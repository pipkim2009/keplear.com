/**
 * Web Worker for audio stem separation using ONNX Runtime Web + Demucs HTDemucs model.
 *
 * Uses onnxruntime-web (npm package) with a Demucs ONNX model loaded from
 * HuggingFace on demand. The model requires two inputs:
 *   1. Waveform: float32[1, 2, samples] (stereo audio)
 *   2. Spectrogram: float32[1, 2, 2048, time_frames, 2] (STFT with real/imag)
 *
 * STFT parameters: n_fft=4096, hop_length=1024, Hann window
 * Audio is processed in 10-second segments (441000 samples at 44.1kHz).
 *
 * Output: float32[1, 4, 2, samples] — drums=0, bass=1, other=2, vocals=3
 *
 * Communication protocol:
 * - Main → Worker: { type: 'SEPARATE', leftChannel: ArrayBuffer, rightChannel: ArrayBuffer, sampleRate: number }
 * - Worker → Main: { type: 'PROGRESS', progress: number, stage: string }
 * - Worker → Main: { type: 'RESULT', stems: Record<string, {left: Float32Array, right: Float32Array}> }
 * - Worker → Main: { type: 'ERROR', error: string }
 */

import * as ort from 'onnxruntime-web'

// Model URL — Demucs v4 HTDemucs, freely hosted on HuggingFace
const MODEL_URL =
  'https://huggingface.co/timcsy/demucs-web-onnx/resolve/main/htdemucs_embedded.onnx'

// Stem order in Demucs output: drums=0, bass=1, other=2, vocals=3
const STEM_NAMES = ['drums', 'bass', 'other', 'vocals'] as const
const NUM_STEMS = 4

// STFT parameters matching Demucs HTDemucs
const N_FFT = 4096
const HOP_LENGTH = 1024
const FREQ_BINS = N_FFT / 2 // 2048 (Demucs drops the Nyquist bin)

// Demucs processes audio at 44100 Hz in 7.8-second segments (default htdemucs segment)
const MODEL_SAMPLE_RATE = 44100
const SEGMENT_SAMPLES = 343980 // 7.8 * 44100 — fixed by model export

// Configure ONNX Runtime WASM paths to use CDN
ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/'

let session: ort.InferenceSession | null = null

// ─── Hann Window ───────────────────────────────────────────────────────────

function createHannWindow(size: number): Float32Array {
  const window = new Float32Array(size)
  for (let i = 0; i < size; i++) {
    window[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / size))
  }
  return window
}

const hannWindow = createHannWindow(N_FFT)

// ─── FFT (radix-2 Cooley-Tukey) ───────────────────────────────────────────

/**
 * In-place radix-2 FFT. Input arrays are modified in place.
 * real and imag must have length that is a power of 2.
 */
function fft(real: Float64Array, imag: Float64Array): void {
  const n = real.length
  if (n <= 1) return

  // Bit-reversal permutation
  let j = 0
  for (let i = 1; i < n; i++) {
    let bit = n >> 1
    while (j & bit) {
      j ^= bit
      bit >>= 1
    }
    j ^= bit
    if (i < j) {
      let tmp = real[i]
      real[i] = real[j]
      real[j] = tmp
      tmp = imag[i]
      imag[i] = imag[j]
      imag[j] = tmp
    }
  }

  // FFT butterfly
  for (let len = 2; len <= n; len <<= 1) {
    const halfLen = len >> 1
    const angle = (-2 * Math.PI) / len
    const wReal = Math.cos(angle)
    const wImag = Math.sin(angle)

    for (let i = 0; i < n; i += len) {
      let curReal = 1,
        curImag = 0
      for (let k = 0; k < halfLen; k++) {
        const evenIdx = i + k
        const oddIdx = i + k + halfLen
        const tReal = curReal * real[oddIdx] - curImag * imag[oddIdx]
        const tImag = curReal * imag[oddIdx] + curImag * real[oddIdx]
        real[oddIdx] = real[evenIdx] - tReal
        imag[oddIdx] = imag[evenIdx] - tImag
        real[evenIdx] += tReal
        imag[evenIdx] += tImag
        const newCurReal = curReal * wReal - curImag * wImag
        curImag = curReal * wImag + curImag * wReal
        curReal = newCurReal
      }
    }
  }
}

// ─── STFT ──────────────────────────────────────────────────────────────────

/**
 * Get a sample with reflect padding (matches PyTorch's center=True, pad_mode='reflect').
 */
function getReflectPadded(signal: Float32Array, numSamples: number, idx: number): number {
  if (idx >= 0 && idx < numSamples) return signal[idx]
  // Reflect: for negative indices, mirror around 0; for indices >= N, mirror around N-1
  if (idx < 0) {
    idx = -idx
    if (idx >= numSamples) idx = numSamples - 1
  } else if (idx >= numSamples) {
    idx = 2 * numSamples - 2 - idx
    if (idx < 0) idx = 0
  }
  return signal[idx]
}

/**
 * Compute STFT for a single channel with center reflect padding (matching PyTorch default).
 * Returns real and imaginary arrays, each of shape [FREQ_BINS, numFrames].
 */
function computeSTFTChannel(
  signal: Float32Array,
  numSamples: number
): { real: Float32Array; imag: Float32Array; numFrames: number } {
  // Center padding: pad n_fft//2 on each side using reflect mode
  const padSize = N_FFT >> 1
  const paddedLen = numSamples + 2 * padSize
  const numFrames = Math.floor((paddedLen - N_FFT) / HOP_LENGTH) + 1

  const real = new Float32Array(FREQ_BINS * numFrames)
  const imag = new Float32Array(FREQ_BINS * numFrames)

  const fftReal = new Float64Array(N_FFT)
  const fftImag = new Float64Array(N_FFT)

  for (let t = 0; t < numFrames; t++) {
    const start = t * HOP_LENGTH // position in padded signal

    // Apply window with reflect padding
    fftReal.fill(0)
    fftImag.fill(0)
    for (let i = 0; i < N_FFT; i++) {
      const sampleIdx = start + i - padSize // map padded index to original signal
      const sample = getReflectPadded(signal, numSamples, sampleIdx)
      fftReal[i] = sample * hannWindow[i]
    }

    fft(fftReal, fftImag)

    // Store first FREQ_BINS (drop Nyquist bin at index 2048)
    for (let f = 0; f < FREQ_BINS; f++) {
      real[f * numFrames + t] = fftReal[f]
      imag[f * numFrames + t] = fftImag[f]
    }
  }

  return { real, imag, numFrames }
}

/**
 * Build STFT tensor in complex-as-channels (CaC) format.
 * Shape: [1, 4, FREQ_BINS, numFrames]
 * Channel order: left_real, left_imag, right_real, right_imag
 */
function computeSTFTTensor(
  leftChannel: Float32Array,
  rightChannel: Float32Array,
  numSamples: number
): ort.Tensor {
  const leftSTFT = computeSTFTChannel(leftChannel, numSamples)
  const rightSTFT = computeSTFTChannel(rightChannel, numSamples)
  const numFrames = leftSTFT.numFrames
  const channelSize = FREQ_BINS * numFrames

  // CaC layout: [1, 4, FREQ_BINS, numFrames]
  const data = new Float32Array(4 * channelSize)
  data.set(leftSTFT.real, 0 * channelSize)
  data.set(leftSTFT.imag, 1 * channelSize)
  data.set(rightSTFT.real, 2 * channelSize)
  data.set(rightSTFT.imag, 3 * channelSize)

  console.log(`STFT tensor shape: [1, 4, ${FREQ_BINS}, ${numFrames}]`)
  return new ort.Tensor('float32', data, [1, 4, FREQ_BINS, numFrames])
}

// ─── Model Loading ─────────────────────────────────────────────────────────

async function loadModel(): Promise<ort.InferenceSession> {
  if (session) return session

  self.postMessage({ type: 'PROGRESS', progress: 0, stage: 'loading_model' })

  let modelBuffer = await loadFromCache()

  if (!modelBuffer) {
    self.postMessage({ type: 'PROGRESS', progress: 5, stage: 'downloading_model' })

    const response = await fetch(MODEL_URL)
    if (!response.ok) throw new Error(`Failed to download model: HTTP ${response.status}`)

    const contentLength = parseInt(response.headers.get('content-length') || '0')
    const reader = response.body?.getReader()
    if (!reader) throw new Error('Failed to read model response')

    const chunks: Uint8Array[] = []
    let received = 0

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
      received += value.length
      if (contentLength > 0) {
        const progress = 5 + (received / contentLength) * 70
        self.postMessage({
          type: 'PROGRESS',
          progress: Math.round(progress),
          stage: 'downloading_model',
        })
      }
    }

    modelBuffer = new Uint8Array(received)
    let offset = 0
    for (const chunk of chunks) {
      modelBuffer.set(chunk, offset)
      offset += chunk.length
    }

    await saveToCache(modelBuffer)
  } else {
    self.postMessage({ type: 'PROGRESS', progress: 75, stage: 'loading_cached_model' })
  }

  self.postMessage({ type: 'PROGRESS', progress: 80, stage: 'initializing_model' })

  session = await ort.InferenceSession.create(modelBuffer.buffer, {
    executionProviders: ['wasm'],
    graphOptimizationLevel: 'all',
  })

  console.log('Model input names:', JSON.stringify(session.inputNames))
  console.log('Model output names:', JSON.stringify(session.outputNames))

  self.postMessage({ type: 'PROGRESS', progress: 100, stage: 'model_ready' })
  return session
}

// ─── IndexedDB Cache ───────────────────────────────────────────────────────

const DB_NAME = 'keplear_demucs'
const STORE_NAME = 'models'
const MODEL_KEY = 'htdemucs_embedded'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function loadFromCache(): Promise<Uint8Array | null> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const req = store.get(MODEL_KEY)
      req.onsuccess = () => resolve(req.result ?? null)
      req.onerror = () => reject(req.error)
    })
  } catch {
    return null
  }
}

async function saveToCache(data: Uint8Array): Promise<void> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const req = store.put(data, MODEL_KEY)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  } catch {
    // Cache failure is non-fatal
  }
}

// ─── Stem Separation ───────────────────────────────────────────────────────

/**
 * Run Demucs inference on the given stereo audio.
 * Processes in 10-second segments and stitches results.
 */
async function separateStems(
  leftChannel: Float32Array,
  rightChannel: Float32Array,
  sampleRate: number,
  inferSession: ort.InferenceSession
): Promise<Record<string, { left: Float32Array; right: Float32Array }>> {
  const numSamples = leftChannel.length

  self.postMessage({ type: 'PROGRESS', progress: 0, stage: 'separating' })

  // Resample to 44100 if needed (simple linear interpolation)
  let left = leftChannel
  let right = rightChannel
  let totalSamples = numSamples

  if (sampleRate !== MODEL_SAMPLE_RATE) {
    const ratio = MODEL_SAMPLE_RATE / sampleRate
    totalSamples = Math.round(numSamples * ratio)
    left = resample(leftChannel, totalSamples)
    right = resample(rightChannel, totalSamples)
  }

  // Process in segments
  const numSegments = Math.ceil(totalSamples / SEGMENT_SAMPLES)

  // Allocate output buffers
  const stemOutputs: Record<string, { left: Float32Array; right: Float32Array }> = {}
  for (const name of STEM_NAMES) {
    stemOutputs[name] = {
      left: new Float32Array(totalSamples),
      right: new Float32Array(totalSamples),
    }
  }

  // Get input/output names
  const inputNames = inferSession.inputNames
  const outputNames = inferSession.outputNames
  console.log(`Processing ${numSegments} segment(s), ${totalSamples} total samples`)

  for (let seg = 0; seg < numSegments; seg++) {
    const segStart = seg * SEGMENT_SAMPLES
    const segEnd = Math.min(segStart + SEGMENT_SAMPLES, totalSamples)
    const segLen = segEnd - segStart

    // Pad to full segment length for consistent tensor shapes
    const paddedLen = SEGMENT_SAMPLES
    const segLeft = new Float32Array(paddedLen)
    const segRight = new Float32Array(paddedLen)
    segLeft.set(left.subarray(segStart, segEnd))
    segRight.set(right.subarray(segStart, segEnd))

    // Build waveform tensor [1, 2, paddedLen]
    const waveformData = new Float32Array(2 * paddedLen)
    waveformData.set(segLeft, 0)
    waveformData.set(segRight, paddedLen)
    const waveformTensor = new ort.Tensor('float32', waveformData, [1, 2, paddedLen])

    // Build feeds:
    // - "input" = waveform [1, 2, samples] (rank 3)
    // - "x" = STFT spectrogram in complex-as-channels format [1, 4, freq_bins, time_frames] (rank 4)
    const feeds: Record<string, ort.Tensor> = {}

    // Compute STFT for the spectrogram input
    const specTensor = computeSTFTTensor(segLeft, segRight, paddedLen)

    for (const name of inputNames) {
      if (name === 'input') {
        feeds[name] = waveformTensor
      } else {
        // 'x' or any other name gets the spectrogram
        feeds[name] = specTensor
      }
    }

    console.log(
      `Segment ${seg + 1}/${numSegments}: feeds =`,
      Object.keys(feeds).map(k => `${k}: [${feeds[k].dims}]`)
    )

    // Run inference
    const results = await inferSession.run(feeds)

    // Parse output — model has 2 outputs:
    //   "output"  = frequency-domain stems [1, 4, 4, 2048, T] (CaC spectrogram)
    //   "add_67"  = time-domain stems [1, 4, 2, samples] (waveform — this is what we want)
    // Find the time-domain output (rank 4 with last dim matching input samples)
    let outputTensor: ort.Tensor | null = null
    for (const name of outputNames) {
      const t = results[name]
      console.log(`Output "${name}" shape: [${t.dims}]`)
      if (t.dims.length === 4 && Number(t.dims[3]) === paddedLen) {
        outputTensor = t
      }
    }
    // Fallback: use whichever output is rank 4 with a samples-like last dim
    if (!outputTensor) {
      for (const name of outputNames) {
        const t = results[name]
        if (t.dims.length === 4) {
          outputTensor = t
          break
        }
      }
    }
    if (!outputTensor) {
      throw new Error(
        `No suitable time-domain output found. Outputs: ${outputNames.map(n => `${n}:[${results[n].dims}]`).join(', ')}`
      )
    }

    const outputData = outputTensor.data as Float32Array
    const outputShape = outputTensor.dims

    console.log(`Segment ${seg + 1} using output shape: [${outputShape}]`)

    // Diagnostic: check if output has actual audio data
    let maxVal = 0,
      sumSq = 0
    for (let i = 0; i < Math.min(outputData.length, 100000); i++) {
      const v = Math.abs(outputData[i])
      if (v > maxVal) maxVal = v
      sumSq += outputData[i] * outputData[i]
    }
    const rms = Math.sqrt(sumSq / Math.min(outputData.length, 100000))
    console.log(
      `Segment ${seg + 1} output stats: max=${maxVal.toFixed(6)}, rms=${rms.toFixed(6)}, length=${outputData.length}`
    )

    // Extract stems from output
    if (outputShape.length === 4) {
      // Shape: [1, numStems, 2, samples]
      const outSamples = Number(outputShape[3])
      const outStems = Number(outputShape[1])
      const outChannels = Number(outputShape[2])

      for (let s = 0; s < Math.min(outStems, NUM_STEMS); s++) {
        const leftStart = s * outChannels * outSamples
        const rightStart = leftStart + outSamples
        const copyLen = Math.min(segLen, outSamples)

        stemOutputs[STEM_NAMES[s]].left.set(
          outputData.subarray(leftStart, leftStart + copyLen),
          segStart
        )
        stemOutputs[STEM_NAMES[s]].right.set(
          outputData.subarray(rightStart, rightStart + copyLen),
          segStart
        )
      }
    } else if (outputShape.length === 3) {
      // Shape: [numStems, 2, samples]
      const outSamples = Number(outputShape[2])
      const outStems = Number(outputShape[0])
      const outChannels = Number(outputShape[1])

      for (let s = 0; s < Math.min(outStems, NUM_STEMS); s++) {
        const leftStart = s * outChannels * outSamples
        const rightStart = leftStart + outSamples
        const copyLen = Math.min(segLen, outSamples)

        stemOutputs[STEM_NAMES[s]].left.set(
          outputData.subarray(leftStart, leftStart + copyLen),
          segStart
        )
        stemOutputs[STEM_NAMES[s]].right.set(
          outputData.subarray(rightStart, rightStart + copyLen),
          segStart
        )
      }
    } else {
      throw new Error(`Unexpected output shape: [${outputShape.join(', ')}]`)
    }

    const progress = Math.round(((seg + 1) / numSegments) * 90)
    self.postMessage({ type: 'PROGRESS', progress, stage: 'separating' })
  }

  // Resample back to original sample rate if needed
  if (sampleRate !== MODEL_SAMPLE_RATE) {
    for (const name of STEM_NAMES) {
      stemOutputs[name].left = resample(stemOutputs[name].left, numSamples)
      stemOutputs[name].right = resample(stemOutputs[name].right, numSamples)
    }
  }

  self.postMessage({ type: 'PROGRESS', progress: 100, stage: 'separating' })
  return stemOutputs
}

/**
 * Simple linear interpolation resampler.
 */
function resample(input: Float32Array, targetLength: number): Float32Array {
  if (input.length === targetLength) return input
  const output = new Float32Array(targetLength)
  const ratio = (input.length - 1) / (targetLength - 1)
  for (let i = 0; i < targetLength; i++) {
    const srcIdx = i * ratio
    const srcFloor = Math.floor(srcIdx)
    const frac = srcIdx - srcFloor
    if (srcFloor + 1 < input.length) {
      output[i] = input[srcFloor] * (1 - frac) + input[srcFloor + 1] * frac
    } else {
      output[i] = input[srcFloor]
    }
  }
  return output
}

// ─── Worker Message Handler ────────────────────────────────────────────────

self.onmessage = async (e: MessageEvent) => {
  const { type } = e.data

  try {
    if (type === 'SEPARATE') {
      const { leftChannel, rightChannel, sampleRate } = e.data

      const inferSession = await loadModel()

      const stems = await separateStems(
        new Float32Array(leftChannel),
        new Float32Array(rightChannel),
        sampleRate,
        inferSession
      )

      const transferables: ArrayBuffer[] = []
      for (const [, channels] of Object.entries(stems)) {
        transferables.push(channels.left.buffer, channels.right.buffer)
      }

      self.postMessage(
        { type: 'RESULT', stems },
        // @ts-expect-error — transferables typing
        transferables
      )
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    self.postMessage({ type: 'ERROR', error: message })
  }
}

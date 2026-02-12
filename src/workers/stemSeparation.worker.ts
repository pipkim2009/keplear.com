/**
 * Web Worker for audio stem separation using ONNX Runtime + Spleeter.
 *
 * Supports all Spleeter model variants:
 *   - 2stems: vocals + accompaniment
 *   - 4stems: vocals + drums + bass + other
 *   - 5stems: vocals + drums + bass + piano + other
 *
 * Pipeline:
 *   Input: stereo PCM (44100 Hz)
 *     → STFT (n_fft=4096, hop=1024, Hann window, no center padding)
 *     → magnitude spectrogram (first 1024 of 2049 freq bins)
 *     → pad frames to multiple of 512, reshape to [2, chunks, 512, 1024]
 *     → run each stem's ONNX model → magnitude estimates
 *     → Wiener-like soft mask normalization
 *     → apply masks to original STFT magnitude (zero-pad to 2049 bins)
 *     → ISTFT (overlap-add) → time-domain stems
 *   Output: { stemName: {left, right}, ... }
 */

import * as ort from 'onnxruntime-web'

// STFT parameters (matching Spleeter defaults)
const FRAME_LENGTH = 4096
const HOP_LENGTH = 1024
const FREQ_BINS = FRAME_LENGTH / 2 + 1 // 2049
const MODEL_FREQ_BINS = 1024 // model uses only first 1024 bins
const CHUNK_FRAMES = 512 // model expects frames grouped in 512
const MODEL_SAMPLE_RATE = 44100

// Stem names per model variant
const MODEL_STEMS: Record<string, string[]> = {
  '2stems': ['vocals', 'accompaniment'],
  '4stems': ['vocals', 'drums', 'bass', 'other'],
  '5stems': ['vocals', 'drums', 'bass', 'piano', 'other'],
}

// HuggingFace model URLs per variant (fp32)
// 2stems: publicly available from sherpa-onnx (csukuangfj)
// 4stems/5stems: must be converted from Spleeter TF checkpoints and hosted.
//   Run: python scripts/convert-spleeter-onnx.py --model 4stems
//   Then upload to HuggingFace and update the URL below.
const HF_BASE_URLS: Record<string, string> = {
  '2stems': 'https://huggingface.co/csukuangfj/sherpa-onnx-spleeter-2stems/resolve/main',
  '4stems': 'https://huggingface.co/csukuangfj/sherpa-onnx-spleeter-4stems/resolve/main',
  '5stems': 'https://huggingface.co/csukuangfj/sherpa-onnx-spleeter-5stems/resolve/main',
}

// Track which models have been verified as available (avoids repeated HEAD checks)
const modelAvailability: Record<string, boolean | null> = {
  '2stems': true, // known available
  '4stems': null, // unknown until checked
  '5stems': null,
}

/** In dev mode, proxy through the Vite dev server to avoid CSP issues. */
function getModelUrl(model: string, stem: string): string {
  const isDev = typeof location !== 'undefined' && location.origin.includes('localhost')
  if (isDev) {
    return `/api/spleeter-model?model=${model}&stem=${stem}`
  }
  return `${HF_BASE_URLS[model]}/${stem}.onnx`
}

// Configure ONNX Runtime — use multi-threading when SharedArrayBuffer is available
// (requires Cross-Origin-Embedder-Policy: require-corp + Cross-Origin-Opener-Policy: same-origin)
ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.24.1/dist/'
const canUseThreads = typeof SharedArrayBuffer !== 'undefined'
ort.env.wasm.numThreads = canUseThreads ? navigator.hardwareConcurrency || 4 : 1

// ─── IndexedDB Model Cache ──────────────────────────────────────────────────

const DB_NAME = 'keplear_spleeter_onnx'
const STORE_NAME = 'models'
const DB_VERSION = 1

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE_NAME)) {
        req.result.createObjectStore(STORE_NAME)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function getCachedModel(name: string): Promise<ArrayBuffer | null> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const req = store.get(name)
      req.onsuccess = () => resolve(req.result ?? null)
      req.onerror = () => reject(req.error)
    })
  } catch {
    return null
  }
}

async function cacheModel(name: string, data: ArrayBuffer): Promise<void> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const req = store.put(data, name)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  } catch {
    // Caching failure is non-fatal
  }
}

// ─── ONNX Model Loading ────────────────────────────────────────────────────

const loadedSessions: Map<string, ort.InferenceSession> = new Map()
let loadedModelName: string | null = null

async function loadOnnxModel(
  name: string,
  url: string,
  onProgress?: (loaded: number, total: number) => void
): Promise<ort.InferenceSession> {
  // Try IndexedDB cache
  let buffer = await getCachedModel(name)

  if (buffer) {
    console.log(
      `[spleeter] Loaded ${name} from cache (${(buffer.byteLength / 1024 / 1024).toFixed(1)} MB)`
    )
  } else {
    console.log(`[spleeter] Downloading ${name}...`)
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Failed to download ${name}: HTTP ${response.status}`)

    const contentLength = parseInt(response.headers.get('content-length') || '0')
    const reader = response.body!.getReader()
    const chunks: Uint8Array[] = []
    let loaded = 0

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
      loaded += value.byteLength
      if (onProgress && contentLength > 0) {
        onProgress(loaded, contentLength)
      }
    }

    // Combine chunks into single buffer
    buffer = new Uint8Array(loaded).buffer
    const combined = new Uint8Array(buffer)
    let offset = 0
    for (const chunk of chunks) {
      combined.set(chunk, offset)
      offset += chunk.byteLength
    }

    console.log(`[spleeter] Downloaded ${name}: ${(loaded / 1024 / 1024).toFixed(1)} MB`)

    // Cache for next time
    await cacheModel(name, buffer)
  }

  return ort.InferenceSession.create(buffer, {
    executionProviders: ['wasm'],
  })
}

async function loadModels(modelName: string): Promise<void> {
  const stemNames = MODEL_STEMS[modelName]
  if (!stemNames) throw new Error(`Unknown model: ${modelName}`)

  // Reuse if same model is already loaded
  if (loadedModelName === modelName && loadedSessions.size === stemNames.length) return

  // Dispose previous sessions if switching models
  for (const [, session] of loadedSessions) {
    try {
      await session.release()
    } catch {
      /* ignore */
    }
  }
  loadedSessions.clear()
  loadedModelName = null

  self.postMessage({ type: 'PROGRESS', progress: 0, stage: 'loading_model' })

  const progressPerStem = 75 / stemNames.length

  for (let i = 0; i < stemNames.length; i++) {
    const stem = stemNames[i]
    const baseProgress = 5 + i * progressPerStem

    self.postMessage({
      type: 'PROGRESS',
      progress: Math.round(baseProgress),
      stage: 'downloading_model',
    })

    const session = await loadOnnxModel(
      `${modelName}_${stem}`,
      getModelUrl(modelName, stem),
      (loaded, total) => {
        const p = baseProgress + (loaded / total) * progressPerStem
        self.postMessage({ type: 'PROGRESS', progress: Math.round(p), stage: 'downloading_model' })
      }
    )

    loadedSessions.set(stem, session)
  }

  loadedModelName = modelName
  self.postMessage({ type: 'PROGRESS', progress: 80, stage: 'model_ready' })
  console.log(`[spleeter] Loaded ${stemNames.length} models for ${modelName}`)
}

// ─── Hann Window ────────────────────────────────────────────────────────────

function createHannWindow(length: number): Float32Array {
  const window = new Float32Array(length)
  for (let i = 0; i < length; i++) {
    window[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / length))
  }
  return window
}

// ─── FFT (Cooley-Tukey radix-2, pre-computed twiddle factors) ───────────────

// Pre-compute bit-reversal table and twiddle factors for FRAME_LENGTH.
// Eliminates thousands of Math.cos/sin calls during STFT/ISTFT processing.
const bitRevTable = new Uint32Array(FRAME_LENGTH)
{
  for (let i = 0; i < FRAME_LENGTH; i++) {
    let j = 0
    let x = i
    for (let bit = 0; bit < Math.log2(FRAME_LENGTH); bit++) {
      j = (j << 1) | (x & 1)
      x >>= 1
    }
    bitRevTable[i] = j
  }
}

// Twiddle factors: twiddleReal[stage][k], twiddleImag[stage][k]
// stage index corresponds to FFT size = 2^(stage+1)
const numStages = Math.log2(FRAME_LENGTH)
const twiddleReal: Float64Array[] = []
const twiddleImag: Float64Array[] = []
for (let s = 0; s < numStages; s++) {
  const halfSize = 1 << s
  const re = new Float64Array(halfSize)
  const im = new Float64Array(halfSize)
  const angle = (-2 * Math.PI) / (halfSize * 2)
  for (let k = 0; k < halfSize; k++) {
    re[k] = Math.cos(angle * k)
    im[k] = Math.sin(angle * k)
  }
  twiddleReal.push(re)
  twiddleImag.push(im)
}

function fft(real: Float32Array, imag: Float32Array): void {
  // Bit-reversal permutation
  for (let i = 0; i < FRAME_LENGTH; i++) {
    const j = bitRevTable[i]
    if (i < j) {
      let tmp = real[i]
      real[i] = real[j]
      real[j] = tmp
      tmp = imag[i]
      imag[i] = imag[j]
      imag[j] = tmp
    }
  }

  // Butterfly stages with pre-computed twiddle factors
  for (let s = 0; s < numStages; s++) {
    const halfSize = 1 << s
    const size = halfSize << 1
    const twRe = twiddleReal[s]
    const twIm = twiddleImag[s]

    for (let i = 0; i < FRAME_LENGTH; i += size) {
      for (let k = 0; k < halfSize; k++) {
        const evenIdx = i + k
        const oddIdx = evenIdx + halfSize

        const tReal = twRe[k] * real[oddIdx] - twIm[k] * imag[oddIdx]
        const tImag = twRe[k] * imag[oddIdx] + twIm[k] * real[oddIdx]

        real[oddIdx] = real[evenIdx] - tReal
        imag[oddIdx] = imag[evenIdx] - tImag
        real[evenIdx] += tReal
        imag[evenIdx] += tImag
      }
    }
  }
}

function ifft(real: Float32Array, imag: Float32Array): void {
  for (let i = 0; i < FRAME_LENGTH; i++) imag[i] = -imag[i]
  fft(real, imag)
  const scale = 1 / FRAME_LENGTH
  for (let i = 0; i < FRAME_LENGTH; i++) {
    real[i] *= scale
    imag[i] = -imag[i] * scale
  }
}

// ─── STFT ───────────────────────────────────────────────────────────────────

interface STFTResult {
  magnitude: Float32Array[] // [numFrames][FREQ_BINS]
  phase: Float32Array[] // [numFrames][FREQ_BINS]
  numFrames: number
}

function computeSTFT(signal: Float32Array, hannWindow: Float32Array): STFTResult {
  const numFrames = Math.floor((signal.length - FRAME_LENGTH) / HOP_LENGTH) + 1

  // Pre-allocate all output arrays at once to reduce GC pressure
  const magnitude = new Array<Float32Array>(numFrames)
  const phase = new Array<Float32Array>(numFrames)
  for (let f = 0; f < numFrames; f++) {
    magnitude[f] = new Float32Array(FREQ_BINS)
    phase[f] = new Float32Array(FREQ_BINS)
  }

  // Reuse working buffers across all frames
  const real = new Float32Array(FRAME_LENGTH)
  const imag = new Float32Array(FRAME_LENGTH)

  for (let f = 0; f < numFrames; f++) {
    const start = f * HOP_LENGTH

    // Apply window directly into real buffer — skip separate frame array
    for (let i = 0; i < FRAME_LENGTH; i++) {
      real[i] = (signal[start + i] || 0) * hannWindow[i]
    }
    imag.fill(0)
    fft(real, imag)

    const mag = magnitude[f]
    const ph = phase[f]
    for (let k = 0; k < FREQ_BINS; k++) {
      const r = real[k]
      const im = imag[k]
      mag[k] = Math.sqrt(r * r + im * im)
      ph[k] = Math.atan2(im, r)
    }
  }

  return { magnitude, phase, numFrames }
}

// ─── ISTFT ──────────────────────────────────────────────────────────────────

function computeISTFT(
  magnitude: Float32Array[],
  phase: Float32Array[],
  numFrames: number,
  outputLength: number,
  hannWindow: Float32Array
): Float32Array {
  const output = new Float32Array(outputLength)
  const windowSum = new Float32Array(outputLength)

  // Reuse working buffers across all frames
  const real = new Float32Array(FRAME_LENGTH)
  const imag = new Float32Array(FRAME_LENGTH)

  for (let f = 0; f < numFrames; f++) {
    const mag = magnitude[f]
    const ph = phase[f]

    for (let k = 0; k < FREQ_BINS; k++) {
      real[k] = mag[k] * Math.cos(ph[k])
      imag[k] = mag[k] * Math.sin(ph[k])
    }
    for (let k = FREQ_BINS; k < FRAME_LENGTH; k++) {
      const mirrorK = FRAME_LENGTH - k
      real[k] = real[mirrorK]
      imag[k] = -imag[mirrorK]
    }

    ifft(real, imag)

    const start = f * HOP_LENGTH
    const end = Math.min(FRAME_LENGTH, outputLength - start)
    for (let i = 0; i < end; i++) {
      const outIdx = start + i
      output[outIdx] += real[i] * hannWindow[i]
      windowSum[outIdx] += hannWindow[i] * hannWindow[i]
    }
  }

  for (let i = 0; i < outputLength; i++) {
    if (windowSum[i] > 1e-8) {
      output[i] /= windowSum[i]
    }
  }

  return output
}

// ─── Resampling ─────────────────────────────────────────────────────────────

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

// ─── Stem Separation ────────────────────────────────────────────────────────

async function separateStems(
  leftChannel: Float32Array,
  rightChannel: Float32Array,
  sampleRate: number,
  modelName: string
): Promise<Record<string, { left: Float32Array; right: Float32Array }>> {
  const stemNames = MODEL_STEMS[modelName]
  const numSamples = leftChannel.length

  self.postMessage({ type: 'PROGRESS', progress: 0, stage: 'separating' })

  // Resample to 44100 Hz if needed
  let left = leftChannel
  let right = rightChannel
  let totalSamples = numSamples

  if (sampleRate !== MODEL_SAMPLE_RATE) {
    const ratio = MODEL_SAMPLE_RATE / sampleRate
    totalSamples = Math.round(numSamples * ratio)
    left = resample(leftChannel, totalSamples)
    right = resample(rightChannel, totalSamples)
  }

  // Ensure signal is long enough for at least one STFT frame
  const minLength = FRAME_LENGTH
  if (left.length < minLength) {
    const padded = new Float32Array(minLength)
    padded.set(left)
    left = padded
    const paddedR = new Float32Array(minLength)
    paddedR.set(right)
    right = paddedR
  }
  const signalLength = left.length

  self.postMessage({ type: 'PROGRESS', progress: 5, stage: 'separating' })

  // STFT both channels
  const hannWindow = createHannWindow(FRAME_LENGTH)
  const leftSTFT = computeSTFT(left, hannWindow)
  const rightSTFT = computeSTFT(right, hannWindow)
  const numFrames = leftSTFT.numFrames

  self.postMessage({ type: 'PROGRESS', progress: 15, stage: 'separating' })
  console.log(`[spleeter] STFT: ${numFrames} frames, ${FREQ_BINS} freq bins`)

  // Pad frame count to multiple of CHUNK_FRAMES
  const numChunks = Math.ceil(numFrames / CHUNK_FRAMES)
  const paddedFrames = numChunks * CHUNK_FRAMES

  // Build input tensor [2, numChunks, 512, 1024]
  // Channel layout: [left_chunks..., right_chunks...]
  const inputSize = 2 * numChunks * CHUNK_FRAMES * MODEL_FREQ_BINS
  const inputData = new Float32Array(inputSize)

  for (let c = 0; c < 2; c++) {
    const stft = c === 0 ? leftSTFT : rightSTFT
    const channelOffset = c * paddedFrames * MODEL_FREQ_BINS

    for (let f = 0; f < numFrames; f++) {
      const frameOffset = channelOffset + f * MODEL_FREQ_BINS
      for (let k = 0; k < MODEL_FREQ_BINS; k++) {
        inputData[frameOffset + k] = stft.magnitude[f][k]
      }
    }
    // Padded frames (numFrames..paddedFrames) stay zero
  }

  self.postMessage({ type: 'PROGRESS', progress: 20, stage: 'separating' })

  // Run both ONNX models
  const inputTensor = new ort.Tensor('float32', inputData, [
    2,
    numChunks,
    CHUNK_FRAMES,
    MODEL_FREQ_BINS,
  ])

  console.log(
    `[spleeter] Running inference: input shape [2, ${numChunks}, ${CHUNK_FRAMES}, ${MODEL_FREQ_BINS}], stems=${stemNames.join(',')}`
  )

  // Run each stem's ONNX model and collect magnitude estimates
  const stemModelOutputs: Map<string, Float32Array> = new Map()
  const inferenceProgressRange = 40 // 20% to 60%

  for (let s = 0; s < stemNames.length; s++) {
    const stem = stemNames[s]
    const session = loadedSessions.get(stem)
    if (!session) throw new Error(`No session loaded for stem: ${stem}`)

    const result = await session.run({ x: inputTensor })
    stemModelOutputs.set(stem, result.y.data as Float32Array)

    const progress = 20 + ((s + 1) / stemNames.length) * inferenceProgressRange
    self.postMessage({ type: 'PROGRESS', progress: Math.round(progress), stage: 'separating' })
  }

  // ── Aggressive masking pipeline for minimal bleed ──────────────────────
  //
  // 1. α=6 Wiener masking (v^6 power — much harder than standard α=2)
  // 2. Sigmoid sharpening pushes masks toward 0/1 binary
  // 3. Median temporal filtering (preserves transients, kills isolated bleed)
  // 4. Per-band high-frequency extension (8 sub-bands)

  // Median-of-5 helper (sort-free for exactly 5 values)
  function median5(a: number, b: number, c: number, d: number, e: number): number {
    // Sorting network for 5 elements — 9 comparisons
    let t: number
    if (a > b) {
      t = a
      a = b
      b = t
    }
    if (c > d) {
      t = c
      c = d
      d = t
    }
    if (a > c) {
      t = a
      a = c
      c = t
      t = b
      b = d
      d = t
    }
    if (b > e) {
      t = b
      b = e
      e = t
    }
    if (b > c) {
      t = b
      b = c
      c = t
    }
    if (d > e) {
      t = d
      d = e
      e = t
    }
    if (c > d) {
      c = d
    }
    return b > c ? b : c
  }

  // Median-of-3 helper
  function median3(a: number, b: number, c: number): number {
    if (a > b) {
      const t = a
      a = b
      b = t
    }
    return c < a ? a : c > b ? b : c
  }

  // Sigmoid sharpening: pushes mask values toward 0 or 1
  // gain controls steepness (higher = harder mask), center is the crossover point
  const SIGMOID_GAIN = 12
  const SIGMOID_CENTER = 0.5
  function sharpen(mask: number): number {
    return 1 / (1 + Math.exp(-SIGMOID_GAIN * (mask - SIGMOID_CENTER)))
  }

  // Temporal smoothing radius for median filter
  const SMOOTH_RADIUS = 2 // 5-frame median window

  // High-frequency extension config
  const HF_BANDS = 8
  const HF_RANGE = FREQ_BINS - MODEL_FREQ_BINS // 1025 bins
  const HF_BAND_SIZE = Math.ceil(HF_RANGE / HF_BANDS)
  const HF_SRC_BAND = Math.floor(MODEL_FREQ_BINS / HF_BANDS)

  const stemMags: Record<string, [Float32Array[], Float32Array[]]> = {}
  for (const stem of stemNames) {
    stemMags[stem] = [[], []]
  }

  // First pass: compute raw Wiener masks with α=6
  const rawMasks: Record<string, [Float32Array, Float32Array]> = {}
  for (const stem of stemNames) {
    rawMasks[stem] = [
      new Float32Array(numFrames * MODEL_FREQ_BINS),
      new Float32Array(numFrames * MODEL_FREQ_BINS),
    ]
  }

  const sumPow = new Float32Array(MODEL_FREQ_BINS)

  for (let c = 0; c < 2; c++) {
    const channelOffset = c * paddedFrames * MODEL_FREQ_BINS

    for (let f = 0; f < numFrames; f++) {
      const frameOffset = channelOffset + f * MODEL_FREQ_BINS
      const maskOffset = f * MODEL_FREQ_BINS

      // Sum v^6 across all stems
      sumPow.fill(0)
      for (const stem of stemNames) {
        const data = stemModelOutputs.get(stem)!
        for (let k = 0; k < MODEL_FREQ_BINS; k++) {
          const v = Math.abs(data[frameOffset + k])
          const v2 = v * v
          const v3 = v2 * v
          sumPow[k] += v3 * v3 // v^6
        }
      }

      for (const stem of stemNames) {
        const data = stemModelOutputs.get(stem)!
        const masks = rawMasks[stem][c]
        for (let k = 0; k < MODEL_FREQ_BINS; k++) {
          const v = Math.abs(data[frameOffset + k])
          const v2 = v * v
          const v3 = v2 * v
          masks[maskOffset + k] = (v3 * v3 + 1e-12) / (sumPow[k] + 1e-10)
        }
      }
    }
  }

  self.postMessage({ type: 'PROGRESS', progress: 63, stage: 'separating' })

  // Second pass: sigmoid sharpening (in-place on rawMasks)
  for (const stem of stemNames) {
    for (let c = 0; c < 2; c++) {
      const masks = rawMasks[stem][c]
      const len = numFrames * MODEL_FREQ_BINS
      for (let i = 0; i < len; i++) {
        masks[i] = sharpen(masks[i])
      }
    }
  }

  self.postMessage({ type: 'PROGRESS', progress: 65, stage: 'separating' })

  // Third pass: median temporal filter + apply to magnitudes + HF extension
  for (let c = 0; c < 2; c++) {
    const stft = c === 0 ? leftSTFT : rightSTFT

    for (let f = 0; f < numFrames; f++) {
      for (const stem of stemNames) {
        const mag = new Float32Array(FREQ_BINS)
        const masks = rawMasks[stem][c]

        const bandMaskSums = new Float32Array(HF_BANDS)
        const bandMaskCounts = new Float32Array(HF_BANDS)

        // Clamp window to valid frames
        const f0 = Math.max(0, f - SMOOTH_RADIUS)
        const f4 = Math.min(numFrames - 1, f + SMOOTH_RADIUS)
        const windowSize = f4 - f0 + 1

        for (let k = 0; k < MODEL_FREQ_BINS; k++) {
          // Median filter across temporal window
          let m: number
          if (windowSize >= 5) {
            m = median5(
              masks[f0 * MODEL_FREQ_BINS + k],
              masks[(f0 + 1) * MODEL_FREQ_BINS + k],
              masks[(f0 + 2) * MODEL_FREQ_BINS + k],
              masks[(f0 + 3) * MODEL_FREQ_BINS + k],
              masks[f4 * MODEL_FREQ_BINS + k]
            )
          } else if (windowSize === 4) {
            // Median of 4 = average of middle 2; approximate with median of 3 center values
            m = median3(
              masks[(f0 + 1) * MODEL_FREQ_BINS + k],
              masks[(f0 + 2) * MODEL_FREQ_BINS + k],
              masks[f0 * MODEL_FREQ_BINS + k]
            )
          } else if (windowSize === 3) {
            m = median3(
              masks[f0 * MODEL_FREQ_BINS + k],
              masks[(f0 + 1) * MODEL_FREQ_BINS + k],
              masks[f4 * MODEL_FREQ_BINS + k]
            )
          } else {
            m = masks[f * MODEL_FREQ_BINS + k]
          }

          mag[k] = m * stft.magnitude[f][k]

          // Accumulate for HF band extension
          const bandIdx = Math.floor(k / HF_SRC_BAND)
          if (bandIdx < HF_BANDS) {
            bandMaskSums[bandIdx] += m
            bandMaskCounts[bandIdx] += 1
          }
        }

        // Extend to high frequencies using per-band averages
        for (let k = MODEL_FREQ_BINS; k < FREQ_BINS; k++) {
          const hfOffset = k - MODEL_FREQ_BINS
          const bandIdx = Math.min(HF_BANDS - 1, Math.floor(hfOffset / HF_BAND_SIZE))
          const srcBand = HF_BANDS - 1 - bandIdx
          const avgMask =
            bandMaskCounts[srcBand] > 0 ? bandMaskSums[srcBand] / bandMaskCounts[srcBand] : 0
          mag[k] = avgMask * stft.magnitude[f][k]
        }

        stemMags[stem][c].push(mag)
      }
    }
  }

  self.postMessage({ type: 'PROGRESS', progress: 70, stage: 'separating' })

  // ISTFT to reconstruct time-domain audio for each stem
  const stemOutputs: Record<string, { left: Float32Array; right: Float32Array }> = {}

  for (let s = 0; s < stemNames.length; s++) {
    const stem = stemNames[s]
    const leftStem = computeISTFT(
      stemMags[stem][0],
      leftSTFT.phase,
      numFrames,
      signalLength,
      hannWindow
    )
    const rightStem = computeISTFT(
      stemMags[stem][1],
      rightSTFT.phase,
      numFrames,
      signalLength,
      hannWindow
    )

    stemOutputs[stem] = {
      left: leftStem.slice(0, totalSamples),
      right: rightStem.slice(0, totalSamples),
    }

    self.postMessage({
      type: 'PROGRESS',
      progress: 70 + ((s + 1) / stemNames.length) * 25,
      stage: 'separating',
    })
  }

  // Resample back to original sample rate if needed
  if (sampleRate !== MODEL_SAMPLE_RATE) {
    for (const name of stemNames) {
      stemOutputs[name].left = resample(stemOutputs[name].left, numSamples)
      stemOutputs[name].right = resample(stemOutputs[name].right, numSamples)
    }
  }

  self.postMessage({ type: 'PROGRESS', progress: 100, stage: 'separating' })
  return stemOutputs
}

// ─── Model Availability Check ──────────────────────────────────────────────

async function checkModelAvailability(modelName: string): Promise<boolean> {
  // Already verified
  if (modelAvailability[modelName] === true) return true
  if (modelAvailability[modelName] === false) return false

  // Check if models are cached in IndexedDB (if cached, they're available)
  const stemNames = MODEL_STEMS[modelName]
  if (!stemNames) return false

  const firstStem = stemNames[0]
  const cached = await getCachedModel(`${modelName}_${firstStem}`)
  if (cached) {
    modelAvailability[modelName] = true
    return true
  }

  // HEAD request to check if the first stem's model file exists
  try {
    const url = getModelUrl(modelName, firstStem)
    const response = await fetch(url, { method: 'HEAD' })
    const available = response.ok
    modelAvailability[modelName] = available
    return available
  } catch {
    modelAvailability[modelName] = false
    return false
  }
}

// ─── Worker Message Handler ────────────────────────────────────────────────

self.onmessage = async (e: MessageEvent) => {
  const { type } = e.data

  try {
    if (type === 'CHECK_AVAILABILITY') {
      const { model: modelName } = e.data
      const available = await checkModelAvailability(modelName)
      self.postMessage({ type: 'AVAILABILITY', model: modelName, available })
    } else if (type === 'SEPARATE') {
      const { leftChannel, rightChannel, sampleRate, model: modelName = '2stems' } = e.data

      // Verify model is available before starting expensive work
      const available = await checkModelAvailability(modelName)
      if (!available) {
        throw new Error(
          `The ${modelName} model is not yet available. ` +
            'Only 2-stem separation (vocals) is currently supported. ' +
            'Run scripts/convert-spleeter-onnx.py to generate 4/5-stem models.'
        )
      }

      await loadModels(modelName)

      const stems = await separateStems(
        new Float32Array(leftChannel),
        new Float32Array(rightChannel),
        sampleRate,
        modelName
      )

      const transferables: ArrayBuffer[] = []
      for (const [, channels] of Object.entries(stems)) {
        transferables.push(channels.left.buffer, channels.right.buffer)
      }

      self.postMessage(
        {
          type: 'RESULT',
          stems,
          stemNames: MODEL_STEMS[modelName],
        },
        // @ts-expect-error — transferables typing
        transferables
      )
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    self.postMessage({ type: 'ERROR', error: message })
  }
}

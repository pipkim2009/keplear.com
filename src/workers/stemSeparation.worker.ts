/**
 * Web Worker for audio stem separation using ONNX Runtime Web + Demucs HTDemucs model.
 *
 * Uses the self-contained Demucs ONNX model from mixxxdj/demucs which bakes
 * STFT/ISTFT into the model as 1D convolutions. It accepts a single waveform
 * input and outputs stems directly — no manual FFT/STFT computation needed.
 *
 * Input: float32[1, 2, 343980] (stereo waveform at 44.1kHz, ~7.8s segments)
 * Output: float32[1, 4, 2, 343980] — drums=0, bass=1, other=2, vocals=3
 *
 * Communication protocol:
 * - Main → Worker: { type: 'SEPARATE', leftChannel: ArrayBuffer, rightChannel: ArrayBuffer, sampleRate: number }
 * - Worker → Main: { type: 'PROGRESS', progress: number, stage: string }
 * - Worker → Main: { type: 'RESULT', stems: Record<string, {left: Float32Array, right: Float32Array}> }
 * - Worker → Main: { type: 'ERROR', error: string }
 */

import * as ort from 'onnxruntime-web'

// Model URL — self-contained Demucs v4 HTDemucs from mixxxdj/demucs (MIT license)
// Proxied through the dev server to avoid CORS issues (GitHub releases lack CORS headers).
// For production, host the model on a CORS-friendly CDN (e.g. HuggingFace) and update this URL.
const MODEL_URL = '/api/demucs-model'

// Stem order in Demucs output: drums=0, bass=1, other=2, vocals=3
const STEM_NAMES = ['drums', 'bass', 'other', 'vocals'] as const
const NUM_STEMS = 4

// Demucs processes audio at 44100 Hz in 7.8-second segments (default htdemucs segment)
const MODEL_SAMPLE_RATE = 44100
const SEGMENT_SAMPLES = 343980 // 7.8 * 44100 — fixed by model export

// Configure ONNX Runtime WASM paths to use CDN
ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/'

let session: ort.InferenceSession | null = null

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
const MODEL_KEY = 'htdemucs_selfcontained'

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

// Overlap between segments — matches Demucs default (0.25 = 25%)
const OVERLAP = 0.25
const SEGMENT_STRIDE = Math.round(SEGMENT_SAMPLES * (1 - OVERLAP))

/**
 * Build triangle crossfade weight matching Demucs apply.py:
 *   weight = cat([arange(1, S//2+1), arange(S - S//2, 0, -1)])
 * Ramps from 1 up to S//2 then back down to 1.
 */
function buildTriangleWeight(length: number): Float32Array {
  const weight = new Float32Array(length)
  const half = Math.floor(length / 2)
  for (let i = 0; i < half; i++) {
    weight[i] = i + 1
  }
  for (let i = half; i < length; i++) {
    weight[i] = length - i
  }
  return weight
}

/**
 * Run Demucs inference on stereo audio.
 * Uses overlapping segments with triangle crossfade (matching Demucs apply.py).
 */
async function separateStems(
  leftChannel: Float32Array,
  rightChannel: Float32Array,
  sampleRate: number,
  inferSession: ort.InferenceSession
): Promise<Record<string, { left: Float32Array; right: Float32Array }>> {
  const numSamples = leftChannel.length

  self.postMessage({ type: 'PROGRESS', progress: 0, stage: 'separating' })

  // Resample to 44100 if needed
  let left = leftChannel
  let right = rightChannel
  let totalSamples = numSamples

  if (sampleRate !== MODEL_SAMPLE_RATE) {
    const ratio = MODEL_SAMPLE_RATE / sampleRate
    totalSamples = Math.round(numSamples * ratio)
    left = resample(leftChannel, totalSamples)
    right = resample(rightChannel, totalSamples)
  }

  // Build segment offsets with overlap
  const offsets: number[] = []
  for (let off = 0; off < totalSamples; off += SEGMENT_STRIDE) {
    offsets.push(off)
  }
  const numSegments = offsets.length

  // Triangle crossfade weight (matching Demucs)
  const weight = buildTriangleWeight(SEGMENT_SAMPLES)

  // Allocate weighted output buffers + weight accumulator
  const stemOutputs: Record<string, { left: Float32Array; right: Float32Array }> = {}
  for (const name of STEM_NAMES) {
    stemOutputs[name] = {
      left: new Float32Array(totalSamples),
      right: new Float32Array(totalSamples),
    }
  }
  const sumWeight = new Float32Array(totalSamples)

  console.log(
    `Processing ${numSegments} overlapping segment(s), stride=${SEGMENT_STRIDE}, total=${totalSamples}`
  )

  for (let seg = 0; seg < numSegments; seg++) {
    const segStart = offsets[seg]
    const segEnd = Math.min(segStart + SEGMENT_SAMPLES, totalSamples)
    const segLen = segEnd - segStart

    // Extract segment, zero-pad to full length if at end
    const segLeft = new Float32Array(SEGMENT_SAMPLES)
    const segRight = new Float32Array(SEGMENT_SAMPLES)
    segLeft.set(left.subarray(segStart, segEnd))
    segRight.set(right.subarray(segStart, segEnd))

    // Build waveform tensor [1, 2, SEGMENT_SAMPLES]
    const waveformData = new Float32Array(2 * SEGMENT_SAMPLES)
    waveformData.set(segLeft, 0)
    waveformData.set(segRight, SEGMENT_SAMPLES)
    const waveformTensor = new ort.Tensor('float32', waveformData, [1, 2, SEGMENT_SAMPLES])

    // Run inference — single input, single output
    const results = await inferSession.run({ input: waveformTensor })
    const outputData = results.output.data as Float32Array
    // Output shape: [1, 4, 2, SEGMENT_SAMPLES]

    // Accumulate weighted stem output (triangle crossfade in overlap regions)
    for (let s = 0; s < NUM_STEMS; s++) {
      const lStart = s * 2 * SEGMENT_SAMPLES
      const rStart = lStart + SEGMENT_SAMPLES

      for (let i = 0; i < segLen; i++) {
        const outIdx = segStart + i
        const w = weight[i]
        stemOutputs[STEM_NAMES[s]].left[outIdx] += w * outputData[lStart + i]
        stemOutputs[STEM_NAMES[s]].right[outIdx] += w * outputData[rStart + i]
      }
    }

    // Accumulate weight
    for (let i = 0; i < segLen; i++) {
      sumWeight[segStart + i] += weight[i]
    }

    const progress = Math.round(((seg + 1) / numSegments) * 90)
    self.postMessage({ type: 'PROGRESS', progress, stage: 'separating' })
  }

  // Normalize by accumulated weight
  for (const name of STEM_NAMES) {
    const l = stemOutputs[name].left
    const r = stemOutputs[name].right
    for (let i = 0; i < totalSamples; i++) {
      const w = sumWeight[i]
      if (w > 0) {
        l[i] /= w
        r[i] /= w
      }
    }
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

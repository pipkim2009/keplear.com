/**
 * useStemSeparation - React hook for audio stem separation.
 *
 * The user picks individual instruments (vocals, drums, bass, piano).
 * The hook auto-selects the smallest Spleeter model that covers all
 * selected instruments, runs inference, and combines any unselected
 * model stems into a "Music" remainder track.
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { downloadFullAudioBuffer } from './useWaveformData'

export type StemType = string // 'vocals' | 'drums' | 'bass' | 'piano' | 'music'

// Internal — which Spleeter model to use
type SpleeterModel = '2stems' | '4stems' | '5stems'

// Model stem names (must match worker)
const MODEL_STEMS: Record<string, string[]> = {
  '2stems': ['vocals', 'accompaniment'],
  '4stems': ['vocals', 'drums', 'bass', 'other'],
  '5stems': ['vocals', 'drums', 'bass', 'piano', 'other'],
}

/** Pick the smallest model that covers all requested instruments. */
function getRequiredModel(instruments: string[]): SpleeterModel {
  if (instruments.includes('piano')) return '5stems'
  if (instruments.includes('drums') || instruments.includes('bass')) return '4stems'
  return '2stems'
}

/** Which instruments require which model. */
export function getModelForInstrument(instrument: string): SpleeterModel {
  if (instrument === 'piano') return '5stems'
  if (instrument === 'drums' || instrument === 'bass') return '4stems'
  return '2stems'
}

// ─── Model availability (cached across hook instances) ─────────────────────

const modelAvailabilityCache: Record<string, boolean | null> = {
  '2stems': true, // known available
  '4stems': null,
  '5stems': null,
}

let availabilityCheckPromise: Promise<void> | null = null

/** Check which models are available. Runs once and caches results. */
export function checkAllModelAvailability(): Promise<Record<string, boolean>> {
  if (!availabilityCheckPromise) {
    availabilityCheckPromise = new Promise<void>(resolve => {
      const worker = new Worker(new URL('../workers/stemSeparation.worker.ts', import.meta.url), {
        type: 'module',
      })
      let pending = 2 // check 4stems and 5stems
      worker.onmessage = (e: MessageEvent) => {
        if (e.data.type === 'AVAILABILITY') {
          modelAvailabilityCache[e.data.model] = e.data.available
          pending--
          if (pending <= 0) {
            worker.terminate()
            resolve()
          }
        }
      }
      worker.onerror = () => {
        // On error, mark unknown models as unavailable
        if (modelAvailabilityCache['4stems'] === null) modelAvailabilityCache['4stems'] = false
        if (modelAvailabilityCache['5stems'] === null) modelAvailabilityCache['5stems'] = false
        worker.terminate()
        resolve()
      }

      worker.postMessage({ type: 'CHECK_AVAILABILITY', model: '4stems' })
      worker.postMessage({ type: 'CHECK_AVAILABILITY', model: '5stems' })
    })
  }

  return availabilityCheckPromise.then(() => ({
    '2stems': modelAvailabilityCache['2stems'] ?? false,
    '4stems': modelAvailabilityCache['4stems'] ?? false,
    '5stems': modelAvailabilityCache['5stems'] ?? false,
  }))
}

/** Get cached availability (synchronous, returns null if not yet checked). */
export function getModelAvailability(): Record<string, boolean | null> {
  return { ...modelAvailabilityCache }
}

export interface StemData {
  stems: Record<string, AudioBuffer>
  stemNames: string[]
  sampleRate: number
  duration: number
}

export type SeparationStatus =
  | 'idle'
  | 'downloading'
  | 'loading_model'
  | 'separating'
  | 'ready'
  | 'error'

interface StemSeparationState {
  status: SeparationStatus
  progress: number
  stems: StemData | null
  error: string | null
}

/**
 * Convert stereo Float32Arrays into an AudioBuffer.
 */
function createAudioBufferFromChannels(
  left: Float32Array,
  right: Float32Array,
  sampleRate: number
): AudioBuffer {
  const audioCtx = new OfflineAudioContext(2, left.length, sampleRate)
  const buffer = audioCtx.createBuffer(2, left.length, sampleRate)
  buffer.getChannelData(0).set(left)
  buffer.getChannelData(1).set(right)
  return buffer
}

export function useStemSeparation(videoId: string | null) {
  const [state, setState] = useState<StemSeparationState>({
    status: 'idle',
    progress: 0,
    stems: null,
    error: null,
  })

  const workerRef = useRef<Worker | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const videoIdRef = useRef<string | null>(null)

  // Clean up worker on unmount or video change
  useEffect(() => {
    return () => {
      workerRef.current?.terminate()
      workerRef.current = null
      abortRef.current?.abort()
    }
  }, [])

  // Reset when video changes
  useEffect(() => {
    if (videoId !== videoIdRef.current) {
      videoIdRef.current = videoId
      setState({ status: 'idle', progress: 0, stems: null, error: null })
      workerRef.current?.terminate()
      workerRef.current = null
      abortRef.current?.abort()
    }
  }, [videoId])

  const separate = useCallback(
    async (selectedInstruments: string[]) => {
      if (!videoId || selectedInstruments.length === 0) return

      const model = getRequiredModel(selectedInstruments)
      const modelStems = MODEL_STEMS[model]

      // Reset state
      setState({ status: 'downloading', progress: 0, stems: null, error: null })

      const abortController = new AbortController()
      abortRef.current = abortController

      try {
        // Step 1: Get full-quality audio data (highest bitrate for best stem separation)
        const arrayBuffer = await downloadFullAudioBuffer(videoId, abortController.signal)
        if (!arrayBuffer) {
          throw new Error('Failed to download audio. The song may be too long or unavailable.')
        }

        if (abortController.signal.aborted) return

        // Step 2: Decode audio to get raw PCM channels
        setState(prev => ({ ...prev, status: 'downloading', progress: 50 }))
        const audioCtx = new AudioContext()
        let decodedBuffer: AudioBuffer
        try {
          decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0))
        } finally {
          await audioCtx.close()
        }

        const leftChannel = decodedBuffer.getChannelData(0)
        const rightChannel =
          decodedBuffer.numberOfChannels >= 2
            ? decodedBuffer.getChannelData(1)
            : decodedBuffer.getChannelData(0)
        const sampleRate = decodedBuffer.sampleRate

        if (abortController.signal.aborted) return

        // Warn for very long songs (> 10 minutes)
        if (decodedBuffer.duration > 600) {
          console.warn(
            `Song is ${Math.round(decodedBuffer.duration / 60)} minutes long. ` +
              'Stem separation may use significant memory for the full spectrogram.'
          )
        }

        // Step 3: Create and initialize worker
        setState(prev => ({ ...prev, status: 'loading_model', progress: 0 }))

        // Terminate previous worker if exists
        workerRef.current?.terminate()

        const worker = new Worker(new URL('../workers/stemSeparation.worker.ts', import.meta.url), {
          type: 'module',
        })
        workerRef.current = worker

        // Set up message handling
        const stemPromise = new Promise<StemData>((resolve, reject) => {
          worker.onmessage = (e: MessageEvent) => {
            const { type: msgType } = e.data

            if (msgType === 'PROGRESS') {
              const { progress, stage } = e.data
              let status: SeparationStatus = 'loading_model'
              if (stage === 'separating') {
                status = 'separating'
              } else if (
                stage === 'loading_model' ||
                stage === 'downloading_model' ||
                stage === 'loading_cached_model' ||
                stage === 'initializing_model' ||
                stage === 'model_ready'
              ) {
                status = 'loading_model'
              }
              setState(prev => ({ ...prev, status, progress: Math.round(progress) }))
            } else if (msgType === 'RESULT') {
              const { stems } = e.data

              // Build output: selected instruments as individual tracks,
              // everything else combined into a "music" remainder track.
              const stemBuffers: Record<string, AudioBuffer> = {}
              const outputNames: string[] = []

              // Add each selected instrument that exists in the model
              for (const name of selectedInstruments) {
                if (stems[name]) {
                  stemBuffers[name] = createAudioBufferFromChannels(
                    stems[name].left,
                    stems[name].right,
                    sampleRate
                  )
                  outputNames.push(name)
                }
              }

              // Combine unselected model stems into "music"
              const unselected = modelStems.filter(s => !selectedInstruments.includes(s))
              if (unselected.length > 0) {
                const firstUnselected = stems[unselected[0]]
                if (firstUnselected) {
                  const len = firstUnselected.left.length
                  const musicLeft = new Float32Array(len)
                  const musicRight = new Float32Array(len)
                  for (const s of unselected) {
                    if (stems[s]) {
                      const l = new Float32Array(stems[s].left)
                      const r = new Float32Array(stems[s].right)
                      for (let i = 0; i < len; i++) {
                        musicLeft[i] += l[i]
                        musicRight[i] += r[i]
                      }
                    }
                  }
                  stemBuffers['music'] = createAudioBufferFromChannels(
                    musicLeft,
                    musicRight,
                    sampleRate
                  )
                  outputNames.push('music')
                }
              }

              const stemData: StemData = {
                stems: stemBuffers,
                stemNames: outputNames,
                sampleRate,
                duration: decodedBuffer.duration,
              }

              console.log(
                `Stem separation complete: model=${model}, selected=[${selectedInstruments.join(', ')}], ` +
                  `output=[${outputNames.join(', ')}], duration=${decodedBuffer.duration.toFixed(1)}s`
              )

              resolve(stemData)
            } else if (msgType === 'ERROR') {
              reject(new Error(e.data.error))
            }
          }

          worker.onerror = err => {
            reject(new Error(err.message || 'Worker error'))
          }

          // Handle abort
          abortController.signal.addEventListener('abort', () => {
            reject(new Error('Cancelled'))
            worker.terminate()
          })

          // Send audio data to worker (worker receives the internal model name)
          worker.postMessage(
            {
              type: 'SEPARATE',
              leftChannel: leftChannel.buffer,
              rightChannel: rightChannel.buffer,
              sampleRate,
              model,
            },
            [leftChannel.buffer, rightChannel.buffer]
          )
        })

        const stems = await stemPromise

        if (abortController.signal.aborted) return

        setState({
          status: 'ready',
          progress: 100,
          stems,
          error: null,
        })
      } catch (err) {
        if (abortController.signal.aborted) return

        const message = err instanceof Error ? err.message : 'Stem separation failed'
        setState({
          status: 'error',
          progress: 0,
          stems: null,
          error: message,
        })
      }
    },
    [videoId]
  )

  const clearStems = useCallback(() => {
    setState({ status: 'idle', progress: 0, stems: null, error: null })
    workerRef.current?.terminate()
    workerRef.current = null
  }, [])

  const cancel = useCallback(() => {
    abortRef.current?.abort()
    workerRef.current?.terminate()
    workerRef.current = null
    setState({ status: 'idle', progress: 0, stems: null, error: null })
  }, [])

  return {
    ...state,
    separate,
    clearStems,
    cancel,
  }
}

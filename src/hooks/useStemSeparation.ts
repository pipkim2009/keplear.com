/**
 * useStemSeparation - React hook for audio stem separation.
 *
 * Downloads audio via the existing proxy pipeline (reusing cached ArrayBuffer
 * from waveform generation), sends it to a Web Worker running Demucs WASM,
 * and returns 4 stem AudioBuffers (vocals, drums, bass, other).
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { downloadFullAudioBuffer } from './useWaveformData'

export type StemType = 'vocals' | 'drums' | 'bass' | 'other'

export interface StemData {
  vocals: AudioBuffer
  drums: AudioBuffer
  bass: AudioBuffer
  other: AudioBuffer
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

  const separate = useCallback(async () => {
    if (!videoId) return

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

      // Warn for very long songs (> 8 minutes)
      if (decodedBuffer.duration > 480) {
        console.warn(
          `Song is ${Math.round(decodedBuffer.duration / 60)} minutes long. ` +
            'Stem separation may use significant memory (~200MB+ for stems).'
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
            // Map worker stages to UI status
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

            // Convert Float32Arrays to AudioBuffers
            const stemData: StemData = {
              vocals: createAudioBufferFromChannels(
                stems.vocals.left,
                stems.vocals.right,
                sampleRate
              ),
              drums: createAudioBufferFromChannels(stems.drums.left, stems.drums.right, sampleRate),
              bass: createAudioBufferFromChannels(stems.bass.left, stems.bass.right, sampleRate),
              other: createAudioBufferFromChannels(stems.other.left, stems.other.right, sampleRate),
              sampleRate,
              duration: decodedBuffer.duration,
            }

            console.log(
              `Stem separation complete: audio duration=${decodedBuffer.duration.toFixed(1)}s, ` +
                `vocals samples=${stems.vocals.left.length}, sampleRate=${sampleRate}`
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

        // Send audio data — worker handles model loading internally
        worker.postMessage(
          {
            type: 'SEPARATE',
            leftChannel: leftChannel.buffer,
            rightChannel: rightChannel.buffer,
            sampleRate,
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
  }, [videoId])

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

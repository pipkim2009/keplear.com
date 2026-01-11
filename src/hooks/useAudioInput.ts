/**
 * Shared Audio Input Hook
 * Provides common microphone access and audio context functionality
 * for pitch detection and audio analysis hooks
 */

import { useState, useCallback, useRef, useEffect } from 'react'

export type MicrophonePermission = 'prompt' | 'granted' | 'denied' | 'error'

export interface AudioInputConfig {
  sampleRate?: number
  fftSize?: number
  smoothingTimeConstant?: number
}

export interface AudioInputState {
  isListening: boolean
  permission: MicrophonePermission
  error: string | null
  volumeLevel: number
}

export interface UseAudioInputReturn extends AudioInputState {
  startListening: () => Promise<boolean>
  stopListening: () => void
  analyserRef: React.RefObject<AnalyserNode | null>
  audioContextRef: React.RefObject<AudioContext | null>
  getTimeDomainData: () => Float32Array | null
  getFrequencyData: () => Uint8Array | null
}

const DEFAULT_CONFIG: Required<AudioInputConfig> = {
  sampleRate: 44100,
  fftSize: 4096,
  smoothingTimeConstant: 0
}

/**
 * Shared hook for microphone access and audio input management
 * Used by pitch detection hooks to avoid code duplication
 */
export const useAudioInput = (config: AudioInputConfig = {}): UseAudioInputReturn => {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config }

  // State
  const [isListening, setIsListening] = useState(false)
  const [permission, setPermission] = useState<MicrophonePermission>('prompt')
  const [error, setError] = useState<string | null>(null)
  const [volumeLevel, setVolumeLevel] = useState(0)

  // Audio refs
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const timeDomainBufferRef = useRef<Float32Array | null>(null)
  const frequencyBufferRef = useRef<Uint8Array | null>(null)

  /**
   * Calculate RMS volume from audio buffer
   */
  const calculateRMS = useCallback((buffer: Float32Array): number => {
    let sum = 0
    for (let i = 0; i < buffer.length; i++) {
      sum += buffer[i] * buffer[i]
    }
    return Math.sqrt(sum / buffer.length)
  }, [])

  /**
   * Get time domain data from analyser
   */
  const getTimeDomainData = useCallback((): Float32Array | null => {
    if (!analyserRef.current) return null

    if (!timeDomainBufferRef.current || timeDomainBufferRef.current.length !== analyserRef.current.fftSize) {
      timeDomainBufferRef.current = new Float32Array(analyserRef.current.fftSize)
    }

    analyserRef.current.getFloatTimeDomainData(timeDomainBufferRef.current)

    // Update volume level
    const rms = calculateRMS(timeDomainBufferRef.current)
    setVolumeLevel(Math.min(1, rms * 10))

    return timeDomainBufferRef.current
  }, [calculateRMS])

  /**
   * Get frequency data from analyser
   */
  const getFrequencyData = useCallback((): Uint8Array | null => {
    if (!analyserRef.current) return null

    if (!frequencyBufferRef.current || frequencyBufferRef.current.length !== analyserRef.current.frequencyBinCount) {
      frequencyBufferRef.current = new Uint8Array(analyserRef.current.frequencyBinCount)
    }

    analyserRef.current.getByteFrequencyData(frequencyBufferRef.current)
    return frequencyBufferRef.current
  }, [])

  /**
   * Cleanup audio resources
   */
  const cleanup = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop())
      mediaStreamRef.current = null
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    analyserRef.current = null
    timeDomainBufferRef.current = null
    frequencyBufferRef.current = null
    setVolumeLevel(0)
  }, [])

  /**
   * Start listening to microphone
   */
  const startListening = useCallback(async (): Promise<boolean> => {
    if (isListening) return true

    setError(null)

    try {
      // Request microphone with disabled processing for clean instrument audio
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: mergedConfig.sampleRate
        }
      })

      setPermission('granted')
      mediaStreamRef.current = stream

      // Create audio context
      const audioContext = new AudioContext({ sampleRate: mergedConfig.sampleRate })
      audioContextRef.current = audioContext

      if (audioContext.state === 'suspended') {
        await audioContext.resume()
      }

      // Create and configure analyser
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = mergedConfig.fftSize
      analyser.smoothingTimeConstant = mergedConfig.smoothingTimeConstant
      analyserRef.current = analyser

      // Connect microphone to analyser
      const source = audioContext.createMediaStreamSource(stream)
      source.connect(analyser)

      setIsListening(true)
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'

      if (errorMessage.includes('Permission denied') || errorMessage.includes('NotAllowedError')) {
        setPermission('denied')
        setError('Microphone access denied. Please allow microphone access.')
      } else if (errorMessage.includes('NotFoundError')) {
        setError('No microphone found.')
        setPermission('error')
      } else {
        setError(`Microphone error: ${errorMessage}`)
        setPermission('error')
      }

      cleanup()
      return false
    }
  }, [isListening, mergedConfig.sampleRate, mergedConfig.fftSize, mergedConfig.smoothingTimeConstant, cleanup])

  /**
   * Stop listening
   */
  const stopListening = useCallback(() => {
    setIsListening(false)
    cleanup()
  }, [cleanup])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [cleanup])

  return {
    // State
    isListening,
    permission,
    error,
    volumeLevel,

    // Actions
    startListening,
    stopListening,

    // Refs for direct access
    analyserRef,
    audioContextRef,

    // Data getters
    getTimeDomainData,
    getFrequencyData
  }
}

export default useAudioInput

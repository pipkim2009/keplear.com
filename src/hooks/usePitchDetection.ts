/**
 * Real-time pitch detection hook using Web Audio API and Pitchfinder
 * Optimized for instrument detection (guitar, bass, etc.)
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { YIN } from 'pitchfinder'
import { frequencyToNote } from '../utils/pitchUtils'

/**
 * Pitch detection result for a single detection frame
 */
export interface PitchDetectionResult {
  /** Detected frequency in Hz, null if no pitch detected */
  frequency: number | null
  /** Detected note name (e.g., "C4"), null if no pitch detected */
  note: string | null
  /** Timestamp of the detection */
  timestamp: number
}

/**
 * Microphone permission state
 */
export type MicrophonePermission = 'prompt' | 'granted' | 'denied' | 'error'

/**
 * Return type for usePitchDetection hook
 */
interface UsePitchDetectionReturn {
  /** Start listening to microphone and detecting pitch */
  startListening: () => Promise<void>
  /** Stop listening and release microphone */
  stopListening: () => void
  /** Current detected pitch result */
  currentPitch: PitchDetectionResult | null
  /** Whether currently listening */
  isListening: boolean
  /** Current microphone permission state */
  permission: MicrophonePermission
  /** Any error that occurred */
  error: string | null
  /** Volume level (0-1) for visual feedback */
  volumeLevel: number
}

// Optimized settings for instrument detection
const SAMPLE_RATE = 44100
const FFT_SIZE = 4096  // Larger for better low frequency detection (guitar low E = 82Hz)
const DETECTION_INTERVAL = 50  // ms between detections
const MIN_VOLUME = 0.01  // Minimum volume to attempt detection

/**
 * Hook for real-time pitch detection from microphone input
 * Optimized for instruments (guitar, bass, keyboard)
 */
export const usePitchDetection = (): UsePitchDetectionReturn => {
  const [isListening, setIsListening] = useState(false)
  const [permission, setPermission] = useState<MicrophonePermission>('prompt')
  const [error, setError] = useState<string | null>(null)
  const [currentPitch, setCurrentPitch] = useState<PitchDetectionResult | null>(null)
  const [volumeLevel, setVolumeLevel] = useState(0)

  // Refs for audio resources
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const detectionIntervalRef = useRef<number | null>(null)
  const pitchDetectorRef = useRef<ReturnType<typeof YIN> | null>(null)

  // Initialize pitch detector
  useEffect(() => {
    pitchDetectorRef.current = YIN({
      sampleRate: SAMPLE_RATE,
      threshold: 0.1  // Lower threshold = more sensitive detection
    })
    return () => {
      pitchDetectorRef.current = null
    }
  }, [])

  /**
   * Cleanup audio resources
   */
  const cleanup = useCallback(() => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current)
      detectionIntervalRef.current = null
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop())
      mediaStreamRef.current = null
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    analyserRef.current = null
    setCurrentPitch(null)
    setVolumeLevel(0)
  }, [])

  /**
   * Detect pitch from current audio buffer
   */
  const detectPitch = useCallback(() => {
    if (!analyserRef.current || !pitchDetectorRef.current) return

    const analyser = analyserRef.current
    const bufferLength = analyser.fftSize
    const buffer = new Float32Array(bufferLength)

    // Get time domain data
    analyser.getFloatTimeDomainData(buffer)

    // Calculate volume (RMS)
    let sum = 0
    for (let i = 0; i < bufferLength; i++) {
      sum += buffer[i] * buffer[i]
    }
    const rms = Math.sqrt(sum / bufferLength)
    setVolumeLevel(Math.min(1, rms * 10))

    // Only detect if there's enough volume
    if (rms < MIN_VOLUME) {
      setCurrentPitch(null)
      return
    }

    // Run pitch detection
    const frequency = pitchDetectorRef.current(buffer)

    // If we got a frequency, use it (trust the detector)
    if (frequency && frequency > 60 && frequency < 2000) {
      // Valid range for guitar/bass/keyboard (roughly E2 to B6)
      const result: PitchDetectionResult = {
        frequency,
        note: frequencyToNote(frequency),
        timestamp: performance.now()
      }
      setCurrentPitch(result)
    }
  }, [])

  /**
   * Start listening to microphone
   */
  const startListening = useCallback(async () => {
    if (isListening) return

    setError(null)

    try {
      // Request microphone - DISABLE all processing for instruments
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      })

      setPermission('granted')
      mediaStreamRef.current = stream

      // Create audio context
      const audioContext = new AudioContext({ sampleRate: SAMPLE_RATE })
      audioContextRef.current = audioContext

      if (audioContext.state === 'suspended') {
        await audioContext.resume()
      }

      // Create analyser node
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = FFT_SIZE
      analyser.smoothingTimeConstant = 0
      analyserRef.current = analyser

      // Connect microphone to analyser
      const source = audioContext.createMediaStreamSource(stream)
      source.connect(analyser)

      // Start detection loop
      setIsListening(true)
      detectionIntervalRef.current = window.setInterval(detectPitch, DETECTION_INTERVAL)
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
    }
  }, [isListening, detectPitch, cleanup])

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
    startListening,
    stopListening,
    currentPitch,
    isListening,
    permission,
    error,
    volumeLevel
  }
}

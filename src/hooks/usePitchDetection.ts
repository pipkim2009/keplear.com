/**
 * Real-time pitch detection hook using Web Audio API
 *
 * Based on research of Yousician's approach:
 * - Uses YIN algorithm for accurate monophonic pitch detection
 * - Tracks pitch confidence to filter noise
 * - Detects note onsets (new note attacks)
 * - Maintains pitch history for stability analysis
 *
 * References:
 * - YIN Algorithm: http://audition.ens.fr/adc/pdf/2002_JASA_YIN.pdf
 * - Onset Detection: https://www.cycfi.com/2021/01/onset-detection/
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { YIN } from 'pitchfinder'
import { frequencyToNote, noteToFrequency, calculateCentsDifference } from '../utils/pitchUtils'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Enhanced pitch detection result
 */
export interface PitchDetectionResult {
  /** Detected frequency in Hz */
  frequency: number
  /** Detected note name with octave (e.g., "C4") */
  note: string
  /** Pitch confidence (0-1), higher = more reliable */
  confidence: number
  /** Cents deviation from perfect pitch (-50 to +50) */
  centsOffset: number
  /** Timestamp of detection */
  timestamp: number
  /** Whether this is a new note onset (attack) */
  isOnset: boolean
}

/**
 * Pitch history entry for stability tracking
 */
interface PitchHistoryEntry {
  note: string
  frequency: number
  confidence: number
  timestamp: number
}

export type MicrophonePermission = 'prompt' | 'granted' | 'denied' | 'error'

interface UsePitchDetectionReturn {
  startListening: () => Promise<void>
  stopListening: () => void
  /** Current stable pitch (null if no pitch or unstable) */
  currentPitch: PitchDetectionResult | null
  /** Raw pitch (may be unstable, useful for visualization) */
  rawPitch: PitchDetectionResult | null
  isListening: boolean
  permission: MicrophonePermission
  error: string | null
  /** Volume level 0-1 */
  volumeLevel: number
  /** Average pitch confidence over recent detections */
  averageConfidence: number
  /** Whether currently detecting a sustained note */
  isSustaining: boolean
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // Audio settings
  SAMPLE_RATE: 44100,
  FFT_SIZE: 4096,           // Larger for better low-freq detection (guitar low E = 82Hz)

  // Detection timing
  DETECTION_INTERVAL_MS: 20, // 50 FPS for smooth tracking

  // Volume thresholds
  MIN_VOLUME_RMS: 0.008,    // Minimum volume to attempt detection
  ONSET_VOLUME_JUMP: 0.02,   // Volume increase that indicates new note attack

  // Frequency range (covers guitar, bass, keyboard)
  MIN_FREQUENCY: 60,        // ~B1 (lowest on 5-string bass)
  MAX_FREQUENCY: 2000,      // ~B6 (high keyboard range)

  // Stability requirements
  STABILITY_WINDOW_MS: 80,  // Time window to check pitch stability
  MIN_STABLE_DETECTIONS: 3, // Consecutive detections needed for stable pitch
  PITCH_STABILITY_CENTS: 30, // Max cents deviation to consider "same note"

  // Onset detection
  ONSET_SILENCE_MS: 50,     // Silence duration before new onset can trigger
  ONSET_COOLDOWN_MS: 100,   // Minimum time between onsets

  // Confidence
  MIN_CONFIDENCE: 0.7,      // Minimum confidence to report pitch
  HISTORY_SIZE: 10,         // Number of detections to keep for averaging
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export const usePitchDetection = (): UsePitchDetectionReturn => {
  // State
  const [isListening, setIsListening] = useState(false)
  const [permission, setPermission] = useState<MicrophonePermission>('prompt')
  const [error, setError] = useState<string | null>(null)
  const [currentPitch, setCurrentPitch] = useState<PitchDetectionResult | null>(null)
  const [rawPitch, setRawPitch] = useState<PitchDetectionResult | null>(null)
  const [volumeLevel, setVolumeLevel] = useState(0)
  const [averageConfidence, setAverageConfidence] = useState(0)
  const [isSustaining, setIsSustaining] = useState(false)

  // Audio refs
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const detectionIntervalRef = useRef<number | null>(null)
  const pitchDetectorRef = useRef<ReturnType<typeof YIN> | null>(null)

  // Detection state refs
  const pitchHistoryRef = useRef<PitchHistoryEntry[]>([])
  const lastStablePitchRef = useRef<string | null>(null)
  const lastOnsetTimeRef = useRef<number>(0)
  const lastVolumeRef = useRef<number>(0)
  const silenceStartRef = useRef<number>(0)
  const wasInSilenceRef = useRef<boolean>(true)

  // Initialize pitch detector
  useEffect(() => {
    pitchDetectorRef.current = YIN({
      sampleRate: CONFIG.SAMPLE_RATE,
      threshold: 0.1  // Lower = more sensitive, but more octave errors
    })
    return () => {
      pitchDetectorRef.current = null
    }
  }, [])

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
   * Calculate pitch confidence based on signal characteristics
   * Higher confidence = cleaner, more periodic signal
   */
  const calculateConfidence = useCallback((
    buffer: Float32Array,
    frequency: number,
    rms: number
  ): number => {
    if (!frequency || rms < CONFIG.MIN_VOLUME_RMS) return 0

    // Base confidence from volume (louder = more confident)
    const volumeConfidence = Math.min(1, rms * 15)

    // Check signal periodicity by looking at autocorrelation peak strength
    // YIN gives us frequency, we can estimate confidence from signal clarity
    const periodSamples = CONFIG.SAMPLE_RATE / frequency

    // Simple periodicity check: compare signal at 0 and 1 period apart
    let correlation = 0
    let count = 0
    const offset = Math.round(periodSamples)

    for (let i = 0; i < buffer.length - offset; i++) {
      correlation += buffer[i] * buffer[i + offset]
      count++
    }

    if (count > 0) {
      correlation = correlation / count
      // Normalize by RMS
      const periodicityConfidence = Math.max(0, Math.min(1, correlation / (rms * rms) + 0.5))

      // Combine confidences
      return volumeConfidence * 0.3 + periodicityConfidence * 0.7
    }

    return volumeConfidence * 0.5
  }, [])

  /**
   * Check if current pitch is stable (same note held)
   */
  const checkPitchStability = useCallback((
    currentNote: string,
    currentFreq: number
  ): boolean => {
    const history = pitchHistoryRef.current
    const now = performance.now()

    // Filter to recent history within stability window
    const recentHistory = history.filter(
      h => now - h.timestamp < CONFIG.STABILITY_WINDOW_MS
    )

    if (recentHistory.length < CONFIG.MIN_STABLE_DETECTIONS) {
      return false
    }

    // Check if all recent detections are the same note within cents tolerance
    for (const entry of recentHistory) {
      if (entry.note !== currentNote) {
        // Check cents difference for near-matches
        const centsDiff = Math.abs(calculateCentsDifference(entry.frequency, currentFreq))
        if (centsDiff > CONFIG.PITCH_STABILITY_CENTS) {
          return false
        }
      }
    }

    return true
  }, [])

  /**
   * Detect if this is a new note onset (attack)
   */
  const detectOnset = useCallback((
    currentNote: string,
    currentVolume: number,
    isStable: boolean
  ): boolean => {
    const now = performance.now()
    const lastOnsetTime = lastOnsetTimeRef.current
    const wasInSilence = wasInSilenceRef.current
    const lastVolume = lastVolumeRef.current
    const lastStablePitch = lastStablePitchRef.current

    // Check cooldown
    if (now - lastOnsetTime < CONFIG.ONSET_COOLDOWN_MS) {
      return false
    }

    // Onset condition 1: Coming out of silence
    if (wasInSilence && currentVolume > CONFIG.MIN_VOLUME_RMS && isStable) {
      lastOnsetTimeRef.current = now
      wasInSilenceRef.current = false
      return true
    }

    // Onset condition 2: Volume jump (new attack)
    const volumeJump = currentVolume - lastVolume
    if (volumeJump > CONFIG.ONSET_VOLUME_JUMP && isStable) {
      lastOnsetTimeRef.current = now
      return true
    }

    // Onset condition 3: Pitch change (different note)
    if (isStable && lastStablePitch && lastStablePitch !== currentNote) {
      lastOnsetTimeRef.current = now
      return true
    }

    return false
  }, [])

  /**
   * Main pitch detection function
   */
  const detectPitch = useCallback(() => {
    if (!analyserRef.current || !pitchDetectorRef.current) return

    const analyser = analyserRef.current
    const buffer = new Float32Array(analyser.fftSize)
    analyser.getFloatTimeDomainData(buffer)

    const now = performance.now()
    const rms = calculateRMS(buffer)

    // Update volume level for UI
    setVolumeLevel(Math.min(1, rms * 10))

    // Check for silence
    if (rms < CONFIG.MIN_VOLUME_RMS) {
      // Track silence duration
      if (!wasInSilenceRef.current) {
        silenceStartRef.current = now
      }
      if (now - silenceStartRef.current > CONFIG.ONSET_SILENCE_MS) {
        wasInSilenceRef.current = true
      }

      setCurrentPitch(null)
      setRawPitch(null)
      setIsSustaining(false)
      lastVolumeRef.current = rms
      return
    }

    // Run YIN pitch detection
    const frequency = pitchDetectorRef.current(buffer)

    // Validate frequency range
    if (!frequency || frequency < CONFIG.MIN_FREQUENCY || frequency > CONFIG.MAX_FREQUENCY) {
      lastVolumeRef.current = rms
      return
    }

    // Convert to note
    const note = frequencyToNote(frequency)
    if (!note) {
      lastVolumeRef.current = rms
      return
    }

    // Calculate confidence
    const confidence = calculateConfidence(buffer, frequency, rms)

    // Calculate cents offset from perfect pitch
    const perfectFreq = noteToFrequency(note)
    const centsOffset = perfectFreq ? calculateCentsDifference(frequency, perfectFreq) : 0

    // Add to history
    pitchHistoryRef.current.push({
      note,
      frequency,
      confidence,
      timestamp: now
    })

    // Trim history
    if (pitchHistoryRef.current.length > CONFIG.HISTORY_SIZE) {
      pitchHistoryRef.current.shift()
    }

    // Calculate average confidence
    const avgConf = pitchHistoryRef.current.reduce((sum, h) => sum + h.confidence, 0) /
                    pitchHistoryRef.current.length
    setAverageConfidence(avgConf)

    // Create raw pitch result (always update for visualization)
    const rawResult: PitchDetectionResult = {
      frequency,
      note,
      confidence,
      centsOffset,
      timestamp: now,
      isOnset: false
    }
    setRawPitch(rawResult)

    // Check stability for confirmed pitch
    const isStable = checkPitchStability(note, frequency)

    // Only report if confident enough
    if (confidence < CONFIG.MIN_CONFIDENCE) {
      lastVolumeRef.current = rms
      return
    }

    if (isStable) {
      // Detect onset
      const isOnset = detectOnset(note, rms, isStable)

      const stableResult: PitchDetectionResult = {
        frequency,
        note,
        confidence,
        centsOffset,
        timestamp: now,
        isOnset
      }

      setCurrentPitch(stableResult)
      setIsSustaining(true)
      lastStablePitchRef.current = note
    }

    lastVolumeRef.current = rms
  }, [calculateRMS, calculateConfidence, checkPitchStability, detectOnset])

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
    pitchHistoryRef.current = []
    lastStablePitchRef.current = null
    wasInSilenceRef.current = true

    setCurrentPitch(null)
    setRawPitch(null)
    setVolumeLevel(0)
    setAverageConfidence(0)
    setIsSustaining(false)
  }, [])

  /**
   * Start listening to microphone
   */
  const startListening = useCallback(async () => {
    if (isListening) return

    setError(null)

    try {
      // Request microphone with disabled processing for clean instrument audio
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          // Request specific sample rate if supported
          sampleRate: CONFIG.SAMPLE_RATE
        }
      })

      setPermission('granted')
      mediaStreamRef.current = stream

      // Create audio context
      const audioContext = new AudioContext({ sampleRate: CONFIG.SAMPLE_RATE })
      audioContextRef.current = audioContext

      if (audioContext.state === 'suspended') {
        await audioContext.resume()
      }

      // Create and configure analyser
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = CONFIG.FFT_SIZE
      analyser.smoothingTimeConstant = 0  // No smoothing for accurate onset detection
      analyserRef.current = analyser

      // Connect microphone to analyser
      const source = audioContext.createMediaStreamSource(stream)
      source.connect(analyser)

      // Reset detection state
      pitchHistoryRef.current = []
      lastStablePitchRef.current = null
      lastOnsetTimeRef.current = 0
      lastVolumeRef.current = 0
      wasInSilenceRef.current = true
      silenceStartRef.current = performance.now()

      // Start detection loop
      setIsListening(true)
      detectionIntervalRef.current = window.setInterval(
        detectPitch,
        CONFIG.DETECTION_INTERVAL_MS
      )
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
    rawPitch,
    isListening,
    permission,
    error,
    volumeLevel,
    averageConfidence,
    isSustaining
  }
}

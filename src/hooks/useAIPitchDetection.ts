/**
 * AI-powered pitch detection using TensorFlow.js with CREPE model
 *
 * CREPE (Convolutional REpresentation for Pitch Estimation) is a deep CNN
 * that provides state-of-the-art monophonic pitch detection.
 *
 * Features:
 * - Runs entirely in browser (no API costs)
 * - GPU accelerated via WebGL
 * - More accurate than traditional DSP algorithms
 * - Robust to noise and different instruments
 *
 * References:
 * - CREPE Paper: https://arxiv.org/abs/1802.06182
 * - Model: https://github.com/marl/crepe
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { frequencyToNote, noteToFrequency, calculateCentsDifference, INSTRUMENT_CONFIG, isFrequencyInInstrumentRange } from '../utils/pitchUtils'
import type { InstrumentType } from '../types/instrument'

// Lazy-loaded TensorFlow.js reference
let tf: typeof import('@tensorflow/tfjs') | null = null

// ============================================================================
// TYPES
// ============================================================================

export interface AIPitchDetectionResult {
  frequency: number
  note: string
  confidence: number
  centsOffset: number
  timestamp: number
  isOnset: boolean
}

export type MicrophonePermission = 'prompt' | 'granted' | 'denied' | 'error'
export type ModelStatus = 'unloaded' | 'loading' | 'ready' | 'error'

interface UseAIPitchDetectionOptions {
  /** The instrument type for frequency filtering */
  instrument?: InstrumentType
}

interface UseAIPitchDetectionReturn {
  startListening: () => Promise<void>
  stopListening: () => void
  currentPitch: AIPitchDetectionResult | null
  rawPitch: AIPitchDetectionResult | null
  isListening: boolean
  permission: MicrophonePermission
  error: string | null
  volumeLevel: number
  modelStatus: ModelStatus
  isModelLoading: boolean
  averageConfidence: number
  isSustaining: boolean
  /** Update the instrument type for filtering */
  setInstrument: (instrument: InstrumentType) => void
}

// ============================================================================
// CREPE MODEL CONFIGURATION
// ============================================================================

// CREPE model constants
const CREPE_SAMPLE_RATE = 16000
const CREPE_FRAME_SIZE = 1024
const CREPE_CENTS_PER_BIN = 20
const CREPE_NUM_BINS = 360

// Frequency range for CREPE (C1 to B7)
const CREPE_FMIN = 32.70  // C1
const CREPE_FMAX = 1975.53 // B6

// Model URL - using ml5.js hosted CREPE model
const CREPE_MODEL_URL = 'https://cdn.jsdelivr.net/gh/ml5js/ml5-data-and-models@master/models/pitch-detection/crepe/model.json'

// ============================================================================
// CONFIGURATION
// ============================================================================

// Base config values
const BASE_CONFIG = {
  DETECTION_INTERVAL_MS: 30,
  MIN_VOLUME_RMS: 0.01,
  ONSET_VOLUME_JUMP: 0.03,
  MIN_CONFIDENCE: 0.6,
  STABILITY_WINDOW_MS: 80,
  MIN_STABLE_DETECTIONS: 3,
  PITCH_STABILITY_CENTS: 40,
  ONSET_SILENCE_MS: 40,
  ONSET_COOLDOWN_MS: 180,
  NOTE_HOLD_WINDOW_MS: 100,
  HISTORY_SIZE: 6,
}

/**
 * Get instrument-adjusted config values
 * Different instruments have different attack characteristics:
 * - Piano: Sharp attacks, clear onset
 * - Guitar: Softer attacks, string noise
 * - Bass: Very soft attacks, low frequencies need more sensitivity
 */
const getInstrumentConfig = (instrument: InstrumentType) => {
  const instrumentConfig = INSTRUMENT_CONFIG[instrument]

  // Adjust based on instrument sensitivity (0.5 = bass, 0.6 = guitar, 0.7 = piano)
  const sensitivity = instrumentConfig.onsetSensitivity

  return {
    ...BASE_CONFIG,
    // Lower confidence threshold for instruments with softer attacks
    MIN_CONFIDENCE: BASE_CONFIG.MIN_CONFIDENCE * sensitivity,
    // Adjust volume jump threshold (bass needs lower threshold)
    ONSET_VOLUME_JUMP: BASE_CONFIG.ONSET_VOLUME_JUMP * sensitivity,
    // Bass needs longer stability window due to low frequency oscillations
    STABILITY_WINDOW_MS: instrument === 'bass'
      ? BASE_CONFIG.STABILITY_WINDOW_MS * 1.5
      : BASE_CONFIG.STABILITY_WINDOW_MS,
    // Adjust cooldown based on sustain type
    ONSET_COOLDOWN_MS: instrumentConfig.sustainType === 'long'
      ? BASE_CONFIG.ONSET_COOLDOWN_MS * 1.3
      : instrumentConfig.sustainType === 'short'
        ? BASE_CONFIG.ONSET_COOLDOWN_MS * 0.8
        : BASE_CONFIG.ONSET_COOLDOWN_MS,
  }
}

// Default config (will be overridden by instrument-specific values)
let CONFIG = BASE_CONFIG

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert CREPE bin index to frequency
 */
const binToFrequency = (bin: number): number => {
  const cents = bin * CREPE_CENTS_PER_BIN + 1997.3794084376191
  return 10 * Math.pow(2, cents / 1200)
}

/**
 * Resample audio buffer to target sample rate
 */
const resampleBuffer = (
  inputBuffer: Float32Array,
  inputSampleRate: number,
  outputSampleRate: number
): Float32Array => {
  if (inputSampleRate === outputSampleRate) {
    return inputBuffer
  }

  const ratio = inputSampleRate / outputSampleRate
  const outputLength = Math.round(inputBuffer.length / ratio)
  const output = new Float32Array(outputLength)

  for (let i = 0; i < outputLength; i++) {
    const inputIndex = i * ratio
    const lowIndex = Math.floor(inputIndex)
    const highIndex = Math.min(lowIndex + 1, inputBuffer.length - 1)
    const fraction = inputIndex - lowIndex
    output[i] = inputBuffer[lowIndex] * (1 - fraction) + inputBuffer[highIndex] * fraction
  }

  return output
}

/**
 * Normalize audio buffer to [-1, 1] range
 */
const normalizeBuffer = (buffer: Float32Array): Float32Array => {
  const max = Math.max(...buffer.map(Math.abs))
  if (max === 0) return buffer
  return buffer.map(x => x / max)
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export const useAIPitchDetection = (options?: UseAIPitchDetectionOptions): UseAIPitchDetectionReturn => {
  // State
  const [isListening, setIsListening] = useState(false)
  const [permission, setPermission] = useState<MicrophonePermission>('prompt')
  const [error, setError] = useState<string | null>(null)
  const [currentPitch, setCurrentPitch] = useState<AIPitchDetectionResult | null>(null)

  // Instrument type for frequency filtering (stored in ref to avoid stale closures)
  const instrumentRef = useRef<InstrumentType>(options?.instrument || 'keyboard')
  // Instrument-specific config (updated when instrument changes)
  const configRef = useRef(getInstrumentConfig(options?.instrument || 'keyboard'))

  const setInstrument = useCallback((instrument: InstrumentType) => {
    instrumentRef.current = instrument
    configRef.current = getInstrumentConfig(instrument)
    console.log(`Pitch detection configured for ${instrument}:`, configRef.current)
  }, [])
  const [rawPitch, setRawPitch] = useState<AIPitchDetectionResult | null>(null)
  const [volumeLevel, setVolumeLevel] = useState(0)
  const [modelStatus, setModelStatus] = useState<ModelStatus>('unloaded')
  const [averageConfidence, setAverageConfidence] = useState(0)
  const [isSustaining, setIsSustaining] = useState(false)

  // Refs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const modelRef = useRef<any>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const detectionIntervalRef = useRef<number | null>(null)
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null)
  const audioBufferRef = useRef<Float32Array>(new Float32Array(CREPE_FRAME_SIZE))

  // Detection state refs
  const pitchHistoryRef = useRef<Array<{ note: string; frequency: number; confidence: number; timestamp: number }>>([])
  const lastStablePitchRef = useRef<string | null>(null)
  const lastOnsetTimeRef = useRef<number>(0)
  const lastVolumeRef = useRef<number>(0)
  const silenceStartRef = useRef<number>(0)
  const wasInSilenceRef = useRef<boolean>(true)
  const noteHoldStartRef = useRef<number>(0)
  const currentHeldNoteRef = useRef<string | null>(null)

  // Track if model loading has been attempted
  const modelLoadAttemptedRef = useRef(false)
  // Track model status in ref to avoid closure issues
  const modelStatusRef = useRef<ModelStatus>('unloaded')

  /**
   * Load CREPE model (called only when starting to listen)
   */
  const loadModel = useCallback(async (): Promise<boolean> => {
    // Already loaded
    if (modelRef.current) return true

    // Already loading or failed
    if (modelLoadAttemptedRef.current) {
      return modelRef.current !== null
    }

    modelLoadAttemptedRef.current = true
    setModelStatus('loading')
    modelStatusRef.current = 'loading'
    setError(null)

    try {
      // Lazy load TensorFlow.js
      console.log('Loading TensorFlow.js...')
      if (!tf) {
        tf = await import('@tensorflow/tfjs')
      }

      // Set TensorFlow.js backend
      console.log('TensorFlow.js loaded, initializing backend...')
      await tf.ready()
      console.log('TensorFlow backend ready, loading CREPE model...')

      // Load the CREPE model from CDN
      modelRef.current = await tf.loadLayersModel(CREPE_MODEL_URL)
      console.log('CREPE model loaded successfully!')
      setModelStatus('ready')
      modelStatusRef.current = 'ready'
      return true
    } catch (err) {
      console.error('Failed to load AI model:', err)
      setError('Failed to load AI pitch detection model. Please check your internet connection and refresh the page.')
      setModelStatus('error')
      modelStatusRef.current = 'error'
      modelRef.current = null
      return false
    }
  }, [])

  /**
   * Calculate RMS volume
   */
  const calculateRMS = useCallback((buffer: Float32Array): number => {
    let sum = 0
    for (let i = 0; i < buffer.length; i++) {
      sum += buffer[i] * buffer[i]
    }
    return Math.sqrt(sum / buffer.length)
  }, [])

  /**
   * Check pitch stability
   */
  const checkPitchStability = useCallback((currentNote: string, currentFreq: number): boolean => {
    const history = pitchHistoryRef.current
    const now = performance.now()

    const recentHistory = history.filter(h => now - h.timestamp < configRef.current.STABILITY_WINDOW_MS)

    if (recentHistory.length < configRef.current.MIN_STABLE_DETECTIONS) {
      return false
    }

    for (const entry of recentHistory) {
      if (entry.note !== currentNote) {
        const centsDiff = Math.abs(calculateCentsDifference(entry.frequency, currentFreq))
        if (centsDiff > configRef.current.PITCH_STABILITY_CENTS) {
          return false
        }
      }
    }

    return true
  }, [])

  /**
   * Detect onset - triggers when a new note is played
   */
  const detectOnset = useCallback((currentNote: string, currentVolume: number, isStable: boolean): boolean => {
    const now = performance.now()

    // Cooldown - don't trigger too rapidly
    if (now - lastOnsetTimeRef.current < configRef.current.ONSET_COOLDOWN_MS) {
      // But still track the current note
      if (isStable && currentHeldNoteRef.current !== currentNote) {
        currentHeldNoteRef.current = currentNote
        noteHoldStartRef.current = now
      }
      return false
    }

    // Case 1: Coming out of silence - primary onset trigger
    if (wasInSilenceRef.current && currentVolume > configRef.current.MIN_VOLUME_RMS && isStable) {
      lastOnsetTimeRef.current = now
      wasInSilenceRef.current = false
      currentHeldNoteRef.current = currentNote
      noteHoldStartRef.current = now
      return true
    }

    // Case 2: Note change - different note than what we were holding
    if (isStable && currentHeldNoteRef.current && currentHeldNoteRef.current !== currentNote) {
      const holdDuration = now - noteHoldStartRef.current
      if (holdDuration > configRef.current.NOTE_HOLD_WINDOW_MS) {
        lastOnsetTimeRef.current = now
        currentHeldNoteRef.current = currentNote
        noteHoldStartRef.current = now
        return true
      }
    }

    // Case 3: Volume spike (re-attack of same or new note)
    const volumeJump = currentVolume - lastVolumeRef.current
    if (volumeJump > configRef.current.ONSET_VOLUME_JUMP && isStable) {
      lastOnsetTimeRef.current = now
      currentHeldNoteRef.current = currentNote
      noteHoldStartRef.current = now
      return true
    }

    // Track current note without triggering
    if (isStable && currentHeldNoteRef.current !== currentNote) {
      currentHeldNoteRef.current = currentNote
      noteHoldStartRef.current = now
    }

    return false
  }, [])

  /**
   * Run CREPE inference
   */
  const runCrepeInference = useCallback(async (buffer: Float32Array): Promise<{ frequency: number; confidence: number } | null> => {
    if (!modelRef.current || !tf) return null

    try {
      // Normalize and prepare input
      const normalized = normalizeBuffer(buffer)

      // Create tensor with shape [1, 1024]
      const inputTensor = tf.tensor2d(normalized, [1, CREPE_FRAME_SIZE])

      // Run inference
      const output = modelRef.current.predict(inputTensor) as { data: () => Promise<Float32Array | Int32Array | Uint8Array>; dispose: () => void }

      // Get activations
      const activations = await output.data()

      // Find bin with highest activation
      let maxIndex = 0
      let maxValue = activations[0]
      for (let i = 1; i < activations.length; i++) {
        if (activations[i] > maxValue) {
          maxValue = activations[i]
          maxIndex = i
        }
      }

      // Cleanup tensors
      inputTensor.dispose()
      output.dispose()

      // Convert bin to frequency
      const frequency = binToFrequency(maxIndex)
      const confidence = maxValue

      // Validate frequency range
      if (frequency < CREPE_FMIN || frequency > CREPE_FMAX) {
        return null
      }

      return { frequency, confidence }
    } catch (err) {
      console.error('CREPE inference error:', err)
      return null
    }
  }, [])


  /**
   * Main detection function
   */
  const detectPitch = useCallback(async () => {
    if (!analyserRef.current) return

    const analyser = analyserRef.current
    const buffer = new Float32Array(analyser.fftSize)
    analyser.getFloatTimeDomainData(buffer)

    const now = performance.now()
    const rms = calculateRMS(buffer)

    // Always update volume level regardless of model status
    setVolumeLevel(Math.min(1, rms * 10))

    // Check if model is available for pitch detection (use ref to avoid stale closure)
    if (!modelRef.current || modelStatusRef.current !== 'ready') {
      // Debug: log model status occasionally
      if (Math.random() < 0.01) console.log(`Model not ready: status=${modelStatusRef.current}, model=${!!modelRef.current}`)
      return
    }

    // Silence detection
    if (rms < configRef.current.MIN_VOLUME_RMS) {
      if (!wasInSilenceRef.current) {
        silenceStartRef.current = now
      }
      if (now - silenceStartRef.current > configRef.current.ONSET_SILENCE_MS) {
        wasInSilenceRef.current = true
      }

      setCurrentPitch(null)
      setRawPitch(null)
      setIsSustaining(false)
      lastVolumeRef.current = rms
      return
    }

    // Resample to 16kHz for CREPE
    const sampleRate = audioContextRef.current?.sampleRate || 44100
    const resampled = resampleBuffer(buffer, sampleRate, CREPE_SAMPLE_RATE)

    // Take last CREPE_FRAME_SIZE samples
    const crepeInput = resampled.length >= CREPE_FRAME_SIZE
      ? resampled.slice(-CREPE_FRAME_SIZE)
      : new Float32Array(CREPE_FRAME_SIZE)

    if (resampled.length < CREPE_FRAME_SIZE) {
      crepeInput.set(resampled, CREPE_FRAME_SIZE - resampled.length)
    }

    const result = await runCrepeInference(crepeInput)

    if (!result) {
      // Log occasionally to debug
      if (Math.random() < 0.02) console.log('CREPE returned null result')
      lastVolumeRef.current = rms
      return
    }

    const { frequency, confidence } = result

    // INSTRUMENT-SPECIFIC FILTERING: Skip frequencies outside instrument range
    // This helps filter out harmonics, noise, and sounds from other sources
    if (!isFrequencyInInstrumentRange(frequency, instrumentRef.current)) {
      // Log occasionally for debugging
      if (Math.random() < 0.02) {
        const config = INSTRUMENT_CONFIG[instrumentRef.current]
        console.log(`Frequency ${frequency.toFixed(1)}Hz outside ${instrumentRef.current} range (${config.minFreq}-${config.maxFreq}Hz)`)
      }
      lastVolumeRef.current = rms
      return
    }

    const note = frequencyToNote(frequency)

    // Debug log occasionally
    if (Math.random() < 0.05) {
      console.log(`Pitch detected: ${note} (${frequency.toFixed(1)}Hz) conf: ${confidence.toFixed(2)} [${instrumentRef.current}]`)
    }

    if (!note) {
      lastVolumeRef.current = rms
      return
    }

    // Calculate cents offset
    const perfectFreq = noteToFrequency(note)
    const centsOffset = perfectFreq ? calculateCentsDifference(frequency, perfectFreq) : 0

    // Add to history
    pitchHistoryRef.current.push({ note, frequency, confidence, timestamp: now })
    if (pitchHistoryRef.current.length > configRef.current.HISTORY_SIZE) {
      pitchHistoryRef.current.shift()
    }

    // Calculate average confidence
    const avgConf = pitchHistoryRef.current.reduce((sum, h) => sum + h.confidence, 0) / pitchHistoryRef.current.length
    setAverageConfidence(avgConf)

    // Check stability for onset detection
    const isStable = checkPitchStability(note, frequency)

    // Detect onset (for advancing in melody)
    const isOnset = confidence >= configRef.current.MIN_CONFIDENCE && detectOnset(note, rms, isStable)

    // Create pitch result
    const pitchResult: AIPitchDetectionResult = {
      frequency,
      note,
      confidence,
      centsOffset,
      timestamp: now,
      isOnset
    }

    // Always set raw pitch for debugging
    setRawPitch(pitchResult)

    // Set current pitch if confidence is high enough (filters out speech)
    if (confidence >= configRef.current.MIN_CONFIDENCE) {
      setCurrentPitch(pitchResult)
      setIsSustaining(true)

      if (isStable) {
        lastStablePitchRef.current = note
      }
    }

    lastVolumeRef.current = rms
  }, [calculateRMS, checkPitchStability, detectOnset, runCrepeInference])

  /**
   * Cleanup
   */
  const cleanup = useCallback(() => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current)
      detectionIntervalRef.current = null
    }

    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect()
      scriptProcessorRef.current = null
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
    currentHeldNoteRef.current = null
    noteHoldStartRef.current = 0

    setCurrentPitch(null)
    setRawPitch(null)
    setVolumeLevel(0)
    setAverageConfidence(0)
    setIsSustaining(false)
  }, [])

  /**
   * Start listening
   */
  const startListening = useCallback(async () => {
    if (isListening) return

    setError(null)

    // Load model first if not already loaded
    const modelLoaded = await loadModel()
    if (!modelLoaded) {
      return // Error already set by loadModel
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      })

      setPermission('granted')
      mediaStreamRef.current = stream

      const audioContext = new AudioContext()
      audioContextRef.current = audioContext

      if (audioContext.state === 'suspended') {
        await audioContext.resume()
      }

      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 4096
      analyser.smoothingTimeConstant = 0
      analyserRef.current = analyser

      const source = audioContext.createMediaStreamSource(stream)
      source.connect(analyser)

      // Reset state
      pitchHistoryRef.current = []
      lastStablePitchRef.current = null
      lastOnsetTimeRef.current = 0
      lastVolumeRef.current = 0
      wasInSilenceRef.current = true
      silenceStartRef.current = performance.now()
      currentHeldNoteRef.current = null
      noteHoldStartRef.current = 0

      setIsListening(true)
      detectionIntervalRef.current = window.setInterval(detectPitch, BASE_CONFIG.DETECTION_INTERVAL_MS)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'

      if (errorMessage.includes('Permission denied') || errorMessage.includes('NotAllowedError')) {
        setPermission('denied')
        setError('Microphone access denied.')
      } else if (errorMessage.includes('NotFoundError')) {
        setError('No microphone found.')
        setPermission('error')
      } else {
        setError(`Microphone error: ${errorMessage}`)
        setPermission('error')
      }

      cleanup()
    }
  }, [isListening, detectPitch, cleanup, loadModel])

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
      // Don't dispose model on unmount to allow reuse
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
    modelStatus,
    isModelLoading: modelStatus === 'loading',
    averageConfidence,
    isSustaining,
    setInstrument
  }
}

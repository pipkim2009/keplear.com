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
import { frequencyToNote, noteToFrequency, calculateCentsDifference } from '../utils/pitchUtils'

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

const CONFIG = {
  DETECTION_INTERVAL_MS: 30,
  MIN_VOLUME_RMS: 0.01,
  ONSET_VOLUME_JUMP: 0.08,        // Higher threshold - need significant volume jump
  MIN_CONFIDENCE: 0.5,
  STABILITY_WINDOW_MS: 80,        // Longer stability check window
  MIN_STABLE_DETECTIONS: 3,       // Need more stable detections before confirming
  PITCH_STABILITY_CENTS: 35,
  ONSET_SILENCE_MS: 80,           // Need longer silence before new onset
  ONSET_COOLDOWN_MS: 350,         // Much longer cooldown - prevents rapid triggers
  NOTE_HOLD_WINDOW_MS: 150,       // Time to consider we're "holding" a note
  HISTORY_SIZE: 10,
}

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

export const useAIPitchDetection = (): UseAIPitchDetectionReturn => {
  // State
  const [isListening, setIsListening] = useState(false)
  const [permission, setPermission] = useState<MicrophonePermission>('prompt')
  const [error, setError] = useState<string | null>(null)
  const [currentPitch, setCurrentPitch] = useState<AIPitchDetectionResult | null>(null)
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
    setError(null)

    try {
      // Lazy load TensorFlow.js
      if (!tf) {
        tf = await import('@tensorflow/tfjs')
      }

      // Set TensorFlow.js backend
      await tf.ready()

      // Load the CREPE model from CDN
      modelRef.current = await tf.loadLayersModel(CREPE_MODEL_URL)
      console.log('CREPE model loaded successfully')
      setModelStatus('ready')
      return true
    } catch (err) {
      console.error('Failed to load AI model:', err)
      setError('Failed to load AI pitch detection model. Please check your internet connection and refresh the page.')
      setModelStatus('error')
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

    const recentHistory = history.filter(h => now - h.timestamp < CONFIG.STABILITY_WINDOW_MS)

    if (recentHistory.length < CONFIG.MIN_STABLE_DETECTIONS) {
      return false
    }

    for (const entry of recentHistory) {
      if (entry.note !== currentNote) {
        const centsDiff = Math.abs(calculateCentsDifference(entry.frequency, currentFreq))
        if (centsDiff > CONFIG.PITCH_STABILITY_CENTS) {
          return false
        }
      }
    }

    return true
  }, [])

  /**
   * Detect onset - only triggers when a genuinely new note is played
   */
  const detectOnset = useCallback((currentNote: string, currentVolume: number, isStable: boolean): boolean => {
    const now = performance.now()

    // Strict cooldown - never trigger onsets faster than this
    if (now - lastOnsetTimeRef.current < CONFIG.ONSET_COOLDOWN_MS) {
      return false
    }

    // Only process stable detections
    if (!isStable) {
      return false
    }

    // Case 1: Coming out of silence - this is the primary onset trigger
    if (wasInSilenceRef.current && currentVolume > CONFIG.MIN_VOLUME_RMS * 2) {
      lastOnsetTimeRef.current = now
      wasInSilenceRef.current = false
      currentHeldNoteRef.current = currentNote
      noteHoldStartRef.current = now
      return true
    }

    // Case 2: Significant volume spike (new attack) - must be a substantial jump
    const volumeJump = currentVolume - lastVolumeRef.current
    if (volumeJump > CONFIG.ONSET_VOLUME_JUMP) {
      // Only count as new note if it's actually a different note OR we had a mini-silence
      const timeSinceLastOnset = now - lastOnsetTimeRef.current
      if (timeSinceLastOnset > CONFIG.ONSET_COOLDOWN_MS * 1.5) {
        lastOnsetTimeRef.current = now
        currentHeldNoteRef.current = currentNote
        noteHoldStartRef.current = now
        return true
      }
    }

    // Case 3: Clear pitch change after holding a note for a while
    if (currentHeldNoteRef.current && currentHeldNoteRef.current !== currentNote) {
      const holdDuration = now - noteHoldStartRef.current
      // Only trigger if we've been holding the previous note for a meaningful duration
      if (holdDuration > CONFIG.NOTE_HOLD_WINDOW_MS) {
        lastOnsetTimeRef.current = now
        currentHeldNoteRef.current = currentNote
        noteHoldStartRef.current = now
        return true
      }
    }

    // Update held note tracking (without triggering onset)
    if (currentHeldNoteRef.current !== currentNote) {
      // Note is changing but we haven't held it long enough - just update tracking
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

    // Check if model is available
    if (!modelRef.current || modelStatus !== 'ready') {
      return
    }

    const analyser = analyserRef.current
    const buffer = new Float32Array(analyser.fftSize)
    analyser.getFloatTimeDomainData(buffer)

    const now = performance.now()
    const rms = calculateRMS(buffer)

    setVolumeLevel(Math.min(1, rms * 10))

    // Silence detection
    if (rms < CONFIG.MIN_VOLUME_RMS) {
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
      lastVolumeRef.current = rms
      return
    }

    const { frequency, confidence } = result
    const note = frequencyToNote(frequency)

    if (!note) {
      lastVolumeRef.current = rms
      return
    }

    // Calculate cents offset
    const perfectFreq = noteToFrequency(note)
    const centsOffset = perfectFreq ? calculateCentsDifference(frequency, perfectFreq) : 0

    // Add to history
    pitchHistoryRef.current.push({ note, frequency, confidence, timestamp: now })
    if (pitchHistoryRef.current.length > CONFIG.HISTORY_SIZE) {
      pitchHistoryRef.current.shift()
    }

    // Calculate average confidence
    const avgConf = pitchHistoryRef.current.reduce((sum, h) => sum + h.confidence, 0) / pitchHistoryRef.current.length
    setAverageConfidence(avgConf)

    // Raw pitch for visualization
    const rawResult: AIPitchDetectionResult = {
      frequency,
      note,
      confidence,
      centsOffset,
      timestamp: now,
      isOnset: false
    }
    setRawPitch(rawResult)

    // Check stability
    const isStable = checkPitchStability(note, frequency)

    if (confidence < CONFIG.MIN_CONFIDENCE) {
      lastVolumeRef.current = rms
      return
    }

    if (isStable) {
      const isOnset = detectOnset(note, rms, isStable)

      const stableResult: AIPitchDetectionResult = {
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
  }, [modelStatus, calculateRMS, checkPitchStability, detectOnset, runCrepeInference])

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
      detectionIntervalRef.current = window.setInterval(detectPitch, CONFIG.DETECTION_INTERVAL_MS)
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
    isSustaining
  }
}

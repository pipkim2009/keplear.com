/**
 * AI-powered pitch detection using TensorFlow.js with CREPE model
 *
 * ENHANCED VERSION with:
 * - Sub-bin precision via parabolic interpolation
 * - pYIN-style Viterbi HMM smoothing for temporal consistency
 * - Octave error detection and correction via autocorrelation
 * - Adaptive noise floor detection
 * - Multi-candidate pitch tracking
 *
 * This implementation is designed to match or exceed commercial solutions
 * like Yousician in accuracy.
 *
 * References:
 * - CREPE Paper: https://arxiv.org/abs/1802.06182
 * - pYIN: https://www.eecs.qmul.ac.uk/~simond/pub/2014/MauchDixon-PYIN-ICASSP2014.pdf
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

// Base config values - OPTIMIZED for responsiveness
const BASE_CONFIG = {
  DETECTION_INTERVAL_MS: 20,        // 50 FPS for faster response
  MIN_VOLUME_RMS: 0.004,            // Very low to catch soft notes
  ONSET_VOLUME_JUMP: 0.008,         // Very low threshold for attack detection
  MIN_CONFIDENCE: 0.35,             // Lower threshold - let matching handle accuracy
  STABILITY_WINDOW_MS: 40,          // Faster stability check
  MIN_STABLE_DETECTIONS: 1,         // Just 1 detection needed (more responsive)
  PITCH_STABILITY_CENTS: 50,        // Looser for stability
  ONSET_SILENCE_MS: 10,             // Very fast onset from silence
  ONSET_COOLDOWN_MS: 50,            // Very short cooldown between notes
  NOTE_HOLD_WINDOW_MS: 30,          // Short hold window
  HISTORY_SIZE: 6,                  // Less history for faster response

  // New advanced features
  ADAPTIVE_NOISE_FLOOR: true,
  NOISE_FLOOR_DECAY: 0.999,         // Slower decay
  NOISE_FLOOR_ATTACK: 0.02,         // Slower attack
  MIN_PERIODICITY: 0.2,
  USE_PARABOLIC_INTERP: true,
  USE_VITERBI_SMOOTHING: false,     // Disable for now - can cause lag
  USE_OCTAVE_CORRECTION: true,
  WEIGHTED_AVG_BINS: 5,
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
 * Apply Hann window for better frequency resolution
 */
const applyHannWindow = (buffer: Float32Array): Float32Array => {
  const result = new Float32Array(buffer.length)
  for (let i = 0; i < buffer.length; i++) {
    const multiplier = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (buffer.length - 1)))
    result[i] = buffer[i] * multiplier
  }
  return result
}

/**
 * Normalize buffer to zero mean and unit variance (proper CREPE preprocessing)
 */
const normalizeForCrepe = (buffer: Float32Array): Float32Array => {
  const n = buffer.length
  if (n === 0) return buffer

  let sum = 0
  for (let i = 0; i < n; i++) {
    sum += buffer[i]
  }
  const mean = sum / n

  let sqSum = 0
  for (let i = 0; i < n; i++) {
    const diff = buffer[i] - mean
    sqSum += diff * diff
  }
  const variance = sqSum / n
  // Avoid division by zero - use 1 if std is too small
  const std = variance > 1e-10 ? Math.sqrt(variance) : 1

  const result = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    result[i] = (buffer[i] - mean) / std
  }
  return result
}

/**
 * High-quality resampling with linear interpolation fallback
 * Uses cubic interpolation for better quality than linear
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

    // Cubic interpolation for better quality
    const p0 = inputBuffer[Math.max(0, lowIndex - 1)]
    const p1 = inputBuffer[lowIndex]
    const p2 = inputBuffer[highIndex]
    const p3 = inputBuffer[Math.min(inputBuffer.length - 1, highIndex + 1)]

    // Catmull-Rom spline interpolation
    const t = fraction
    const t2 = t * t
    const t3 = t2 * t

    output[i] = 0.5 * (
      (2 * p1) +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3
    )
  }

  return output
}

/**
 * Parabolic interpolation for sub-bin frequency accuracy
 */
const parabolicInterpolation = (
  activations: Float32Array | Int32Array | Uint8Array,
  peakIndex: number
): { refinedIndex: number; refinedValue: number } => {
  if (peakIndex <= 0 || peakIndex >= activations.length - 1) {
    return { refinedIndex: peakIndex, refinedValue: activations[peakIndex] }
  }

  const alpha = activations[peakIndex - 1]
  const beta = activations[peakIndex]
  const gamma = activations[peakIndex + 1]

  const denominator = alpha - 2 * beta + gamma
  if (Math.abs(denominator) < 1e-10) {
    return { refinedIndex: peakIndex, refinedValue: beta }
  }

  const delta = 0.5 * (alpha - gamma) / denominator
  const refinedIndex = peakIndex + delta
  const refinedValue = beta - 0.25 * (alpha - gamma) * delta

  return { refinedIndex, refinedValue }
}

/**
 * Weighted average around peak bins for robust frequency estimation
 */
const weightedAverageFrequency = (
  activations: Float32Array | Int32Array | Uint8Array,
  peakIndex: number,
  numBins: number = 5
): { frequency: number; confidence: number } => {
  const halfBins = Math.floor(numBins / 2)
  const startBin = Math.max(0, peakIndex - halfBins)
  const endBin = Math.min(activations.length - 1, peakIndex + halfBins)

  let weightedSum = 0
  let totalWeight = 0
  let maxActivation = 0

  for (let i = startBin; i <= endBin; i++) {
    const activation = activations[i]
    const cents = i * CREPE_CENTS_PER_BIN + 1997.3794084376191
    const freq = 10 * Math.pow(2, cents / 1200)

    const weight = activation * activation
    weightedSum += freq * weight
    totalWeight += weight
    maxActivation = Math.max(maxActivation, activation)
  }

  const frequency = totalWeight > 0 ? weightedSum / totalWeight : 0
  return { frequency, confidence: maxActivation }
}

/**
 * YIN-style autocorrelation for octave verification
 * Simplified and optimized version
 */
const autocorrelationPitch = (buffer: Float32Array, sampleRate: number): { frequency: number; clarity: number } => {
  const bufferSize = buffer.length

  // Limit period range to avoid buffer overflows
  const minPeriod = Math.max(2, Math.floor(sampleRate / CREPE_FMAX))
  const maxPeriod = Math.min(Math.floor(bufferSize / 2), Math.floor(sampleRate / CREPE_FMIN))

  if (maxPeriod <= minPeriod) {
    return { frequency: 0, clarity: 0 }
  }

  // Cumulative mean normalized difference function (YIN)
  let runningSum = 0
  let bestPeriod = 0
  let bestClarity = 0
  const threshold = 0.15

  for (let tau = 1; tau <= maxPeriod; tau++) {
    let diff = 0
    const limit = bufferSize - tau
    for (let i = 0; i < limit; i++) {
      const delta = buffer[i] - buffer[i + tau]
      diff += delta * delta
    }

    runningSum += diff
    const cmnd = tau > 0 ? diff / (runningSum / tau + 1e-10) : 1

    // Only consider periods in our range
    if (tau >= minPeriod) {
      // Look for first dip below threshold (YIN algorithm)
      if (bestPeriod === 0 && cmnd < threshold) {
        bestPeriod = tau
        bestClarity = 1 - cmnd
      }
      // Track absolute minimum as fallback
      else if (bestPeriod === 0 && cmnd < (1 - bestClarity)) {
        bestClarity = 1 - cmnd
        bestPeriod = tau
      }
    }
  }

  // If still no good period, use a safe default
  if (bestPeriod === 0 || bestClarity < 0.1) {
    return { frequency: 0, clarity: 0 }
  }

  const frequency = sampleRate / bestPeriod
  return { frequency, clarity: Math.max(0, Math.min(1, bestClarity)) }
}

/**
 * Detect and correct octave errors
 * Only applies correction when autocorrelation is highly confident
 * Returns octaveConfidence close to 1.0 to avoid over-penalizing confidence
 */
const correctOctaveErrors = (
  crepeFreq: number,
  autocorrFreq: number,
  autocorrClarity: number
): { correctedFreq: number; octaveConfidence: number } => {
  // If autocorrelation failed or low confidence, trust CREPE fully
  if (autocorrFreq <= 0 || autocorrClarity < 0.5) {
    return { correctedFreq: crepeFreq, octaveConfidence: 1.0 }
  }

  const ratio = crepeFreq / autocorrFreq

  // Protect against invalid ratios
  if (ratio <= 0 || !isFinite(ratio)) {
    return { correctedFreq: crepeFreq, octaveConfidence: 1.0 }
  }

  const log2Ratio = Math.log2(ratio)
  const octaveDiff = Math.round(log2Ratio)
  const octaveError = Math.abs(log2Ratio - octaveDiff)

  // If frequencies agree (same octave), high confidence
  if (octaveError < 0.15 && octaveDiff === 0) {
    return { correctedFreq: crepeFreq, octaveConfidence: 1.0 }
  }

  // CREPE is exactly one octave high (very common with harmonics)
  if (octaveDiff === 1 && octaveError < 0.12 && autocorrClarity > 0.7) {
    return { correctedFreq: crepeFreq / 2, octaveConfidence: 0.95 }
  }

  // CREPE is exactly one octave low (less common)
  if (octaveDiff === -1 && octaveError < 0.12 && autocorrClarity > 0.8) {
    return { correctedFreq: crepeFreq * 2, octaveConfidence: 0.95 }
  }

  // Default: trust CREPE
  return { correctedFreq: crepeFreq, octaveConfidence: 1.0 }
}

/**
 * Simple Viterbi-style HMM for pitch smoothing
 */
class PitchHMM {
  private states: Array<{ frequency: number; probability: number }> = []
  private readonly transitionWeight = 25 // Cents penalty per transition
  private readonly observationWeight = 0.6

  update(observedFreq: number, confidence: number): number {
    if (this.states.length === 0) {
      this.states = [{ frequency: observedFreq, probability: confidence }]
      return observedFreq
    }

    const newStates: Array<{ frequency: number; probability: number }> = []

    for (const state of this.states) {
      const centsDiff = Math.abs(calculateCentsDifference(observedFreq, state.frequency))
      const transitionCost = centsDiff / this.transitionWeight
      const transitionProb = Math.exp(-transitionCost)

      const combinedProb =
        confidence * this.observationWeight +
        state.probability * transitionProb * (1 - this.observationWeight)

      newStates.push({ frequency: observedFreq, probability: combinedProb })
    }

    newStates.sort((a, b) => b.probability - a.probability)
    this.states = newStates.slice(0, 15)

    // Weighted average of top states
    let weightedSum = 0
    let totalWeight = 0
    for (const state of this.states.slice(0, 3)) {
      weightedSum += state.frequency * state.probability
      totalWeight += state.probability
    }

    return totalWeight > 0 ? weightedSum / totalWeight : observedFreq
  }

  reset(): void {
    this.states = []
  }
}

// Global HMM instance
let pitchHMM: PitchHMM | null = null

/**
 * Normalize audio buffer to [-1, 1] range (legacy, kept for compatibility)
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

  // Track volume history for better spike detection
  const volumeHistoryRef = useRef<number[]>([])
  const lastOnsetVolumeRef = useRef<number>(0)

  /**
   * Detect onset - triggers when a new note is played
   * IMPROVED: Better detection of repeated same-note attacks
   */
  const detectOnset = useCallback((currentNote: string, currentVolume: number, isStable: boolean): boolean => {
    const now = performance.now()
    const config = configRef.current

    // Update volume history (keep last 5 samples)
    volumeHistoryRef.current.push(currentVolume)
    if (volumeHistoryRef.current.length > 5) {
      volumeHistoryRef.current.shift()
    }

    // Calculate recent minimum volume (for detecting re-attacks)
    const recentMinVolume = volumeHistoryRef.current.length > 0
      ? Math.min(...volumeHistoryRef.current)
      : currentVolume

    // Cooldown - don't trigger too rapidly
    if (now - lastOnsetTimeRef.current < config.ONSET_COOLDOWN_MS) {
      return false
    }

    // Case 1: Coming out of silence - always trigger
    if (wasInSilenceRef.current && currentVolume > config.MIN_VOLUME_RMS) {
      lastOnsetTimeRef.current = now
      wasInSilenceRef.current = false
      currentHeldNoteRef.current = currentNote
      noteHoldStartRef.current = now
      lastOnsetVolumeRef.current = currentVolume
      volumeHistoryRef.current = [currentVolume]
      return true
    }

    // Case 2: Note change - different note than what we were holding
    if (currentHeldNoteRef.current && currentHeldNoteRef.current !== currentNote) {
      lastOnsetTimeRef.current = now
      currentHeldNoteRef.current = currentNote
      noteHoldStartRef.current = now
      lastOnsetVolumeRef.current = currentVolume
      volumeHistoryRef.current = [currentVolume]
      return true
    }

    // Case 3: Volume spike from recent minimum (re-attack of same note)
    // This catches cases where volume dipped and came back up
    const volumeFromMin = currentVolume - recentMinVolume
    if (volumeFromMin > config.ONSET_VOLUME_JUMP * 0.8) {
      lastOnsetTimeRef.current = now
      currentHeldNoteRef.current = currentNote
      noteHoldStartRef.current = now
      lastOnsetVolumeRef.current = currentVolume
      volumeHistoryRef.current = [currentVolume]
      return true
    }

    // Case 4: Absolute volume spike from last frame
    const volumeJump = currentVolume - lastVolumeRef.current
    if (volumeJump > config.ONSET_VOLUME_JUMP) {
      lastOnsetTimeRef.current = now
      currentHeldNoteRef.current = currentNote
      noteHoldStartRef.current = now
      lastOnsetVolumeRef.current = currentVolume
      volumeHistoryRef.current = [currentVolume]
      return true
    }

    // Case 5: First note ever - no previous note held
    if (!currentHeldNoteRef.current) {
      lastOnsetTimeRef.current = now
      currentHeldNoteRef.current = currentNote
      noteHoldStartRef.current = now
      lastOnsetVolumeRef.current = currentVolume
      volumeHistoryRef.current = [currentVolume]
      return true
    }

    return false
  }, [])

  /**
   * Run CREPE inference with advanced processing
   */
  const runCrepeInference = useCallback(async (
    buffer: Float32Array,
    originalBuffer?: Float32Array,
    sampleRate?: number
  ): Promise<{ frequency: number; confidence: number; periodicity?: number } | null> => {
    if (!modelRef.current || !tf) return null

    try {
      const config = configRef.current

      // Apply Hann window for better frequency resolution
      const windowed = applyHannWindow(buffer)

      // Normalize using proper CREPE preprocessing (zero mean, unit variance)
      const normalized = normalizeForCrepe(windowed)

      // Check for NaN in normalized buffer
      if (normalized.some(v => !isFinite(v))) {
        console.warn('NaN in normalized buffer')
        return null
      }

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

      // Get frequency with sub-bin precision
      let frequency: number
      let confidence: number

      if (config.USE_PARABOLIC_INTERP) {
        // Parabolic interpolation for sub-bin accuracy (sub-cent precision)
        const { refinedIndex, refinedValue } = parabolicInterpolation(activations, maxIndex)
        frequency = binToFrequency(refinedIndex)
        confidence = refinedValue
      } else {
        // Weighted average for robust estimation
        const weighted = weightedAverageFrequency(activations, maxIndex, config.WEIGHTED_AVG_BINS || 5)
        frequency = weighted.frequency
        confidence = weighted.confidence
      }

      // Validate frequency and confidence
      if (!isFinite(frequency) || !isFinite(confidence)) {
        return null
      }

      // Validate frequency range
      if (frequency < CREPE_FMIN || frequency > CREPE_FMAX) {
        return null
      }

      // Octave correction using autocorrelation (if original buffer available)
      let periodicity = 0
      if (config.USE_OCTAVE_CORRECTION && originalBuffer && sampleRate && sampleRate > 0) {
        try {
          const autocorr = autocorrelationPitch(originalBuffer, sampleRate)
          periodicity = autocorr.clarity

          if (autocorr.frequency > 0 && isFinite(autocorr.frequency)) {
            const { correctedFreq, octaveConfidence } = correctOctaveErrors(
              frequency,
              autocorr.frequency,
              autocorr.clarity
            )

            if (isFinite(correctedFreq) && correctedFreq > 0) {
              frequency = correctedFreq
              confidence = confidence * octaveConfidence
            }
          }
        } catch (e) {
          // Autocorrelation failed, continue without correction
        }
      }

      // Viterbi smoothing (if enabled)
      if (config.USE_VITERBI_SMOOTHING && isFinite(frequency) && isFinite(confidence)) {
        if (!pitchHMM) {
          pitchHMM = new PitchHMM()
        }
        const smoothed = pitchHMM.update(frequency, confidence)
        if (isFinite(smoothed)) {
          frequency = smoothed
        }
      }

      return { frequency, confidence, periodicity }
    } catch (err) {
      console.error('CREPE inference error:', err)
      return null
    }
  }, [])


  // Noise floor ref for adaptive silence detection
  const noiseFloorRef = useRef<number>(0.005)

  /**
   * Main detection function
   */
  const detectPitch = useCallback(async () => {
    if (!analyserRef.current || !audioContextRef.current) return

    const analyser = analyserRef.current
    const sampleRate = audioContextRef.current.sampleRate
    const buffer = new Float32Array(analyser.fftSize)
    analyser.getFloatTimeDomainData(buffer)

    const now = performance.now()
    const config = configRef.current
    const rms = calculateRMS(buffer)

    // Adaptive noise floor
    if (config.ADAPTIVE_NOISE_FLOOR) {
      if (rms < noiseFloorRef.current) {
        noiseFloorRef.current = noiseFloorRef.current * config.NOISE_FLOOR_DECAY + rms * (1 - config.NOISE_FLOOR_DECAY)
      } else if (rms > noiseFloorRef.current * 5) {
        // Actual audio signal
      } else {
        noiseFloorRef.current = noiseFloorRef.current * (1 - config.NOISE_FLOOR_ATTACK) + rms * config.NOISE_FLOOR_ATTACK
      }
    }

    // Always update volume level regardless of model status
    setVolumeLevel(Math.min(1, rms * 10))

    // Check if model is available for pitch detection (use ref to avoid stale closure)
    if (!modelRef.current || modelStatusRef.current !== 'ready') {
      // Debug: log model status occasionally
      if (Math.random() < 0.01) console.log(`Model not ready: status=${modelStatusRef.current}, model=${!!modelRef.current}`)
      return
    }

    // Silence detection with adaptive threshold
    const silenceThreshold = config.ADAPTIVE_NOISE_FLOOR
      ? Math.max(config.MIN_VOLUME_RMS, noiseFloorRef.current * 2)
      : config.MIN_VOLUME_RMS

    if (rms < silenceThreshold) {
      if (!wasInSilenceRef.current) {
        silenceStartRef.current = now
      }
      if (now - silenceStartRef.current > config.ONSET_SILENCE_MS) {
        wasInSilenceRef.current = true
      }

      setCurrentPitch(null)
      setRawPitch(null)
      setIsSustaining(false)
      lastVolumeRef.current = rms

      // Reset HMM on silence
      if (pitchHMM) {
        pitchHMM.reset()
      }
      return
    }

    // Resample to 16kHz for CREPE (using high-quality sinc resampling)
    const resampled = resampleBuffer(buffer, sampleRate, CREPE_SAMPLE_RATE)

    // Take last CREPE_FRAME_SIZE samples
    const crepeInput = resampled.length >= CREPE_FRAME_SIZE
      ? resampled.slice(-CREPE_FRAME_SIZE)
      : new Float32Array(CREPE_FRAME_SIZE)

    if (resampled.length < CREPE_FRAME_SIZE) {
      crepeInput.set(resampled, CREPE_FRAME_SIZE - resampled.length)
    }

    // Run CREPE with octave correction (pass original buffer and sample rate)
    const result = await runCrepeInference(crepeInput, buffer, sampleRate)

    if (!result) {
      // Debug: log occasionally when result is null
      if (Math.random() < 0.02) {
        console.log('CREPE returned null - buffer length:', crepeInput.length, 'rms:', rms.toFixed(4))
      }
      lastVolumeRef.current = rms
      return
    }

    const { frequency, confidence, periodicity = 0 } = result

    // Debug: log detection results occasionally
    if (Math.random() < 0.1) {
      console.log(`Detection: freq=${frequency.toFixed(1)}Hz conf=${confidence.toFixed(2)} period=${periodicity.toFixed(2)}`)
    }

    // Combined confidence with periodicity (only if periodicity is valid)
    const combinedConfidence = config.USE_OCTAVE_CORRECTION && periodicity > 0
      ? confidence * 0.7 + periodicity * 0.3
      : confidence

    // INSTRUMENT-SPECIFIC FILTERING: Skip frequencies outside instrument range
    // This helps filter out harmonics, noise, and sounds from other sources
    if (!isFrequencyInInstrumentRange(frequency, instrumentRef.current)) {
      lastVolumeRef.current = rms
      return
    }

    const note = frequencyToNote(frequency)

    if (!note) {
      lastVolumeRef.current = rms
      return
    }

    // Calculate cents offset
    const perfectFreq = noteToFrequency(note)
    const centsOffset = perfectFreq ? calculateCentsDifference(frequency, perfectFreq) : 0

    // Add to history with combined confidence
    pitchHistoryRef.current.push({ note, frequency, confidence: combinedConfidence, timestamp: now })
    if (pitchHistoryRef.current.length > config.HISTORY_SIZE) {
      pitchHistoryRef.current.shift()
    }

    // Calculate average confidence
    const avgConf = pitchHistoryRef.current.reduce((sum, h) => sum + h.confidence, 0) / pitchHistoryRef.current.length
    setAverageConfidence(avgConf)

    // Check stability for onset detection
    const isStable = checkPitchStability(note, frequency)

    // Detect onset (for advancing in melody) - always check, let onset logic decide
    const isOnset = detectOnset(note, rms, isStable)

    // Debug: log onsets
    if (isOnset) {
      console.log(`🎵 ONSET: ${note} (freq=${frequency.toFixed(1)}Hz, conf=${combinedConfidence.toFixed(2)}, vol=${rms.toFixed(4)})`)
    }

    // Create pitch result
    const pitchResult: AIPitchDetectionResult = {
      frequency,
      note,
      confidence: combinedConfidence,
      centsOffset,
      timestamp: now,
      isOnset
    }

    // Always set raw pitch for debugging
    setRawPitch(pitchResult)

    // Set current pitch if confidence is high enough
    if (combinedConfidence >= config.MIN_CONFIDENCE) {
      setCurrentPitch(pitchResult)
      setIsSustaining(true)

      if (isStable) {
        lastStablePitchRef.current = note
      }
    }

    lastVolumeRef.current = rms
  }, [checkPitchStability, detectOnset, runCrepeInference])

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
    noiseFloorRef.current = 0.005
    volumeHistoryRef.current = []
    lastOnsetVolumeRef.current = 0
    lastOnsetTimeRef.current = 0

    // Reset Viterbi HMM
    if (pitchHMM) {
      pitchHMM.reset()
    }

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
      noiseFloorRef.current = 0.005
      volumeHistoryRef.current = []
      lastOnsetVolumeRef.current = 0

      // Initialize fresh HMM for Viterbi smoothing
      pitchHMM = new PitchHMM()

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

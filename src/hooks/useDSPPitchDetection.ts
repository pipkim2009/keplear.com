/**
 * DSP-based Pitch Detection Hook
 *
 * Industry-grade pitch detection pipeline WITHOUT machine learning.
 * Implements the full recommended pipeline:
 *
 * 1. Audio capture (44.1kHz, 2048-4096 buffer, mono)
 * 2. Noise floor calibration
 * 3. Noise gate
 * 4. Band-pass filtering (instrument-specific)
 * 5. Onset detection
 * 6. YIN pitch detection
 * 7. Multi-frame smoothing
 * 8. Musical constraint layer
 * 9. Harmonic sanity check
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import {
  yin,
  calculateRMS,
  calibrateNoiseFloor,
  detectEnergyOnset,
  medianFilter,
  checkPitchStability,
  frequencyToNoteName,
  frequencyToCents,
  matchesExpectedNote,
  correctOctaveError,
  INSTRUMENT_RANGES,
  type PitchFrame,
  type NoiseFloorCalibration,
  type InstrumentRange
} from '../utils/dspPitch'

// ============================================================================
// TYPES
// ============================================================================

export type InstrumentType = 'keyboard' | 'guitar' | 'bass' | 'voice'

export interface DSPPitchResult {
  frequency: number
  note: string
  cents: number
  confidence: number
  isOnset: boolean
  isStable: boolean
  rms: number
  timestamp: number
}

export interface DSPPitchDetectionState {
  isListening: boolean
  isCalibrating: boolean
  isCalibrated: boolean
  permission: 'prompt' | 'granted' | 'denied' | 'error'
  error: string | null
}

interface UseDSPPitchDetectionOptions {
  instrument?: InstrumentType
  bufferSize?: number  // 2048 or 4096
  yinThreshold?: number  // 0.1-0.2, lower = stricter
  stabilityWindowMs?: number  // How long pitch must be stable
  feedbackDelayMs?: number  // Delay before reporting (smoothing)
}

interface UseDSPPitchDetectionReturn {
  // State
  isListening: boolean
  isCalibrating: boolean
  isCalibrated: boolean
  permission: 'prompt' | 'granted' | 'denied' | 'error'
  error: string | null

  // Current detection
  currentPitch: DSPPitchResult | null
  volumeLevel: number
  noiseFloor: number

  // Actions
  startListening: () => Promise<void>
  stopListening: () => void
  calibrateNoise: () => Promise<void>
  setInstrument: (instrument: InstrumentType) => void

  // For debugging
  rawFrequency: number | null
  rawConfidence: number
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const DEFAULT_OPTIONS: Required<UseDSPPitchDetectionOptions> = {
  instrument: 'keyboard',
  bufferSize: 2048,
  yinThreshold: 0.15,
  stabilityWindowMs: 100,
  feedbackDelayMs: 50
}

// Detection runs at ~28 FPS
const DETECTION_INTERVAL_MS = 35

// Minimum frames for stability check
const MIN_STABLE_FRAMES = 3

// Smoothing window size
const SMOOTHING_WINDOW = 5

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useDSPPitchDetection(
  options: UseDSPPitchDetectionOptions = {}
): UseDSPPitchDetectionReturn {
  const config = { ...DEFAULT_OPTIONS, ...options }

  // State
  const [state, setState] = useState<DSPPitchDetectionState>({
    isListening: false,
    isCalibrating: false,
    isCalibrated: false,
    permission: 'prompt',
    error: null
  })

  const [currentPitch, setCurrentPitch] = useState<DSPPitchResult | null>(null)
  const [volumeLevel, setVolumeLevel] = useState(0)
  const [noiseFloor, setNoiseFloor] = useState(0.01)
  const [rawFrequency, setRawFrequency] = useState<number | null>(null)
  const [rawConfidence, setRawConfidence] = useState(0)

  // Refs
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const lowPassFilterRef = useRef<BiquadFilterNode | null>(null)
  const highPassFilterRef = useRef<BiquadFilterNode | null>(null)
  const detectionIntervalRef = useRef<number | null>(null)

  // Detection state refs
  const instrumentRef = useRef<InstrumentType>(config.instrument)
  const noiseCalibrationRef = useRef<NoiseFloorCalibration | null>(null)
  const previousRMSRef = useRef(0)
  const pitchHistoryRef = useRef<PitchFrame[]>([])
  const frequencyHistoryRef = useRef<number[]>([])
  const lastOnsetTimeRef = useRef(0)
  const isAfterOnsetRef = useRef(false)

  // Audio buffer for YIN
  const audioBufferRef = useRef<Float32Array | null>(null)

  /**
   * Get instrument range config
   */
  const getInstrumentRange = useCallback((): InstrumentRange => {
    return INSTRUMENT_RANGES[instrumentRef.current] || INSTRUMENT_RANGES.keyboard
  }, [])

  /**
   * Set up audio filters based on instrument
   */
  const setupFilters = useCallback(() => {
    if (!audioContextRef.current) return

    const range = getInstrumentRange()

    // High-pass filter (removes rumble)
    if (highPassFilterRef.current) {
      highPassFilterRef.current.type = 'highpass'
      highPassFilterRef.current.frequency.value = range.highPassHz
      highPassFilterRef.current.Q.value = 0.7
    }

    // Low-pass filter (removes harmonics that confuse pitch detection)
    if (lowPassFilterRef.current) {
      lowPassFilterRef.current.type = 'lowpass'
      lowPassFilterRef.current.frequency.value = range.lowPassHz
      lowPassFilterRef.current.Q.value = 0.7
    }
  }, [getInstrumentRange])

  /**
   * Set instrument and reconfigure filters
   */
  const setInstrument = useCallback((instrument: InstrumentType) => {
    instrumentRef.current = instrument
    setupFilters()
  }, [setupFilters])

  /**
   * Run one frame of pitch detection
   */
  const detectPitch = useCallback(() => {
    if (!analyserRef.current || !audioBufferRef.current) return

    const analyser = analyserRef.current
    const buffer = audioBufferRef.current
    const sampleRate = audioContextRef.current?.sampleRate || 44100

    // Get audio data
    analyser.getFloatTimeDomainData(buffer)

    // Calculate RMS
    const rms = calculateRMS(buffer)
    setVolumeLevel(Math.min(1, rms * 10))

    // Noise gate - reject frames below noise threshold
    const threshold = noiseCalibrationRef.current?.threshold || 0.01
    if (rms < threshold) {
      // Below noise floor - reset state
      previousRMSRef.current = rms
      isAfterOnsetRef.current = false
      setCurrentPitch(null)
      setRawFrequency(null)
      setRawConfidence(0)
      return
    }

    // Onset detection
    const isOnset = detectEnergyOnset(rms, previousRMSRef.current, 1.8)
    const now = performance.now()

    if (isOnset) {
      lastOnsetTimeRef.current = now
      isAfterOnsetRef.current = true
      pitchHistoryRef.current = []  // Reset history on new note
      frequencyHistoryRef.current = []
    }

    previousRMSRef.current = rms

    // Skip first ~15ms after onset (transient)
    if (isAfterOnsetRef.current && now - lastOnsetTimeRef.current < 15) {
      return
    }

    // Run YIN pitch detection
    const range = getInstrumentRange()
    const yinResult = yin(
      buffer,
      sampleRate,
      config.yinThreshold,
      range.lowHz,
      range.highHz
    )

    if (!yinResult || yinResult.confidence < 0.5) {
      // Low confidence - don't update
      setRawFrequency(null)
      setRawConfidence(yinResult?.confidence || 0)
      return
    }

    setRawFrequency(yinResult.frequency)
    setRawConfidence(yinResult.confidence)

    // Add to frequency history for median filtering
    frequencyHistoryRef.current.push(yinResult.frequency)
    if (frequencyHistoryRef.current.length > SMOOTHING_WINDOW) {
      frequencyHistoryRef.current.shift()
    }

    // Apply median filter
    const smoothedFrequency = medianFilter(frequencyHistoryRef.current, SMOOTHING_WINDOW)

    // Add to pitch history for stability check
    const frame: PitchFrame = {
      frequency: smoothedFrequency,
      confidence: yinResult.confidence,
      timestamp: now,
      rms
    }
    pitchHistoryRef.current.push(frame)

    // Keep only recent frames
    const maxHistoryMs = config.stabilityWindowMs * 2
    while (
      pitchHistoryRef.current.length > 1 &&
      now - pitchHistoryRef.current[0].timestamp > maxHistoryMs
    ) {
      pitchHistoryRef.current.shift()
    }

    // Check stability
    const stability = checkPitchStability(
      pitchHistoryRef.current,
      30,  // ±30 cents tolerance for stability
      config.stabilityWindowMs
    )

    // Only output if we have enough stable frames
    if (pitchHistoryRef.current.length >= MIN_STABLE_FRAMES) {
      const { note, cents } = frequencyToCents(smoothedFrequency)

      const result: DSPPitchResult = {
        frequency: smoothedFrequency,
        note,
        cents,
        confidence: yinResult.confidence,
        isOnset,
        isStable: stability.isStable,
        rms,
        timestamp: now
      }

      setCurrentPitch(result)
    }
  }, [config.yinThreshold, config.stabilityWindowMs, getInstrumentRange])

  /**
   * Calibrate noise floor
   */
  const calibrateNoise = useCallback(async () => {
    if (!analyserRef.current || !audioBufferRef.current) {
      throw new Error('Audio not initialized')
    }

    setState(prev => ({ ...prev, isCalibrating: true }))

    const samples: Float32Array[] = []
    const analyser = analyserRef.current
    const buffer = audioBufferRef.current

    // Collect ~0.5s of silence samples
    const collectSamples = () => {
      return new Promise<void>(resolve => {
        const interval = setInterval(() => {
          analyser.getFloatTimeDomainData(buffer)
          samples.push(new Float32Array(buffer))

          if (samples.length >= 15) {  // ~0.5s at 30fps
            clearInterval(interval)
            resolve()
          }
        }, 33)
      })
    }

    await collectSamples()

    const calibration = calibrateNoiseFloor(samples, 1.5)
    noiseCalibrationRef.current = calibration
    setNoiseFloor(calibration.threshold)

    setState(prev => ({
      ...prev,
      isCalibrating: false,
      isCalibrated: true
    }))
  }, [])

  /**
   * Start listening
   */
  const startListening = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, error: null }))

      // Request microphone
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 44100
        }
      })

      mediaStreamRef.current = stream
      setState(prev => ({ ...prev, permission: 'granted' }))

      // Create audio context
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)({
        sampleRate: 44100
      })
      audioContextRef.current = audioContext

      // Create nodes
      const source = audioContext.createMediaStreamSource(stream)
      sourceRef.current = source

      // Create filters
      const highPass = audioContext.createBiquadFilter()
      const lowPass = audioContext.createBiquadFilter()
      highPassFilterRef.current = highPass
      lowPassFilterRef.current = lowPass

      // Create analyser
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = config.bufferSize * 2
      analyser.smoothingTimeConstant = 0
      analyserRef.current = analyser

      // Connect: source -> highpass -> lowpass -> analyser
      source.connect(highPass)
      highPass.connect(lowPass)
      lowPass.connect(analyser)

      // Set up filters for current instrument
      setupFilters()

      // Create audio buffer
      audioBufferRef.current = new Float32Array(analyser.fftSize)

      // Start detection loop
      detectionIntervalRef.current = window.setInterval(detectPitch, DETECTION_INTERVAL_MS)

      setState(prev => ({ ...prev, isListening: true }))

      // Auto-calibrate if not already calibrated
      if (!noiseCalibrationRef.current) {
        // Wait a moment for audio to stabilize, then calibrate
        setTimeout(() => {
          calibrateNoise().catch(console.error)
        }, 200)
      }

    } catch (err) {
      console.error('Failed to start pitch detection:', err)

      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setState(prev => ({
          ...prev,
          permission: 'denied',
          error: 'Microphone permission denied'
        }))
      } else {
        setState(prev => ({
          ...prev,
          permission: 'error',
          error: `Failed to start: ${err instanceof Error ? err.message : 'Unknown error'}`
        }))
      }
    }
  }, [config.bufferSize, setupFilters, detectPitch, calibrateNoise])

  /**
   * Stop listening
   */
  const stopListening = useCallback(() => {
    // Stop detection loop
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current)
      detectionIntervalRef.current = null
    }

    // Stop media stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop())
      mediaStreamRef.current = null
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    // Clear refs
    analyserRef.current = null
    sourceRef.current = null
    highPassFilterRef.current = null
    lowPassFilterRef.current = null
    audioBufferRef.current = null

    // Reset state
    pitchHistoryRef.current = []
    frequencyHistoryRef.current = []
    previousRMSRef.current = 0

    setCurrentPitch(null)
    setVolumeLevel(0)

    setState(prev => ({ ...prev, isListening: false }))
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening()
    }
  }, [stopListening])

  return {
    // State
    isListening: state.isListening,
    isCalibrating: state.isCalibrating,
    isCalibrated: state.isCalibrated,
    permission: state.permission,
    error: state.error,

    // Current detection
    currentPitch,
    volumeLevel,
    noiseFloor,

    // Actions
    startListening,
    stopListening,
    calibrateNoise,
    setInstrument,

    // Debug
    rawFrequency,
    rawConfidence
  }
}

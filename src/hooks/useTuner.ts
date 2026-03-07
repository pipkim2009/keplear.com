import { useState, useCallback, useRef, useEffect } from 'react'
import { useAudioInput } from './useAudioInput'
import type { MicrophonePermission } from './useAudioInput'
import { MUSIC_CONFIG } from '../constants'

interface DetectedPitch {
  note: string
  octave: number
  frequency: number
  targetFrequency: number
  cents: number
}

interface UseTunerReturn {
  readonly detectedPitch: DetectedPitch | null
  readonly isListening: boolean
  readonly permission: MicrophonePermission
  readonly error: string | null
  readonly volumeLevel: number
  startTuner: () => Promise<void>
  stopTuner: () => void
}

const A4_FREQUENCY = 440
const CHROMATIC_NOTES = MUSIC_CONFIG.chromaticNotes

// --- Tuner configuration ---
/** Minimum RMS volume to consider a valid signal (noise gate) */
const VOLUME_GATE = 0.008
/** EMA smoothing factor for frequency (0 = max smooth, 1 = no smooth) */
const FREQUENCY_SMOOTHING = 0.35
/** How many consecutive frames a note must be stable before displaying */
const NOTE_STABILITY_FRAMES = 3
/** How long to hold the last note after signal drops (ms) */
const NOTE_HOLD_MS = 800
/** Target analysis rate — ms between analyses (~15 fps) */
const ANALYSIS_INTERVAL_MS = 64

/**
 * Convert frequency to note name, octave, and cents deviation
 */
function frequencyToNote(freq: number): DetectedPitch {
  const semitones = 12 * Math.log2(freq / A4_FREQUENCY)
  const roundedSemitones = Math.round(semitones)
  const cents = Math.round((semitones - roundedSemitones) * 100)

  const noteIndex = ((roundedSemitones % 12) + 12 + 9) % 12
  const octave = 4 + Math.floor((roundedSemitones + 9) / 12)
  const targetFrequency = A4_FREQUENCY * Math.pow(2, roundedSemitones / 12)

  return {
    note: CHROMATIC_NOTES[noteIndex],
    octave,
    frequency: freq,
    targetFrequency,
    cents,
  }
}

/**
 * YIN autocorrelation pitch detection
 */
function detectPitchYIN(buffer: Float32Array, sampleRate: number): number | null {
  const bufferSize = buffer.length
  const halfSize = Math.floor(bufferSize / 2)
  const yinBuffer = new Float32Array(halfSize)

  // Step 1: Squared difference function
  for (let tau = 0; tau < halfSize; tau++) {
    let sum = 0
    for (let i = 0; i < halfSize; i++) {
      const delta = buffer[i] - buffer[i + tau]
      sum += delta * delta
    }
    yinBuffer[tau] = sum
  }

  // Step 2: Cumulative mean normalized difference
  yinBuffer[0] = 1
  let runningSum = 0
  for (let tau = 1; tau < halfSize; tau++) {
    runningSum += yinBuffer[tau]
    yinBuffer[tau] = (yinBuffer[tau] * tau) / runningSum
  }

  // Step 3: Absolute threshold — find first dip below threshold
  const threshold = 0.15
  let tauEstimate = -1

  for (let tau = 2; tau < halfSize; tau++) {
    if (yinBuffer[tau] < threshold) {
      while (tau + 1 < halfSize && yinBuffer[tau + 1] < yinBuffer[tau]) {
        tau++
      }
      tauEstimate = tau
      break
    }
  }

  if (tauEstimate === -1) return null

  // Step 4: Parabolic interpolation for sub-sample accuracy
  const s0 = tauEstimate > 0 ? yinBuffer[tauEstimate - 1] : yinBuffer[tauEstimate]
  const s1 = yinBuffer[tauEstimate]
  const s2 = tauEstimate + 1 < halfSize ? yinBuffer[tauEstimate + 1] : yinBuffer[tauEstimate]

  let betterTau = tauEstimate
  const denominator = 2 * s1 - s2 - s0
  if (denominator !== 0) {
    betterTau = tauEstimate + (s2 - s0) / (2 * denominator)
  }

  const frequency = sampleRate / betterTau

  // Sanity check: instrument range (low E1 ~41Hz to high frets ~1400Hz)
  if (frequency < 27.5 || frequency > 4200) return null

  return frequency
}

/**
 * Calculate RMS volume from audio buffer
 */
function calculateRMS(buffer: Float32Array): number {
  let sum = 0
  for (let i = 0; i < buffer.length; i++) {
    sum += buffer[i] * buffer[i]
  }
  return Math.sqrt(sum / buffer.length)
}

export const useTuner = (): UseTunerReturn => {
  const [detectedPitch, setDetectedPitch] = useState<DetectedPitch | null>(null)
  const rafRef = useRef<number | null>(null)

  // Smoothing state (refs to avoid re-renders in the analysis loop)
  const smoothedFreqRef = useRef<number | null>(null)
  const lastDetectionTimeRef = useRef(0)
  const candidateNoteRef = useRef<string | null>(null)
  const candidateOctaveRef = useRef<number | null>(null)
  const candidateCountRef = useRef(0)
  const lastAnalysisTimeRef = useRef(0)
  const currentDisplayRef = useRef<{ note: string; octave: number } | null>(null)

  const {
    isListening,
    permission,
    error,
    volumeLevel,
    startListening,
    stopListening,
    audioContextRef,
    getTimeDomainData,
  } = useAudioInput({
    sampleRate: 44100,
    fftSize: 4096,
    smoothingTimeConstant: 0,
  })

  const analyzeFrame = useCallback(() => {
    const now = performance.now()

    // Throttle: only analyze at target interval
    if (now - lastAnalysisTimeRef.current < ANALYSIS_INTERVAL_MS) {
      rafRef.current = requestAnimationFrame(analyzeFrame)
      return
    }
    lastAnalysisTimeRef.current = now

    const buffer = getTimeDomainData()
    if (!buffer || !audioContextRef.current) {
      rafRef.current = requestAnimationFrame(analyzeFrame)
      return
    }

    // Noise gate: ignore quiet signals
    const rms = calculateRMS(buffer)
    if (rms < VOLUME_GATE) {
      // No valid signal — check hold time
      if (lastDetectionTimeRef.current > 0 && now - lastDetectionTimeRef.current > NOTE_HOLD_MS) {
        smoothedFreqRef.current = null
        candidateCountRef.current = 0
        candidateNoteRef.current = null
        candidateOctaveRef.current = null
        currentDisplayRef.current = null
        setDetectedPitch(null)
      }
      rafRef.current = requestAnimationFrame(analyzeFrame)
      return
    }

    const rawFrequency = detectPitchYIN(buffer, audioContextRef.current.sampleRate)

    if (rawFrequency === null) {
      // Missed detection — hold the current note for NOTE_HOLD_MS
      if (lastDetectionTimeRef.current > 0 && now - lastDetectionTimeRef.current > NOTE_HOLD_MS) {
        smoothedFreqRef.current = null
        candidateCountRef.current = 0
        candidateNoteRef.current = null
        candidateOctaveRef.current = null
        currentDisplayRef.current = null
        setDetectedPitch(null)
      }
      rafRef.current = requestAnimationFrame(analyzeFrame)
      return
    }

    // Valid detection — update timestamp
    lastDetectionTimeRef.current = now

    // EMA frequency smoothing
    const prevSmoothed = smoothedFreqRef.current
    let smoothedFreq: number
    if (prevSmoothed === null) {
      smoothedFreq = rawFrequency
    } else {
      // If frequency jumps by more than a semitone, reset smoothing
      // (user plucked a different string)
      const semitoneRatio = Math.abs(12 * Math.log2(rawFrequency / prevSmoothed))
      if (semitoneRatio > 1.5) {
        smoothedFreq = rawFrequency
        candidateCountRef.current = 0
      } else {
        smoothedFreq = FREQUENCY_SMOOTHING * rawFrequency + (1 - FREQUENCY_SMOOTHING) * prevSmoothed
      }
    }
    smoothedFreqRef.current = smoothedFreq

    const pitch = frequencyToNote(smoothedFreq)

    // Note stability: require consistent note/octave for N frames before switching
    const currentDisplay = currentDisplayRef.current
    if (
      currentDisplay &&
      pitch.note === currentDisplay.note &&
      pitch.octave === currentDisplay.octave
    ) {
      // Same note as currently displayed — update cents/frequency immediately
      setDetectedPitch(pitch)
      candidateCountRef.current = 0
      candidateNoteRef.current = null
      candidateOctaveRef.current = null
    } else if (
      pitch.note === candidateNoteRef.current &&
      pitch.octave === candidateOctaveRef.current
    ) {
      // Same as candidate — increment stability counter
      candidateCountRef.current++
      if (candidateCountRef.current >= NOTE_STABILITY_FRAMES) {
        // Stable enough — switch display
        currentDisplayRef.current = { note: pitch.note, octave: pitch.octave }
        setDetectedPitch(pitch)
        candidateCountRef.current = 0
        candidateNoteRef.current = null
        candidateOctaveRef.current = null
      } else if (currentDisplay) {
        // Still waiting for stability — update cents on current note
        const currentPitch = frequencyToNote(smoothedFreq)
        setDetectedPitch({
          ...currentPitch,
          note: currentDisplay.note,
          octave: currentDisplay.octave,
          targetFrequency:
            A4_FREQUENCY *
            Math.pow(
              2,
              (CHROMATIC_NOTES.indexOf(currentDisplay.note) -
                9 +
                (currentDisplay.octave - 4) * 12) /
                12
            ),
        })
      }
    } else {
      // New candidate note — start counting
      candidateNoteRef.current = pitch.note
      candidateOctaveRef.current = pitch.octave
      candidateCountRef.current = 1

      if (!currentDisplay) {
        // No current display — show immediately on first detection
        currentDisplayRef.current = { note: pitch.note, octave: pitch.octave }
        setDetectedPitch(pitch)
      }
    }

    rafRef.current = requestAnimationFrame(analyzeFrame)
  }, [getTimeDomainData, audioContextRef])

  const startTuner = useCallback(async () => {
    const ok = await startListening()
    if (ok) {
      // Reset all smoothing state
      smoothedFreqRef.current = null
      lastDetectionTimeRef.current = 0
      candidateNoteRef.current = null
      candidateOctaveRef.current = null
      candidateCountRef.current = 0
      lastAnalysisTimeRef.current = 0
      currentDisplayRef.current = null
      rafRef.current = requestAnimationFrame(analyzeFrame)
    }
  }, [startListening, analyzeFrame])

  const stopTuner = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    smoothedFreqRef.current = null
    currentDisplayRef.current = null
    setDetectedPitch(null)
    stopListening()
  }, [stopListening])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [])

  return {
    detectedPitch,
    isListening,
    permission,
    error,
    volumeLevel,
    startTuner,
    stopTuner,
  }
}

export type { DetectedPitch }

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

/**
 * Convert frequency to note name, octave, and cents deviation
 */
function frequencyToNote(freq: number): DetectedPitch {
  // Semitones from A4
  const semitones = 12 * Math.log2(freq / A4_FREQUENCY)
  const roundedSemitones = Math.round(semitones)
  const cents = Math.round((semitones - roundedSemitones) * 100)

  // A4 is index 9 in chromatic scale (A), octave 4
  // noteIndex relative to C
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
      // Walk to the minimum of this dip
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

  // Sanity check: human-audible instrument range
  if (frequency < 27.5 || frequency > 4200) return null

  return frequency
}

export const useTuner = (): UseTunerReturn => {
  const [detectedPitch, setDetectedPitch] = useState<DetectedPitch | null>(null)
  const rafRef = useRef<number | null>(null)

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
    const buffer = getTimeDomainData()
    if (buffer && audioContextRef.current) {
      const frequency = detectPitchYIN(buffer, audioContextRef.current.sampleRate)
      if (frequency !== null) {
        setDetectedPitch(frequencyToNote(frequency))
      } else {
        setDetectedPitch(null)
      }
    }
    rafRef.current = requestAnimationFrame(analyzeFrame)
  }, [getTimeDomainData, audioContextRef])

  const startTuner = useCallback(async () => {
    const ok = await startListening()
    if (ok) {
      rafRef.current = requestAnimationFrame(analyzeFrame)
    }
  }, [startListening, analyzeFrame])

  const stopTuner = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
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

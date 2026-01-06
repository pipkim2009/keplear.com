/**
 * DSP-based Pitch Detection Utilities
 *
 * Industry-grade pitch detection pipeline WITHOUT machine learning.
 * Based on proven DSP algorithms used in professional tuners.
 *
 * Core algorithm: YIN (de Cheveigné & Kawahara, 2002)
 */

// ============================================================================
// TYPES
// ============================================================================

export interface YINResult {
  frequency: number
  confidence: number  // 0-1, higher is better (inverse of YIN's aperiodicity)
  period: number      // Period in samples
}

export interface OnsetResult {
  isOnset: boolean
  energy: number
  spectralFlux: number
  isStable: boolean
}

export interface PitchFrame {
  frequency: number
  confidence: number
  timestamp: number
  rms: number
}

export interface InstrumentRange {
  name: string
  lowHz: number
  highHz: number
  highPassHz: number
  lowPassHz: number
}

// ============================================================================
// INSTRUMENT CONFIGURATIONS
// ============================================================================

export const INSTRUMENT_RANGES: Record<string, InstrumentRange> = {
  guitar: {
    name: 'Guitar',
    lowHz: 82,      // E2 ~82.4Hz
    highHz: 1320,   // E6 ~1318.5Hz
    highPassHz: 75,
    lowPassHz: 1400
  },
  bass: {
    name: 'Bass',
    lowHz: 41,      // E1 ~41.2Hz
    highHz: 392,    // G4 ~392Hz
    highPassHz: 38,
    lowPassHz: 420
  },
  keyboard: {
    name: 'Keyboard/Piano',
    lowHz: 32,      // C1 ~32.7Hz
    highHz: 4186,   // C8 ~4186Hz
    highPassHz: 30,
    lowPassHz: 4500
  },
  voice: {
    name: 'Voice',
    lowHz: 80,      // Low male voice
    highHz: 1000,   // High female voice
    highPassHz: 75,
    lowPassHz: 1200
  }
}

// ============================================================================
// YIN ALGORITHM
// ============================================================================

/**
 * YIN pitch detection algorithm
 *
 * A robust fundamental frequency estimator that handles harmonics well.
 * Returns frequency, confidence, and period.
 *
 * @param buffer Audio samples (mono, Float32Array)
 * @param sampleRate Sample rate in Hz
 * @param threshold YIN threshold (0.1-0.2 typical, lower = stricter)
 * @param minFreq Minimum frequency to detect
 * @param maxFreq Maximum frequency to detect
 */
export function yin(
  buffer: Float32Array,
  sampleRate: number,
  threshold: number = 0.15,
  minFreq: number = 60,
  maxFreq: number = 2000
): YINResult | null {
  const bufferSize = buffer.length

  // Calculate lag range from frequency range
  const minLag = Math.floor(sampleRate / maxFreq)
  const maxLag = Math.min(Math.floor(sampleRate / minFreq), Math.floor(bufferSize / 2))

  if (maxLag <= minLag) {
    return null
  }

  // Step 1: Difference function
  const diffFunction = new Float32Array(maxLag)

  for (let lag = minLag; lag < maxLag; lag++) {
    let sum = 0
    for (let i = 0; i < bufferSize - maxLag; i++) {
      const diff = buffer[i] - buffer[i + lag]
      sum += diff * diff
    }
    diffFunction[lag] = sum
  }

  // Step 2: Cumulative mean normalized difference function (CMND)
  const cmndFunction = new Float32Array(maxLag)
  cmndFunction[minLag] = 1

  let runningSum = diffFunction[minLag]

  for (let lag = minLag + 1; lag < maxLag; lag++) {
    runningSum += diffFunction[lag]
    cmndFunction[lag] = diffFunction[lag] / (runningSum / (lag - minLag + 1))
  }

  // Step 3: Absolute threshold - find first valley below threshold
  let bestLag = -1

  for (let lag = minLag; lag < maxLag - 1; lag++) {
    if (cmndFunction[lag] < threshold) {
      // Found a candidate, look for the local minimum
      while (lag + 1 < maxLag && cmndFunction[lag + 1] < cmndFunction[lag]) {
        lag++
      }
      bestLag = lag
      break
    }
  }

  // No pitch found below threshold
  if (bestLag === -1) {
    return null
  }

  // Step 4: Parabolic interpolation for sub-sample accuracy
  let refinedLag = bestLag

  if (bestLag > minLag && bestLag < maxLag - 1) {
    const y0 = cmndFunction[bestLag - 1]
    const y1 = cmndFunction[bestLag]
    const y2 = cmndFunction[bestLag + 1]

    const d = (y0 - y2) / (2 * (y0 - 2 * y1 + y2))
    if (Math.abs(d) < 1) {
      refinedLag = bestLag + d
    }
  }

  // Calculate frequency and confidence
  const frequency = sampleRate / refinedLag
  const confidence = 1 - cmndFunction[bestLag]  // Invert: lower CMND = higher confidence

  return {
    frequency,
    confidence: Math.max(0, Math.min(1, confidence)),
    period: refinedLag
  }
}

// ============================================================================
// NOISE FLOOR CALIBRATION
// ============================================================================

/**
 * Calculate RMS (Root Mean Square) of a buffer
 */
export function calculateRMS(buffer: Float32Array): number {
  let sum = 0
  for (let i = 0; i < buffer.length; i++) {
    sum += buffer[i] * buffer[i]
  }
  return Math.sqrt(sum / buffer.length)
}

/**
 * Noise floor calibration result
 */
export interface NoiseFloorCalibration {
  rmsAverage: number
  rmsPeak: number
  threshold: number  // Recommended threshold (rmsAverage * 1.5)
}

/**
 * Calibrate noise floor from silence samples
 * Call this during initialization with ~0.5-1s of ambient silence
 */
export function calibrateNoiseFloor(samples: Float32Array[], multiplier: number = 1.5): NoiseFloorCalibration {
  if (samples.length === 0) {
    return { rmsAverage: 0.01, rmsPeak: 0.02, threshold: 0.015 }
  }

  const rmsValues = samples.map(calculateRMS)
  const rmsAverage = rmsValues.reduce((a, b) => a + b, 0) / rmsValues.length
  const rmsPeak = Math.max(...rmsValues)

  return {
    rmsAverage,
    rmsPeak,
    threshold: rmsAverage * multiplier
  }
}

// ============================================================================
// ONSET DETECTION
// ============================================================================

/**
 * Simple energy-based onset detection
 * Detects sudden increases in signal energy
 */
export function detectEnergyOnset(
  currentRMS: number,
  previousRMS: number,
  threshold: number = 2.0  // Current must be 2x previous
): boolean {
  if (previousRMS < 0.001) {
    // Coming from silence - any significant energy is an onset
    return currentRMS > 0.01
  }
  return currentRMS / previousRMS > threshold
}

/**
 * Spectral flux onset detection
 * Measures change in spectral content between frames
 */
export function calculateSpectralFlux(
  currentSpectrum: Float32Array,
  previousSpectrum: Float32Array
): number {
  if (currentSpectrum.length !== previousSpectrum.length) {
    return 0
  }

  let flux = 0
  for (let i = 0; i < currentSpectrum.length; i++) {
    // Only count positive differences (onsets, not offsets)
    const diff = currentSpectrum[i] - previousSpectrum[i]
    if (diff > 0) {
      flux += diff
    }
  }

  return flux
}

/**
 * Calculate magnitude spectrum from audio buffer using FFT
 * Uses a simple DFT for small buffers (good enough for onset detection)
 */
export function calculateSpectrum(buffer: Float32Array): Float32Array {
  const n = buffer.length
  const spectrum = new Float32Array(n / 2)

  // Simple magnitude calculation using correlation with sine/cosine
  // For onset detection, we don't need perfect FFT - just spectral energy distribution
  for (let k = 0; k < n / 2; k++) {
    let real = 0
    let imag = 0

    for (let t = 0; t < n; t++) {
      const angle = (2 * Math.PI * k * t) / n
      real += buffer[t] * Math.cos(angle)
      imag -= buffer[t] * Math.sin(angle)
    }

    spectrum[k] = Math.sqrt(real * real + imag * imag) / n
  }

  return spectrum
}

// ============================================================================
// MULTI-FRAME SMOOTHING
// ============================================================================

/**
 * Median filter for pitch values
 * Removes outliers and jitter
 */
export function medianFilter(values: number[], windowSize: number = 5): number {
  if (values.length === 0) return 0
  if (values.length === 1) return values[0]

  const window = values.slice(-windowSize)
  const sorted = [...window].sort((a, b) => a - b)

  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2
  }
  return sorted[mid]
}

/**
 * Check pitch stability over recent frames
 * Returns true if pitch is stable within tolerance
 */
export function checkPitchStability(
  frames: PitchFrame[],
  toleranceCents: number = 20,
  minDurationMs: number = 100
): { isStable: boolean; averageFrequency: number; averageConfidence: number } {
  if (frames.length < 2) {
    return { isStable: false, averageFrequency: 0, averageConfidence: 0 }
  }

  // Check duration
  const duration = frames[frames.length - 1].timestamp - frames[0].timestamp
  if (duration < minDurationMs) {
    return { isStable: false, averageFrequency: 0, averageConfidence: 0 }
  }

  // Calculate average frequency
  const frequencies = frames.map(f => f.frequency)
  const avgFreq = frequencies.reduce((a, b) => a + b, 0) / frequencies.length

  // Check if all frequencies are within tolerance
  const toleranceRatio = Math.pow(2, toleranceCents / 1200)
  const minFreq = avgFreq / toleranceRatio
  const maxFreq = avgFreq * toleranceRatio

  const isStable = frequencies.every(f => f >= minFreq && f <= maxFreq)

  const avgConfidence = frames.reduce((a, f) => a + f.confidence, 0) / frames.length

  return {
    isStable,
    averageFrequency: avgFreq,
    averageConfidence: avgConfidence
  }
}

// ============================================================================
// FREQUENCY / NOTE CONVERSION
// ============================================================================

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const A4_FREQ = 440

/**
 * Convert frequency to MIDI note number
 */
export function frequencyToMidi(frequency: number): number {
  return 69 + 12 * Math.log2(frequency / A4_FREQ)
}

/**
 * Convert MIDI note number to frequency
 */
export function midiToFrequency(midi: number): number {
  return A4_FREQ * Math.pow(2, (midi - 69) / 12)
}

/**
 * Convert frequency to note name with octave
 */
export function frequencyToNoteName(frequency: number): string {
  const midi = frequencyToMidi(frequency)
  const noteIndex = Math.round(midi) % 12
  const octave = Math.floor(Math.round(midi) / 12) - 1
  return `${NOTE_NAMES[noteIndex]}${octave}`
}

/**
 * Calculate cents offset from nearest note
 */
export function frequencyToCents(frequency: number): { note: string; cents: number } {
  const midi = frequencyToMidi(frequency)
  const nearestMidi = Math.round(midi)
  const cents = Math.round((midi - nearestMidi) * 100)

  const noteIndex = nearestMidi % 12
  const octave = Math.floor(nearestMidi / 12) - 1
  const note = `${NOTE_NAMES[noteIndex]}${octave}`

  return { note, cents }
}

/**
 * Check if detected frequency matches expected note within tolerance
 */
export function matchesExpectedNote(
  detectedFreq: number,
  expectedNoteName: string,
  toleranceCents: number = 50
): { matches: boolean; centsOff: number } {
  // Parse expected note
  const match = expectedNoteName.match(/^([A-G]#?)(\d+)?$/)
  if (!match) {
    return { matches: false, centsOff: 0 }
  }

  const noteName = match[1]
  const octave = match[2] ? parseInt(match[2]) : null

  const detected = frequencyToCents(detectedFreq)
  const detectedNoteName = detected.note.replace(/\d+$/, '')

  // Check pitch class match (ignore octave if not specified)
  if (octave === null) {
    // Just check note name without octave
    if (detectedNoteName === noteName) {
      return { matches: Math.abs(detected.cents) <= toleranceCents, centsOff: detected.cents }
    }
    return { matches: false, centsOff: detected.cents }
  }

  // Check exact match with octave
  if (detected.note === expectedNoteName) {
    return { matches: Math.abs(detected.cents) <= toleranceCents, centsOff: detected.cents }
  }

  // Check for octave error (common issue)
  if (detectedNoteName === noteName) {
    // Same pitch class, different octave - calculate cents off
    const expectedMidi = NOTE_NAMES.indexOf(noteName) + (octave + 1) * 12
    const detectedMidi = frequencyToMidi(detectedFreq)
    const centsOff = Math.round((detectedMidi - expectedMidi) * 100) % 1200

    return {
      matches: Math.abs(centsOff) <= toleranceCents || Math.abs(centsOff - 1200) <= toleranceCents,
      centsOff
    }
  }

  return { matches: false, centsOff: 0 }
}

// ============================================================================
// HARMONIC SANITY CHECK
// ============================================================================

/**
 * Check if detected frequency might be a harmonic of the true fundamental
 * Returns corrected frequency if octave error detected
 */
export function correctOctaveError(
  detectedFreq: number,
  expectedNoteName: string,
  spectrum?: Float32Array,
  sampleRate?: number
): number {
  // Parse expected note to get target frequency
  const match = expectedNoteName.match(/^([A-G]#?)(\d+)?$/)
  if (!match || !match[2]) {
    return detectedFreq  // Can't correct without octave info
  }

  const noteName = match[1]
  const octave = parseInt(match[2])
  const noteIndex = NOTE_NAMES.indexOf(noteName)
  const expectedMidi = noteIndex + (octave + 1) * 12
  const expectedFreq = midiToFrequency(expectedMidi)

  // Check if detected is approximately 2x expected (octave up error)
  if (Math.abs(detectedFreq / expectedFreq - 2) < 0.1) {
    return detectedFreq / 2
  }

  // Check if detected is approximately 0.5x expected (octave down error)
  if (Math.abs(detectedFreq / expectedFreq - 0.5) < 0.1) {
    return detectedFreq * 2
  }

  return detectedFreq
}

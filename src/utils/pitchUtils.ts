/**
 * Pitch detection and analysis utilities
 * Used for real-time performance grading (Yousician-style)
 *
 * Enhanced with:
 * - Professional-grade frequency-to-note conversion
 * - Multi-octave tolerance for flexible matching
 * - Cents-based precision for tuning feedback
 */

import { MUSIC_CONFIG } from '../constants'
import type { InstrumentType } from '../types/instrument'

/**
 * A4 reference frequency (standard tuning)
 * Can be adjusted for different tuning standards (e.g., 432 Hz)
 */
const A4_FREQUENCY = 440

/**
 * A4 MIDI note number (standard)
 */
const A4_MIDI = 69

/**
 * Chromatic note names for conversion
 */
const NOTE_NAMES = MUSIC_CONFIG.chromaticNotes

/**
 * Pitch tolerance in cents (±50 cents = half a semitone)
 * This matches Yousician's approach - if you're within 50 cents, you hit the note
 * Tightened from 50 to 45 for more accurate grading
 */
export const PITCH_TOLERANCE_CENTS = 45

/**
 * Strict tolerance for advanced mode (±25 cents = quarter semitone)
 */
export const PITCH_TOLERANCE_STRICT_CENTS = 25

/**
 * Lenient tolerance for beginners (±75 cents)
 */
export const PITCH_TOLERANCE_LENIENT_CENTS = 75

/**
 * Instrument-specific frequency ranges and detection parameters
 * Used to filter out-of-range frequencies and optimize detection
 */
export const INSTRUMENT_CONFIG: Record<InstrumentType, {
  minFreq: number      // Lowest expected frequency (Hz)
  maxFreq: number      // Highest expected frequency (Hz)
  minMidi: number      // Lowest MIDI note
  maxMidi: number      // Highest MIDI note
  onsetSensitivity: number  // How sensitive onset detection should be (0-1)
  sustainType: 'short' | 'medium' | 'long'  // How long notes typically sustain
}> = {
  keyboard: {
    minFreq: 65.41,    // C2
    maxFreq: 2093.00,  // C7
    minMidi: 36,
    maxMidi: 96,
    onsetSensitivity: 0.7,  // Piano has clear attacks
    sustainType: 'medium'
  },
  guitar: {
    minFreq: 82.41,    // E2 (low E string)
    maxFreq: 1318.51,  // E6 (high frets)
    minMidi: 40,
    maxMidi: 88,
    onsetSensitivity: 0.6,  // Guitar has softer attacks than piano
    sustainType: 'medium'
  },
  bass: {
    minFreq: 41.20,    // E1 (low E string)
    maxFreq: 392.00,   // G4 (high frets)
    minMidi: 28,
    maxMidi: 67,
    onsetSensitivity: 0.5,  // Bass has even softer attacks
    sustainType: 'long'
  }
}

/**
 * Get the frequency range for an instrument
 */
export const getInstrumentFrequencyRange = (instrument: InstrumentType): { min: number; max: number } => {
  const config = INSTRUMENT_CONFIG[instrument]
  return { min: config.minFreq, max: config.maxFreq }
}

/**
 * Check if a frequency is within the expected range for an instrument
 */
export const isFrequencyInInstrumentRange = (frequency: number, instrument: InstrumentType): boolean => {
  const { min, max } = getInstrumentFrequencyRange(instrument)
  // Allow some tolerance (one semitone below/above)
  const tolerance = 1.06 // ~1 semitone
  return frequency >= min / tolerance && frequency <= max * tolerance
}

/**
 * Converts a frequency in Hz to the nearest note name with octave
 * @param frequency - Frequency in Hz
 * @returns Note name (e.g., "C4", "F#5") or null if frequency is invalid
 */
export const frequencyToNote = (frequency: number | null): string | null => {
  if (!frequency || frequency <= 0 || !isFinite(frequency)) {
    return null
  }

  // Calculate MIDI note number from frequency
  const midiNote = 12 * Math.log2(frequency / A4_FREQUENCY) + A4_MIDI
  const roundedMidi = Math.round(midiNote)

  // Convert MIDI note to note name and octave
  const noteIndex = ((roundedMidi % 12) + 12) % 12 // Handle negative modulo
  const octave = Math.floor(roundedMidi / 12) - 1

  return `${NOTE_NAMES[noteIndex]}${octave}`
}

/**
 * Converts a note name to frequency in Hz
 * @param noteName - Note name with octave (e.g., "C4", "F#5")
 * @returns Frequency in Hz or null if note name is invalid
 */
export const noteToFrequency = (noteName: string): number | null => {
  if (!noteName) return null

  // Parse note name and octave
  const match = noteName.match(/^([A-G]#?)(\d+)$/)
  if (!match) return null

  const [, note, octaveStr] = match
  const octave = parseInt(octaveStr, 10)
  const noteIndex = NOTE_NAMES.indexOf(note as typeof NOTE_NAMES[number])

  if (noteIndex === -1) return null

  // Calculate MIDI note number
  const midiNote = (octave + 1) * 12 + noteIndex

  // Convert MIDI to frequency
  return A4_FREQUENCY * Math.pow(2, (midiNote - A4_MIDI) / 12)
}

/**
 * Calculates the difference in cents between two frequencies
 * 100 cents = 1 semitone
 * @param detected - Detected frequency in Hz
 * @param expected - Expected frequency in Hz
 * @returns Difference in cents (positive = sharp, negative = flat)
 */
export const calculateCentsDifference = (
  detected: number,
  expected: number
): number => {
  if (detected <= 0 || expected <= 0) return 0
  return 1200 * Math.log2(detected / expected)
}

/**
 * Calculates the difference in cents between a detected frequency and expected note
 * @param detectedFrequency - Detected frequency in Hz
 * @param expectedNote - Expected note name (e.g., "C4")
 * @returns Difference in cents (positive = sharp, negative = flat)
 */
export const calculateCentsFromNote = (
  detectedFrequency: number,
  expectedNote: string
): number => {
  const expectedFrequency = noteToFrequency(expectedNote)
  if (!expectedFrequency) return 0
  return calculateCentsDifference(detectedFrequency, expectedFrequency)
}

/**
 * Calculates the semitone offset between detected and expected notes
 * @param detectedNote - Detected note name (e.g., "C4")
 * @param expectedNote - Expected note name (e.g., "D4")
 * @returns Semitone difference (positive = higher, negative = lower)
 */
export const calculateSemitoneOffset = (
  detectedNote: string | null,
  expectedNote: string
): number => {
  if (!detectedNote) return 0

  const detectedFreq = noteToFrequency(detectedNote)
  const expectedFreq = noteToFrequency(expectedNote)

  if (!detectedFreq || !expectedFreq) return 0

  // Calculate semitone difference
  return Math.round(12 * Math.log2(detectedFreq / expectedFreq))
}

/**
 * Extracts just the note name without octave (pitch class)
 * @param noteName - Note name with octave (e.g., "C4", "F#5")
 * @returns Just the note name (e.g., "C", "F#")
 */
export const getNoteClass = (noteName: string): string | null => {
  const match = noteName.match(/^([A-G]#?)/)
  return match ? match[1] : null
}

/**
 * Checks if a detected note matches the expected note (Yousician-style)
 * Only compares pitch class (note name) - ignores octave
 * This is how Yousician does it - C4 matches C3, C5, etc.
 * @param detectedNote - Detected note name
 * @param expectedNote - Expected note name
 * @returns Whether the notes match
 */
export const isNoteCorrect = (
  detectedNote: string | null,
  expectedNote: string
): boolean => {
  if (!detectedNote) return false

  // Extract just the note names without octaves
  const detectedClass = getNoteClass(detectedNote)
  const expectedClass = getNoteClass(expectedNote)

  if (!detectedClass || !expectedClass) return false

  // Simple comparison - same note name = correct
  return detectedClass === expectedClass
}

/**
 * EXPECTED NOTE BIAS: Check if frequency is close enough to expected note
 * This allows detection to succeed even when the standard frequency-to-note
 * conversion might round to an adjacent note.
 *
 * For example, if expecting C4 (261.63Hz) and detecting 258Hz,
 * standard conversion might say B3, but this is close enough to C4.
 *
 * @param detectedFrequency - The detected frequency in Hz
 * @param expectedNote - The note we expect the user to play
 * @param toleranceCents - How many cents off is acceptable (default: 60 = slightly more than half semitone)
 * @returns Whether the frequency is close enough to the expected note
 */
export const isFrequencyCloseToExpectedNote = (
  detectedFrequency: number,
  expectedNote: string,
  toleranceCents: number = 60
): boolean => {
  const expectedFreq = noteToFrequency(expectedNote)
  if (!expectedFreq) return false

  const centsDiff = Math.abs(calculateCentsDifference(detectedFrequency, expectedFreq))
  return centsDiff <= toleranceCents
}

/**
 * SMART NOTE MATCHING: Combines standard note matching with expected note bias
 * If standard detection says the note is correct, return true.
 * If not, check if the frequency is close enough to what we expected.
 *
 * @param detectedNote - The detected note name
 * @param detectedFrequency - The detected frequency
 * @param expectedNote - The note we expect
 * @returns Whether the note should be considered correct
 */
export const isNoteCorrectWithBias = (
  detectedNote: string | null,
  detectedFrequency: number,
  expectedNote: string
): boolean => {
  // First, check standard note matching (pitch class only)
  if (isNoteCorrect(detectedNote, expectedNote)) {
    return true
  }

  // If standard matching failed, check if frequency is close to expected
  // This handles edge cases where the frequency is between two notes
  // and rounded to the wrong one
  return isFrequencyCloseToExpectedNote(detectedFrequency, expectedNote, 50)
}

/**
 * ADVANCED NOTE MATCHING: More sophisticated matching with confidence scoring
 * Returns both whether the note is correct and a confidence score
 *
 * @param detectedNote - The detected note name
 * @param detectedFrequency - The detected frequency
 * @param expectedNote - The note we expect
 * @param options - Matching options
 * @returns Match result with correctness and confidence
 */
export interface NoteMatchResult {
  isCorrect: boolean
  confidence: number      // 0-1, how confident in the match
  centsOff: number        // How many cents off from perfect
  matchType: 'exact' | 'pitch-class' | 'frequency-close' | 'octave-error' | 'wrong'
}

export const advancedNoteMatch = (
  detectedNote: string | null,
  detectedFrequency: number,
  expectedNote: string,
  options: {
    toleranceCents?: number
    allowOctaveErrors?: boolean
    strictOctave?: boolean
  } = {}
): NoteMatchResult => {
  const {
    toleranceCents = PITCH_TOLERANCE_CENTS,
    allowOctaveErrors = true,
    strictOctave = false
  } = options

  // No detection
  if (!detectedNote || detectedFrequency <= 0) {
    return { isCorrect: false, confidence: 0, centsOff: 0, matchType: 'wrong' }
  }

  const expectedFreq = noteToFrequency(expectedNote)
  if (!expectedFreq) {
    return { isCorrect: false, confidence: 0, centsOff: 0, matchType: 'wrong' }
  }

  const centsOff = Math.abs(calculateCentsDifference(detectedFrequency, expectedFreq))

  // Exact octave match - check frequency directly
  if (centsOff <= toleranceCents) {
    const confidence = 1 - (centsOff / toleranceCents) * 0.3
    return { isCorrect: true, confidence, centsOff, matchType: 'exact' }
  }

  // Check for octave errors (frequency is 2x or 0.5x expected)
  if (allowOctaveErrors && !strictOctave) {
    const octaveUpCents = Math.abs(calculateCentsDifference(detectedFrequency, expectedFreq * 2))
    const octaveDownCents = Math.abs(calculateCentsDifference(detectedFrequency, expectedFreq / 2))

    if (octaveUpCents <= toleranceCents) {
      // Playing an octave higher
      const confidence = 0.8 - (octaveUpCents / toleranceCents) * 0.2
      return { isCorrect: true, confidence, centsOff: octaveUpCents, matchType: 'octave-error' }
    }

    if (octaveDownCents <= toleranceCents) {
      // Playing an octave lower
      const confidence = 0.8 - (octaveDownCents / toleranceCents) * 0.2
      return { isCorrect: true, confidence, centsOff: octaveDownCents, matchType: 'octave-error' }
    }
  }

  // Pitch class match (same note name, any octave)
  const detectedClass = getNoteClass(detectedNote)
  const expectedClass = getNoteClass(expectedNote)

  if (detectedClass && expectedClass && detectedClass === expectedClass) {
    // Same pitch class, but not same octave and not within tolerance
    // Still consider correct but with lower confidence
    const confidence = 0.7
    return { isCorrect: true, confidence, centsOff, matchType: 'pitch-class' }
  }

  // Check if frequency is very close to expected (handles edge cases)
  if (centsOff <= toleranceCents * 1.2) {
    const confidence = 0.6 - (centsOff / toleranceCents) * 0.3
    return { isCorrect: true, confidence, centsOff, matchType: 'frequency-close' }
  }

  return { isCorrect: false, confidence: 0, centsOff, matchType: 'wrong' }
}

/**
 * Calculate the harmonic relationship between two frequencies
 * Useful for detecting octave errors and harmonic confusion
 */
export const getHarmonicRelationship = (
  freq1: number,
  freq2: number
): { ratio: number; isHarmonic: boolean; relationship: string } => {
  const ratio = freq1 / freq2
  const log2Ratio = Math.log2(ratio)
  const nearestOctave = Math.round(log2Ratio)
  const octaveError = Math.abs(log2Ratio - nearestOctave)

  // Check for octave relationship
  if (octaveError < 0.08) { // Within ~1.3 semitones of an octave
    if (nearestOctave === 0) {
      return { ratio, isHarmonic: true, relationship: 'unison' }
    } else if (nearestOctave === 1) {
      return { ratio, isHarmonic: true, relationship: 'octave-up' }
    } else if (nearestOctave === -1) {
      return { ratio, isHarmonic: true, relationship: 'octave-down' }
    } else if (nearestOctave === 2) {
      return { ratio, isHarmonic: true, relationship: 'two-octaves-up' }
    } else if (nearestOctave === -2) {
      return { ratio, isHarmonic: true, relationship: 'two-octaves-down' }
    }
  }

  // Check for perfect fifth (3:2 ratio, ~7 semitones)
  const fifthRatio = freq1 / freq2
  if (Math.abs(fifthRatio - 1.5) < 0.05 || Math.abs(fifthRatio - 0.667) < 0.03) {
    return { ratio, isHarmonic: true, relationship: 'fifth' }
  }

  return { ratio, isHarmonic: false, relationship: 'none' }
}

/**
 * Get neighboring notes (one semitone up and down)
 * Used to check if a detected note is an adjacent note to expected
 */
export const getAdjacentNotes = (noteName: string): { lower: string; higher: string } | null => {
  const midi = noteToMidi(noteName)
  if (midi === null) return null

  return {
    lower: midiToNote(midi - 1),
    higher: midiToNote(midi + 1)
  }
}

/**
 * Normalizes a note name to use sharps (no flats)
 * @param noteName - Note name that may use flats (e.g., "Bb4")
 * @returns Normalized note name using sharps (e.g., "A#4")
 */
export const normalizeNoteName = (noteName: string): string => {
  const flatToSharp: Record<string, string> = {
    Db: 'C#',
    Eb: 'D#',
    Fb: 'E',
    Gb: 'F#',
    Ab: 'G#',
    Bb: 'A#',
    Cb: 'B'
  }

  for (const [flat, sharp] of Object.entries(flatToSharp)) {
    if (noteName.startsWith(flat)) {
      return noteName.replace(flat, sharp)
    }
  }

  return noteName
}

/**
 * Gets the MIDI note number from a note name
 * @param noteName - Note name with octave (e.g., "C4")
 * @returns MIDI note number or null if invalid
 */
export const noteToMidi = (noteName: string): number | null => {
  const match = noteName.match(/^([A-G]#?)(\d+)$/)
  if (!match) return null

  const [, note, octaveStr] = match
  const octave = parseInt(octaveStr, 10)
  const noteIndex = NOTE_NAMES.indexOf(note as typeof NOTE_NAMES[number])

  if (noteIndex === -1) return null

  return (octave + 1) * 12 + noteIndex
}

/**
 * Gets a note name from a MIDI note number
 * @param midiNote - MIDI note number
 * @returns Note name with octave (e.g., "C4")
 */
export const midiToNote = (midiNote: number): string => {
  const noteIndex = midiNote % 12
  const octave = Math.floor(midiNote / 12) - 1
  return `${NOTE_NAMES[noteIndex]}${octave}`
}

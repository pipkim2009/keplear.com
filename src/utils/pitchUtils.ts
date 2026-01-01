/**
 * Pitch detection and analysis utilities
 * Used for real-time performance grading (Yousician-style)
 */

import { MUSIC_CONFIG } from '../constants'

/**
 * A4 reference frequency (standard tuning)
 */
const A4_FREQUENCY = 440

/**
 * A4 MIDI note number
 */
const A4_MIDI = 69

/**
 * Chromatic note names for conversion
 */
const NOTE_NAMES = MUSIC_CONFIG.chromaticNotes

/**
 * Pitch tolerance in cents (±50 cents = half a semitone)
 * This matches Yousician's approach - if you're within 50 cents, you hit the note
 */
export const PITCH_TOLERANCE_CENTS = 50

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

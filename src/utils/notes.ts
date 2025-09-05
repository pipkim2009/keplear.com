import { MUSIC_CONFIG, LAYOUT_CONFIG } from '../constants'

/**
 * Represents a musical note with its properties
 */
export interface Note {
  /** The note name including octave (e.g., "C4", "F#5") */
  readonly name: string
  /** The frequency in Hz */
  readonly frequency: number
  /** Whether this is a black key (sharp/flat) */
  readonly isBlack: boolean
  /** The position index in the note sequence */
  readonly position: number
}

/**
 * The chromatic note names in a single octave
 */
const CHROMATIC_NOTES = MUSIC_CONFIG.chromaticNotes

/**
 * Base frequency for C4 in Hz
 */
const C4_FREQUENCY = MUSIC_CONFIG.c4Frequency

/**
 * Number of semitones in an octave
 */
const SEMITONES_PER_OCTAVE = MUSIC_CONFIG.semitonesPerOctave

/**
 * Generates all notes for the keyboard range (C4 to B5)
 * @returns Array of Note objects
 */
export const generateNotes = (): readonly Note[] => {
  const notes: Note[] = []
  const { startOctave, endOctave } = MUSIC_CONFIG.keyboardRange
  
  for (let octave = startOctave; octave <= endOctave; octave++) {
    CHROMATIC_NOTES.forEach((noteName, index) => {
      const octaveOffset = (octave - startOctave) * SEMITONES_PER_OCTAVE
      const position = octaveOffset + index
      const frequency = C4_FREQUENCY * Math.pow(2, position / SEMITONES_PER_OCTAVE)
      
      notes.push({
        name: `${noteName}${octave}`,
        frequency: Math.round(frequency * 100) / 100,
        isBlack: noteName.includes('#'),
        position
      })
    })
  }
  
  return Object.freeze(notes)
}

/**
 * All musical notes in the keyboard range
 */
export const notes = generateNotes()

/**
 * Only the white keys (natural notes)
 */
export const whiteKeys = notes.filter(note => !note.isBlack)

/**
 * Only the black keys (sharp/flat notes)
 */
export const blackKeys = notes.filter(note => note.isBlack)

/**
 * Keyboard layout constants
 */
const KEYBOARD_DIMENSIONS = {
  whiteKeyWidth: LAYOUT_CONFIG.whiteKeyWidth,
  blackKeyWidth: LAYOUT_CONFIG.blackKeyWidth
} as const

/**
 * Pre-calculated positions for black keys based on their position in the note sequence
 */
const BLACK_KEY_POSITIONS: Readonly<Record<number, number>> = Object.freeze({
  // First octave (C4-B4)
  1: KEYBOARD_DIMENSIONS.whiteKeyWidth * 1 - KEYBOARD_DIMENSIONS.blackKeyWidth / 2,   // C#4
  3: KEYBOARD_DIMENSIONS.whiteKeyWidth * 2 - KEYBOARD_DIMENSIONS.blackKeyWidth / 2,   // D#4
  6: KEYBOARD_DIMENSIONS.whiteKeyWidth * 4 - KEYBOARD_DIMENSIONS.blackKeyWidth / 2,   // F#4
  8: KEYBOARD_DIMENSIONS.whiteKeyWidth * 5 - KEYBOARD_DIMENSIONS.blackKeyWidth / 2,   // G#4
  10: KEYBOARD_DIMENSIONS.whiteKeyWidth * 6 - KEYBOARD_DIMENSIONS.blackKeyWidth / 2,  // A#4
  
  // Second octave (C5-B5)
  13: KEYBOARD_DIMENSIONS.whiteKeyWidth * 8 - KEYBOARD_DIMENSIONS.blackKeyWidth / 2,  // C#5
  15: KEYBOARD_DIMENSIONS.whiteKeyWidth * 9 - KEYBOARD_DIMENSIONS.blackKeyWidth / 2,  // D#5
  18: KEYBOARD_DIMENSIONS.whiteKeyWidth * 11 - KEYBOARD_DIMENSIONS.blackKeyWidth / 2, // F#5
  20: KEYBOARD_DIMENSIONS.whiteKeyWidth * 12 - KEYBOARD_DIMENSIONS.blackKeyWidth / 2, // G#5
  22: KEYBOARD_DIMENSIONS.whiteKeyWidth * 13 - KEYBOARD_DIMENSIONS.blackKeyWidth / 2, // A#5
})

/**
 * Calculates the left position for a black key based on its position in the note sequence
 * @param position - The position index of the note
 * @returns The left offset in pixels, or 0 if position is not a black key
 */
export const getBlackKeyLeft = (position: number): number => {
  return BLACK_KEY_POSITIONS[position] ?? 0
}
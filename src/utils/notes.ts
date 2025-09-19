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
 * Generates notes for an expanded keyboard range with octave offset
 * @param octaveOffset - Number of additional octaves to add (positive = higher octaves, negative = lower octaves)
 * @returns Array of Note objects
 */
export const generateNotesWithOffset = (octaveOffset: number = 0): readonly Note[] => {
  const notes: Note[] = []
  const { startOctave, endOctave } = MUSIC_CONFIG.keyboardRange
  
  // Calculate expanded range
  const finalStartOctave = octaveOffset < 0 ? startOctave + octaveOffset : startOctave
  const finalEndOctave = octaveOffset > 0 ? endOctave + octaveOffset : endOctave
  
  for (let octave = finalStartOctave; octave <= finalEndOctave; octave++) {
    CHROMATIC_NOTES.forEach((noteName, index) => {
      const relativeOctavePosition = (octave - finalStartOctave) * SEMITONES_PER_OCTAVE
      const position = relativeOctavePosition + index
      const frequency = C4_FREQUENCY * Math.pow(2, ((octave - 4) * SEMITONES_PER_OCTAVE + index) / SEMITONES_PER_OCTAVE)
      
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
 * Generate white keys with octave offset
 * @param octaveOffset - Number to offset the base octave range
 * @returns Array of white key Note objects
 */
export const generateWhiteKeysWithOffset = (octaveOffset: number = 0): readonly Note[] => {
  return generateNotesWithOffset(octaveOffset).filter(note => !note.isBlack)
}

/**
 * Generate black keys with octave offset
 * @param octaveOffset - Number to offset the base octave range
 * @returns Array of black key Note objects
 */
export const generateBlackKeysWithOffset = (octaveOffset: number = 0): readonly Note[] => {
  return generateNotesWithOffset(octaveOffset).filter(note => note.isBlack)
}

/**
 * Generates notes for a keyboard range with separate lower and higher octave additions
 * @param lowerOctaves - Number of octaves to add below the base range
 * @param higherOctaves - Number of octaves to add above the base range
 * @returns Array of Note objects
 */
export const generateNotesWithSeparateOctaves = (lowerOctaves: number = 0, higherOctaves: number = 0): readonly Note[] => {
  const notes: Note[] = []
  const { startOctave, endOctave } = MUSIC_CONFIG.keyboardRange
  
  // Calculate expanded range
  const finalStartOctave = startOctave - lowerOctaves
  const finalEndOctave = endOctave + higherOctaves
  
  for (let octave = finalStartOctave; octave <= finalEndOctave; octave++) {
    CHROMATIC_NOTES.forEach((noteName, index) => {
      const relativeOctavePosition = (octave - finalStartOctave) * SEMITONES_PER_OCTAVE
      const position = relativeOctavePosition + index
      const frequency = C4_FREQUENCY * Math.pow(2, ((octave - 4) * SEMITONES_PER_OCTAVE + index) / SEMITONES_PER_OCTAVE)
      
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
 * Generate white keys with separate lower and higher octave additions
 * @param lowerOctaves - Number of octaves to add below the base range
 * @param higherOctaves - Number of octaves to add above the base range
 * @returns Array of white key Note objects
 */
export const generateWhiteKeysWithSeparateOctaves = (lowerOctaves: number = 0, higherOctaves: number = 0): readonly Note[] => {
  return generateNotesWithSeparateOctaves(lowerOctaves, higherOctaves).filter(note => !note.isBlack)
}

/**
 * Generate black keys with separate lower and higher octave additions
 * @param lowerOctaves - Number of octaves to add below the base range
 * @param higherOctaves - Number of octaves to add above the base range
 * @returns Array of black key Note objects
 */
export const generateBlackKeysWithSeparateOctaves = (lowerOctaves: number = 0, higherOctaves: number = 0): readonly Note[] => {
  return generateNotesWithSeparateOctaves(lowerOctaves, higherOctaves).filter(note => note.isBlack)
}

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

/**
 * Calculates the left position for a black key based on its note name and all white keys
 * @param note - The black key note
 * @param whiteKeys - Array of all white keys
 * @returns The left offset in pixels
 */
export const getBlackKeyLeftDynamic = (note: Note, whiteKeys: readonly Note[]): number => {
  if (!note.isBlack) return 0
  
  // Extract the note name without octave (e.g., "C#" from "C#4")
  const noteName = note.name.slice(0, -1)
  const blackOctave = parseInt(note.name.slice(-1))
  
  // Find the index of this black key in the sorted list of all notes
  let whiteKeysBeforeThisBlack = 0
  
  for (const whiteKey of whiteKeys) {
    const whiteOctave = parseInt(whiteKey.name.slice(-1))
    const whiteNoteName = whiteKey.name.slice(0, -1)
    
    // Count white keys that come before this black key chronologically
    if (whiteOctave < blackOctave) {
      // All white keys from previous octaves
      whiteKeysBeforeThisBlack++
    } else if (whiteOctave === blackOctave) {
      // White keys from same octave that come before this black key
      const noteOrder = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
      const whiteNotePosition = noteOrder.indexOf(whiteNoteName)
      const blackNotePosition = noteOrder.indexOf(noteName)
      
      if (whiteNotePosition < blackNotePosition) {
        whiteKeysBeforeThisBlack++
      }
    }
  }
  
  // Calculate position: (white keys before) * (white key width including margin) - half black key width
  // whiteKeyWidth already includes the 2px margin (62px total)
  // Base offset for expanded keyboard - will be adjusted by CSS for mobile
  return (whiteKeysBeforeThisBlack * KEYBOARD_DIMENSIONS.whiteKeyWidth) - (KEYBOARD_DIMENSIONS.blackKeyWidth / 2) - 40
}
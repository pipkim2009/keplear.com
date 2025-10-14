import { GUITAR_SCALES, ROOT_NOTES, getScaleNotes, type GuitarScale } from '../guitar/guitarScales'
import type { Note } from '../../notes'

/**
 * Apply a scale to keyboard notes within the current octave range
 * @param rootNote - The root note of the scale
 * @param scale - The scale to apply
 * @param availableNotes - All available keyboard notes in current range
 * @returns Array of notes that belong to the scale
 */
export const applyScaleToKeyboard = (
  rootNote: string,
  scale: GuitarScale,
  availableNotes: readonly Note[]
): Note[] => {
  const scaleNotes = getScaleNotes(rootNote, scale)
  const keyboardScaleNotes: Note[] = []

  availableNotes.forEach(note => {
    // Remove octave number from note name for comparison (e.g., "C4" becomes "C")
    const noteNameWithoutOctave = note.name.replace(/\d+$/, '')

    if (scaleNotes.includes(noteNameWithoutOctave)) {
      keyboardScaleNotes.push(note)
    }
  })

  return keyboardScaleNotes
}

/**
 * Check if a keyboard note belongs to a given scale
 * @param note - The note to check
 * @param rootNote - The root note of the scale
 * @param scale - The scale to check against
 * @returns True if the note belongs to the scale
 */
export const isKeyboardNoteInScale = (
  note: Note,
  rootNote: string,
  scale: GuitarScale
): boolean => {
  const scaleNotes = getScaleNotes(rootNote, scale)
  const noteNameWithoutOctave = note.name.replace(/\d+$/, '')
  return scaleNotes.includes(noteNameWithoutOctave)
}

/**
 * Check if a keyboard note is the root note of a scale
 * @param note - The note to check
 * @param rootNote - The root note of the scale
 * @returns True if the note is the root note
 */
export const isKeyboardNoteRoot = (note: Note, rootNote: string): boolean => {
  const noteNameWithoutOctave = note.name.replace(/\d+$/, '')
  return noteNameWithoutOctave === rootNote
}

// Re-export guitar scales and utilities for keyboard use
export { GUITAR_SCALES as KEYBOARD_SCALES, ROOT_NOTES, type GuitarScale as KeyboardScale }
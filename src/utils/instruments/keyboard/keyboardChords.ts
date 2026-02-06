import { getChordNotes, type GuitarChord } from '../guitar/guitarChords'
import type { Note } from '../../notes'

/**
 * Apply a chord to keyboard notes within the current octave range
 * @param rootNote - The root note of the chord
 * @param chord - The chord to apply
 * @param availableNotes - All available keyboard notes in current range
 * @returns Array of notes that belong to the chord
 */
export const applyChordToKeyboard = (
  rootNote: string,
  chord: GuitarChord,
  availableNotes: readonly Note[]
): Note[] => {
  const chordNotes = getChordNotes(rootNote, chord)
  const keyboardChordNotes: Note[] = []

  availableNotes.forEach(note => {
    // Remove octave number from note name for comparison (e.g., "C4" becomes "C")
    const noteNameWithoutOctave = note.name.replace(/\d+$/, '')

    if (chordNotes.includes(noteNameWithoutOctave)) {
      keyboardChordNotes.push(note)
    }
  })

  return keyboardChordNotes
}

/**
 * Check if a keyboard note belongs to a given chord
 * @param note - The note to check
 * @param rootNote - The root note of the chord
 * @param chord - The chord to check against
 * @returns True if the note belongs to the chord
 */
export const isKeyboardNoteInChord = (
  note: Note,
  rootNote: string,
  chord: GuitarChord
): boolean => {
  const chordNotes = getChordNotes(rootNote, chord)
  const noteNameWithoutOctave = note.name.replace(/\d+$/, '')
  return chordNotes.includes(noteNameWithoutOctave)
}

/**
 * Check if a keyboard note is the root note of a chord
 * @param note - The note to check
 * @param rootNote - The root note of the chord
 * @returns True if the note is the root note
 */
export const isKeyboardNoteChordRoot = (note: Note, rootNote: string): boolean => {
  const noteNameWithoutOctave = note.name.replace(/\d+$/, '')
  return noteNameWithoutOctave === rootNote
}

/**
 * Get chord voicings in different octaves for keyboard
 * @param rootNote - The root note of the chord
 * @param chord - The chord to get voicings for
 * @param availableNotes - All available keyboard notes
 * @returns Object with different voicing options
 */
export const getKeyboardChordVoicings = (
  rootNote: string,
  chord: GuitarChord,
  availableNotes: readonly Note[]
): {
  root: Note[]
  firstInversion: Note[]
  secondInversion: Note[]
  spread: Note[]
} => {
  const chordNotes = applyChordToKeyboard(rootNote, chord, availableNotes)

  // Group notes by octave
  const notesByOctave: { [octave: number]: Note[] } = {}
  chordNotes.forEach(note => {
    const octaveMatch = note.name.match(/\d+$/)
    const octave = octaveMatch ? parseInt(octaveMatch[0]) : 4
    if (!notesByOctave[octave]) {
      notesByOctave[octave] = []
    }
    notesByOctave[octave].push(note)
  })

  // Get chord intervals for voicings
  const intervals = chord.intervals
  const chordToneNames = intervals.map(interval => {
    const rootIndex = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].indexOf(
      rootNote
    )
    const noteIndex = (rootIndex + interval) % 12
    return ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][noteIndex]
  })

  // Create different voicings
  const voicings = {
    root: [] as Note[],
    firstInversion: [] as Note[],
    secondInversion: [] as Note[],
    spread: [] as Note[],
  }

  // Find notes for each voicing type across octaves
  Object.values(notesByOctave).forEach(octaveNotes => {
    octaveNotes.forEach(note => {
      const noteName = note.name.replace(/\d+$/, '')
      const chordToneIndex = chordToneNames.indexOf(noteName)

      if (chordToneIndex !== -1) {
        voicings.root.push(note)
        voicings.firstInversion.push(note)
        voicings.secondInversion.push(note)
        voicings.spread.push(note)
      }
    })
  })

  return voicings
}

// Re-export guitar chords and utilities for keyboard use
export {
  GUITAR_CHORDS as KEYBOARD_CHORDS,
  CHORD_ROOT_NOTES as KEYBOARD_CHORD_ROOT_NOTES,
  type GuitarChord as KeyboardChord,
} from '../guitar/guitarChords'

import { useCallback } from 'react'
import type { Note } from '../utils/notes'
import type { AppliedChord, AppliedScale } from '../components/common/ScaleChordOptions'
import type { KeyboardScale } from '../utils/instruments/keyboard/keyboardScales'
import { isKeyboardNoteInScale, isKeyboardNoteRoot } from '../utils/instruments/keyboard/keyboardScales'

interface UseKeyboardHighlightingProps {
  instrument: string
  appliedScales: AppliedScale[]
  appliedChords: AppliedChord[]
  currentKeyboardScale: { root: string; scale: KeyboardScale } | null
  lowerOctaves: number
  higherOctaves: number
}

export const useKeyboardHighlighting = ({
  instrument,
  appliedScales,
  appliedChords,
  currentKeyboardScale,
  lowerOctaves,
  higherOctaves
}: UseKeyboardHighlightingProps) => {

  // Helper functions for keyboard scale and chord highlighting
  const isNoteInKeyboardScale = useCallback((note: Note): boolean => {
    // Check against all applied keyboard scales, not just the current one
    if (instrument === 'keyboard' && appliedScales.length > 0) {
      return appliedScales.some(appliedScale => {
        return isKeyboardNoteInScale(note, appliedScale.root, appliedScale.scale)
      })
    }
    // Fallback to current scale for backward compatibility
    if (currentKeyboardScale) {
      return isKeyboardNoteInScale(note, currentKeyboardScale.root, currentKeyboardScale.scale)
    }
    return false
  }, [instrument, appliedScales, currentKeyboardScale])

  const isNoteInKeyboardChord = useCallback((note: Note): boolean => {
    // Check against all applied keyboard chords, not just the current one
    if (instrument === 'keyboard' && appliedChords.length > 0) {
      return appliedChords.some(appliedChord => {
        if (appliedChord.notes) {
          // Check if this note matches any of the applied chord's notes
          return appliedChord.notes.some(chordNote => chordNote.name === note.name)
        }
        return false
      })
    }
    return false
  }, [instrument, appliedChords])

  const isNoteKeyboardRoot = useCallback((note: Note): boolean => {
    // Check against all applied keyboard scales, not just the current one
    if (instrument === 'keyboard' && appliedScales.length > 0) {
      return appliedScales.some(appliedScale => {
        return isKeyboardNoteRoot(note, appliedScale.root)
      })
    }
    // Fallback to current scale for backward compatibility
    if (currentKeyboardScale) {
      return isKeyboardNoteRoot(note, currentKeyboardScale.root)
    }
    return false
  }, [instrument, appliedScales, currentKeyboardScale])

  const isNoteKeyboardChordRoot = useCallback((note: Note): boolean => {
    // Check if this note is a root of any applied keyboard chord
    if (instrument === 'keyboard' && appliedChords.length > 0) {
      return appliedChords.some(appliedChord => {
        if (appliedChord.notes) {
          // Check if this note is the root of any applied chord
          const noteNameWithoutOctave = note.name.replace(/\d+$/, '')
          return appliedChord.root === noteNameWithoutOctave
        }
        return false
      })
    }
    return false
  }, [instrument, appliedChords])

  // NOTE: We removed the useEffect that was auto-adding scale/chord notes to selectedNotes
  // This hook should ONLY provide highlighting detection, not modify selections
  // Scale/chord notes are stored in appliedScales/appliedChords and should NOT be in selectedNotes

  return {
    isNoteInKeyboardScale,
    isNoteInKeyboardChord,
    isNoteKeyboardRoot,
    isNoteKeyboardChordRoot
  }
}
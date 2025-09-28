import { useCallback, useEffect } from 'react'
import type { Note } from '../utils/notes'
import type { AppliedChord, AppliedScale } from '../components/common/ScaleChordOptions'
import type { KeyboardScale } from '../utils/keyboardScales'
import type { KeyboardChord } from '../utils/keyboardChords'
import { isKeyboardNoteInScale, isKeyboardNoteRoot, applyScaleToKeyboard } from '../utils/keyboardScales'
import { applyChordToKeyboard } from '../utils/keyboardChords'
import { generateNotesWithSeparateOctaves } from '../utils/notes'

interface UseKeyboardHighlightingProps {
  instrument: string
  appliedScales: AppliedScale[]
  appliedChords: AppliedChord[]
  currentKeyboardScale: { root: string; scale: KeyboardScale } | null
  lowerOctaves: number
  higherOctaves: number
  setGuitarNotes: (notes: Note[]) => void
}

export const useKeyboardHighlighting = ({
  instrument,
  appliedScales,
  appliedChords,
  currentKeyboardScale,
  lowerOctaves,
  higherOctaves,
  setGuitarNotes
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

  // Auto-reapply keyboard scale/chords when octave range changes (but not on initial application)
  useEffect(() => {
    if (currentKeyboardScale) {
      // Generate current keyboard notes based on octave range
      const currentNotes = (lowerOctaves !== 0 || higherOctaves !== 0)
        ? generateNotesWithSeparateOctaves(lowerOctaves, higherOctaves)
        : generateNotesWithSeparateOctaves(0, 0) // Default range

      // Apply scale to get scale notes
      const scaleNotes = applyScaleToKeyboard(currentKeyboardScale.root, currentKeyboardScale.scale, currentNotes)

      // Set these notes as selected (this will trigger the melody system)
      setGuitarNotes(scaleNotes)
    } else if (appliedChords.length > 0 && instrument === 'keyboard') {
      // Generate current keyboard notes based on octave range
      const currentNotes = (lowerOctaves !== 0 || higherOctaves !== 0)
        ? generateNotesWithSeparateOctaves(lowerOctaves, higherOctaves)
        : generateNotesWithSeparateOctaves(0, 0) // Default range

      // Reapply all keyboard chords to the new octave range
      let allChordNotes: Note[] = []
      appliedChords.forEach(appliedChord => {
        if (appliedChord.notes) {
          // Re-generate chord notes for the new octave range
          const chordNotes = applyChordToKeyboard(appliedChord.root, appliedChord.chord as KeyboardChord, currentNotes)
          allChordNotes.push(...chordNotes)
        }
      })

      // Remove duplicates and set as selected
      const uniqueNotes = Array.from(
        new Map(allChordNotes.map(note => [note.position, note])).values()
      )
      setGuitarNotes(uniqueNotes)
    }
  }, [lowerOctaves, higherOctaves, currentKeyboardScale, appliedChords, instrument])

  return {
    isNoteInKeyboardScale,
    isNoteInKeyboardChord,
    isNoteKeyboardRoot,
    isNoteKeyboardChordRoot
  }
}
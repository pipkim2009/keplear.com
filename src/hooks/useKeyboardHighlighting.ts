import { useCallback, useMemo } from 'react'
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

/**
 * Hook for keyboard note highlighting
 * Optimized with pre-computed Sets for O(1) lookup instead of O(n*m) iteration
 */
export const useKeyboardHighlighting = ({
  instrument,
  appliedScales,
  appliedChords,
  currentKeyboardScale,
}: UseKeyboardHighlightingProps) => {

  // Pre-compute Sets for O(1) lookup performance
  // This runs once when appliedScales/appliedChords change, not on every note check
  const scaleNoteNames = useMemo(() => {
    if (instrument !== 'keyboard' || appliedScales.length === 0) {
      return new Set<string>()
    }

    const names = new Set<string>()
    for (const appliedScale of appliedScales) {
      if (appliedScale.notes) {
        for (const note of appliedScale.notes) {
          names.add(note.name)
        }
      }
    }
    return names
  }, [instrument, appliedScales])

  const chordNoteNames = useMemo(() => {
    if (instrument !== 'keyboard' || appliedChords.length === 0) {
      return new Set<string>()
    }

    const names = new Set<string>()
    for (const appliedChord of appliedChords) {
      if (appliedChord.notes) {
        for (const note of appliedChord.notes) {
          names.add(note.name)
        }
      }
    }
    return names
  }, [instrument, appliedChords])

  // Pre-compute root notes for scales
  const scaleRootNotes = useMemo(() => {
    if (instrument !== 'keyboard' || appliedScales.length === 0) {
      return new Set<string>()
    }

    const roots = new Set<string>()
    for (const appliedScale of appliedScales) {
      if (appliedScale.notes) {
        for (const scaleNote of appliedScale.notes) {
          const noteNameWithoutOctave = scaleNote.name.replace(/\d+$/, '')
          if (noteNameWithoutOctave === appliedScale.root) {
            roots.add(scaleNote.name)
          }
        }
      }
    }
    return roots
  }, [instrument, appliedScales])

  // Pre-compute root notes for chords
  const chordRootNotes = useMemo(() => {
    if (instrument !== 'keyboard' || appliedChords.length === 0) {
      return new Set<string>()
    }

    const roots = new Set<string>()
    for (const appliedChord of appliedChords) {
      roots.add(appliedChord.root)
    }
    return roots
  }, [instrument, appliedChords])

  // O(1) lookup using pre-computed Sets
  const isNoteInKeyboardScale = useCallback((note: Note): boolean => {
    // Fast path: check pre-computed Set
    if (scaleNoteNames.size > 0) {
      return scaleNoteNames.has(note.name)
    }

    // Fallback to current scale for backward compatibility
    if (currentKeyboardScale) {
      return isKeyboardNoteInScale(note, currentKeyboardScale.root, currentKeyboardScale.scale)
    }
    return false
  }, [scaleNoteNames, currentKeyboardScale])

  const isNoteInKeyboardChord = useCallback((note: Note): boolean => {
    // Fast path: O(1) Set lookup
    return chordNoteNames.has(note.name)
  }, [chordNoteNames])

  const isNoteKeyboardRoot = useCallback((note: Note): boolean => {
    // Fast path: check pre-computed Set
    if (scaleRootNotes.size > 0) {
      return scaleRootNotes.has(note.name)
    }

    // Fallback to current scale for backward compatibility
    if (currentKeyboardScale) {
      return isKeyboardNoteRoot(note, currentKeyboardScale.root)
    }
    return false
  }, [scaleRootNotes, currentKeyboardScale])

  const isNoteKeyboardChordRoot = useCallback((note: Note): boolean => {
    // Fast path: check if note name (without octave) is in chord roots
    if (chordRootNotes.size > 0) {
      const noteNameWithoutOctave = note.name.replace(/\d+$/, '')
      return chordRootNotes.has(noteNameWithoutOctave)
    }
    return false
  }, [chordRootNotes])

  // NOTE: This hook should ONLY provide highlighting detection, not modify selections
  // Scale/chord notes are stored in appliedScales/appliedChords and should NOT be in selectedNotes

  return {
    isNoteInKeyboardScale,
    isNoteInKeyboardChord,
    isNoteKeyboardRoot,
    isNoteKeyboardChordRoot
  }
}

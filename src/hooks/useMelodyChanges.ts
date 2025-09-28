import { useState, useEffect, useRef } from 'react'
import type { Note } from '../utils/notes'

interface UseMelodyChangesProps {
  selectedNotes: readonly Note[]
  bpm: number
  numberOfNotes: number
  generatedMelody: readonly Note[]
  instrument: string
  keyboardSelectionMode: string
}

interface UseMelodyChangesReturn {
  hasChanges: boolean
  clearChanges: () => void
}

/**
 * Hook to track changes that would require regenerating the melody
 * Shows a badge when note selection, BPM, or number of notes change
 */
export const useMelodyChanges = ({
  selectedNotes,
  bpm,
  numberOfNotes,
  generatedMelody,
  instrument,
  keyboardSelectionMode
}: UseMelodyChangesProps): UseMelodyChangesReturn => {
  const [hasChanges, setHasChanges] = useState(false)
  const [lastMelodyLength, setLastMelodyLength] = useState(0)

  // Check if user has enough notes selected to generate a melody
  const canGenerateMelody = () => {
    if (instrument === 'keyboard') {
      if (keyboardSelectionMode === 'range') {
        return selectedNotes.length === 2  // Range mode needs exactly 2 notes
      } else {
        return selectedNotes.length > 0   // Multi mode needs at least 1 note
      }
    } else {
      return selectedNotes.length > 0     // Guitar/Bass needs at least 1 note
    }
  }

  // Track the last values when melody was generated
  const lastValuesRef = useRef<{
    selectedNotes: string[]
    bpm: number
    numberOfNotes: number
    melodyGenerated: boolean
  }>({
    selectedNotes: [],
    bpm: 120,
    numberOfNotes: 8,
    melodyGenerated: false
  })

  // Update tracking when melody is generated
  useEffect(() => {
    if (generatedMelody.length > 0 && generatedMelody.length !== lastMelodyLength) {
      const noteNames = selectedNotes.map(note => note.name)
      lastValuesRef.current = {
        selectedNotes: [...noteNames],
        bpm,
        numberOfNotes,
        melodyGenerated: true
      }
      setHasChanges(false)
      setLastMelodyLength(generatedMelody.length)
    }
  }, [generatedMelody.length, selectedNotes, bpm, numberOfNotes, lastMelodyLength])

  // Track changes in parameters
  useEffect(() => {
    const last = lastValuesRef.current
    const currentNoteNames = selectedNotes.map(note => note.name)

    // If no melody has been generated yet, don't show changes indicator
    if (!lastValuesRef.current.melodyGenerated) {
      setHasChanges(false)
      return
    }

    // Check if selected notes changed
    const notesChanged = currentNoteNames.length !== last.selectedNotes.length ||
      currentNoteNames.some((name, index) => name !== last.selectedNotes[index])

    // Check if BPM or number of notes changed
    const bpmChanged = bpm !== last.bpm
    const numberOfNotesChanged = numberOfNotes !== last.numberOfNotes

    const hasAnyChanges = notesChanged || bpmChanged || numberOfNotesChanged

    // Only show badge if there are changes AND user can generate a melody
    setHasChanges(hasAnyChanges && canGenerateMelody())
  }, [selectedNotes, bpm, numberOfNotes, instrument, keyboardSelectionMode])

  const clearChanges = () => {
    const noteNames = selectedNotes.map(note => note.name)
    setHasChanges(false)
    lastValuesRef.current = {
      selectedNotes: [...noteNames],
      bpm,
      numberOfNotes,
      melodyGenerated: true
    }
  }

  return {
    hasChanges,
    clearChanges
  }
}
import { useState, useEffect, useRef } from 'react'
import type { Note } from '../utils/notes'
import type { AppliedChord } from '../components/common/ScaleChordOptions'

interface UseMelodyChangesProps {
  selectedNotes: readonly Note[]
  bpm: number
  numberOfBeats: number
  generatedMelody: readonly Note[]
  instrument: string
  keyboardSelectionMode: string
  appliedChords?: AppliedChord[]
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
  numberOfBeats,
  generatedMelody,
  instrument,
  keyboardSelectionMode,
  appliedChords = []
}: UseMelodyChangesProps): UseMelodyChangesReturn => {
  const [hasChanges, setHasChanges] = useState(false)
  const [lastMelodyLength, setLastMelodyLength] = useState(0)

  // Check if user has enough notes selected to generate a melody
  const canGenerateMelody = () => {
    // If there are applied chords, we can always generate a melody (progression mode)
    if (appliedChords.length > 0) {
      return true
    }

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
    appliedChordIds: string[]
    bpm: number
    numberOfBeats: number
    melodyGenerated: boolean
  }>({
    selectedNotes: [],
    appliedChordIds: [],
    bpm: 120,
    numberOfBeats: 8,
    melodyGenerated: false
  })

  // Update tracking when melody is generated
  useEffect(() => {
    if (generatedMelody.length > 0 && generatedMelody.length !== lastMelodyLength) {
      const noteNames = selectedNotes.map(note => note.name)
      const chordIds = appliedChords.map(chord => chord.id)
      lastValuesRef.current = {
        selectedNotes: [...noteNames],
        appliedChordIds: [...chordIds],
        bpm,
        numberOfBeats,
        melodyGenerated: true
      }
      setHasChanges(false)
      setLastMelodyLength(generatedMelody.length)
    }
  }, [generatedMelody.length, selectedNotes, appliedChords, bpm, numberOfBeats, lastMelodyLength])

  // Track changes in parameters
  useEffect(() => {
    const last = lastValuesRef.current
    const currentNoteNames = selectedNotes.map(note => note.name)
    const currentChordIds = appliedChords.map(chord => chord.id)

    // If no melody has been generated yet, don't show changes indicator
    if (!lastValuesRef.current.melodyGenerated) {
      setHasChanges(false)
      return
    }

    // Check if selected notes changed
    const notesChanged = currentNoteNames.length !== last.selectedNotes.length ||
      currentNoteNames.some((name, index) => name !== last.selectedNotes[index])

    // Check if applied chords changed
    const chordsChanged = currentChordIds.length !== last.appliedChordIds.length ||
      currentChordIds.some((id, index) => id !== last.appliedChordIds[index])

    // Check if BPM or number of beats changed
    const bpmChanged = bpm !== last.bpm
    const numberOfBeatsChanged = numberOfBeats !== last.numberOfBeats

    const hasAnyChanges = notesChanged || chordsChanged || bpmChanged || numberOfBeatsChanged

    // Only show badge if there are changes AND user can generate a melody
    setHasChanges(hasAnyChanges && canGenerateMelody())
  }, [selectedNotes, appliedChords, bpm, numberOfBeats, instrument, keyboardSelectionMode])

  const clearChanges = () => {
    const noteNames = selectedNotes.map(note => note.name)
    const chordIds = appliedChords.map(chord => chord.id)
    setHasChanges(false)
    lastValuesRef.current = {
      selectedNotes: [...noteNames],
      appliedChordIds: [...chordIds],
      bpm,
      numberOfBeats,
      melodyGenerated: true
    }
  }

  return {
    hasChanges,
    clearChanges
  }
}
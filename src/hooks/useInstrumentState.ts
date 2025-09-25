import { useState, useCallback, useMemo } from 'react'
import type { Note } from '../utils/notes'

interface InstrumentScale<T> {
  root: string
  scale: T
}

interface InstrumentChord<T> {
  root: string
  chord: T
}

interface UseInstrumentStateOptions {
  stringCount: number
  fretCount: number
}

export function useInstrumentState<TScale, TChord>(options: UseInstrumentStateOptions) {
  const { stringCount, fretCount } = options

  // Initialize state with factory functions for better performance
  const [stringCheckboxes, setStringCheckboxes] = useState<boolean[]>(
    () => new Array(stringCount).fill(false)
  )
  const [fretCheckboxes, setFretCheckboxes] = useState<boolean[]>(
    () => new Array(fretCount + 1).fill(false)
  )
  const [selectedNotes, setSelectedNotes] = useState<Set<string>>(() => new Set())
  const [currentScale, setCurrentScale] = useState<InstrumentScale<TScale> | null>(null)
  const [scaleSelectedNotes, setScaleSelectedNotes] = useState<Set<string>>(() => new Set())
  const [currentChord, setCurrentChord] = useState<InstrumentChord<TChord> | null>(null)
  const [chordSelectedNotes, setChordSelectedNotes] = useState<Set<string>>(() => new Set())

  // Hover state
  const [hoveredString, setHoveredString] = useState<number | null>(null)
  const [hoveredFret, setHoveredFret] = useState<number | null>(null)
  const [hoveredNote, setHoveredNote] = useState<{ string: number; fret: number } | null>(null)

  // Clear all selections
  const clearAllSelections = useCallback(() => {
    setStringCheckboxes(new Array(stringCount).fill(false))
    setFretCheckboxes(new Array(fretCount + 1).fill(false))
    setSelectedNotes(new Set())
    setScaleSelectedNotes(new Set())
    setCurrentScale(null)
    setChordSelectedNotes(new Set())
    setCurrentChord(null)
  }, [stringCount, fretCount])

  // Clear scale selections
  const clearScaleSelections = useCallback(() => {
    setCurrentScale(null)
    setScaleSelectedNotes(new Set())
  }, [])

  // Clear chord selections
  const clearChordSelections = useCallback(() => {
    setCurrentChord(null)
    setChordSelectedNotes(new Set())
  }, [])

  // Toggle note selection
  const toggleNoteSelection = useCallback((noteKey: string, add: boolean) => {
    setSelectedNotes(prev => {
      const newSet = new Set(prev)
      if (add) {
        newSet.add(noteKey)
      } else {
        newSet.delete(noteKey)
      }
      return newSet
    })
  }, [])

  // Batch update notes
  const batchUpdateNotes = useCallback((
    notesToAdd: string[],
    notesToRemove: string[]
  ) => {
    setSelectedNotes(prev => {
      const newSet = new Set(prev)
      notesToAdd.forEach(note => newSet.add(note))
      notesToRemove.forEach(note => newSet.delete(note))
      return newSet
    })
  }, [])

  // Check if note is selected
  const isNoteSelected = useCallback((noteKey: string): boolean => {
    return selectedNotes.has(noteKey)
  }, [selectedNotes])

  // Check if note is in scale
  const isNoteInScale = useCallback((noteKey: string): boolean => {
    return scaleSelectedNotes.has(noteKey)
  }, [scaleSelectedNotes])

  // Check if note is in chord
  const isNoteInChord = useCallback((noteKey: string): boolean => {
    return chordSelectedNotes.has(noteKey)
  }, [chordSelectedNotes])

  return useMemo(() => ({
    // State
    stringCheckboxes,
    fretCheckboxes,
    selectedNotes,
    currentScale,
    scaleSelectedNotes,
    currentChord,
    chordSelectedNotes,
    hoveredString,
    hoveredFret,
    hoveredNote,

    // State setters
    setStringCheckboxes,
    setFretCheckboxes,
    setSelectedNotes,
    setCurrentScale,
    setScaleSelectedNotes,
    setCurrentChord,
    setChordSelectedNotes,
    setHoveredString,
    setHoveredFret,
    setHoveredNote,

    // Helper functions
    clearAllSelections,
    clearScaleSelections,
    clearChordSelections,
    toggleNoteSelection,
    batchUpdateNotes,
    isNoteSelected,
    isNoteInScale,
    isNoteInChord
  }), [
    stringCheckboxes,
    fretCheckboxes,
    selectedNotes,
    currentScale,
    scaleSelectedNotes,
    currentChord,
    chordSelectedNotes,
    hoveredString,
    hoveredFret,
    hoveredNote,
    clearAllSelections,
    clearScaleSelections,
    clearChordSelections,
    toggleNoteSelection,
    batchUpdateNotes,
    isNoteSelected,
    isNoteInScale,
    isNoteInChord
  ])
}

export default useInstrumentState
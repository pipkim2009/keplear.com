import { useState, useCallback } from 'react'
import type { Note } from '../utils/notes'

/**
 * Supported instrument types for melody generation
 */
type InstrumentType = 'keyboard' | 'guitar'

/**
 * Return type for the melody generator hook
 */
interface UseMelodyGeneratorReturn {
  readonly selectedNotes: readonly Note[]
  readonly generatedMelody: readonly Note[]
  readonly clearTrigger: number
  selectNote: (note: Note) => void
  generateMelody: (notes: readonly Note[], numberOfNotes: number, instrument?: InstrumentType) => void
  setGuitarNotes: (notes: Note[]) => void
  isSelected: (note: Note) => boolean
  isInMelody: (note: Note, showNotes: boolean) => boolean
  clearSelection: () => void
}

/**
 * Custom hook for managing note selection and melody generation
 * Handles different logic for keyboard (range-based) and guitar (selection-based) instruments
 */
export const useMelodyGenerator = (): UseMelodyGeneratorReturn => {
  const [selectedNotes, setSelectedNotes] = useState<readonly Note[]>([])
  const [generatedMelody, setGeneratedMelody] = useState<readonly Note[]>([])
  const [clearTrigger, setClearTrigger] = useState<number>(0)

  /**
   * Selects a note for keyboard instrument (max 2 notes for range selection)
   * @param note - The note to select
   */
  const selectNote = useCallback((note: Note): void => {
    setSelectedNotes(prev => prev.length < 2 ? [...prev, note] : [note])
    setGeneratedMelody([])
  }, [])

  /**
   * Generates a melody based on selected notes and instrument type
   * @param notes - All available notes
   * @param numberOfNotes - Number of notes to generate in the melody
   * @param instrument - The instrument type ('keyboard' or 'guitar')
   */
  const generateMelody = useCallback((
    notes: readonly Note[], 
    numberOfNotes: number, 
    instrument: InstrumentType = 'keyboard'
  ): void => {
    if (numberOfNotes <= 0) {
      console.warn('Number of notes must be positive')
      return
    }

    if (instrument === 'keyboard') {
      // Keyboard logic: requires exactly 2 notes for range selection
      if (selectedNotes.length !== 2) {
        console.warn('Keyboard requires exactly 2 notes selected for range')
        return
      }

      const [note1, note2] = [...selectedNotes].sort((a, b) => a.position - b.position)
      
      // If the same note is selected twice, create melody with just that note
      if (note1.name === note2.name) {
        setGeneratedMelody(Array(numberOfNotes).fill(note1))
        return
      }
      
      // Create melody from notes within the selected range
      const startPos = note1.position
      const endPos = note2.position
      
      const notesInRange = notes.filter(note => 
        note.position >= startPos && note.position <= endPos
      )

      if (notesInRange.length === 0) {
        console.warn('No notes found in selected range')
        return
      }

      const melody = Array(numberOfNotes).fill(null).map(() => 
        notesInRange[Math.floor(Math.random() * notesInRange.length)]
      )

      setGeneratedMelody(melody)
    } else if (instrument === 'guitar') {
      // Guitar logic: use all selected notes directly
      if (selectedNotes.length === 0) {
        console.warn('Guitar requires at least one note selected')
        return
      }

      const melody = Array(numberOfNotes).fill(null).map(() => 
        selectedNotes[Math.floor(Math.random() * selectedNotes.length)]
      )

      setGeneratedMelody(melody)
    }
  }, [selectedNotes])

  /**
   * Guitar-specific method to set all selected notes at once
   * @param notes - Array of notes to select for guitar
   */
  const setGuitarNotes = useCallback((notes: Note[]): void => {
    setSelectedNotes([...notes])
    setGeneratedMelody([])
  }, [])

  /**
   * Checks if a note is currently selected
   * @param note - The note to check
   * @returns True if the note is selected
   */
  const isSelected = useCallback((note: Note): boolean => 
    selectedNotes.some(n => n.name === note.name), [selectedNotes])

  /**
   * Checks if a note is part of the generated melody (when notes are shown)
   * @param note - The note to check
   * @param showNotes - Whether notes are currently being displayed
   * @returns True if the note is in the melody and notes are shown
   */
  const isInMelody = useCallback((note: Note, showNotes: boolean): boolean => 
    showNotes && generatedMelody.some(n => n.name === note.name), [generatedMelody])

  /**
   * Clears all selections and generated melody
   */
  const clearSelection = useCallback((): void => {
    setSelectedNotes([])
    setGeneratedMelody([])
    setClearTrigger(prev => prev + 1)
  }, [])

  return {
    selectedNotes,
    generatedMelody,
    selectNote,
    generateMelody,
    setGuitarNotes,
    isSelected,
    isInMelody,
    clearSelection,
    clearTrigger
  }
}
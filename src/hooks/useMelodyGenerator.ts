import { useState, useCallback } from 'react'
import type { Note, ChordGroupInfo } from '../utils/notes'
import type { AppliedChord, AppliedScale } from '../components/common/ScaleChordOptions'

/**
 * Supported instrument types for melody generation
 */
type InstrumentType = 'keyboard' | 'guitar' | 'bass'

/**
 * Return type for the melody generator hook
 */
interface UseMelodyGeneratorReturn {
  readonly selectedNotes: readonly Note[]
  readonly generatedMelody: readonly Note[]
  readonly clearTrigger: number
  selectNote: (note: Note, selectionMode?: 'range' | 'multi') => void
  generateMelody: (notes: readonly Note[], numberOfNotes: number, instrument?: InstrumentType, selectionMode?: 'range' | 'multi', notesToUse?: readonly Note[], chordMode?: 'arpeggiator' | 'progression', appliedChords?: AppliedChord[], appliedScales?: AppliedScale[]) => void
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
   * Selects a note for keyboard instrument
   * @param note - The note to select
   * @param selectionMode - The keyboard selection mode
   */
  const selectNote = useCallback((note: Note, selectionMode: 'range' | 'multi' = 'range'): void => {
    if (selectionMode === 'range') {
      // Range mode: max 2 notes for range selection
      setSelectedNotes(prev => prev.length < 2 ? [...prev, note] : [note])
    } else {
      // Multi mode: toggle individual note selection
      setSelectedNotes(prev => {
        const isAlreadySelected = prev.some(n => n.name === note.name)
        if (isAlreadySelected) {
          // Remove the note if already selected
          return prev.filter(n => n.name !== note.name)
        } else {
          // Add the note
          return [...prev, note]
        }
      })
    }
  }, [])

  /**
   * Generates a melody based on selected notes and instrument type
   * @param notes - All available notes
   * @param numberOfNotes - Number of notes to generate in the melody
   * @param instrument - The instrument type ('keyboard' or 'guitar')
   * @param selectionMode - The keyboard selection mode
   * @param notesToUse - Optional snapshot of notes to use instead of current selectedNotes
   */
  const generateMelody = useCallback((
    notes: readonly Note[],
    numberOfNotes: number,
    instrument: InstrumentType = 'keyboard',
    selectionMode: 'range' | 'multi' = 'range',
    notesToUse?: readonly Note[],
    chordMode: 'arpeggiator' | 'progression' = 'arpeggiator',
    appliedChords?: AppliedChord[],
    appliedScales?: AppliedScale[]
  ): void => {
    if (numberOfNotes <= 0) {
      console.warn('Number of notes must be positive')
      return
    }

    // Use provided notes snapshot or current selectedNotes
    let currentSelectedNotes = notesToUse || selectedNotes

    // If no individual notes are selected but we have applied chords, extract notes from chords for arpeggiator mode
    if (currentSelectedNotes.length === 0 && appliedChords && appliedChords.length > 0 && chordMode === 'arpeggiator') {
      const notesFromChords: Note[] = []
      appliedChords.forEach(chord => {
        if (chord.notes && chord.notes.length > 0) {
          chord.notes.forEach(note => {
            // Avoid duplicates by checking if note already exists
            if (!notesFromChords.some(n => n.name === note.name)) {
              notesFromChords.push(note)
            }
          })
        }
      })
      currentSelectedNotes = notesFromChords
    }

    // If no individual notes are selected and no chords, but we have applied scales, extract notes from scales
    if (currentSelectedNotes.length === 0 && appliedScales && appliedScales.length > 0) {
      const notesFromScales: Note[] = []
      appliedScales.forEach(scale => {
        if (scale.notes && scale.notes.length > 0) {
          scale.notes.forEach(note => {
            // Avoid duplicates by checking if note already exists
            if (!notesFromScales.some(n => n.name === note.name)) {
              notesFromScales.push(note)
            }
          })
        }
      })
      currentSelectedNotes = notesFromScales
    }

    // PROGRESSION MODE: Generate chord progression melody
    // If both chords AND individual notes are selected, automatically mix them
    if (chordMode === 'progression' && appliedChords && appliedChords.length > 0) {
      const melody: Note[] = []
      const hasIndividualNotes = currentSelectedNotes.length > 0

      for (let i = 0; i < numberOfNotes; i++) {
        // If we have both chords and individual notes, mix them (50/50 chance)
        const useChord = hasIndividualNotes ? Math.random() < 0.5 : true

        if (useChord) {
          // Pick a random chord group for this beat
          const randomChordGroup = appliedChords[Math.floor(Math.random() * appliedChords.length)]
          const chordNotes = randomChordGroup.notes || []

          if (chordNotes.length > 0) {
            // Pick a random note from this chord (just for melody display)
            const randomNote = chordNotes[Math.floor(Math.random() * chordNotes.length)]

            // Validate that the note has valid properties
            if (!randomNote || !randomNote.name || typeof randomNote.frequency !== 'number') {
              console.warn('Invalid note in chord group:', randomNote, randomChordGroup)
              continue
            }

            // Create a new note with chord group information
            const noteWithChordInfo: Note = {
              ...randomNote,
              chordGroup: {
                id: randomChordGroup.id,
                displayName: randomChordGroup.displayName,
                rootNote: randomChordGroup.root,
                allNotes: chordNotes.filter(n => n && n.name).map(n => n.name)
              }
            }

            melody.push(noteWithChordInfo)
          }
        } else {
          // Pick a random individual note from selected notes
          // This includes notes from applied chords + any additional manual selections
          const randomNote = currentSelectedNotes[Math.floor(Math.random() * currentSelectedNotes.length)]
          // No chord group info = plays as single note
          melody.push(randomNote)
        }
      }

      if (melody.length === 0) {
        console.warn('No valid notes generated in progression mode')
        return
      }

      setGeneratedMelody(melody)
      return
    }

    // ARPEGGIATOR MODE: Generate regular melody
    if (instrument === 'keyboard') {
      if (selectionMode === 'range') {
        // Range mode: requires exactly 2 notes for range selection
        if (currentSelectedNotes.length !== 2) {
          console.warn('Range mode requires exactly 2 notes selected')
          return
        }

        const [note1, note2] = [...currentSelectedNotes].sort((a, b) => a.position - b.position)

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
      } else {
        // Multi mode: use selected notes directly (like guitar)
        if (currentSelectedNotes.length === 0) {
          console.warn('Multi-select mode requires at least one note selected')
          return
        }

        const melody = Array(numberOfNotes).fill(null).map(() =>
          currentSelectedNotes[Math.floor(Math.random() * currentSelectedNotes.length)]
        )

        setGeneratedMelody(melody)
      }
    } else if (instrument === 'guitar') {
      // Guitar logic: use all selected notes directly
      if (currentSelectedNotes.length === 0) {
        console.warn('Guitar requires at least one note selected')
        return
      }

      const melody = Array(numberOfNotes).fill(null).map(() =>
        currentSelectedNotes[Math.floor(Math.random() * currentSelectedNotes.length)]
      )

      setGeneratedMelody(melody)
    } else if (instrument === 'bass') {
      // Bass logic: use all selected notes directly (same as guitar)
      if (currentSelectedNotes.length === 0) {
        console.warn('Bass requires at least one note selected')
        return
      }

      const melody = Array(numberOfNotes).fill(null).map(() =>
        currentSelectedNotes[Math.floor(Math.random() * currentSelectedNotes.length)]
      )

      setGeneratedMelody(melody)
    }
  }, [])

  /**
   * Guitar-specific method to set all selected notes at once
   * @param notes - Array of notes to select for guitar
   */
  const setGuitarNotes = useCallback((notes: Note[]): void => {
    setSelectedNotes([...notes])
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
  const isInMelody = useCallback((note: Note, showNotes: boolean): boolean => {
    if (!showNotes) return false

    return generatedMelody.some(n => {
      // Direct match - note is played individually
      if (n.name === note.name) return true

      // Check if note is part of a chord group being played
      if (n.chordGroup && n.chordGroup.allNotes) {
        return n.chordGroup.allNotes.includes(note.name)
      }

      return false
    })
  }, [generatedMelody])

  /**
   * Clears all selections but keeps generated melody
   */
  const clearSelection = useCallback((): void => {
    setSelectedNotes([])
    // Don't clear generated melody - keep it so audio player stays visible
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
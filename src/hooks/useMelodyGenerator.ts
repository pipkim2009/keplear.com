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
  clearMelody: () => void
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
    let currentSelectedNotes = [...(notesToUse || selectedNotes)]

    // PROGRESSION MODE: Treat chords as pool options alongside individual notes
    // In progression mode, chords and individual notes are all options that can be randomly selected
    if (chordMode === 'progression' && appliedChords && appliedChords.length > 0) {
      const melody: Note[] = []

      // Collect manually selected notes
      // For keyboard: all notes in currentSelectedNotes are manual (no isManualSelection flag)
      // For guitar/bass: only notes with isManualSelection === true are manual
      const manualNotes = currentSelectedNotes.filter(note =>
        note.isManualSelection === true || note.isManualSelection === undefined
      )

      // Collect scale notes to add to the single note pool
      const scaleNotes: Note[] = []
      if (appliedScales && appliedScales.length > 0) {
        appliedScales.forEach(scale => {
          if (scale.notes && scale.notes.length > 0) {
            scale.notes.forEach(note => {
              // Avoid duplicates
              if (!scaleNotes.some(n => n.name === note.name)) {
                scaleNotes.push(note)
              }
            })
          }
        })
      }

      // Combine manual notes and scale notes as individual options
      const individualNotes = [...manualNotes, ...scaleNotes]

      // Build the pool: each individual note is one option, each chord is one option
      // This way chords can randomly appear in the melody alongside single notes
      const totalPoolSize = individualNotes.length + appliedChords.length

      if (totalPoolSize === 0) {
        console.warn('No notes or chords available for progression mode')
        return
      }

      for (let i = 0; i < numberOfNotes; i++) {
        // Pick a random index from the combined pool
        const randomIndex = Math.floor(Math.random() * totalPoolSize)

        if (randomIndex < individualNotes.length) {
          // Picked an individual note
          const randomNote = individualNotes[randomIndex]

          // Create a clean copy without chordGroup info
          const cleanNote: Note = {
            name: randomNote.name,
            frequency: randomNote.frequency,
            position: randomNote.position,
            octave: randomNote.octave
          }

          melody.push(cleanNote)
        } else {
          // Picked a chord
          const chordIndex = randomIndex - individualNotes.length
          const selectedChord = appliedChords[chordIndex]
          const chordNotes = selectedChord.notes || []

          if (chordNotes.length > 0) {
            // Pick a random note from this chord (just for melody display)
            const randomNote = chordNotes[Math.floor(Math.random() * chordNotes.length)]

            // Validate that the note has valid properties
            if (!randomNote || !randomNote.name || typeof randomNote.frequency !== 'number') {
              console.warn('Invalid note in chord group:', randomNote, selectedChord)
              continue
            }

            // Create a new note with chord group information
            const noteWithChordInfo: Note = {
              ...randomNote,
              chordGroup: {
                id: selectedChord.id,
                displayName: selectedChord.displayName,
                rootNote: selectedChord.root,
                allNotes: chordNotes.filter(n => n && n.name).map(n => n.name),
                chordPositions: selectedChord.noteKeys || []
              }
            }

            melody.push(noteWithChordInfo)
          }
        }
      }

      if (melody.length === 0) {
        console.warn('No valid notes generated in progression mode')
        return
      }

      setGeneratedMelody(melody)
      return
    }

    // ARPEGGIATOR MODE: Add notes from applied chords and scales
    // Add notes from applied chords (for arpeggiator mode only)
    if (appliedChords && appliedChords.length > 0 && chordMode === 'arpeggiator') {
      appliedChords.forEach(chord => {
        if (chord.notes && chord.notes.length > 0) {
          chord.notes.forEach(note => {
            // Avoid duplicates by checking if note already exists
            if (!currentSelectedNotes.some(n => n.name === note.name)) {
              currentSelectedNotes.push(note)
            }
          })
        }
      })
    }

    // Add notes from applied scales (for arpeggiator mode only)
    if (appliedScales && appliedScales.length > 0) {
      appliedScales.forEach(scale => {
        if (scale.notes && scale.notes.length > 0) {
          scale.notes.forEach(note => {
            // Avoid duplicates by checking if note already exists
            if (!currentSelectedNotes.some(n => n.name === note.name)) {
              currentSelectedNotes.push(note)
            }
          })
        }
      })
    }

    // If after all that we still have no notes, bail out
    if (currentSelectedNotes.length === 0) {
      console.warn('No notes available for melody generation')
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

  /**
   * Clears the generated melody
   */
  const clearMelody = useCallback((): void => {
    setGeneratedMelody([])
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
    clearMelody,
    clearTrigger
  }
}
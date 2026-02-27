import { useState, useCallback } from 'react'
import type { Note } from '../utils/notes'
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
  generateMelody: (
    notes: readonly Note[],
    numberOfNotes: number,
    instrument?: InstrumentType,
    selectionMode?: 'range' | 'multi',
    notesToUse?: readonly Note[],
    chordMode?: 'arpeggiator' | 'progression',
    appliedChords?: AppliedChord[],
    appliedScales?: AppliedScale[]
  ) => void
  setGuitarNotes: (notes: Note[]) => void
  isSelected: (note: Note) => boolean
  isInMelody: (note: Note, showNotes: boolean) => boolean
  clearSelection: () => void
  clearMelody: () => void
}

/**
 * Fisher-Yates shuffle for true uniform random distribution
 */
const fisherYatesShuffle = (array: Note[]): Note[] => {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

/**
 * Generates a melody that maximizes note variety from the pool.
 * Always uses as many unique notes as possible before repeating.
 * - If beats >= pool size: include every note at least once, fill remaining randomly
 * - If beats < pool size: pick `beats` unique notes (no repeats)
 */
const maxVarietyMelody = (pool: readonly Note[], beats: number): Note[] => {
  if (pool.length === 0) return []
  if (beats >= pool.length) {
    const required = [...pool]
    const remaining = beats - pool.length
    const fill = Array(remaining)
      .fill(null)
      .map(() => pool[Math.floor(Math.random() * pool.length)])
    return fisherYatesShuffle([...required, ...fill])
  } else {
    return fisherYatesShuffle([...pool]).slice(0, beats)
  }
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
      setSelectedNotes(prev => (prev.length < 2 ? [...prev, note] : [note]))
    } else {
      // Multi mode: toggle individual note selection
      // For guitar/bass, compare by ID to allow same note name on different strings
      // For keyboard, fall back to name comparison
      setSelectedNotes(prev => {
        const isAlreadySelected = note.id
          ? prev.some(n => n.id === note.id)
          : prev.some(n => n.name === note.name)
        if (isAlreadySelected) {
          // Remove the note if already selected
          return note.id
            ? prev.filter(n => n.id !== note.id)
            : prev.filter(n => n.name !== note.name)
        } else {
          // Add the note - make sure to preserve the id
          const noteWithId = { ...note }
          return [...prev, noteWithId]
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
  const generateMelody = useCallback(
    (
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
      const currentSelectedNotes = [...(notesToUse || selectedNotes)]

      // PROGRESSION MODE: Treat chords as pool options alongside individual notes
      // In progression mode, chords and individual notes are all options that can be randomly selected
      if (chordMode === 'progression' && appliedChords && appliedChords.length > 0) {
        const melody: Note[] = []

        // Collect manually selected notes
        // For keyboard: all notes in currentSelectedNotes are manual (no isManualSelection flag)
        // For guitar/bass: only notes with isManualSelection === true are manual
        const manualNotes = currentSelectedNotes.filter(
          note => note.isManualSelection === true || note.isManualSelection === undefined
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

        // Build pool options: each individual note and each chord is one option
        interface PoolOption {
          type: 'note' | 'chord'
          noteIndex?: number
          chordIndex?: number
        }
        const poolOptions: PoolOption[] = [
          ...individualNotes.map((_, i) => ({ type: 'note' as const, noteIndex: i })),
          ...appliedChords.map((_, i) => ({ type: 'chord' as const, chordIndex: i })),
        ]

        // Maximize variety: use each pool option before repeating
        const orderedOptions: PoolOption[] = []
        if (numberOfNotes >= poolOptions.length) {
          // Include every option at least once, fill remaining randomly
          orderedOptions.push(...poolOptions)
          const remaining = numberOfNotes - poolOptions.length
          for (let i = 0; i < remaining; i++) {
            orderedOptions.push(poolOptions[Math.floor(Math.random() * poolOptions.length)])
          }
        } else {
          // Fewer beats than options: pick numberOfNotes unique options
          const shuffled = [...poolOptions].sort(() => Math.random() - 0.5)
          orderedOptions.push(...shuffled.slice(0, numberOfNotes))
        }

        // Shuffle the final order
        for (let i = orderedOptions.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1))
          ;[orderedOptions[i], orderedOptions[j]] = [orderedOptions[j], orderedOptions[i]]
        }

        for (const option of orderedOptions) {
          if (option.type === 'note') {
            const randomNote = individualNotes[option.noteIndex!]
            const cleanNote: Note = {
              name: randomNote.name,
              frequency: randomNote.frequency,
              position: randomNote.position,
              octave: randomNote.octave,
            }
            melody.push(cleanNote)
          } else {
            const selectedChord = appliedChords[option.chordIndex!]
            const chordNotes = selectedChord.notes || []

            if (chordNotes.length > 0) {
              const randomNote = chordNotes[Math.floor(Math.random() * chordNotes.length)]

              if (!randomNote || !randomNote.name || typeof randomNote.frequency !== 'number') {
                console.warn('Invalid note in chord group:', randomNote, selectedChord)
                continue
              }

              const noteWithChordInfo: Note = {
                ...randomNote,
                chordGroup: {
                  id: selectedChord.id,
                  displayName: selectedChord.displayName,
                  rootNote: selectedChord.root,
                  allNotes: chordNotes.filter(n => n && n.name).map(n => n.name),
                  chordPositions: selectedChord.noteKeys || [],
                },
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

          const notesInRange = notes.filter(
            note => note.position >= startPos && note.position <= endPos
          )

          if (notesInRange.length === 0) {
            console.warn('No notes found in selected range')
            return
          }

          const melody = maxVarietyMelody(notesInRange, numberOfNotes)
          setGeneratedMelody(melody)
        } else {
          // Multi mode: use selected notes directly (like guitar)
          if (currentSelectedNotes.length === 0) {
            console.warn('Multi-select mode requires at least one note selected')
            return
          }

          const melody = maxVarietyMelody(currentSelectedNotes, numberOfNotes)
          setGeneratedMelody(melody)
        }
      } else {
        // Guitar/Bass logic: use all selected notes directly
        if (currentSelectedNotes.length === 0) {
          console.warn(`${instrument} requires at least one note selected`)
          return
        }

        const melody = maxVarietyMelody(currentSelectedNotes, numberOfNotes)
        setGeneratedMelody(melody)
      }
    },
    [selectedNotes]
  )

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
  const isSelected = useCallback(
    (note: Note): boolean =>
      note.id
        ? selectedNotes.some(n => n.id === note.id)
        : selectedNotes.some(n => n.name === note.name),
    [selectedNotes]
  )

  /**
   * Checks if a note is part of the generated melody (when notes are shown)
   * @param note - The note to check
   * @param showNotes - Whether notes are currently being displayed
   * @returns True if the note is in the melody and notes are shown
   */
  const isInMelody = useCallback(
    (note: Note, showNotes: boolean): boolean => {
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
    },
    [generatedMelody]
  )

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
    clearTrigger,
  }
}

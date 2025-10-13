import { useState, useEffect, useCallback } from 'react'
import type { Note } from '../utils/notes'
import type { GuitarScale, ScaleBox } from '../utils/guitarScales'
import type { BassScale, BassScaleBox } from '../utils/bassScales'
import type { KeyboardScale } from '../utils/keyboardScales'
import type { KeyboardChord } from '../utils/keyboardChords'
import type { GuitarChord, ChordShape } from '../utils/guitarChords'
import type { BassChord, BassChordShape } from '../utils/bassChords'
import type { AppliedChord, AppliedScale } from '../components/common/ScaleChordOptions'
import { applyScaleToKeyboard } from '../utils/keyboardScales'
import { applyChordToKeyboard } from '../utils/keyboardChords'
import { generateNotesWithSeparateOctaves } from '../utils/notes'
import type { KeyboardSelectionMode } from '../components/keyboard/InstrumentControls'
import { applyScaleToGuitar, applyScaleBoxToGuitar } from '../utils/guitarScales'
import { applyScaleToBass, applyScaleBoxToBass } from '../utils/bassScales'
import { applyChordToGuitar, applyChordShapeToGuitar } from '../utils/guitarChords'
import { applyChordToBass, applyBassChordShapeToBass } from '../utils/bassChords'
import { guitarNotes } from '../utils/guitarNotes'
import { bassNotes } from '../utils/bassNotes'

interface ScaleChordHandlers {
  // Guitar/Bass scale handlers
  scaleHandlers: {
    handleScaleSelect: (rootNote: string, scale: GuitarScale) => void;
    handleScaleBoxSelect: (scaleBox: ScaleBox) => void;
    handleClearScale: () => void;
    handleScaleDelete: (rootNote: string, scale: GuitarScale) => void;
  } | null;

  bassScaleHandlers: {
    handleScaleSelect: (rootNote: string, scale: BassScale) => void;
    handleScaleBoxSelect: (scaleBox: BassScaleBox) => void;
    handleClearScale: () => void;
    handleScaleDelete: (rootNote: string, scale: BassScale) => void;
  } | null;

  // Guitar/Bass chord handlers
  chordHandlers: {
    handleChordSelect: (rootNote: string, chord: GuitarChord) => void;
    handleChordShapeSelect: (chordShape: ChordShape) => void;
    handleClearChord: () => void;
    handleRemoveChordNotes: (noteKeys: string[]) => void;
    handleRemoveChordNotesOnly?: (noteKeys: string[]) => void;
  } | null;

  bassChordHandlers: {
    handleChordSelect: (rootNote: string, chord: BassChord) => void;
    handleChordShapeSelect: (chordShape: BassChordShape) => void;
    handleClearChord: () => void;
    handleRemoveChordNotes: (noteKeys: string[]) => void;
    handleRemoveChordNotesOnly?: (noteKeys: string[]) => void;
  } | null;
}

interface UseScaleChordManagementProps {
  instrument: string
  selectedNotes: Note[]
  setGuitarNotes: (notes: Note[]) => void
  selectNote?: (note: Note, selectionMode?: 'range' | 'multi') => void
  clearSelection: () => void
  clearChordsAndScales?: number
  keyboardSelectionMode?: KeyboardSelectionMode
  onKeyboardSelectionModeChange?: (mode: KeyboardSelectionMode) => void
  lowerOctaves: number
  higherOctaves: number
}

export const useScaleChordManagement = ({
  instrument,
  selectedNotes,
  setGuitarNotes,
  selectNote,
  clearSelection,
  clearChordsAndScales,
  keyboardSelectionMode,
  onKeyboardSelectionModeChange,
  lowerOctaves,
  higherOctaves
}: UseScaleChordManagementProps) => {
  // State for applied scales and chords
  const [appliedChords, setAppliedChords] = useState<AppliedChord[]>([])
  const [appliedScales, setAppliedScales] = useState<AppliedScale[]>([])
  const [selectedRoot, setSelectedRoot] = useState<string>('C')
  const [selectedChordRoot, setSelectedChordRoot] = useState<string>('C')

  // State for keyboard-specific scale/chord tracking
  const [currentKeyboardScale, setCurrentKeyboardScale] = useState<{ root: string; scale: KeyboardScale } | null>(null)
  const [currentKeyboardChord, setCurrentKeyboardChord] = useState<{ root: string; chord: KeyboardChord } | null>(null)

  // State for instrument handlers
  const [scaleHandlers, setScaleHandlers] = useState<ScaleChordHandlers['scaleHandlers']>(null)
  const [bassScaleHandlers, setBassScaleHandlers] = useState<ScaleChordHandlers['bassScaleHandlers']>(null)
  const [chordHandlers, setChordHandlers] = useState<ScaleChordHandlers['chordHandlers']>(null)
  const [bassChordHandlers, setBassChordHandlers] = useState<ScaleChordHandlers['bassChordHandlers']>(null)

  // Clear all chords and scales when instrument changes
  useEffect(() => {
    if (clearChordsAndScales && clearChordsAndScales > 0) {
      // Clear keyboard scales and chords
      setCurrentKeyboardScale(null)
      setCurrentKeyboardChord(null)

      // Clear applied lists for all instruments (this was missing!)
      setAppliedChords([])
      setAppliedScales([])

      // Clear guitar scales and chords
      if (scaleHandlers?.handleClearScale) {
        scaleHandlers.handleClearScale()
      }
      if (chordHandlers?.handleClearChord) {
        chordHandlers.handleClearChord()
      }

      // Clear bass scales and chords
      if (bassScaleHandlers?.handleClearScale) {
        bassScaleHandlers.handleClearScale()
      }
      if (bassChordHandlers?.handleClearChord) {
        bassChordHandlers.handleClearChord()
      }
    }
  }, [clearChordsAndScales, scaleHandlers, chordHandlers, bassScaleHandlers, bassChordHandlers])

  // Clear applied chords when instrument changes
  useEffect(() => {
    setAppliedChords([])
  }, [instrument])

  // Helper function to check if a chord already exists
  const isChordAlreadyApplied = useCallback((root: string, chordName: string): boolean => {
    return appliedChords.some(appliedChord =>
      appliedChord.root === root && appliedChord.chord.name === chordName
    )
  }, [appliedChords])

  // Scale selection handlers
  // Helper function to convert guitar/bass scale/chord selections to Note objects
  const convertSelectionsToNotes = useCallback((selections: { stringIndex: number, fretIndex: number }[], instrument: string): Note[] => {
    const notes: Note[] = []

    if (instrument === 'guitar') {
      selections.forEach(({ stringIndex, fretIndex }) => {
        const noteKey = fretIndex === 0 ? `${stringIndex}-open` : `${stringIndex}-${fretIndex - 1}`

        // Find the actual guitar note to get the real note name and frequency
        const guitarString = 6 - stringIndex // Convert visual string index to guitar string number (1-6)
        const actualGuitarNote = guitarNotes.find(gn => gn.string === guitarString && gn.fret === fretIndex)

        notes.push({
          name: actualGuitarNote?.name || noteKey, // Use actual note name (e.g., "C4") or fallback to noteKey
          frequency: actualGuitarNote?.frequency || 0,
          isBlack: actualGuitarNote?.name.includes('#') || false,
          position: stringIndex * 100 + fretIndex, // Unique position
          __guitarCoord: { stringIndex, fretIndex } // Store the original coordinate for removal
        } as any)
      })
    } else if (instrument === 'bass') {
      selections.forEach(({ stringIndex, fretIndex }) => {
        const noteKey = fretIndex === 0 ? `${stringIndex}-open` : `${stringIndex}-${fretIndex - 1}`

        // Find the actual bass note to get the real note name and frequency
        const bassString = 4 - stringIndex // Convert visual string index to bass string number (1-4)
        const actualBassNote = bassNotes.find(bn => bn.string === bassString && bn.fret === fretIndex)

        notes.push({
          name: actualBassNote?.name || noteKey, // Use actual note name (e.g., "E2") or fallback to noteKey
          frequency: actualBassNote?.frequency || 0,
          isBlack: actualBassNote?.name.includes('#') || false,
          position: stringIndex * 100 + fretIndex, // Unique position
          __bassCoord: { stringIndex, fretIndex } // Store the original coordinate for removal
        } as any)
      })
    }

    return notes
  }, [])

  // Helper function to find notes that can be safely removed (not used by other scales/chords)
  const getNotesToRemove = useCallback((itemToDelete: AppliedScale | AppliedChord, itemType: 'scale' | 'chord'): string[] => {
    if (!itemToDelete.notes) return []

    // Get all noteKeys from the item being deleted
    const itemNoteKeys = itemToDelete.notes.map((note: any) => {
      if (note.__guitarCoord) {
        const { stringIndex, fretIndex } = note.__guitarCoord
        return fretIndex === 0 ? `${stringIndex}-open` : `${stringIndex}-${fretIndex - 1}`
      } else if (note.__bassCoord) {
        const { stringIndex, fretIndex } = note.__bassCoord
        return fretIndex === 0 ? `${stringIndex}-open` : `${stringIndex}-${fretIndex - 1}`
      }
      return note.name // fallback
    }).filter(Boolean)

    // Get all noteKeys from other active scales and chords
    const otherActiveNoteKeys = new Set<string>()

    // Check other scales (excluding the one being deleted)
    appliedScales.forEach(scale => {
      if (scale.id !== itemToDelete.id && scale.notes) {
        scale.notes.forEach((note: any) => {
          if (note.__guitarCoord) {
            const { stringIndex, fretIndex } = note.__guitarCoord
            const noteKey = fretIndex === 0 ? `${stringIndex}-open` : `${stringIndex}-${fretIndex - 1}`
            otherActiveNoteKeys.add(noteKey)
          } else if (note.__bassCoord) {
            const { stringIndex, fretIndex } = note.__bassCoord
            const noteKey = fretIndex === 0 ? `${stringIndex}-open` : `${stringIndex}-${fretIndex - 1}`
            otherActiveNoteKeys.add(noteKey)
          } else if (note.name) {
            otherActiveNoteKeys.add(note.name)
          }
        })
      }
    })

    // Check other chords (excluding the one being deleted if it's a chord)
    appliedChords.forEach(chord => {
      if (chord.id !== itemToDelete.id && chord.notes) {
        chord.notes.forEach((note: any) => {
          if (note.__guitarCoord) {
            const { stringIndex, fretIndex } = note.__guitarCoord
            const noteKey = fretIndex === 0 ? `${stringIndex}-open` : `${stringIndex}-${fretIndex - 1}`
            otherActiveNoteKeys.add(noteKey)
          } else if (note.__bassCoord) {
            const { stringIndex, fretIndex } = note.__bassCoord
            const noteKey = fretIndex === 0 ? `${stringIndex}-open` : `${stringIndex}-${fretIndex - 1}`
            otherActiveNoteKeys.add(noteKey)
          } else if (note.name) {
            otherActiveNoteKeys.add(note.name)
          }
        })
      }
    })

    // Only remove notes that are NOT used by other active scales/chords
    const notesToRemove = itemNoteKeys.filter(noteKey => !otherActiveNoteKeys.has(noteKey))

    return notesToRemove
  }, [appliedScales, appliedChords])

  const handleScaleSelect = useCallback((rootNote: string, scale: GuitarScale) => {
    // Check if this exact scale is already applied
    const isScaleAlreadyApplied = appliedScales.some(appliedScale =>
      appliedScale.root === rootNote && appliedScale.scale.name === scale.name
    )

    if (isScaleAlreadyApplied) {
      return // Don't add duplicate scales
    }

    if (instrument === 'guitar' && scaleHandlers) {
      // Get the scale selections first to store as notes
      const scaleSelections = applyScaleToGuitar(rootNote, scale, guitarNotes)

      // Apply to guitar component
      scaleHandlers.handleScaleSelect(rootNote, scale)

      // Convert selections to Note objects for storage
      const scaleNotes = convertSelectionsToNotes(scaleSelections, 'guitar')

      // Add to applied scales list with actual notes
      const newAppliedScale: AppliedScale = {
        id: `guitar-${rootNote}-${scale.name}-${Date.now()}`,
        root: rootNote,
        scale: scale,
        displayName: `${rootNote} ${scale.name}`,
        notes: scaleNotes // Store the actual notes for removal
      }
      setAppliedScales(prev => {
        const newList = [...prev, newAppliedScale]
        return newList
      })
    } else if (instrument === 'bass' && bassScaleHandlers) {
      // Get the scale selections first to store as notes
      const scaleSelections = applyScaleToBass(rootNote, scale as any, bassNotes)

      // Apply to bass component
      bassScaleHandlers.handleScaleSelect(rootNote, scale as any)

      // Convert selections to Note objects for storage
      const scaleNotes = convertSelectionsToNotes(scaleSelections, 'bass')

      // Add to applied scales list with actual notes
      const newAppliedScale: AppliedScale = {
        id: `bass-${rootNote}-${scale.name}-${Date.now()}`,
        root: rootNote,
        scale: scale,
        displayName: `${rootNote} ${scale.name}`,
        notes: scaleNotes // Store the actual notes for removal
      }
      setAppliedScales(prev => {
        const newList = [...prev, newAppliedScale]
        return newList
      })
    } else {
      console.warn('No handlers or wrong condition:', {
        instrument,
        hasScaleHandlers: !!scaleHandlers,
        hasBassScaleHandlers: !!bassScaleHandlers
      })
    }
  }, [instrument, scaleHandlers, bassScaleHandlers, appliedScales, convertSelectionsToNotes])

  const handleScaleBoxSelect = useCallback((scaleBox: ScaleBox) => {
    if (instrument === 'guitar' && scaleHandlers) {
      // Get the scale box selections first to store as notes
      const scaleSelections = applyScaleBoxToGuitar(scaleBox)

      // Apply to guitar component
      scaleHandlers.handleScaleBoxSelect(scaleBox)

      // Convert selections to Note objects for storage
      const scaleNotes = convertSelectionsToNotes(scaleSelections, 'guitar')

      // Also add to applied scales list like handleScaleSelect does
      const rootPosition = scaleBox.positions.find(pos => pos.isRoot)
      if (rootPosition) {
        const rootNote = rootPosition.note.replace(/\d+$/, '') // Remove octave
        // Create a scale object from the box info
        const scaleFromBox = {
          name: `${scaleBox.name || 'Scale'} (Frets ${scaleBox.minFret}-${scaleBox.maxFret})`,
          intervals: [], // Box selections don't need intervals
          modes: [],
          description: 'Scale box selection'
        }

        const newAppliedScale: AppliedScale = {
          id: `${rootNote}-${scaleFromBox.name}-${Date.now()}`,
          root: rootNote,
          scale: scaleFromBox,
          displayName: `${rootNote} ${scaleFromBox.name}`,
          notes: scaleNotes // Store the actual notes for removal
        }

        // Check for duplicates
        const isDuplicate = appliedScales.some(scale =>
          scale.root === rootNote && scale.scale.name === scaleFromBox.name
        )

        if (!isDuplicate) {
          setAppliedScales(prev => [...prev, newAppliedScale])
        }
      }
    } else if (instrument === 'bass' && bassScaleHandlers) {
      // Get the scale box selections first to store as notes
      const scaleSelections = applyScaleBoxToBass(scaleBox as any)

      // Apply to bass component
      bassScaleHandlers.handleScaleBoxSelect(scaleBox as any)

      // Convert selections to Note objects for storage
      const scaleNotes = convertSelectionsToNotes(scaleSelections, 'bass')

      // Also add to applied scales list like handleScaleSelect does
      const rootPosition = scaleBox.positions.find(pos => pos.isRoot)
      if (rootPosition) {
        const rootNote = rootPosition.note.replace(/\d+$/, '') // Remove octave
        // Create a scale object from the box info
        const scaleFromBox = {
          name: `${scaleBox.name || 'Scale'} (Frets ${scaleBox.minFret}-${scaleBox.maxFret})`,
          intervals: [], // Box selections don't need intervals
          modes: [],
          description: 'Scale box selection'
        }

        const newAppliedScale: AppliedScale = {
          id: `${rootNote}-${scaleFromBox.name}-${Date.now()}`,
          root: rootNote,
          scale: scaleFromBox,
          displayName: `${rootNote} ${scaleFromBox.name}`,
          notes: scaleNotes // Store the actual notes for removal
        }

        // Check for duplicates
        const isDuplicate = appliedScales.some(scale =>
          scale.root === rootNote && scale.scale.name === scaleFromBox.name
        )

        if (!isDuplicate) {
          setAppliedScales(prev => [...prev, newAppliedScale])
        }
      }
    }
  }, [instrument, scaleHandlers, bassScaleHandlers, appliedScales, convertSelectionsToNotes])

  const handleClearScale = useCallback(() => {
    if (instrument === 'guitar' && scaleHandlers) {
      scaleHandlers.handleClearScale()
    } else if (instrument === 'bass' && bassScaleHandlers) {
      bassScaleHandlers.handleClearScale()
    }
    // Clear applied scales list
    setAppliedScales([])
  }, [instrument, scaleHandlers, bassScaleHandlers])

  // Chord selection handlers
  const handleChordSelect = useCallback((rootNote: string, chord: GuitarChord) => {
    // Check if this chord is already applied
    if (isChordAlreadyApplied(rootNote, chord.name)) {
      return
    }

    if (instrument === 'guitar' && chordHandlers) {
      // Get the chord selections first to store as notes
      const chordSelections = applyChordToGuitar(rootNote, chord, guitarNotes)

      // Apply to guitar component
      chordHandlers.handleChordSelect(rootNote, chord)

      // Convert selections to Note objects for storage
      const chordNotes = convertSelectionsToNotes(chordSelections, 'guitar')

      // Track the chord with actual notes
      const chordId = `${instrument}-${rootNote}-${chord.name}-${Date.now()}`
      const newAppliedChord: AppliedChord = {
        id: chordId,
        root: rootNote,
        chord: chord,
        displayName: `${rootNote}${chord.name}`,
        notes: chordNotes // Store the actual notes for removal
      }
      setAppliedChords(prev => [...prev, newAppliedChord])
    } else if (instrument === 'bass' && bassChordHandlers) {
      // Get the chord selections first to store as notes
      const chordSelections = applyChordToBass(rootNote, chord as any, bassNotes)

      // Apply to bass component
      bassChordHandlers.handleChordSelect(rootNote, chord as any)

      // Convert selections to Note objects for storage
      const chordNotes = convertSelectionsToNotes(chordSelections, 'bass')

      // Track the chord with actual notes
      const chordId = `${instrument}-${rootNote}-${chord.name}-${Date.now()}`
      const newAppliedChord: AppliedChord = {
        id: chordId,
        root: rootNote,
        chord: chord,
        displayName: `${rootNote}${chord.name}`,
        notes: chordNotes // Store the actual notes for removal
      }
      setAppliedChords(prev => [...prev, newAppliedChord])
    }
  }, [instrument, chordHandlers, bassChordHandlers, isChordAlreadyApplied, convertSelectionsToNotes])

  const handleChordShapeSelect = useCallback((chordShape: ChordShape & { root?: string }) => {
    // Check if this chord shape is already applied (simplified check)
    if (appliedChords.some(chord => chord.displayName === chordShape.name)) {
      return
    }

    if (instrument === 'guitar' && chordHandlers) {
      // Get the chord shape selections first to store as notes
      const chordSelections = applyChordShapeToGuitar(chordShape)

      // Apply to guitar component
      chordHandlers.handleChordShapeSelect(chordShape)

      // Convert selections to Note objects for storage
      const chordNotes = convertSelectionsToNotes(chordSelections, 'guitar')

      // Track the chord shape with actual notes
      const chordId = `${instrument}-shape-${chordShape.name}-${Date.now()}`
      const newAppliedChord: AppliedChord = {
        id: chordId,
        root: chordShape.root || 'Unknown', // Use provided root or fallback
        chord: { name: chordShape.name, intervals: [] } as any, // Simplified for shapes
        displayName: chordShape.name,
        notes: chordNotes // Store the actual notes for removal
      }
      setAppliedChords(prev => [...prev, newAppliedChord])
    } else if (instrument === 'bass' && bassChordHandlers) {
      // Get the chord shape selections first to store as notes
      const chordSelections = applyBassChordShapeToBass(chordShape as any)

      // Apply to bass component
      bassChordHandlers.handleChordShapeSelect(chordShape as any)

      // Convert selections to Note objects for storage
      const chordNotes = convertSelectionsToNotes(chordSelections, 'bass')

      // Track the chord shape with actual notes
      const chordId = `${instrument}-shape-${chordShape.name}-${Date.now()}`
      const newAppliedChord: AppliedChord = {
        id: chordId,
        root: chordShape.root || 'Unknown', // Use provided root or fallback
        chord: { name: chordShape.name, intervals: [] } as any, // Simplified for shapes
        displayName: chordShape.name,
        notes: chordNotes // Store the actual notes for removal
      }
      setAppliedChords(prev => [...prev, newAppliedChord])
    }
  }, [instrument, chordHandlers, bassChordHandlers, appliedChords, convertSelectionsToNotes])

  const handleClearChord = useCallback(() => {
    if (instrument === 'guitar' && chordHandlers) {
      chordHandlers.handleClearChord()
    } else if (instrument === 'bass' && bassChordHandlers) {
      bassChordHandlers.handleClearChord()
    }
    // Clear applied chords list
    setAppliedChords([])
  }, [instrument, chordHandlers, bassChordHandlers])

  // Keyboard scale handlers
  const handleKeyboardScaleApply = useCallback((rootNote: string, scale: KeyboardScale) => {
    // Check if this exact scale is already applied
    const isScaleAlreadyApplied = appliedScales.some(appliedScale =>
      appliedScale.root === rootNote && appliedScale.scale.name === scale.name
    )

    if (isScaleAlreadyApplied) {
      return // Don't add duplicate scales
    }

    // Switch to multi-select mode automatically (but keep existing selections)
    if (onKeyboardSelectionModeChange && keyboardSelectionMode !== 'multi') {
      onKeyboardSelectionModeChange('multi', false) // false = don't clear selections
    }

    // Generate current keyboard notes based on octave range
    const currentNotes = (lowerOctaves !== 0 || higherOctaves !== 0)
      ? generateNotesWithSeparateOctaves(lowerOctaves, higherOctaves)
      : generateNotesWithSeparateOctaves(0, 0) // Default range

    // Apply scale to get scale notes
    const scaleNotes = applyScaleToKeyboard(rootNote, scale, currentNotes)

    // DON'T add scale notes to selectedNotes - they should only be in appliedScales
    // This allows clicking them to add a "manual" layer for gradient colors

    // Add scale to applied scales list
    const newAppliedScale: AppliedScale = {
      id: `${rootNote}-${scale.name}-${Date.now()}`,
      root: rootNote,
      scale: scale,
      displayName: `${rootNote} ${scale.name}`,
      notes: scaleNotes
    }

    setAppliedScales(prev => [...prev, newAppliedScale])

    // Store current scale info for visual highlighting
    setCurrentKeyboardScale({ root: rootNote, scale })
  }, [appliedScales, onKeyboardSelectionModeChange, keyboardSelectionMode, lowerOctaves, higherOctaves, selectNote, selectedNotes])

  const handleKeyboardScaleClear = useCallback(() => {
    // Clear all selected notes
    clearSelection()
    // Clear scale info
    setCurrentKeyboardScale(null)
    // Clear applied scales
    setAppliedScales([])
  }, [clearSelection])

  const handleScaleDelete = useCallback((scaleId: string) => {
    // Find the scale to delete by ID
    const scaleToDelete = appliedScales.find(scale => scale.id === scaleId)
    if (!scaleToDelete) {
      return
    }

    if (instrument === 'guitar' && scaleHandlers) {
      // For guitar, use overlap-aware removal
      const noteKeysToRemove = getNotesToRemove(scaleToDelete, 'scale')

      if (noteKeysToRemove.length > 0 && chordHandlers?.handleRemoveChordNotes) {
        chordHandlers.handleRemoveChordNotes(noteKeysToRemove)
      } else if (noteKeysToRemove.length === 0) {
      } else {
        // Fallback: call the specific scale delete function
        scaleHandlers.handleScaleDelete(scaleToDelete.root, scaleToDelete.scale as any)
      }
    } else if (instrument === 'bass' && bassScaleHandlers) {
      // For bass, use overlap-aware removal
      const noteKeysToRemove = getNotesToRemove(scaleToDelete, 'scale')

      if (noteKeysToRemove.length > 0 && bassChordHandlers?.handleRemoveChordNotes) {
        bassChordHandlers.handleRemoveChordNotes(noteKeysToRemove)
      } else {
        // Fallback: call the specific scale delete function
        bassScaleHandlers.handleScaleDelete(scaleToDelete.root, scaleToDelete.scale as any)
      }
    } else if (instrument === 'keyboard') {
      // For keyboard, we need to remove only the specific scale notes
      if (scaleToDelete.notes) {
        // For keyboard, we'd need a removeNote function, but this is complex to implement
        // For now, just clear all selections (same as before)
        clearSelection()
        setCurrentKeyboardScale(null)
      }
    }

    // Remove from applied scales list
    setAppliedScales(prev => prev.filter(scale => scale.id !== scaleId))
  }, [instrument, scaleHandlers, bassScaleHandlers, chordHandlers, bassChordHandlers, clearSelection, appliedScales])

  // Keyboard chord handlers
  const handleKeyboardChordApply = useCallback((rootNote: string, chord: KeyboardChord) => {
    // Check if this chord is already applied
    if (isChordAlreadyApplied(rootNote, chord.name)) {
      return
    }

    // Switch to multi-select mode automatically (but keep existing selections)
    if (onKeyboardSelectionModeChange && keyboardSelectionMode !== 'multi') {
      onKeyboardSelectionModeChange('multi', false) // false = don't clear selections
    }

    // Generate current keyboard notes based on octave range
    const currentNotes = (lowerOctaves !== 0 || higherOctaves !== 0)
      ? generateNotesWithSeparateOctaves(lowerOctaves, higherOctaves)
      : generateNotesWithSeparateOctaves(0, 0) // Default range

    // Apply chord to get chord notes
    const chordNotes = applyChordToKeyboard(rootNote, chord, currentNotes)

    // DON'T add chord notes to selectedNotes - they should only be in appliedChords
    // This allows clicking them to add a "manual" layer for gradient colors

    // Add keyboard chord to applied chords list with the actual notes
    const chordId = `keyboard-${rootNote}-${chord.name}-${Date.now()}`
    const newAppliedChord: AppliedChord = {
      id: chordId,
      root: rootNote,
      chord: chord,
      displayName: `${rootNote}${chord.name}`,
      notes: chordNotes
    }
    setAppliedChords(prev => [...prev, newAppliedChord])
  }, [isChordAlreadyApplied, onKeyboardSelectionModeChange, keyboardSelectionMode, lowerOctaves, higherOctaves, selectNote, selectedNotes])

  const handleKeyboardChordClear = useCallback(() => {
    // Clear all selected notes
    clearSelection()
    // Clear chord info (not needed for highlighting anymore, but kept for compatibility)
    setCurrentKeyboardChord(null)
    // Clear applied chords list
    setAppliedChords([])
  }, [clearSelection])

  // Handle deleting individual chords
  const handleChordDelete = useCallback((chordId: string) => {
    // Find the chord to delete by ID
    const chordToDelete = appliedChords.find(chord => chord.id === chordId)
    if (!chordToDelete) {
      return
    }

    if (instrument === 'guitar' && chordHandlers) {
      // For guitar, use overlap-aware removal
      const noteKeysToRemove = getNotesToRemove(chordToDelete, 'chord')

      if (noteKeysToRemove.length > 0) {
        // Use the chord-only removal handler to preserve scale highlighting
        if (chordHandlers?.handleRemoveChordNotesOnly) {
          chordHandlers.handleRemoveChordNotesOnly(noteKeysToRemove)
        } else if (chordHandlers?.handleRemoveChordNotes) {
          // Fallback to regular removal if chord-only function not available
          chordHandlers.handleRemoveChordNotes(noteKeysToRemove)
        }
      } else {
      }
    } else if (instrument === 'bass' && bassChordHandlers) {
      // For bass, use overlap-aware removal
      const noteKeysToRemove = getNotesToRemove(chordToDelete, 'chord')

      if (noteKeysToRemove.length > 0) {
        // Use the chord-only removal handler to preserve scale highlighting
        if (bassChordHandlers?.handleRemoveChordNotesOnly) {
          bassChordHandlers.handleRemoveChordNotesOnly(noteKeysToRemove)
        } else if (bassChordHandlers?.handleRemoveChordNotes) {
          // Fallback to regular removal if chord-only function not available
          bassChordHandlers.handleRemoveChordNotes(noteKeysToRemove)
        }
      }
    } else if (instrument === 'keyboard') {
      // For keyboard, clear all selected notes (same as before)
      clearSelection()
      setCurrentKeyboardChord(null)
    }

    // Remove from applied chords list
    setAppliedChords(prev => prev.filter(chord => chord.id !== chordId))
  }, [instrument, chordHandlers, bassChordHandlers, clearSelection, appliedChords])

  const handleRootChange = useCallback((rootNote: string) => {
    setSelectedRoot(rootNote)
  }, [])

  const handleChordRootChange = useCallback((rootNote: string) => {
    setSelectedChordRoot(rootNote)
  }, [])

  return {
    // State
    appliedChords,
    appliedScales,
    selectedRoot,
    selectedChordRoot,
    currentKeyboardScale,
    currentKeyboardChord,

    // Handler setters (for instruments to register their handlers)
    setScaleHandlers,
    setBassScaleHandlers,
    setChordHandlers,
    setBassChordHandlers,

    // Event handlers
    handleScaleSelect,
    handleScaleBoxSelect,
    handleClearScale,
    handleChordSelect,
    handleChordShapeSelect,
    handleClearChord,
    handleKeyboardScaleApply,
    handleKeyboardScaleClear,
    handleScaleDelete,
    handleKeyboardChordApply,
    handleKeyboardChordClear,
    handleChordDelete,
    handleRootChange,
    handleChordRootChange,

    // Utility functions
    isChordAlreadyApplied
  }
}
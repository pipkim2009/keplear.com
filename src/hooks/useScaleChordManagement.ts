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
  } | null;

  bassChordHandlers: {
    handleChordSelect: (rootNote: string, chord: BassChord) => void;
    handleChordShapeSelect: (chordShape: BassChordShape) => void;
    handleClearChord: () => void;
    handleRemoveChordNotes: (noteKeys: string[]) => void;
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
  const handleScaleSelect = useCallback((rootNote: string, scale: GuitarScale) => {
    // Check if this exact scale is already applied
    const isScaleAlreadyApplied = appliedScales.some(appliedScale =>
      appliedScale.root === rootNote && appliedScale.scale.name === scale.name
    )

    if (isScaleAlreadyApplied) {
      console.log('🚫 Scale already applied, skipping')
      return // Don't add duplicate scales
    }

    if (instrument === 'guitar' && scaleHandlers) {
      console.log('🎸 Applying scale to guitar')
      scaleHandlers.handleScaleSelect(rootNote, scale)
      // Add to applied scales list for guitar (like keyboard does)
      const newAppliedScale: AppliedScale = {
        id: `guitar-${rootNote}-${scale.name}-${Date.now()}`,
        root: rootNote,
        scale: scale,
        displayName: `${rootNote} ${scale.name}`,
        notes: [] // Guitar uses internal note tracking
      }
      console.log('🎸 Adding to applied scales:', newAppliedScale)
      setAppliedScales(prev => {
        const newList = [...prev, newAppliedScale]
        console.log('🎸 New applied scales length:', newList.length)
        return newList
      })
    } else if (instrument === 'bass' && bassScaleHandlers) {
      console.log('🎻 Applying scale to bass')
      bassScaleHandlers.handleScaleSelect(rootNote, scale as any)
      // Add to applied scales list for bass (like keyboard does)
      const newAppliedScale: AppliedScale = {
        id: `bass-${rootNote}-${scale.name}-${Date.now()}`,
        root: rootNote,
        scale: scale,
        displayName: `${rootNote} ${scale.name}`,
        notes: [] // Bass uses internal note tracking
      }
      console.log('🎻 Adding to applied scales:', newAppliedScale)
      setAppliedScales(prev => {
        const newList = [...prev, newAppliedScale]
        console.log('🎻 New applied scales length:', newList.length)
        return newList
      })
    } else {
      console.log('❌ No handlers or wrong condition:', {
        instrument,
        hasScaleHandlers: !!scaleHandlers,
        hasBassScaleHandlers: !!bassScaleHandlers
      })
    }
  }, [instrument, scaleHandlers, bassScaleHandlers, appliedScales])

  const handleScaleBoxSelect = useCallback((scaleBox: ScaleBox) => {
    if (instrument === 'guitar' && scaleHandlers) {
      scaleHandlers.handleScaleBoxSelect(scaleBox)

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
          noteKeys: [] // Will be populated by the guitar component
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
      bassScaleHandlers.handleScaleBoxSelect(scaleBox as any)

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
          noteKeys: [] // Will be populated by the bass component
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
  }, [instrument, scaleHandlers, bassScaleHandlers, appliedScales])

  const handleClearScale = useCallback(() => {
    if (instrument === 'guitar' && scaleHandlers) {
      scaleHandlers.handleClearScale()
    } else if (instrument === 'bass' && bassScaleHandlers) {
      bassScaleHandlers.handleClearScale()
    }
  }, [instrument, scaleHandlers, bassScaleHandlers])

  // Chord selection handlers
  const handleChordSelect = useCallback((rootNote: string, chord: GuitarChord) => {
    // Check if this chord is already applied
    if (isChordAlreadyApplied(rootNote, chord.name)) {
      console.log(`Chord ${rootNote}${chord.name} is already applied, skipping...`)
      return
    }

    // Apply the chord first
    if (instrument === 'guitar' && chordHandlers) {
      chordHandlers.handleChordSelect(rootNote, chord)
    } else if (instrument === 'bass' && bassChordHandlers) {
      bassChordHandlers.handleChordSelect(rootNote, chord as any)
    }

    // Track the chord
    const chordId = `${instrument}-${rootNote}-${chord.name}-${Date.now()}`
    const newAppliedChord: AppliedChord = {
      id: chordId,
      root: rootNote,
      chord: chord,
      displayName: `${rootNote}${chord.name}`
    }
    setAppliedChords(prev => [...prev, newAppliedChord])
  }, [instrument, chordHandlers, bassChordHandlers, isChordAlreadyApplied])

  const handleChordShapeSelect = useCallback((chordShape: ChordShape & { root?: string }) => {
    // For chord shapes, we need to track them differently since they don't have root context
    // We'll just use a generic identifier
    const chordShapeId = `chord-shape-${chordShape.name}`

    // Check if this chord shape is already applied (simplified check)
    if (appliedChords.some(chord => chord.displayName === chordShape.name)) {
      console.log(`Chord shape ${chordShape.name} is already applied, skipping...`)
      return
    }

    // Apply the chord shape first
    if (instrument === 'guitar' && chordHandlers) {
      chordHandlers.handleChordShapeSelect(chordShape)
    } else if (instrument === 'bass' && bassChordHandlers) {
      bassChordHandlers.handleChordShapeSelect(chordShape as any)
    }

    // Track the chord shape (without root since shapes don't have root context)
    const chordId = `${instrument}-shape-${chordShape.name}-${Date.now()}`
    const newAppliedChord: AppliedChord = {
      id: chordId,
      root: chordShape.root || 'Unknown', // Use provided root or fallback
      chord: { name: chordShape.name, intervals: [] } as any, // Simplified for shapes
      displayName: chordShape.name
    }
    setAppliedChords(prev => [...prev, newAppliedChord])
  }, [instrument, chordHandlers, bassChordHandlers, appliedChords])

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

    // Switch to multi-select mode automatically
    if (onKeyboardSelectionModeChange && keyboardSelectionMode !== 'multi') {
      onKeyboardSelectionModeChange('multi')
    }

    // Generate current keyboard notes based on octave range
    const currentNotes = (lowerOctaves !== 0 || higherOctaves !== 0)
      ? generateNotesWithSeparateOctaves(lowerOctaves, higherOctaves)
      : generateNotesWithSeparateOctaves(0, 0) // Default range

    // Apply scale to get scale notes
    const scaleNotes = applyScaleToKeyboard(rootNote, scale, currentNotes)

    // Add each scale note individually using selectNote in multi mode
    if (selectNote) {
      scaleNotes.forEach(note => {
        // Only add if not already selected
        if (!selectedNotes.some(selectedNote => selectedNote.name === note.name)) {
          selectNote(note, 'multi')
        }
      })
    } else {
      // Fallback to the old method if selectNote is not available
      setGuitarNotes(scaleNotes)
    }

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
  }, [appliedScales, onKeyboardSelectionModeChange, keyboardSelectionMode, lowerOctaves, higherOctaves, selectNote, selectedNotes, setGuitarNotes])

  const handleKeyboardScaleClear = useCallback(() => {
    // Clear all selected notes
    clearSelection()
    // Clear scale info
    setCurrentKeyboardScale(null)
    // Clear applied scales
    setAppliedScales([])
  }, [clearSelection])

  const handleScaleDelete = useCallback((scaleId: string) => {
    // Find the scale to delete
    const scaleToDelete = appliedScales.find(scale => scale.id === scaleId)

    if (scaleToDelete) {
      // Call the appropriate deletion handler
      if (instrument === 'guitar' && scaleHandlers?.handleScaleDelete) {
        scaleHandlers.handleScaleDelete(scaleToDelete.root, scaleToDelete.scale as GuitarScale)
      } else if (instrument === 'bass' && bassScaleHandlers?.handleScaleDelete) {
        bassScaleHandlers.handleScaleDelete(scaleToDelete.root, scaleToDelete.scale as BassScale)
      }
    }

    // Remove from applied scales list
    setAppliedScales(prev => prev.filter(scale => scale.id !== scaleId))
  }, [appliedScales, instrument, scaleHandlers, bassScaleHandlers])

  // Keyboard chord handlers
  const handleKeyboardChordApply = useCallback((rootNote: string, chord: KeyboardChord) => {
    // Check if this chord is already applied
    if (isChordAlreadyApplied(rootNote, chord.name)) {
      console.log(`Keyboard chord ${rootNote}${chord.name} is already applied, skipping...`)
      return
    }

    // Switch to multi-select mode automatically
    if (onKeyboardSelectionModeChange && keyboardSelectionMode !== 'multi') {
      onKeyboardSelectionModeChange('multi')
    }

    // Generate current keyboard notes based on octave range
    const currentNotes = (lowerOctaves !== 0 || higherOctaves !== 0)
      ? generateNotesWithSeparateOctaves(lowerOctaves, higherOctaves)
      : generateNotesWithSeparateOctaves(0, 0) // Default range

    // Apply chord to get chord notes
    const chordNotes = applyChordToKeyboard(rootNote, chord, currentNotes)

    // Add each chord note individually using selectNote in multi mode
    if (selectNote) {
      chordNotes.forEach(note => {
        // Only add if not already selected
        if (!selectedNotes.some(selectedNote => selectedNote.name === note.name)) {
          selectNote(note, 'multi')
        }
      })
    } else {
      // Fallback to the old method if selectNote is not available
      const combinedNotes = [...selectedNotes, ...chordNotes]
      const uniqueNotes = Array.from(
        new Map(combinedNotes.map(note => [note.position, note])).values()
      )
      setGuitarNotes(uniqueNotes)
    }

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
  }, [isChordAlreadyApplied, onKeyboardSelectionModeChange, keyboardSelectionMode, lowerOctaves, higherOctaves, selectNote, selectedNotes, setGuitarNotes])

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
    // For now, just clear all chords - we can implement selective removal later
    if (instrument === 'guitar' && chordHandlers) {
      chordHandlers.handleClearChord()
    } else if (instrument === 'bass' && bassChordHandlers) {
      bassChordHandlers.handleClearChord()
    } else if (instrument === 'keyboard') {
      // For keyboard, clear all selected notes
      clearSelection()
      setCurrentKeyboardChord(null)
    }

    // Remove from applied chords list
    setAppliedChords(prev => prev.filter(chord => chord.id !== chordId))
  }, [instrument, chordHandlers, bassChordHandlers, clearSelection])

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
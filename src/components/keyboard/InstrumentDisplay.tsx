import Keyboard from './Keyboard'
import Guitar from '../guitar/Guitar'
import Bass from '../bass/Bass'
import InstrumentControls from './InstrumentControls'
import ScaleChordOptions, { type AppliedChord, type AppliedScale } from '../common/ScaleChordOptions'
import NotesToggle from '../common/NotesToggle'
import { useRef, useState, useEffect } from 'react'
import type { Note } from '../../utils/notes'
import type { GuitarScale, ScaleBox } from '../../utils/guitarScales'
import type { BassScale, BassScaleBox } from '../../utils/bassScales'
import type { KeyboardSelectionMode } from './InstrumentControls'
import { applyScaleToKeyboard, isKeyboardNoteInScale, isKeyboardNoteRoot, type KeyboardScale } from '../../utils/keyboardScales'
import { applyChordToKeyboard, isKeyboardNoteInChord, isKeyboardNoteChordRoot, type KeyboardChord } from '../../utils/keyboardChords'
import { generateNotesWithSeparateOctaves } from '../../utils/notes'
import type { GuitarChord, ChordShape } from '../../utils/guitarChords'
import type { BassChord, BassChordShape } from '../../utils/bassChords'

interface InstrumentDisplayProps {
  onNoteClick: (note: Note) => void
  isSelected: (note: Note) => boolean
  isInMelody: (note: Note, showNotes: boolean) => boolean
  showNotes: boolean
  bpm: number
  setBpm: (bpm: number) => void
  numberOfNotes: number
  setNumberOfNotes: (count: number) => void
  instrument: string
  setInstrument: (instrument: string) => void
  setGuitarNotes: (notes: Note[]) => void
  setBassNotes?: (notes: Note[]) => void
  clearSelection: () => void
  clearTrigger: number
  selectedNotes: Note[]
  selectNote?: (note: Note, selectionMode?: 'range' | 'multi') => void
  onOctaveRangeChange?: (lowerOctaves: number, higherOctaves: number) => void
  keyboardSelectionMode?: KeyboardSelectionMode
  onKeyboardSelectionModeChange?: (mode: KeyboardSelectionMode) => void
  flashingInputs: { bpm: boolean; notes: boolean; mode: boolean }
  triggerInputFlash: (inputType: 'bpm' | 'notes' | 'mode') => void
  setInputActive: (inputType: 'bpm' | 'notes' | 'mode', active: boolean) => void
  clearChordsAndScales?: number
  onGenerateMelody?: () => void
  onPlayMelody?: () => void
  onRecordMelody?: () => Promise<Blob | null>
  isPlaying?: boolean
  isRecording?: boolean
  hasGeneratedMelody?: boolean
  onToggleNotes?: () => void
  playbackProgress?: number
  melodyDuration?: number
  onProgressChange?: (progress: number) => void
  onClearRecordedAudio?: () => void
  recordedAudioBlob?: Blob | null
  generatedMelody?: Note[]
}

const InstrumentDisplay: React.FC<InstrumentDisplayProps> = ({
  onNoteClick,
  isSelected,
  isInMelody,
  showNotes,
  bpm,
  setBpm,
  numberOfNotes,
  setNumberOfNotes,
  instrument,
  setInstrument,
  setGuitarNotes,
  setBassNotes,
  clearSelection,
  clearTrigger,
  selectedNotes,
  selectNote,
  onOctaveRangeChange,
  keyboardSelectionMode = 'range',
  onKeyboardSelectionModeChange,
  flashingInputs,
  triggerInputFlash,
  setInputActive,
  clearChordsAndScales,
  onGenerateMelody,
  onPlayMelody,
  onRecordMelody,
  isPlaying,
  isRecording,
  hasGeneratedMelody,
  onToggleNotes,
  playbackProgress,
  melodyDuration,
  onProgressChange,
  onClearRecordedAudio,
  recordedAudioBlob,
  generatedMelody
}) => {
  const guitarRef = useRef<any>(null)
  const bassRef = useRef<any>(null)
  const [lowerOctaves, setLowerOctaves] = useState<number>(0)
  const [higherOctaves, setHigherOctaves] = useState<number>(0)
  const [currentKeyboardScale, setCurrentKeyboardScale] = useState<{ root: string; scale: KeyboardScale } | null>(null)
  const [currentKeyboardChord, setCurrentKeyboardChord] = useState<{ root: string; chord: KeyboardChord } | null>(null)
  const [selectedRoot, setSelectedRoot] = useState<string>('C')
  const [selectedChordRoot, setSelectedChordRoot] = useState<string>('C')
  const [appliedChords, setAppliedChords] = useState<AppliedChord[]>([])
  const [appliedScales, setAppliedScales] = useState<AppliedScale[]>([])

  const [scaleHandlers, setScaleHandlers] = useState<{
    handleScaleSelect: (rootNote: string, scale: GuitarScale) => void;
    handleScaleBoxSelect: (scaleBox: ScaleBox) => void;
    handleClearScale: () => void;
    handleScaleDelete: (rootNote: string, scale: GuitarScale) => void;
  } | null>(null)
  const [bassScaleHandlers, setBassScaleHandlers] = useState<{
    handleScaleSelect: (rootNote: string, scale: BassScale) => void;
    handleScaleBoxSelect: (scaleBox: BassScaleBox) => void;
    handleClearScale: () => void;
    handleScaleDelete: (rootNote: string, scale: BassScale) => void;
  } | null>(null)
  const [chordHandlers, setChordHandlers] = useState<{
    handleChordSelect: (rootNote: string, chord: GuitarChord) => void;
    handleChordShapeSelect: (chordShape: ChordShape) => void;
    handleClearChord: () => void;
    handleRemoveChordNotes: (noteKeys: string[]) => void;
  } | null>(null)
  const [bassChordHandlers, setBassChordHandlers] = useState<{
    handleChordSelect: (rootNote: string, chord: BassChord) => void;
    handleChordShapeSelect: (chordShape: BassChordShape) => void;
    handleClearChord: () => void;
    handleRemoveChordNotes: (noteKeys: string[]) => void;
  } | null>(null)

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

  const handleScaleSelect = (rootNote: string, scale: GuitarScale) => {

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
  }

  const handleScaleBoxSelect = (scaleBox: ScaleBox) => {
    if (instrument === 'guitar' && scaleHandlers) {
      scaleHandlers.handleScaleBoxSelect(scaleBox)

      // Also add to applied scales list like handleScaleSelect does
      const rootPosition = scaleBox.positions.find(pos => pos.isRoot)
      if (rootPosition) {
        const rootNote = rootPosition.note.replace(/\d+$/, '') // Remove octave
        // Create a scale object from the box info
        const scaleFromBox = {
          name: `${scaleBox.scaleName} (Frets ${scaleBox.minFret}-${scaleBox.maxFret})`,
          intervals: [], // Box selections don't need intervals
          modes: []
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
          name: `${scaleBox.scaleName} (Frets ${scaleBox.minFret}-${scaleBox.maxFret})`,
          intervals: [], // Box selections don't need intervals
          modes: []
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
  }

  const handleClearScale = () => {
    if (instrument === 'guitar' && scaleHandlers) {
      scaleHandlers.handleClearScale()
    } else if (instrument === 'bass' && bassScaleHandlers) {
      bassScaleHandlers.handleClearScale()
    }
  }

  // Chord handlers
  const handleChordSelect = (rootNote: string, chord: GuitarChord) => {
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
  }

  const handleChordShapeSelect = (chordShape: ChordShape & { root?: string }) => {
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
  }

  const handleClearChord = () => {
    if (instrument === 'guitar' && chordHandlers) {
      chordHandlers.handleClearChord()
    } else if (instrument === 'bass' && bassChordHandlers) {
      bassChordHandlers.handleClearChord()
    }
    // Clear applied chords list
    setAppliedChords([])
  }

  // Keyboard scale handlers
  const handleKeyboardScaleApply = (rootNote: string, scale: KeyboardScale) => {
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
  }

  const handleKeyboardScaleClear = () => {
    // Clear all selected notes
    clearSelection()
    // Clear scale info
    setCurrentKeyboardScale(null)
    // Clear applied scales
    setAppliedScales([])
  }

  const handleScaleDelete = (scaleId: string) => {
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
  }

  // Keyboard chord handlers
  const handleKeyboardChordApply = (rootNote: string, chord: KeyboardChord) => {
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

    // Don't clear scale highlighting - let chords and scales coexist
    // Chord styling will take priority over scale styling in the KeyboardKey component

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
  }

  const handleKeyboardChordClear = () => {
    // Clear all selected notes
    clearSelection()
    // Clear chord info (not needed for highlighting anymore, but kept for compatibility)
    setCurrentKeyboardChord(null)
    // Clear applied chords list
    setAppliedChords([])
  }

  // Handle deleting individual chords
  const handleChordDelete = (chordId: string) => {
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
  }

  // Clear applied chords when instrument changes
  useEffect(() => {
    setAppliedChords([])
  }, [instrument])

  // Helper function to check if a chord already exists
  const isChordAlreadyApplied = (root: string, chordName: string): boolean => {
    return appliedChords.some(appliedChord =>
      appliedChord.root === root && appliedChord.chord.name === chordName
    )
  }

  const handleRootChange = (rootNote: string) => {
    setSelectedRoot(rootNote)
    // Update scale handlers if they exist (for guitar)
    // The selected root will be used when applying scales
  }

  const handleChordRootChange = (rootNote: string) => {
    setSelectedChordRoot(rootNote)
    // The selected root will be used when applying chords
  }

  // Helper functions for keyboard scale and chord highlighting
  const isNoteInKeyboardScale = (note: Note): boolean => {
    // Check against all applied keyboard scales, not just the current one
    if (instrument === 'keyboard' && appliedScales.length > 0) {
      return appliedScales.some(appliedScale => {
        return isKeyboardNoteInScale(note, appliedScale.root, appliedScale.scale)
      })
    }
    // Fallback to current scale for backward compatibility
    if (currentKeyboardScale) {
      return isKeyboardNoteInScale(note, currentKeyboardScale.root, currentKeyboardScale.scale)
    }
    return false
  }

  const isNoteInKeyboardChord = (note: Note): boolean => {
    // Check against all applied keyboard chords, not just the current one
    if (instrument === 'keyboard' && appliedChords.length > 0) {
      return appliedChords.some(appliedChord => {
        if (appliedChord.notes) {
          // Check if this note matches any of the applied chord's notes
          return appliedChord.notes.some(chordNote => chordNote.name === note.name)
        }
        return false
      })
    }
    return false
  }

  const isNoteKeyboardRoot = (note: Note): boolean => {
    // Check against all applied keyboard scales, not just the current one
    if (instrument === 'keyboard' && appliedScales.length > 0) {
      return appliedScales.some(appliedScale => {
        return isKeyboardNoteRoot(note, appliedScale.root)
      })
    }
    // Fallback to current scale for backward compatibility
    if (currentKeyboardScale) {
      return isKeyboardNoteRoot(note, currentKeyboardScale.root)
    }
    return false
  }

  const isNoteKeyboardChordRoot = (note: Note): boolean => {
    // Check if this note is a root of any applied keyboard chord
    if (instrument === 'keyboard' && appliedChords.length > 0) {
      return appliedChords.some(appliedChord => {
        if (appliedChord.notes) {
          // Check if this note is the root of any applied chord
          const noteNameWithoutOctave = note.name.replace(/\d+$/, '')
          return appliedChord.root === noteNameWithoutOctave
        }
        return false
      })
    }
    return false
  }

  // Notify parent when octave range changes
  useEffect(() => {
    if (onOctaveRangeChange) {
      onOctaveRangeChange(lowerOctaves, higherOctaves)
    }
  }, [lowerOctaves, higherOctaves, onOctaveRangeChange])

  // Auto-reapply keyboard scale/chords when octave range changes (but not on initial application)
  useEffect(() => {
    if (currentKeyboardScale) {
      // Generate current keyboard notes based on octave range
      const currentNotes = (lowerOctaves !== 0 || higherOctaves !== 0)
        ? generateNotesWithSeparateOctaves(lowerOctaves, higherOctaves)
        : generateNotesWithSeparateOctaves(0, 0) // Default range

      // Apply scale to get scale notes
      const scaleNotes = applyScaleToKeyboard(currentKeyboardScale.root, currentKeyboardScale.scale, currentNotes)

      // Set these notes as selected (this will trigger the melody system)
      setGuitarNotes(scaleNotes)
    } else if (appliedChords.length > 0 && instrument === 'keyboard') {
      // Generate current keyboard notes based on octave range
      const currentNotes = (lowerOctaves !== 0 || higherOctaves !== 0)
        ? generateNotesWithSeparateOctaves(lowerOctaves, higherOctaves)
        : generateNotesWithSeparateOctaves(0, 0) // Default range

      // Reapply all keyboard chords to the new octave range
      let allChordNotes: any[] = []
      appliedChords.forEach(appliedChord => {
        if (appliedChord.notes) {
          // Re-generate chord notes for the new octave range
          const chordNotes = applyChordToKeyboard(appliedChord.root, appliedChord.chord as KeyboardChord, currentNotes)
          allChordNotes.push(...chordNotes)
        }
      })

      // Remove duplicates and set as selected
      const uniqueNotes = Array.from(
        new Map(allChordNotes.map(note => [note.position, note])).values()
      )
      setGuitarNotes(uniqueNotes)
    }
  }, [lowerOctaves, higherOctaves]) // Only depend on octave changes, not the scale/chord state

  return (
    <>
      <div className={`instrument-controls-container ${instrument === 'guitar' || instrument === 'bass' ? 'guitar-mode' : ''}`}>
          <InstrumentControls
            bpm={bpm}
            setBpm={setBpm}
            numberOfNotes={numberOfNotes}
            setNumberOfNotes={setNumberOfNotes}
            instrument={instrument}
            setInstrument={setInstrument}
            clearSelection={clearSelection}
            hasSelectedNotes={selectedNotes.length > 0}
            onScaleSelect={handleScaleSelect}
            onScaleBoxSelect={handleScaleBoxSelect}
            onClearScale={handleClearScale}
            lowerOctaves={lowerOctaves}
            higherOctaves={higherOctaves}
            onAddLowerOctave={() => setLowerOctaves(Math.min(lowerOctaves + 1, 7))}
            onRemoveLowerOctave={() => setLowerOctaves(Math.max(lowerOctaves - 1, -4))}
            onAddHigherOctave={() => setHigherOctaves(Math.min(higherOctaves + 1, 7))}
            onRemoveHigherOctave={() => setHigherOctaves(Math.max(higherOctaves - 1, -4))}
            keyboardSelectionMode={keyboardSelectionMode}
            onKeyboardSelectionModeChange={onKeyboardSelectionModeChange}
            onKeyboardScaleApply={handleKeyboardScaleApply}
            onKeyboardScaleClear={handleKeyboardScaleClear}
            flashingInputs={flashingInputs}
            triggerInputFlash={triggerInputFlash}
            setInputActive={setInputActive}
            selectedNotesCount={selectedNotes.length}
            onGenerateMelody={onGenerateMelody}
            onPlayMelody={onPlayMelody}
            onRecordMelody={onRecordMelody}
            isPlaying={isPlaying}
            isRecording={isRecording}
            hasGeneratedMelody={hasGeneratedMelody}
            showNotes={showNotes}
            onToggleNotes={onToggleNotes}
            playbackProgress={playbackProgress}
            melodyDuration={melodyDuration}
            onProgressChange={onProgressChange}
            onClearRecordedAudio={onClearRecordedAudio}
            recordedAudioBlob={recordedAudioBlob}
            generatedMelody={generatedMelody}
          />
      </div>

      <div className="instrument-container">
        {/* Instrument-specific controls above the instrument */}
        <div className="instrument-header-controls">
          <div className="header-controls-left">
            {instrument === 'keyboard' && (
              <div className="control-group">
                <label className="control-label">Selection Mode</label>
                <select
                  value={keyboardSelectionMode}
                  onChange={(e) => onKeyboardSelectionModeChange && onKeyboardSelectionModeChange(e.target.value as KeyboardSelectionMode)}
                  className={`control-input ${flashingInputs.mode ? 'flashing' : ''}`}
                >
                  <option value="range">Range Select</option>
                  <option value="multi">Multi Select</option>
                </select>
              </div>
            )}

            {/* Scale/Chord Options */}
            <div className="control-group scale-chord-options">
              <ScaleChordOptions
                instrument={instrument}
                onScaleSelect={handleScaleSelect}
                onScaleBoxSelect={handleScaleBoxSelect}
                onClearScale={handleClearScale}
                onChordSelect={handleChordSelect}
                onChordShapeSelect={handleChordShapeSelect}
                onClearChord={handleClearChord}
                onRootChange={handleRootChange}
                onChordRootChange={handleChordRootChange}
                selectedRoot={selectedRoot}
                selectedChordRoot={selectedChordRoot}
                onKeyboardScaleApply={handleKeyboardScaleApply}
                onKeyboardScaleClear={handleKeyboardScaleClear}
                onKeyboardChordApply={handleKeyboardChordApply}
                onKeyboardChordClear={handleKeyboardChordClear}
                appliedChords={appliedChords}
                onChordDelete={handleChordDelete}
                appliedScales={appliedScales}
                onScaleDelete={handleScaleDelete}
              />
            </div>

            {/* Deselect All button */}
            {(selectedNotes.length > 0 || appliedChords.length > 0 || appliedScales.length > 0) && (
              <div className="control-group">
                <button
                  onClick={() => {
                    // Clear all selections
                    clearSelection()
                    // Clear chord and scale state for keyboard
                    if (instrument === 'keyboard') {
                      setCurrentKeyboardChord(null)
                      setCurrentKeyboardScale(null)
                    }
                    // Clear applied chords and scales lists
                    setAppliedChords([])
                    setAppliedScales([])
                  }}
                  className="control-button delete-selection"
                  title="Clear selected notes, chords, and scales"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M2.5 1a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1H3v9a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V4h.5a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H10a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1H2.5zm3 4a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 .5-.5zM8 5a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7A.5.5 0 0 1 8 5zm3 .5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 1 0z"/>
                  </svg>
                  Deselect All
                </button>
              </div>
            )}

            {hasGeneratedMelody && (
              <div className="control-group">
                <button
                  className="notes-toggle-container control-input"
                  onClick={onToggleNotes}
                  title={showNotes ? 'Hide notes' : 'Reveal notes'}
                  aria-label={showNotes ? 'Hide notes' : 'Reveal notes'}
                >
                  <NotesToggle showNotes={showNotes} onToggle={() => {}} />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="instrument-wrapper">
          {instrument === 'keyboard' ? (
            <Keyboard
              onNoteClick={onNoteClick}
              isSelected={isSelected}
              isInMelody={isInMelody}
              showNotes={showNotes}
              lowerOctaves={lowerOctaves}
              higherOctaves={higherOctaves}
              selectionMode={keyboardSelectionMode}
              isNoteInScale={isNoteInKeyboardScale}
              isNoteRoot={isNoteKeyboardRoot}
              isNoteInChord={isNoteInKeyboardChord}
              isNoteChordRoot={isNoteKeyboardChordRoot}
            />
          ) : instrument === 'guitar' ? (
            <Guitar
              setGuitarNotes={setGuitarNotes}
              isInMelody={isInMelody}
              showNotes={showNotes}
              onNoteClick={onNoteClick}
              clearTrigger={clearTrigger}
              onScaleHandlersReady={setScaleHandlers}
              onChordHandlersReady={setChordHandlers}
            />
          ) : (
            <Bass
              setBassNotes={setBassNotes || setGuitarNotes}
              isInMelody={isInMelody}
              showNotes={showNotes}
              onNoteClick={onNoteClick}
              clearTrigger={clearTrigger}
              onScaleHandlersReady={setBassScaleHandlers}
              onChordHandlersReady={setBassChordHandlers}
            />
          )}
        </div>
      </div>
    </>
  )
}

export default InstrumentDisplay
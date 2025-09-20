import Keyboard from './Keyboard'
import Guitar from '../guitar/Guitar'
import Bass from '../bass/Bass'
import InstrumentControls from './InstrumentControls'
import ScaleChordOptions from '../common/ScaleChordOptions'
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
  onOctaveRangeChange?: (lowerOctaves: number, higherOctaves: number) => void
  keyboardSelectionMode?: KeyboardSelectionMode
  onKeyboardSelectionModeChange?: (mode: KeyboardSelectionMode) => void
  flashingInputs: { bpm: boolean; notes: boolean; mode: boolean }
  triggerInputFlash: (inputType: 'bpm' | 'notes' | 'mode') => void
  setInputActive: (inputType: 'bpm' | 'notes' | 'mode', active: boolean) => void
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
  onOctaveRangeChange,
  keyboardSelectionMode = 'range',
  onKeyboardSelectionModeChange,
  flashingInputs,
  triggerInputFlash,
  setInputActive
}) => {
  const guitarRef = useRef<any>(null)
  const bassRef = useRef<any>(null)
  const [lowerOctaves, setLowerOctaves] = useState<number>(0)
  const [higherOctaves, setHigherOctaves] = useState<number>(0)
  const [currentKeyboardScale, setCurrentKeyboardScale] = useState<{ root: string; scale: KeyboardScale } | null>(null)
  const [currentKeyboardChord, setCurrentKeyboardChord] = useState<{ root: string; chord: KeyboardChord } | null>(null)
  const [selectedRoot, setSelectedRoot] = useState<string>('C')
  const [selectedChordRoot, setSelectedChordRoot] = useState<string>('C')
  const [scaleHandlers, setScaleHandlers] = useState<{
    handleScaleSelect: (rootNote: string, scale: GuitarScale) => void;
    handleScaleBoxSelect: (scaleBox: ScaleBox) => void;
    handleClearScale: () => void;
  } | null>(null)
  const [bassScaleHandlers, setBassScaleHandlers] = useState<{
    handleScaleSelect: (rootNote: string, scale: BassScale) => void;
    handleScaleBoxSelect: (scaleBox: BassScaleBox) => void;
    handleClearScale: () => void;
  } | null>(null)
  const [chordHandlers, setChordHandlers] = useState<{
    handleChordSelect: (rootNote: string, chord: GuitarChord) => void;
    handleChordShapeSelect: (chordShape: ChordShape) => void;
    handleClearChord: () => void;
  } | null>(null)
  const [bassChordHandlers, setBassChordHandlers] = useState<{
    handleChordSelect: (rootNote: string, chord: BassChord) => void;
    handleChordShapeSelect: (chordShape: BassChordShape) => void;
    handleClearChord: () => void;
  } | null>(null)

  const handleScaleSelect = (rootNote: string, scale: GuitarScale) => {
    if (instrument === 'guitar' && scaleHandlers) {
      scaleHandlers.handleScaleSelect(rootNote, scale)
    } else if (instrument === 'bass' && bassScaleHandlers) {
      bassScaleHandlers.handleScaleSelect(rootNote, scale as any)
    }
  }

  const handleScaleBoxSelect = (scaleBox: ScaleBox) => {
    if (instrument === 'guitar' && scaleHandlers) {
      scaleHandlers.handleScaleBoxSelect(scaleBox)
    } else if (instrument === 'bass' && bassScaleHandlers) {
      bassScaleHandlers.handleScaleBoxSelect(scaleBox as any)
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
    if (instrument === 'guitar' && chordHandlers) {
      chordHandlers.handleChordSelect(rootNote, chord)
    } else if (instrument === 'bass' && bassChordHandlers) {
      bassChordHandlers.handleChordSelect(rootNote, chord as any)
    }
  }

  const handleChordShapeSelect = (chordShape: ChordShape) => {
    if (instrument === 'guitar' && chordHandlers) {
      chordHandlers.handleChordShapeSelect(chordShape)
    } else if (instrument === 'bass' && bassChordHandlers) {
      bassChordHandlers.handleChordShapeSelect(chordShape as any)
    }
  }

  const handleClearChord = () => {
    if (instrument === 'guitar' && chordHandlers) {
      chordHandlers.handleClearChord()
    } else if (instrument === 'bass' && bassChordHandlers) {
      bassChordHandlers.handleClearChord()
    }
  }

  // Keyboard scale handlers
  const handleKeyboardScaleApply = (rootNote: string, scale: KeyboardScale) => {
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

    // Set these notes as selected (this will trigger the melody system)
    setGuitarNotes(scaleNotes)

    // Store current scale info for visual highlighting
    setCurrentKeyboardScale({ root: rootNote, scale })
  }

  const handleKeyboardScaleClear = () => {
    // Clear all selected notes
    clearSelection()
    // Clear scale info
    setCurrentKeyboardScale(null)
  }

  // Keyboard chord handlers
  const handleKeyboardChordApply = (rootNote: string, chord: KeyboardChord) => {
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

    // Set these notes as selected (this will trigger the melody system)
    setGuitarNotes(chordNotes)

    // Store current chord info for visual highlighting
    setCurrentKeyboardChord({ root: rootNote, chord })
    // Clear scale highlighting when chord is applied
    setCurrentKeyboardScale(null)
  }

  const handleKeyboardChordClear = () => {
    // Clear all selected notes
    clearSelection()
    // Clear chord info
    setCurrentKeyboardChord(null)
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
    if (currentKeyboardScale) {
      return isKeyboardNoteInScale(note, currentKeyboardScale.root, currentKeyboardScale.scale)
    }
    if (currentKeyboardChord) {
      return isKeyboardNoteInChord(note, currentKeyboardChord.root, currentKeyboardChord.chord)
    }
    return false
  }

  const isNoteKeyboardRoot = (note: Note): boolean => {
    if (currentKeyboardScale) {
      return isKeyboardNoteRoot(note, currentKeyboardScale.root)
    }
    if (currentKeyboardChord) {
      return isKeyboardNoteChordRoot(note, currentKeyboardChord.root)
    }
    return false
  }

  // Notify parent when octave range changes
  useEffect(() => {
    if (onOctaveRangeChange) {
      onOctaveRangeChange(lowerOctaves, higherOctaves)
    }
  }, [lowerOctaves, higherOctaves, onOctaveRangeChange])

  // Auto-reapply keyboard scale/chord when octave range changes (but not on initial application)
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
    } else if (currentKeyboardChord) {
      // Generate current keyboard notes based on octave range
      const currentNotes = (lowerOctaves !== 0 || higherOctaves !== 0)
        ? generateNotesWithSeparateOctaves(lowerOctaves, higherOctaves)
        : generateNotesWithSeparateOctaves(0, 0) // Default range

      // Apply chord to get chord notes
      const chordNotes = applyChordToKeyboard(currentKeyboardChord.root, currentKeyboardChord.chord, currentNotes)

      // Set these notes as selected (this will trigger the melody system)
      setGuitarNotes(chordNotes)
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
            scaleOptionsComponent={
              <ScaleChordOptions
                instrument={instrument}
                selectedRoot={selectedRoot}
                selectedChordRoot={selectedChordRoot}
                onRootChange={handleRootChange}
                onChordRootChange={handleChordRootChange}
                onScaleSelect={handleScaleSelect}
                onScaleBoxSelect={handleScaleBoxSelect}
                onKeyboardScaleApply={handleKeyboardScaleApply}
                onChordSelect={handleChordSelect}
                onChordShapeSelect={handleChordShapeSelect}
                onKeyboardChordApply={handleKeyboardChordApply}
              />
            }
          />
      </div>

      <div className="instrument-container">
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
    </>
  )
}

export default InstrumentDisplay
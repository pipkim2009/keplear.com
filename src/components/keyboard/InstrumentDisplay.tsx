import Keyboard from './Keyboard'
import Guitar from '../guitar/Guitar'
import Bass from '../bass/Bass'
import InstrumentControls from './InstrumentControls'
import ScaleOptions from '../common/ScaleOptions'
import { useRef, useState, useEffect } from 'react'
import type { Note } from '../../utils/notes'
import type { GuitarScale, ScaleBox } from '../../utils/guitarScales'
import type { BassScale, BassScaleBox } from '../../utils/bassScales'
import type { KeyboardSelectionMode } from './InstrumentControls'
import { applyScaleToKeyboard, isKeyboardNoteInScale, isKeyboardNoteRoot, type KeyboardScale } from '../../utils/keyboardScales'
import { generateNotesWithSeparateOctaves } from '../../utils/notes'

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
  onKeyboardSelectionModeChange
}) => {
  const guitarRef = useRef<any>(null)
  const bassRef = useRef<any>(null)
  const [lowerOctaves, setLowerOctaves] = useState<number>(0)
  const [higherOctaves, setHigherOctaves] = useState<number>(0)
  const [currentKeyboardScale, setCurrentKeyboardScale] = useState<{ root: string; scale: KeyboardScale } | null>(null)
  const [selectedRoot, setSelectedRoot] = useState<string>('C')
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

  // Keyboard scale handlers
  const handleKeyboardScaleApply = (rootNote: string, scale: KeyboardScale) => {
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

  const handleRootChange = (rootNote: string) => {
    setSelectedRoot(rootNote)
    // Update scale handlers if they exist (for guitar)
    // The selected root will be used when applying scales
  }

  // Helper functions for keyboard scale highlighting
  const isNoteInKeyboardScale = (note: Note): boolean => {
    if (!currentKeyboardScale) return false
    return isKeyboardNoteInScale(note, currentKeyboardScale.root, currentKeyboardScale.scale)
  }

  const isNoteKeyboardRoot = (note: Note): boolean => {
    if (!currentKeyboardScale) return false
    return isKeyboardNoteRoot(note, currentKeyboardScale.root)
  }

  // Notify parent when octave range changes
  useEffect(() => {
    if (onOctaveRangeChange) {
      onOctaveRangeChange(lowerOctaves, higherOctaves)
    }
  }, [lowerOctaves, higherOctaves, onOctaveRangeChange])

  // Auto-reapply keyboard scale when octave range changes (but not on initial scale application)
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
    }
  }, [lowerOctaves, higherOctaves]) // Only depend on octave changes, not the scale state

  return (
    <>
      <div className="controls-layout">
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
          />
        </div>

        <ScaleOptions
          instrument={instrument}
          selectedRoot={selectedRoot}
          onRootChange={handleRootChange}
          onScaleSelect={handleScaleSelect}
          onScaleBoxSelect={handleScaleBoxSelect}
          onKeyboardScaleApply={handleKeyboardScaleApply}
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
          />
        ) : (
          <Bass
            setBassNotes={setBassNotes || setGuitarNotes}
            isInMelody={isInMelody}
            showNotes={showNotes}
            onNoteClick={onNoteClick}
            clearTrigger={clearTrigger}
            onScaleHandlersReady={setBassScaleHandlers}
          />
        )}
      </div>
    </>
  )
}

export default InstrumentDisplay
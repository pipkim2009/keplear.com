import Keyboard from './Keyboard'
import Guitar from '../guitar/Guitar'
import InstrumentControls from './InstrumentControls'
import { useRef, useState, useEffect } from 'react'
import type { Note } from '../../utils/notes'
import type { GuitarScale, ScaleBox } from '../../utils/guitarScales'
import type { KeyboardSelectionMode } from './InstrumentControls'

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
  clearSelection,
  clearTrigger,
  selectedNotes,
  onOctaveRangeChange,
  keyboardSelectionMode = 'range',
  onKeyboardSelectionModeChange
}) => {
  const guitarRef = useRef<any>(null)
  const [lowerOctaves, setLowerOctaves] = useState<number>(0)
  const [higherOctaves, setHigherOctaves] = useState<number>(0)
  const [scaleHandlers, setScaleHandlers] = useState<{
    handleScaleSelect: (rootNote: string, scale: GuitarScale) => void;
    handleScaleBoxSelect: (scaleBox: ScaleBox) => void;
    handleClearScale: () => void;
  } | null>(null)

  const handleScaleSelect = (rootNote: string, scale: GuitarScale) => {
    if (scaleHandlers) {
      scaleHandlers.handleScaleSelect(rootNote, scale)
    }
  }

  const handleScaleBoxSelect = (scaleBox: ScaleBox) => {
    if (scaleHandlers) {
      scaleHandlers.handleScaleBoxSelect(scaleBox)
    }
  }

  const handleClearScale = () => {
    if (scaleHandlers) {
      scaleHandlers.handleClearScale()
    }
  }

  // Notify parent when octave range changes
  useEffect(() => {
    if (onOctaveRangeChange) {
      onOctaveRangeChange(lowerOctaves, higherOctaves)
    }
  }, [lowerOctaves, higherOctaves, onOctaveRangeChange])

  return (
    <>
      <div className={`instrument-controls-container ${instrument === 'guitar' ? 'guitar-mode' : ''}`}>
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
          />
        ) : (
          <Guitar 
            ref={guitarRef}
            setGuitarNotes={setGuitarNotes}
            isInMelody={isInMelody}
            showNotes={showNotes}
            onNoteClick={onNoteClick}
            clearTrigger={clearTrigger}
            onScaleHandlersReady={setScaleHandlers}
          />
        )}
      </div>
    </>
  )
}

export default InstrumentDisplay
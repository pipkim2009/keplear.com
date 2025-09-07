import Keyboard from './Keyboard'
import Guitar from '../guitar/Guitar'
import InstrumentControls from './InstrumentControls'
import { useRef, useState } from 'react'
import type { Note } from '../../utils/notes'
import type { GuitarScale } from '../../utils/guitarScales'

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
  selectedNotes
}) => {
  const guitarRef = useRef<any>(null)
  const [scaleHandlers, setScaleHandlers] = useState<{
    handleScaleSelect: (rootNote: string, scale: GuitarScale) => void;
    handleClearScale: () => void;
  } | null>(null)

  const handleScaleSelect = (rootNote: string, scale: GuitarScale) => {
    if (scaleHandlers) {
      scaleHandlers.handleScaleSelect(rootNote, scale)
    }
  }

  const handleClearScale = () => {
    if (scaleHandlers) {
      scaleHandlers.handleClearScale()
    }
  }

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
          onClearScale={handleClearScale}
        />
      </div>
      
      <div className="instrument-container">
        {instrument === 'keyboard' ? (
          <Keyboard
            onNoteClick={onNoteClick}
            isSelected={isSelected}
            isInMelody={isInMelody}
            showNotes={showNotes}
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
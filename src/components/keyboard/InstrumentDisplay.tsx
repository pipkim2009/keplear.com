import Keyboard from './Keyboard'
import Guitar from '../guitar/Guitar'
import InstrumentControls from './InstrumentControls'
import type { Note } from '../../utils/notes'

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
  clearTrigger
}) => {
  return (
    <>
      <div className="instrument-controls-container">
        <InstrumentControls
          bpm={bpm}
          setBpm={setBpm}
          numberOfNotes={numberOfNotes}
          setNumberOfNotes={setNumberOfNotes}
          instrument={instrument}
          setInstrument={setInstrument}
          clearSelection={clearSelection}
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
            setGuitarNotes={setGuitarNotes}
            isInMelody={isInMelody}
            showNotes={showNotes}
            onNoteClick={onNoteClick}
            clearTrigger={clearTrigger}
          />
        )}
      </div>
    </>
  )
}

export default InstrumentDisplay
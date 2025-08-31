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
  setGuitarNotes
}) => {
  return (
    <div className="instrument-container">
      <InstrumentControls
        bpm={bpm}
        setBpm={setBpm}
        numberOfNotes={numberOfNotes}
        setNumberOfNotes={setNumberOfNotes}
        instrument={instrument}
        setInstrument={setInstrument}
      />
      
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
        />
      )}
    </div>
  )
}

export default InstrumentDisplay
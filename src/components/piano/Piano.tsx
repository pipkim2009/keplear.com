import React from 'react'
import Keyboard from './Keyboard'
import Guitar from '../guitar/Guitar'
import PianoControls from './PianoControls'
import type { Note } from '../../utils/notes'

interface PianoProps {
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
}

const Piano: React.FC<PianoProps> = ({
  onNoteClick,
  isSelected,
  isInMelody,
  showNotes,
  bpm,
  setBpm,
  numberOfNotes,
  setNumberOfNotes,
  instrument,
  setInstrument
}) => {
  return (
    <div className="piano-container">
      <PianoControls
        bpm={bpm}
        setBpm={setBpm}
        numberOfNotes={numberOfNotes}
        setNumberOfNotes={setNumberOfNotes}
        instrument={instrument}
        setInstrument={setInstrument}
      />
      
      {instrument === 'piano' ? (
        <Keyboard
          onNoteClick={onNoteClick}
          isSelected={isSelected}
          isInMelody={isInMelody}
          showNotes={showNotes}
        />
      ) : (
        <Guitar />
      )}
    </div>
  )
}

export default Piano
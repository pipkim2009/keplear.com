import React from 'react'
import Keyboard from './Keyboard'
import PianoControls from './PianoControls'
import type { Note } from '../../utils/notes'

interface PianoProps {
  onNoteClick: (note: Note) => void
  isSelected: (note: Note) => boolean
  isInMelody: (note: Note, showNotes: boolean) => boolean
  showNotes: boolean
  setShowNotes: (show: boolean) => void
  bpm: number
  setBpm: (bpm: number) => void
  numberOfNotes: number
  setNumberOfNotes: (count: number) => void
}

const Piano: React.FC<PianoProps> = ({
  onNoteClick,
  isSelected,
  isInMelody,
  showNotes,
  setShowNotes,
  bpm,
  setBpm,
  numberOfNotes,
  setNumberOfNotes
}) => {
  return (
    <div className="piano-container">
      <PianoControls
        bpm={bpm}
        setBpm={setBpm}
        numberOfNotes={numberOfNotes}
        setNumberOfNotes={setNumberOfNotes}
        showNotes={showNotes}
        setShowNotes={setShowNotes}
      />
      
      <Keyboard
        onNoteClick={onNoteClick}
        isSelected={isSelected}
        isInMelody={isInMelody}
        showNotes={showNotes}
      />
    </div>
  )
}

export default Piano
import React from 'react'
import PianoKey from './PianoKey'
import { whiteKeys, blackKeys, getBlackKeyLeft, type Note } from '../../utils/notes'
import '../../styles/Keyboard.css'

interface KeyboardProps {
  onNoteClick: (note: Note) => void
  isSelected: (note: Note) => boolean
  isInMelody: (note: Note, showNotes: boolean) => boolean
  showNotes: boolean
}

const Keyboard: React.FC<KeyboardProps> = ({ 
  onNoteClick, 
  isSelected, 
  isInMelody, 
  showNotes 
}) => {
  return (
    <div className="keyboard">
      {/* White Keys */}
      {whiteKeys.map((note) => (
        <PianoKey
          key={note.name}
          note={note}
          isSelected={isSelected(note)}
          isInMelody={isInMelody(note, showNotes)}
          onClick={onNoteClick}
        />
      ))}
      
      {/* Black Keys */}
      <div className="black-keys">
        {blackKeys.map((note) => (
          <PianoKey
            key={note.name}
            note={note}
            isSelected={isSelected(note)}
            isInMelody={isInMelody(note, showNotes)}
            onClick={onNoteClick}
            style={{ left: `${getBlackKeyLeft(note.position)}px` }}
          />
        ))}
      </div>
    </div>
  )
}

export default Keyboard
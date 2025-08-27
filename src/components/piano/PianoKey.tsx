import React from 'react'
import type { Note } from '../../utils/notes'

interface PianoKeyProps {
  note: Note
  isSelected: boolean
  isInMelody: boolean
  onClick: (note: Note) => void
  className?: string
  style?: React.CSSProperties
}

const PianoKey: React.FC<PianoKeyProps> = ({ 
  note, 
  isSelected, 
  isInMelody, 
  onClick,
  className = '',
  style
}) => {
  const baseClass = note.isBlack ? 'black-key' : 'white-key'
  const selectedClass = isSelected ? 'selected' : ''
  const melodyClass = isInMelody ? 'melody' : ''
  
  return (
    <button
      className={`${baseClass} ${selectedClass} ${melodyClass} ${className}`.trim()}
      onClick={() => onClick(note)}
      style={style}
    >
      <span className="key-label">{note.name}</span>
    </button>
  )
}

export default PianoKey
import type { Note } from '../../utils/notes'

interface KeyboardKeyProps {
  note: Note
  isSelected: boolean
  isInMelody: boolean
  onClick: (note: Note) => void
  className?: string
  style?: React.CSSProperties
  isInScale?: boolean
  isRoot?: boolean
  isInChord?: boolean
  isChordRoot?: boolean
}

const KeyboardKey: React.FC<KeyboardKeyProps> = ({
  note,
  isSelected,
  isInMelody,
  onClick,
  className = '',
  style,
  isInScale = false,
  isRoot = false,
  isInChord = false,
  isChordRoot = false
}) => {
  const baseClass = note.isBlack ? 'black-key' : 'white-key'
  const selectedClass = isSelected ? 'selected' : ''
  const melodyClass = isInMelody ? 'melody' : ''

  // Handle mixed chord/scale styling and prioritization
  let noteTypeClass = ''
  let rootTypeClass = ''

  // Handle roots first (chord roots take priority)
  if (isChordRoot) {
    rootTypeClass = 'chord-root'
  } else if (isRoot) {
    rootTypeClass = 'scale-root'
  }
  // Handle regular notes - check for mixed chord/scale
  else if (isInChord && isInScale) {
    noteTypeClass = 'chord-scale-note'
  } else if (isInChord) {
    noteTypeClass = 'chord-note'
  } else if (isInScale) {
    noteTypeClass = 'scale-note'
  }

  return (
    <button
      className={`${baseClass} ${selectedClass} ${melodyClass} ${noteTypeClass} ${rootTypeClass} ${className}`.trim()}
      onClick={() => onClick(note)}
      style={style}
    >
      <span className="key-label">{note.name}</span>
    </button>
  )
}

export default KeyboardKey
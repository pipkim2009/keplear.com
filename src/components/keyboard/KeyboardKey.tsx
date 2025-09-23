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

  // Prioritize chord styling over scale styling
  let noteTypeClass = ''
  let rootTypeClass = ''

  if (isChordRoot) {
    rootTypeClass = 'chord-root'
  } else if (isRoot) {
    rootTypeClass = 'scale-root'
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
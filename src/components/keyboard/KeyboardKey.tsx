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
}

const KeyboardKey: React.FC<KeyboardKeyProps> = ({
  note,
  isSelected,
  isInMelody,
  onClick,
  className = '',
  style,
  isInScale = false,
  isRoot = false
}) => {
  const baseClass = note.isBlack ? 'black-key' : 'white-key'
  const selectedClass = isSelected ? 'selected' : ''
  const melodyClass = isInMelody ? 'melody' : ''
  const scaleClass = isInScale ? 'scale-note' : ''
  const rootClass = isRoot ? 'scale-root' : ''

  return (
    <button
      className={`${baseClass} ${selectedClass} ${melodyClass} ${scaleClass} ${rootClass} ${className}`.trim()}
      onClick={() => onClick(note)}
      style={style}
    >
      <span className="key-label">{note.name}</span>
    </button>
  )
}

export default KeyboardKey
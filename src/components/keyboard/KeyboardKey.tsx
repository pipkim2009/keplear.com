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

  // Handle all possible combinations of chord/scale and root states
  let noteTypeClass = ''

  // Check all possible combinations using the same logic as Guitar/Bass
  const isChordRootNote = isChordRoot && isInChord
  const isScaleRootNote = isRoot && isInScale

  if (isChordRootNote && isScaleRootNote) {
    // Both roots - stays red
    noteTypeClass = 'chord-root-scale-root'
  } else if (isChordRootNote && isInScale) {
    // Chord root + scale note - red + orange mix
    noteTypeClass = 'chord-root-scale-note'
  } else if (isInChord && isScaleRootNote) {
    // Chord note + scale root - red + purple mix
    noteTypeClass = 'chord-note-scale-root'
  } else if (isChordRootNote) {
    // Just chord root
    noteTypeClass = 'chord-root'
  } else if (isScaleRootNote) {
    // Just scale root
    noteTypeClass = 'scale-root'
  } else if (isInChord && isInScale) {
    // Regular chord note + scale note - orange + purple mix
    noteTypeClass = 'chord-scale-note'
  } else if (isInChord) {
    // Just chord note
    noteTypeClass = 'chord-note'
  } else if (isInScale) {
    // Just scale note
    noteTypeClass = 'scale-note'
  }

  return (
    <button
      className={`${baseClass} ${selectedClass} ${melodyClass} ${noteTypeClass} ${className}`.trim()}
      onClick={() => onClick(note)}
      style={style}
    >
      <span className="key-label">{note.name}</span>
    </button>
  )
}

export default KeyboardKey
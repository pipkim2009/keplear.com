import React, { memo, useCallback, useMemo } from 'react'
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

const KeyboardKey: React.FC<KeyboardKeyProps> = memo(({
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
  const baseClass = useMemo(() => note.isBlack ? 'black-key' : 'white-key', [note.isBlack])
  const selectedClass = isSelected ? 'selected' : ''
  const melodyClass = isInMelody ? 'melody' : ''

  // Memoize the note type class calculation
  const noteTypeClass = useMemo(() => {
    const isChordRootNote = isChordRoot && isInChord
    const isScaleRootNote = isRoot && isInScale

    if (isChordRootNote && isScaleRootNote) return 'chord-root-scale-root'
    if (isChordRootNote && isInScale) return 'chord-root-scale-note'
    if (isInChord && isScaleRootNote) return 'chord-note-scale-root'
    if (isChordRootNote) return 'chord-root'
    if (isScaleRootNote) return 'scale-root'
    if (isInChord && isInScale) return 'chord-scale-note'
    if (isInChord) return 'chord-note'
    if (isInScale) return 'scale-note'
    return ''
  }, [isChordRoot, isInChord, isRoot, isInScale])

  const handleClick = useCallback(() => {
    onClick(note)
  }, [onClick, note])

  const classNames = useMemo(() => {
    return `${baseClass} ${selectedClass} ${melodyClass} ${noteTypeClass} ${className}`.trim()
  }, [baseClass, selectedClass, melodyClass, noteTypeClass, className])

  return (
    <button
      className={classNames}
      onClick={handleClick}
      style={style}
      aria-label={`${note.name} key`}
      aria-pressed={isSelected}
    >
      <span className="key-label">{note.name}</span>
    </button>
  )
})

KeyboardKey.displayName = 'KeyboardKey'

export default KeyboardKey
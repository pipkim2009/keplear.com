import React, { memo, useCallback, useMemo } from 'react'
import type { Note } from '../../../utils/notes'

interface KeyboardKeyProps {
  note: Note
  isSelected: boolean // Now means "manually selected"
  isVisible: boolean // Should the note be visible (manual OR scale/chord)
  isInMelody: boolean
  onClick: (note: Note) => void
  className?: string
  style?: React.CSSProperties
  isInScale?: boolean
  isRoot?: boolean
  isInChord?: boolean
  isChordRoot?: boolean
  isCurrentlyPlaying?: boolean
}

const KeyboardKey: React.FC<KeyboardKeyProps> = memo(({
  note,
  isSelected, // Manual selection
  isVisible, // Overall visibility
  isInMelody,
  onClick,
  className = '',
  style,
  isInScale = false,
  isRoot = false,
  isInChord = false,
  isChordRoot = false,
  isCurrentlyPlaying = false
}) => {
  const baseClass = useMemo(() => note.isBlack ? 'black-key' : 'white-key', [note.isBlack])
  const selectedClass = isSelected ? 'selected' : ''
  const melodyClass = isInMelody ? 'melody' : ''
  const playingClass = isCurrentlyPlaying ? 'currently-playing' : ''

  // Memoize the note type class calculation
  const noteTypeClass = useMemo(() => {
    const isChordRootNote = isChordRoot && isInChord
    const isScaleRootNote = isRoot && isInScale
    const isAnyRoot = isChordRootNote || isScaleRootNote

    // Manual note combinations with gradients (same logic as guitar/bass)
    if (isSelected) {
      if (isScaleRootNote && isChordRootNote) {
        // Both roots - just red + blue (no orange/purple for non-root notes)
        return 'manual-scale-root'
      } else if (isAnyRoot && isInChord && isInScale) {
        // Root + scale note + chord note - all 4 colors
        return 'manual-scale-chord-root-note'
      } else if (isAnyRoot && isInChord) {
        // Root + chord note - red + purple + blue
        return 'manual-chord-root-note'
      } else if (isInChord && isInScale) {
        // Scale note + chord note - purple + orange + blue
        return 'manual-scale-chord-note'
      } else if (isAnyRoot) {
        // Just root - red + blue
        return isScaleRootNote ? 'manual-scale-root' : 'manual-chord-root'
      } else if (isInScale) {
        // Just scale - orange + blue
        return 'manual-scale-note'
      } else if (isInChord) {
        // Just chord - purple + blue
        return 'manual-chord-note'
      }
      // If selected but not in scale/chord, fall through to return empty string (just blue)
      return ''
    } else {
      // Non-manual combinations (existing logic)
      if (isChordRootNote && isScaleRootNote) return 'chord-root-scale-root'
      if (isChordRootNote && isInScale) return 'chord-root-scale-note'
      if (isInChord && isScaleRootNote) return 'chord-note-scale-root'
      if (isChordRootNote) return 'chord-root'
      if (isScaleRootNote) return 'scale-root'
      if (isInChord && isInScale) return 'chord-scale-note'
      if (isInChord) return 'chord-note'
      if (isInScale) return 'scale-note'
      return ''
    }
  }, [isChordRoot, isInChord, isRoot, isInScale, isSelected])

  const handleClick = useCallback(() => {
    onClick(note)
  }, [onClick, note])

  const classNames = useMemo(() => {
    return `${baseClass} ${selectedClass} ${melodyClass} ${playingClass} ${noteTypeClass} ${className}`.trim()
  }, [baseClass, selectedClass, melodyClass, playingClass, noteTypeClass, className])

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
}, (prevProps, nextProps) => {
  // Custom equality check for optimal performance
  return (
    prevProps.note.name === nextProps.note.name &&
    prevProps.note.position === nextProps.note.position &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isVisible === nextProps.isVisible &&
    prevProps.isInMelody === nextProps.isInMelody &&
    prevProps.isInScale === nextProps.isInScale &&
    prevProps.isRoot === nextProps.isRoot &&
    prevProps.isInChord === nextProps.isInChord &&
    prevProps.isChordRoot === nextProps.isChordRoot &&
    prevProps.isCurrentlyPlaying === nextProps.isCurrentlyPlaying &&
    prevProps.className === nextProps.className
  )
})

KeyboardKey.displayName = 'KeyboardKey'

export default KeyboardKey
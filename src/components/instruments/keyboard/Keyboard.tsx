import { memo, useMemo, useCallback } from 'react'
import KeyboardKey from './KeyboardKey'
import {
  whiteKeys,
  blackKeys,
  getBlackKeyLeft,
  getBlackKeyLeftDynamic,
  generateWhiteKeysWithSeparateOctaves,
  generateBlackKeysWithSeparateOctaves,
  type Note,
} from '../../../utils/notes'
import type { KeyboardPreview } from '../../common/ScaleChordOptions'
import '../../../styles/Keyboard.css'

interface KeyboardProps {
  onNoteClick: (note: Note) => void
  isSelected: (note: Note) => boolean
  isInMelody: (note: Note, showNotes: boolean) => boolean
  showNotes: boolean
  lowerOctaves?: number
  higherOctaves?: number
  isNoteInScale?: (note: Note) => boolean
  isNoteRoot?: (note: Note) => boolean
  isNoteInChord?: (note: Note) => boolean
  isNoteChordRoot?: (note: Note) => boolean
  currentlyPlayingNote?: Note | null
  currentlyPlayingNoteNames?: string[]
  previewNotes?: KeyboardPreview | null
  disableNoteSelection?: boolean
}

const Keyboard: React.FC<KeyboardProps> = memo(function Keyboard({
  onNoteClick,
  isSelected,
  isInMelody,
  showNotes,
  lowerOctaves = 0,
  higherOctaves = 0,
  isNoteInScale,
  isNoteRoot,
  isNoteInChord,
  isNoteChordRoot,
  currentlyPlayingNoteNames = [],
  previewNotes = null,
  disableNoteSelection = false,
}) {
  const hasExtendedRange = lowerOctaves !== 0 || higherOctaves !== 0

  // Helper to get note display name
  const getDisplayName = useCallback((note: Note): string => {
    return note.name
  }, [])

  // Check if a note is in scale or chord layer
  const isInScaleChordLayer = useCallback(
    (note: Note): boolean => {
      const inScale = isNoteInScale ? isNoteInScale(note) : false
      const inChord = isNoteInChord ? isNoteInChord(note) : false
      return inScale || inChord
    },
    [isNoteInScale, isNoteInChord]
  )

  // Check if a note is manually selected
  // After the architecture change, selectedNotes only contains manually clicked notes
  // Scale/chord notes are NOT in selectedNotes
  const isManuallySelected = useCallback(
    (note: Note): boolean => {
      return isSelected(note)
    },
    [isSelected]
  )

  // Check if a note should be visible (either manual OR in scale/chord)
  const isNoteVisible = useCallback(
    (note: Note): boolean => {
      return isManuallySelected(note) || isInScaleChordLayer(note)
    },
    [isManuallySelected, isInScaleChordLayer]
  )

  // Wrapped click handler that respects disableNoteSelection
  const handleNoteClick = useCallback(
    (note: Note) => {
      if (disableNoteSelection) return
      onNoteClick(note)
    },
    [onNoteClick, disableNoteSelection]
  )

  // Check if a note is currently playing (only highlight when notes are shown)
  // Supports both single notes and chords (multiple notes playing simultaneously)
  const isNoteCurrentlyPlaying = useCallback(
    (note: Note): boolean => {
      return (
        showNotes &&
        currentlyPlayingNoteNames.length > 0 &&
        currentlyPlayingNoteNames.includes(note.name)
      )
    },
    [currentlyPlayingNoteNames, showNotes]
  )

  // Check if a note is in the scale/chord preview from the menu
  const isNoteInPreview = useCallback(
    (note: Note): boolean => {
      if (!previewNotes) return false
      return previewNotes.notes.some(n => n.name === note.name)
    },
    [previewNotes]
  )

  // Check if a note is a root note in the preview
  const isNotePreviewRoot = useCallback(
    (note: Note): boolean => {
      if (!previewNotes) return false
      return previewNotes.rootNotes.some(n => n.name === note.name)
    },
    [previewNotes]
  )

  // Check if the preview is showing a chord (vs scale)
  const isPreviewChord = previewNotes?.isChord ?? false

  // Memoize expensive key generation
  const currentWhiteKeys = useMemo(
    () =>
      hasExtendedRange
        ? generateWhiteKeysWithSeparateOctaves(lowerOctaves, higherOctaves)
        : whiteKeys,
    [hasExtendedRange, lowerOctaves, higherOctaves]
  )

  const currentBlackKeys = useMemo(
    () =>
      hasExtendedRange
        ? generateBlackKeysWithSeparateOctaves(lowerOctaves, higherOctaves)
        : blackKeys,
    [hasExtendedRange, lowerOctaves, higherOctaves]
  )

  return (
    <div className="keyboard-container">
      <div
        className={`keyboard ${!hasExtendedRange ? 'default-mode' : ''} ${showNotes ? 'melody-active' : ''}`}
      >
        {/* White Keys */}
        {currentWhiteKeys.map(note => (
          <KeyboardKey
            key={note.name}
            note={note}
            displayName={getDisplayName(note)}
            isSelected={isManuallySelected(note)}
            isVisible={isNoteVisible(note)}
            isInMelody={isInMelody(note, showNotes)}
            onClick={handleNoteClick}
            isInScale={isNoteInScale ? isNoteInScale(note) : false}
            isRoot={isNoteRoot ? isNoteRoot(note) : false}
            isInChord={isNoteInChord ? isNoteInChord(note) : false}
            isChordRoot={isNoteChordRoot ? isNoteChordRoot(note) : false}
            isCurrentlyPlaying={isNoteCurrentlyPlaying(note)}
            isInPreview={isNoteInPreview(note)}
            isPreviewRoot={isNotePreviewRoot(note)}
            isPreviewChord={isPreviewChord}
          />
        ))}

        {/* Black Keys */}
        <div className="black-keys">
          {currentBlackKeys.map(note => {
            const leftPosition = hasExtendedRange
              ? getBlackKeyLeftDynamic(note, currentWhiteKeys)
              : getBlackKeyLeft(note.position)
            return (
              <KeyboardKey
                key={note.name}
                note={note}
                displayName={getDisplayName(note)}
                isSelected={isManuallySelected(note)}
                isVisible={isNoteVisible(note)}
                isInMelody={isInMelody(note, showNotes)}
                onClick={handleNoteClick}
                style={{ left: `${leftPosition}px` }}
                isInScale={isNoteInScale ? isNoteInScale(note) : false}
                isRoot={isNoteRoot ? isNoteRoot(note) : false}
                isInChord={isNoteInChord ? isNoteInChord(note) : false}
                isChordRoot={isNoteChordRoot ? isNoteChordRoot(note) : false}
                isCurrentlyPlaying={isNoteCurrentlyPlaying(note)}
                isInPreview={isNoteInPreview(note)}
                isPreviewRoot={isNotePreviewRoot(note)}
                isPreviewChord={isPreviewChord}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
})

export default Keyboard

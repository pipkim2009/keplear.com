import { memo, useMemo, useCallback } from 'react'
import KeyboardKey from './KeyboardKey'
import { whiteKeys, blackKeys, getBlackKeyLeft, getBlackKeyLeftDynamic, generateWhiteKeysWithSeparateOctaves, generateBlackKeysWithSeparateOctaves, type Note } from '../../../utils/notes'
import type { KeyboardSelectionMode } from '../shared/InstrumentControls'
import '../../../styles/Keyboard.css'

interface KeyboardProps {
  onNoteClick: (note: Note) => void
  isSelected: (note: Note) => boolean
  isInMelody: (note: Note, showNotes: boolean) => boolean
  showNotes: boolean
  lowerOctaves?: number
  higherOctaves?: number
  selectionMode?: KeyboardSelectionMode
  isNoteInScale?: (note: Note) => boolean
  isNoteRoot?: (note: Note) => boolean
  isNoteInChord?: (note: Note) => boolean
  isNoteChordRoot?: (note: Note) => boolean
  currentlyPlayingNote?: Note | null
  currentlyPlayingNoteNames?: string[]
}

const Keyboard: React.FC<KeyboardProps> = memo(function Keyboard({
  onNoteClick,
  isSelected,
  isInMelody,
  showNotes,
  lowerOctaves = 0,
  higherOctaves = 0,
  selectionMode = 'range',
  isNoteInScale,
  isNoteRoot,
  isNoteInChord,
  isNoteChordRoot,
  currentlyPlayingNote = null,
  currentlyPlayingNoteNames = []
}) {
  const hasExtendedRange = lowerOctaves !== 0 || higherOctaves !== 0

  // Check if a note is in scale or chord layer
  const isInScaleChordLayer = useCallback((note: Note): boolean => {
    const inScale = isNoteInScale ? isNoteInScale(note) : false
    const inChord = isNoteInChord ? isNoteInChord(note) : false
    return inScale || inChord
  }, [isNoteInScale, isNoteInChord])

  // Check if a note is manually selected
  // After the architecture change, selectedNotes only contains manually clicked notes
  // Scale/chord notes are NOT in selectedNotes
  const isManuallySelected = useCallback((note: Note): boolean => {
    return isSelected(note)
  }, [isSelected])

  // Check if a note should be visible (either manual OR in scale/chord)
  const isNoteVisible = useCallback((note: Note): boolean => {
    return isManuallySelected(note) || isInScaleChordLayer(note)
  }, [isManuallySelected, isInScaleChordLayer])

  // Check if a note is currently playing (only highlight when notes are shown)
  // Supports both single notes and chords (multiple notes playing simultaneously)
  const isNoteCurrentlyPlaying = useCallback((note: Note): boolean => {
    return showNotes && currentlyPlayingNoteNames.length > 0 && currentlyPlayingNoteNames.includes(note.name)
  }, [currentlyPlayingNoteNames, showNotes])

  // Memoize expensive key generation
  const currentWhiteKeys = useMemo(
    () => hasExtendedRange ? generateWhiteKeysWithSeparateOctaves(lowerOctaves, higherOctaves) : whiteKeys,
    [hasExtendedRange, lowerOctaves, higherOctaves]
  )

  const currentBlackKeys = useMemo(
    () => hasExtendedRange ? generateBlackKeysWithSeparateOctaves(lowerOctaves, higherOctaves) : blackKeys,
    [hasExtendedRange, lowerOctaves, higherOctaves]
  )

  return (
    <div className="keyboard-container">
      <div className={`keyboard ${!hasExtendedRange ? 'default-mode' : ''} ${showNotes ? 'melody-active' : ''}`}>
        {/* White Keys */}
        {currentWhiteKeys.map((note) => (
          <KeyboardKey
            key={note.name}
            note={note}
            isSelected={isManuallySelected(note)}
            isVisible={isNoteVisible(note)}
            isInMelody={isInMelody(note, showNotes)}
            onClick={onNoteClick}
            isInScale={isNoteInScale ? isNoteInScale(note) : false}
            isRoot={isNoteRoot ? isNoteRoot(note) : false}
            isInChord={isNoteInChord ? isNoteInChord(note) : false}
            isChordRoot={isNoteChordRoot ? isNoteChordRoot(note) : false}
            isCurrentlyPlaying={isNoteCurrentlyPlaying(note)}
          />
        ))}

        {/* Black Keys */}
        <div className="black-keys">
          {currentBlackKeys.map((note) => {
            const leftPosition = hasExtendedRange
              ? getBlackKeyLeftDynamic(note, currentWhiteKeys)
              : getBlackKeyLeft(note.position)
            return (
              <KeyboardKey
                key={note.name}
                note={note}
                isSelected={isManuallySelected(note)}
                isVisible={isNoteVisible(note)}
                isInMelody={isInMelody(note, showNotes)}
                onClick={onNoteClick}
                style={{ left: `${leftPosition}px` }}
                isInScale={isNoteInScale ? isNoteInScale(note) : false}
                isRoot={isNoteRoot ? isNoteRoot(note) : false}
                isInChord={isNoteInChord ? isNoteInChord(note) : false}
                isChordRoot={isNoteChordRoot ? isNoteChordRoot(note) : false}
                isCurrentlyPlaying={isNoteCurrentlyPlaying(note)}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
})

export default Keyboard
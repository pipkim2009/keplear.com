import KeyboardKey from './KeyboardKey'
import { whiteKeys, blackKeys, getBlackKeyLeft, getBlackKeyLeftDynamic, generateWhiteKeysWithSeparateOctaves, generateBlackKeysWithSeparateOctaves, type Note } from '../../utils/notes'
import type { KeyboardSelectionMode } from './InstrumentControls'
import '../../styles/Keyboard.css'

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
}

const Keyboard: React.FC<KeyboardProps> = ({
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
  isNoteChordRoot
}) => {
  const hasExtendedRange = lowerOctaves !== 0 || higherOctaves !== 0
  const currentWhiteKeys = hasExtendedRange ? generateWhiteKeysWithSeparateOctaves(lowerOctaves, higherOctaves) : whiteKeys
  const currentBlackKeys = hasExtendedRange ? generateBlackKeysWithSeparateOctaves(lowerOctaves, higherOctaves) : blackKeys

  return (
    <div className="keyboard-container">
      <div className={`keyboard ${!hasExtendedRange ? 'default-mode' : ''}`}>
        {/* White Keys */}
        {currentWhiteKeys.map((note) => (
          <KeyboardKey
            key={note.name}
            note={note}
            isSelected={isSelected(note)}
            isInMelody={isInMelody(note, showNotes)}
            onClick={onNoteClick}
            isInScale={isNoteInScale ? isNoteInScale(note) : false}
            isRoot={isNoteRoot ? isNoteRoot(note) : false}
            isInChord={isNoteInChord ? isNoteInChord(note) : false}
            isChordRoot={isNoteChordRoot ? isNoteChordRoot(note) : false}
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
                isSelected={isSelected(note)}
                isInMelody={isInMelody(note, showNotes)}
                onClick={onNoteClick}
                style={{ left: `${leftPosition}px` }}
                isInScale={isNoteInScale ? isNoteInScale(note) : false}
                isRoot={isNoteRoot ? isNoteRoot(note) : false}
                isInChord={isNoteInChord ? isNoteInChord(note) : false}
                isChordRoot={isNoteChordRoot ? isNoteChordRoot(note) : false}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default Keyboard
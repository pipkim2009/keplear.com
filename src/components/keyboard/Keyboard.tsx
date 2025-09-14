import KeyboardKey from './KeyboardKey'
import { whiteKeys, blackKeys, getBlackKeyLeft, getBlackKeyLeftDynamic, generateWhiteKeysWithSeparateOctaves, generateBlackKeysWithSeparateOctaves, type Note } from '../../utils/notes'
import '../../styles/Keyboard.css'

interface KeyboardProps {
  onNoteClick: (note: Note) => void
  isSelected: (note: Note) => boolean
  isInMelody: (note: Note, showNotes: boolean) => boolean
  showNotes: boolean
  lowerOctaves?: number
  higherOctaves?: number
  onAddLowerOctave?: () => void
  onRemoveLowerOctave?: () => void
  onAddHigherOctave?: () => void
  onRemoveHigherOctave?: () => void
}

const Keyboard: React.FC<KeyboardProps> = ({ 
  onNoteClick, 
  isSelected, 
  isInMelody, 
  showNotes,
  lowerOctaves = 0,
  higherOctaves = 0,
  onAddLowerOctave,
  onRemoveLowerOctave,
  onAddHigherOctave,
  onRemoveHigherOctave
}) => {
  const hasExtendedRange = lowerOctaves > 0 || higherOctaves > 0
  const currentWhiteKeys = hasExtendedRange ? generateWhiteKeysWithSeparateOctaves(lowerOctaves, higherOctaves) : whiteKeys
  const currentBlackKeys = hasExtendedRange ? generateBlackKeysWithSeparateOctaves(lowerOctaves, higherOctaves) : blackKeys

  return (
    <div className="keyboard-container">
      {/* Left Side Controls - Lower Octaves */}
      <div className="octave-controls left-controls">
        {onAddLowerOctave && (
          <button
            className="octave-button add-lower"
            onClick={onAddLowerOctave}
            title="Add lower octave"
          >
            +
          </button>
        )}
        {onRemoveLowerOctave && (
          <button
            className="octave-button remove-lower"
            onClick={onRemoveLowerOctave}
            title="Remove lower octave"
          >
            −
          </button>
        )}
      </div>
      
      <div className={`keyboard ${!hasExtendedRange ? 'default-mode' : ''}`}>
        {/* White Keys */}
        {currentWhiteKeys.map((note) => (
          <KeyboardKey
            key={note.name}
            note={note}
            isSelected={isSelected(note)}
            isInMelody={isInMelody(note, showNotes)}
            onClick={onNoteClick}
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
              />
            )
          })}
        </div>
      </div>

      {/* Right Side Controls - Higher Octaves */}
      <div className="octave-controls right-controls">
        {onAddHigherOctave && (
          <button
            className="octave-button add-higher"
            onClick={onAddHigherOctave}
            title="Add higher octave"
          >
            +
          </button>
        )}
        {onRemoveHigherOctave && (
          <button
            className="octave-button remove-higher"
            onClick={onRemoveHigherOctave}
            title="Remove higher octave"
          >
            −
          </button>
        )}
      </div>
    </div>
  )
}

export default Keyboard
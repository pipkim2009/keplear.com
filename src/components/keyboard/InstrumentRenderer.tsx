import Keyboard from './Keyboard'
import Guitar from '../guitar/Guitar'
import Bass from '../bass/Bass'
import type { Note } from '../../utils/notes'
import type { GuitarScale, ScaleBox } from '../../utils/instruments/guitar/guitarScales'
import type { BassScale, BassScaleBox } from '../../utils/instruments/bass/bassScales'
import type { GuitarChord, ChordShape } from '../../utils/instruments/guitar/guitarChords'
import type { BassChord, BassChordShape } from '../../utils/instruments/bass/bassChords'
import type { KeyboardSelectionMode } from './InstrumentControls'
import type { AppliedChord, AppliedScale } from '../common/ScaleChordOptions'

interface InstrumentRendererProps {
  instrument: string
  onNoteClick: (note: Note) => void
  isSelected: (note: Note) => boolean
  isInMelody: (note: Note, showNotes: boolean) => boolean
  showNotes: boolean
  setGuitarNotes: (notes: Note[]) => void
  setBassNotes?: (notes: Note[]) => void
  clearTrigger: number
  lowerOctaves: number
  higherOctaves: number
  keyboardSelectionMode?: KeyboardSelectionMode
  isNoteInKeyboardScale: (note: Note) => boolean
  isNoteKeyboardRoot: (note: Note) => boolean
  isNoteInKeyboardChord: (note: Note) => boolean
  isNoteKeyboardChordRoot: (note: Note) => boolean
  onScaleHandlersReady: (handlers: {
    handleScaleSelect: (rootNote: string, scale: GuitarScale) => void;
    handleScaleBoxSelect: (scaleBox: ScaleBox) => void;
    handleClearScale: () => void;
    handleScaleDelete: (rootNote: string, scale: GuitarScale) => void;
  } | null) => void
  onBassScaleHandlersReady: (handlers: {
    handleScaleSelect: (rootNote: string, scale: BassScale) => void;
    handleScaleBoxSelect: (scaleBox: BassScaleBox) => void;
    handleClearScale: () => void;
    handleScaleDelete: (rootNote: string, scale: BassScale) => void;
  } | null) => void
  onChordHandlersReady: (handlers: {
    handleChordSelect: (rootNote: string, chord: GuitarChord) => void;
    handleChordShapeSelect: (chordShape: ChordShape) => void;
    handleClearChord: () => void;
    handleRemoveChordNotes: (noteKeys: string[]) => void;
  } | null) => void
  onBassChordHandlersReady: (handlers: {
    handleChordSelect: (rootNote: string, chord: BassChord) => void;
    handleChordShapeSelect: (chordShape: BassChordShape) => void;
    handleClearChord: () => void;
    handleRemoveChordNotes: (noteKeys: string[]) => void;
  } | null) => void
  appliedScales?: AppliedScale[]
  appliedChords?: AppliedChord[]
}

const InstrumentRenderer: React.FC<InstrumentRendererProps> = ({
  instrument,
  onNoteClick,
  isSelected,
  isInMelody,
  showNotes,
  setGuitarNotes,
  setBassNotes,
  clearTrigger,
  lowerOctaves,
  higherOctaves,
  keyboardSelectionMode,
  isNoteInKeyboardScale,
  isNoteKeyboardRoot,
  isNoteInKeyboardChord,
  isNoteKeyboardChordRoot,
  onScaleHandlersReady,
  onBassScaleHandlersReady,
  onChordHandlersReady,
  onBassChordHandlersReady,
  appliedScales,
  appliedChords
}) => {
  return (
    <div className="instrument-wrapper">
      {instrument === 'keyboard' ? (
        <Keyboard
          onNoteClick={onNoteClick}
          isSelected={isSelected}
          isInMelody={isInMelody}
          showNotes={showNotes}
          lowerOctaves={lowerOctaves}
          higherOctaves={higherOctaves}
          selectionMode={keyboardSelectionMode}
          isNoteInScale={isNoteInKeyboardScale}
          isNoteRoot={isNoteKeyboardRoot}
          isNoteInChord={isNoteInKeyboardChord}
          isNoteChordRoot={isNoteKeyboardChordRoot}
        />
      ) : instrument === 'guitar' ? (
        <Guitar
          setGuitarNotes={setGuitarNotes}
          isInMelody={isInMelody}
          showNotes={showNotes}
          onNoteClick={onNoteClick}
          clearTrigger={clearTrigger}
          onScaleHandlersReady={onScaleHandlersReady}
          onChordHandlersReady={onChordHandlersReady}
          appliedScales={appliedScales}
          appliedChords={appliedChords}
        />
      ) : (
        <Bass
          setBassNotes={setBassNotes || setGuitarNotes}
          isInMelody={isInMelody}
          showNotes={showNotes}
          onNoteClick={onNoteClick}
          clearTrigger={clearTrigger}
          onScaleHandlersReady={onBassScaleHandlersReady}
          onChordHandlersReady={onBassChordHandlersReady}
          appliedScales={appliedScales}
          appliedChords={appliedChords}
        />
      )}
    </div>
  )
}

export default InstrumentRenderer
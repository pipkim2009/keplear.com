import Keyboard from '../keyboard/Keyboard'
import Guitar from '../guitar/Guitar'
import Bass from '../bass/Bass'
import type { Note } from '../../../utils/notes'
import type { GuitarScale, ScaleBox } from '../../../utils/instruments/guitar/guitarScales'
import type { BassScale, BassScaleBox } from '../../../utils/instruments/bass/bassScales'
import type { GuitarChord, ChordShape } from '../../../utils/instruments/guitar/guitarChords'
import type { BassChord, BassChordShape } from '../../../utils/instruments/bass/bassChords'
import type { AppliedChord, AppliedScale, FretboardPreview, KeyboardPreview } from '../../common/ScaleChordOptions'

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
  isNoteInKeyboardScale: (note: Note) => boolean
  isNoteKeyboardRoot: (note: Note) => boolean
  isNoteInKeyboardChord: (note: Note) => boolean
  isNoteKeyboardChordRoot: (note: Note) => boolean
  currentlyPlayingNote?: Note | null
  currentlyPlayingNoteNames?: string[]
  currentlyPlayingNoteIds?: string[]
  currentlyPlayingChordId?: string | null
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
  onNoteHandlersReady?: (handlers: {
    handleSetManualNotes: (noteIds: string[]) => void;
  } | null) => void
  onBassNoteHandlersReady?: (handlers: {
    handleSetManualNotes: (noteIds: string[]) => void;
  } | null) => void
  appliedScales?: AppliedScale[]
  appliedChords?: AppliedChord[]
  externalSelectedNoteIds?: string[]
  fretboardPreview?: FretboardPreview | null
  keyboardPreview?: KeyboardPreview | null
  disableNoteSelection?: boolean
  fretRangeLow?: number
  fretRangeHigh?: number
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
  isNoteInKeyboardScale,
  isNoteKeyboardRoot,
  isNoteInKeyboardChord,
  isNoteKeyboardChordRoot,
  currentlyPlayingNote,
  currentlyPlayingNoteNames,
  currentlyPlayingNoteIds,
  currentlyPlayingChordId,
  onScaleHandlersReady,
  onBassScaleHandlersReady,
  onChordHandlersReady,
  onBassChordHandlersReady,
  onNoteHandlersReady,
  onBassNoteHandlersReady,
  appliedScales,
  appliedChords,
  externalSelectedNoteIds,
  fretboardPreview,
  keyboardPreview,
  disableNoteSelection = false,
  fretRangeLow,
  fretRangeHigh
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
          isNoteInScale={isNoteInKeyboardScale}
          isNoteRoot={isNoteKeyboardRoot}
          isNoteInChord={isNoteInKeyboardChord}
          isNoteChordRoot={isNoteKeyboardChordRoot}
          currentlyPlayingNote={currentlyPlayingNote}
          currentlyPlayingNoteNames={currentlyPlayingNoteNames}
          previewNotes={keyboardPreview}
          disableNoteSelection={disableNoteSelection}
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
          onNoteHandlersReady={onNoteHandlersReady}
          appliedScales={appliedScales}
          appliedChords={appliedChords}
          externalSelectedNoteIds={externalSelectedNoteIds}
          currentlyPlayingNote={currentlyPlayingNote}
          currentlyPlayingNoteNames={currentlyPlayingNoteNames}
          currentlyPlayingNoteIds={currentlyPlayingNoteIds}
          currentlyPlayingChordId={currentlyPlayingChordId}
          previewPositions={fretboardPreview}
          disableNoteSelection={disableNoteSelection}
          fretRangeLow={fretRangeLow}
          fretRangeHigh={fretRangeHigh}
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
          onNoteHandlersReady={onBassNoteHandlersReady}
          appliedScales={appliedScales}
          appliedChords={appliedChords}
          externalSelectedNoteIds={externalSelectedNoteIds}
          currentlyPlayingNote={currentlyPlayingNote}
          currentlyPlayingNoteNames={currentlyPlayingNoteNames}
          currentlyPlayingNoteIds={currentlyPlayingNoteIds}
          currentlyPlayingChordId={currentlyPlayingChordId}
          previewPositions={fretboardPreview}
          disableNoteSelection={disableNoteSelection}
          fretRangeLow={fretRangeLow}
          fretRangeHigh={fretRangeHigh}
        />
      )}
    </div>
  )
}

export default InstrumentRenderer
import ScaleChordOptions, { type AppliedChord, type AppliedScale } from '../common/ScaleChordOptions'
import Tooltip from '../common/Tooltip'
import type { Note } from '../../utils/notes'
import type { KeyboardScale } from '../../utils/instruments/keyboard/keyboardScales'
import type { KeyboardChord } from '../../utils/instruments/keyboard/keyboardChords'
import type { GuitarChord, ChordShape } from '../../utils/instruments/guitar/guitarChords'
import type { GuitarScale, ScaleBox } from '../../utils/instruments/guitar/guitarScales'
import type { BassChord, BassChordShape } from '../../utils/instruments/bass/bassChords'
import type { KeyboardSelectionMode } from './InstrumentControls'

interface InstrumentHeaderProps {
  instrument: string
  keyboardSelectionMode?: KeyboardSelectionMode
  onKeyboardSelectionModeChange?: (mode: KeyboardSelectionMode) => void
  flashingInputs: { bpm: boolean; beats: boolean; mode: boolean }
  selectedNotes: Note[]
  appliedChords: AppliedChord[]
  appliedScales: AppliedScale[]
  selectedRoot: string
  selectedChordRoot: string
  onScaleSelect: (rootNote: string, scale: GuitarScale) => void
  onScaleBoxSelect: (scaleBox: ScaleBox) => void
  onClearScale: () => void
  onChordSelect: (rootNote: string, chord: GuitarChord) => void
  onChordShapeSelect: (chordShape: ChordShape) => void
  onClearChord: () => void
  onRootChange: (rootNote: string) => void
  onChordRootChange: (rootNote: string) => void
  onKeyboardScaleApply: (rootNote: string, scale: KeyboardScale) => void
  onKeyboardScaleClear: () => void
  onKeyboardChordApply: (rootNote: string, chord: KeyboardChord) => void
  onKeyboardChordClear: () => void
  onChordDelete: (chordId: string) => void
  onScaleDelete: (scaleId: string) => void
  onClearAllSelections: () => void
}

const InstrumentHeader: React.FC<InstrumentHeaderProps> = ({
  instrument,
  keyboardSelectionMode,
  onKeyboardSelectionModeChange,
  flashingInputs,
  selectedNotes,
  appliedChords,
  appliedScales,
  selectedRoot,
  selectedChordRoot,
  onScaleSelect,
  onScaleBoxSelect,
  onClearScale,
  onChordSelect,
  onChordShapeSelect,
  onClearChord,
  onRootChange,
  onChordRootChange,
  onKeyboardScaleApply,
  onKeyboardScaleClear,
  onKeyboardChordApply,
  onKeyboardChordClear,
  onChordDelete,
  onScaleDelete,
  onClearAllSelections
}) => {
  return (
    <div className="instrument-header-controls">
      <div className="header-controls-left">
        {instrument === 'keyboard' && (
          <div className="control-group">
            <div className="label-with-tooltip">
              <label className="control-label">Selection Mode</label>
              <Tooltip
                title="Selection Mode"
                text="Select your note selection method
Range Select - Select 2 notes and use the inclusive interval
Multi Select - Select the specific notes to use"
              >
                <div className="tooltip-icon">?</div>
              </Tooltip>
            </div>
            <select
              value={keyboardSelectionMode}
              onChange={(e) => onKeyboardSelectionModeChange && onKeyboardSelectionModeChange(e.target.value as KeyboardSelectionMode)}
              className={`control-input ${flashingInputs.mode ? 'flashing' : ''}`}
            >
              <option value="range">Range Select</option>
              <option value="multi">Multi Select</option>
            </select>
          </div>
        )}

        {/* Scale/Chord Options */}
        <div className="control-group scale-chord-options">
          <ScaleChordOptions
            instrument={instrument}
            onScaleSelect={onScaleSelect}
            onScaleBoxSelect={onScaleBoxSelect}
            onClearScale={onClearScale}
            onChordSelect={onChordSelect}
            onChordShapeSelect={onChordShapeSelect}
            onClearChord={onClearChord}
            onRootChange={onRootChange}
            onChordRootChange={onChordRootChange}
            selectedRoot={selectedRoot}
            selectedChordRoot={selectedChordRoot}
            onKeyboardScaleApply={onKeyboardScaleApply}
            onKeyboardScaleClear={onKeyboardScaleClear}
            onKeyboardChordApply={onKeyboardChordApply}
            onKeyboardChordClear={onKeyboardChordClear}
            appliedChords={appliedChords}
            onChordDelete={onChordDelete}
            appliedScales={appliedScales}
            onScaleDelete={onScaleDelete}
          />
        </div>

        {/* Deselect All button */}
        {(selectedNotes.length > 0 || appliedChords.length > 0 || appliedScales.length > 0) && (
          <div className="control-group">
            <button
              onClick={onClearAllSelections}
              className="control-button delete-selection"
              title="Clear selected notes, chords, and scales"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M2.5 1a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1H3v9a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V4h.5a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H10a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1H2.5zm3 4a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 .5-.5zM8 5a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7A.5.5 0 0 1 8 5zm3 .5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 1 0z"/>
              </svg>
              Deselect All
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default InstrumentHeader
import { memo, useCallback, useMemo } from 'react'
import ScaleChordOptions, { type AppliedChord, type AppliedScale, type FretboardPreview, type KeyboardPreview } from '../../common/ScaleChordOptions'
import Tooltip from '../../common/Tooltip'
import { PiTrashFill } from 'react-icons/pi'
import type { Note } from '../../../utils/notes'
import type { KeyboardScale } from '../../../utils/instruments/keyboard/keyboardScales'
import type { KeyboardChord } from '../../../utils/instruments/keyboard/keyboardChords'
import type { GuitarChord, ChordShape } from '../../../utils/instruments/guitar/guitarChords'
import type { GuitarScale, ScaleBox } from '../../../utils/instruments/guitar/guitarScales'
import type { BassChord, BassChordShape } from '../../../utils/instruments/bass/bassChords'
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
  onKeyboardScaleApply: (rootNote: string, scale: KeyboardScale, octave?: number) => void
  onKeyboardScaleClear: () => void
  onKeyboardChordApply: (rootNote: string, chord: KeyboardChord, octave?: number) => void
  onKeyboardChordClear: () => void
  onChordDelete: (chordId: string) => void
  onScaleDelete: (scaleId: string) => void
  onClearAllSelections: () => void
  lowerOctaves?: number
  higherOctaves?: number
  hideDeselectAll?: boolean
  showOnlyAppliedList?: boolean
  disableSelectionMode?: boolean
  hideSelectionMode?: boolean
  // Preview callbacks
  onFretboardPreviewChange?: (preview: FretboardPreview | null) => void
  onKeyboardPreviewChange?: (preview: KeyboardPreview | null) => void
  availableKeyboardNotes?: readonly Note[]
}

const InstrumentHeader = memo(function InstrumentHeader({
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
  onClearAllSelections,
  lowerOctaves = 0,
  higherOctaves = 0,
  hideDeselectAll = false,
  showOnlyAppliedList = false,
  disableSelectionMode = false,
  hideSelectionMode = false,
  onFretboardPreviewChange,
  onKeyboardPreviewChange,
  availableKeyboardNotes = []
}: InstrumentHeaderProps) {
  // Memoize selection mode handlers
  const handleRangeClick = useCallback(() => {
    if (!disableSelectionMode && onKeyboardSelectionModeChange && keyboardSelectionMode !== 'range') {
      onKeyboardSelectionModeChange('range')
    }
  }, [disableSelectionMode, onKeyboardSelectionModeChange, keyboardSelectionMode])

  const handleMultiClick = useCallback(() => {
    if (!disableSelectionMode && onKeyboardSelectionModeChange && keyboardSelectionMode !== 'multi') {
      onKeyboardSelectionModeChange('multi')
    }
  }, [disableSelectionMode, onKeyboardSelectionModeChange, keyboardSelectionMode])

  // Memoize computed values
  const showDeselectButton = useMemo(() => {
    return !hideDeselectAll && (selectedNotes.length > 0 || appliedChords.length > 0 || appliedScales.length > 0)
  }, [hideDeselectAll, selectedNotes.length, appliedChords.length, appliedScales.length])

  const selectionModeClass = useMemo(() => {
    return `selection-mode-switch ${flashingInputs.mode ? 'flashing' : ''} ${disableSelectionMode ? 'disabled' : ''}`
  }, [flashingInputs.mode, disableSelectionMode])

  return (
    <div className="instrument-header-controls">
      <div className="header-controls-left">
        {instrument === 'keyboard' && !hideSelectionMode && (
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
            <div className={selectionModeClass}>
              <button
                className={`switch-option ${keyboardSelectionMode === 'range' ? 'active' : ''}`}
                onClick={handleRangeClick}
                title="Range Select"
                disabled={disableSelectionMode}
              >
                Range
              </button>
              <button
                className={`switch-option ${keyboardSelectionMode === 'multi' ? 'active' : ''}`}
                onClick={handleMultiClick}
                title="Multi Select"
                disabled={disableSelectionMode}
              >
                Multi
              </button>
            </div>
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
            lowerOctaves={lowerOctaves}
            higherOctaves={higherOctaves}
            showOnlyAppliedList={showOnlyAppliedList}
            onFretboardPreviewChange={onFretboardPreviewChange}
            onKeyboardPreviewChange={onKeyboardPreviewChange}
            availableKeyboardNotes={availableKeyboardNotes}
          />
        </div>

        {/* Deselect All button */}
        {showDeselectButton && (
          <div className="control-group">
            <button
              onClick={onClearAllSelections}
              className="control-button delete-selection"
              title="Clear selected notes, chords, and scales"
            >
              <PiTrashFill size={16} />
              Deselect All
            </button>
          </div>
        )}
      </div>
    </div>
  )
})

export default InstrumentHeader
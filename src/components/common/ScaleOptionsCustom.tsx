import React, { useState, useEffect } from 'react'
import { ROOT_NOTES, GUITAR_SCALES, getScaleBoxes, type GuitarScale, type ScaleBox } from '../../utils/instruments/guitar/guitarScales'
import { guitarNotes } from '../../utils/instruments/guitar/guitarNotes'
import { BASS_ROOT_NOTES, BASS_SCALES, getBassScaleBoxes, type BassScale, type BassScaleBox } from '../../utils/instruments/bass/bassScales'
import { bassNotes } from '../../utils/instruments/bass/bassNotes'
import { KEYBOARD_SCALES, type KeyboardScale } from '../../utils/instruments/keyboard/keyboardScales'
import { CustomSelect } from '../../hooks/useCustomDropdown'
import '../../styles/ScaleOptions.css'

interface ScaleOptionsProps {
  instrument: string
  selectedRoot?: string
  onRootChange?: (rootNote: string) => void
  onScaleSelect?: (rootNote: string, scale: GuitarScale) => void
  onScaleBoxSelect?: (scaleBox: ScaleBox) => void
  onKeyboardScaleApply?: (rootNote: string, scale: KeyboardScale) => void
}

const ScaleOptionsCustom: React.FC<ScaleOptionsProps> = ({
  instrument,
  selectedRoot = 'C',
  onRootChange,
  onScaleSelect,
  onScaleBoxSelect,
  onKeyboardScaleApply
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [selectedScale, setSelectedScale] = useState<GuitarScale>(GUITAR_SCALES[0])
  const [selectedBassScale, setSelectedBassScale] = useState<BassScale>(BASS_SCALES[0])
  const [keyboardSelectedScale, setKeyboardSelectedScale] = useState<KeyboardScale>(KEYBOARD_SCALES[0])
  const [availableBoxes, setAvailableBoxes] = useState<ScaleBox[]>([])
  const [availableBassBoxes, setAvailableBassBoxes] = useState<BassScaleBox[]>([])
  const [selectedBoxIndex, setSelectedBoxIndex] = useState<number>(0)
  const [showPositions, setShowPositions] = useState<boolean>(true)

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded)
  }

  // Update available boxes when root or scale changes
  useEffect(() => {
    if (instrument === 'guitar') {
      const boxes = getScaleBoxes(selectedRoot, selectedScale, guitarNotes)
      setAvailableBoxes(boxes)
      setSelectedBoxIndex(0)
    } else if (instrument === 'bass') {
      const boxes = getBassScaleBoxes(selectedRoot, selectedBassScale, bassNotes)
      setAvailableBassBoxes(boxes)
      setSelectedBoxIndex(0)
    }
  }, [selectedRoot, selectedScale, selectedBassScale, instrument])

  // Prepare dropdown options
  const rootNoteOptions = (instrument === 'bass' ? BASS_ROOT_NOTES : ROOT_NOTES).map(note => ({
    value: note,
    label: note
  }))

  const scaleOptions = (instrument === 'guitar' ? GUITAR_SCALES : instrument === 'bass' ? BASS_SCALES : KEYBOARD_SCALES).map(scale => ({
    value: scale.name,
    label: scale.name
  }))

  const positionOptions = (instrument === 'guitar' ? availableBoxes : availableBassBoxes).map((box, index) => ({
    value: index.toString(),
    label: `Position ${index + 1}`
  }))

  // Handle scale changes
  const handleScaleChange = (scale: GuitarScale) => {
    setSelectedScale(scale)
    if (onScaleSelect) {
      onScaleSelect(selectedRoot, scale)
    }
  }

  const handleBassScaleChange = (scale: BassScale) => {
    setSelectedBassScale(scale)
    if (onScaleSelect) {
      onScaleSelect(selectedRoot, scale as any)
    }
  }

  const handleKeyboardScaleChange = (scale: KeyboardScale) => {
    setKeyboardSelectedScale(scale)
  }

  const handleApplyScale = () => {
    if (instrument === 'guitar' && onScaleSelect) {
      onScaleSelect(selectedRoot, selectedScale)
    } else if (instrument === 'bass' && onScaleSelect) {
      onScaleSelect(selectedRoot, selectedBassScale as any)
    } else if (instrument === 'keyboard' && onKeyboardScaleApply) {
      onKeyboardScaleApply(selectedRoot, keyboardSelectedScale)
    }
  }

  const handleBoxSelect = (boxIndex: number) => {
    setSelectedBoxIndex(boxIndex)
    if (instrument === 'guitar' && onScaleBoxSelect && availableBoxes[boxIndex]) {
      onScaleBoxSelect(availableBoxes[boxIndex])
    } else if (instrument === 'bass' && onScaleBoxSelect && availableBassBoxes[boxIndex]) {
      onScaleBoxSelect(availableBassBoxes[boxIndex] as any)
    }
  }

  return (
    <div className={`scale-options-container ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <button
        className="scale-options-toggle"
        onClick={toggleExpanded}
        aria-expanded={isExpanded}
      >
        {isExpanded ? '▼' : '▶'}
        <span className="toggle-text">{isExpanded ? 'Scale Options' : '\u00A0\u00A0\u00A0Scale Options'}</span>
      </button>

      {isExpanded && (
        <div className="scale-options-content">
          <div className="scale-controls">
            <div className="control-section">
              <label className="control-label">Root Note</label>
              <CustomSelect
                value={selectedRoot}
                onChange={(value) => onRootChange && onRootChange(value)}
                options={rootNoteOptions}
                className="control-select scale-dropdown"
                aria-label="Select root note"
              />
            </div>

            <div className="control-section">
              <label className="control-label">Scale</label>
              <CustomSelect
                value={instrument === 'guitar' ? selectedScale.name : instrument === 'bass' ? selectedBassScale.name : keyboardSelectedScale.name}
                onChange={(value) => {
                  if (instrument === 'guitar') {
                    const scale = GUITAR_SCALES.find(s => s.name === value)
                    if (scale) handleScaleChange(scale)
                  } else if (instrument === 'bass') {
                    const scale = BASS_SCALES.find(s => s.name === value)
                    if (scale) handleBassScaleChange(scale)
                  } else {
                    const scale = KEYBOARD_SCALES.find(s => s.name === value)
                    if (scale) handleKeyboardScaleChange(scale)
                  }
                }}
                options={scaleOptions}
                className="control-select scale-dropdown"
                aria-label="Select scale"
              />
            </div>

            {instrument === 'guitar' && availableBoxes.length > 0 && (
              <div className="control-section">
                <label className="control-label">Position</label>
                <CustomSelect
                  value={selectedBoxIndex.toString()}
                  onChange={(value) => handleBoxSelect(parseInt(value))}
                  options={positionOptions}
                  className="control-select scale-dropdown"
                  aria-label="Select position"
                />
              </div>
            )}

            {instrument === 'bass' && availableBassBoxes.length > 0 && (
              <div className="control-section">
                <label className="control-label">Position</label>
                <CustomSelect
                  value={selectedBoxIndex.toString()}
                  onChange={(value) => handleBoxSelect(parseInt(value))}
                  options={positionOptions}
                  className="control-select scale-dropdown"
                  aria-label="Select position"
                />
              </div>
            )}

            {(instrument === 'guitar' || instrument === 'bass') && (
              <div className="control-section">
                <label className="control-label checkbox-label">
                  <input
                    type="checkbox"
                    checked={showPositions}
                    onChange={(e) => setShowPositions(e.target.checked)}
                    className="styled-checkbox"
                  />
                  Show All Positions
                </label>
              </div>
            )}

            <button onClick={handleApplyScale} className="apply-button">
              Apply Scale
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ScaleOptionsCustom
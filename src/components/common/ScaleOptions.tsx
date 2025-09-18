import React, { useState, useEffect } from 'react'
import { ROOT_NOTES, GUITAR_SCALES, getScaleBoxes, type GuitarScale, type ScaleBox } from '../../utils/guitarScales'
import { guitarNotes } from '../../utils/guitarNotes'
import { BASS_ROOT_NOTES, BASS_SCALES, getBassScaleBoxes, type BassScale, type BassScaleBox } from '../../utils/bassScales'
import { bassNotes } from '../../utils/bassNotes'
import { KEYBOARD_SCALES, type KeyboardScale } from '../../utils/keyboardScales'
import '../../styles/ScaleOptions.css'

interface ScaleOptionsProps {
  instrument: string
  selectedRoot?: string
  onRootChange?: (rootNote: string) => void
  onScaleSelect?: (rootNote: string, scale: GuitarScale) => void
  onScaleBoxSelect?: (scaleBox: ScaleBox) => void
  onKeyboardScaleApply?: (rootNote: string, scale: KeyboardScale) => void
}

const ScaleOptions: React.FC<ScaleOptionsProps> = ({
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

  const handleScaleChange = (scale: GuitarScale) => {
    setSelectedScale(scale)
  }

  const handleBassScaleChange = (scale: BassScale) => {
    setSelectedBassScale(scale)
  }

  const handleKeyboardScaleChange = (scale: KeyboardScale) => {
    setKeyboardSelectedScale(scale)
  }

  const handleBoxChange = (boxIndex: number) => {
    setSelectedBoxIndex(boxIndex)
    // If "Entire Fretboard" is selected (index equals availableBoxes.length), use full scale
    const currentBoxes = instrument === 'bass' ? availableBassBoxes : availableBoxes
    if (boxIndex >= currentBoxes.length) {
      setShowPositions(false)
    } else {
      setShowPositions(true)
    }
  }

  const handleApplyScale = () => {
    if (instrument === 'guitar') {
      if (showPositions && availableBoxes.length > 0 && onScaleBoxSelect) {
        onScaleBoxSelect(availableBoxes[selectedBoxIndex])
      } else if (onScaleSelect) {
        onScaleSelect(selectedRoot, selectedScale)
      }
    } else if (instrument === 'bass') {
      if (showPositions && availableBassBoxes.length > 0 && onScaleBoxSelect) {
        onScaleBoxSelect(availableBassBoxes[selectedBoxIndex] as any)
      } else if (onScaleSelect) {
        onScaleSelect(selectedRoot, selectedBassScale as any)
      }
    } else if (instrument === 'keyboard' && onKeyboardScaleApply) {
      onKeyboardScaleApply(selectedRoot, keyboardSelectedScale)
    }
  }


  return (
    <div className={`scale-options-container ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <button
        className="scale-options-toggle"
        onClick={toggleExpanded}
        title={isExpanded ? 'Collapse Scale Options' : 'Expand Scale Options'}
      >
        {isExpanded ? '▼' : '▶'}
        <span className="toggle-text">{isExpanded ? 'Scale Options' : '\u00A0\u00A0\u00A0Scale Options'}</span>
      </button>

      {isExpanded && (
        <div className="scale-options-content">
          <div className="scale-controls">
            <div className="control-section">
              <label className="control-label">Root Note</label>
              <select
                value={selectedRoot}
                onChange={(e) => onRootChange && onRootChange(e.target.value)}
                className="control-select"
              >
                {(instrument === 'bass' ? BASS_ROOT_NOTES : ROOT_NOTES).map(note => (
                  <option key={note} value={note}>{note}</option>
                ))}
              </select>
            </div>

            <div className="control-section">
              <label className="control-label">Scale</label>
              <select
                value={instrument === 'guitar' ? selectedScale.name : instrument === 'bass' ? selectedBassScale.name : keyboardSelectedScale.name}
                onChange={(e) => {
                  if (instrument === 'guitar') {
                    const scale = GUITAR_SCALES.find(s => s.name === e.target.value)
                    if (scale) handleScaleChange(scale)
                  } else if (instrument === 'bass') {
                    const scale = BASS_SCALES.find(s => s.name === e.target.value)
                    if (scale) handleBassScaleChange(scale)
                  } else {
                    const scale = KEYBOARD_SCALES.find(s => s.name === e.target.value)
                    if (scale) handleKeyboardScaleChange(scale)
                  }
                }}
                className="control-select"
              >
                {(instrument === 'guitar' ? GUITAR_SCALES : instrument === 'bass' ? BASS_SCALES : KEYBOARD_SCALES).map(scale => (
                  <option key={scale.name} value={scale.name}>{scale.name}</option>
                ))}
              </select>
            </div>

            {instrument === 'guitar' && availableBoxes.length > 0 && (
              <div className="control-section">
                <label className="control-label">Position</label>
                <select
                  value={selectedBoxIndex}
                  onChange={(e) => handleBoxChange(parseInt(e.target.value))}
                  className="control-select"
                >
                  {availableBoxes.map((box, index) => (
                    <option key={index} value={index}>
                      Frets {box.minFret}-{box.maxFret}
                    </option>
                  ))}
                  <option key="entire" value={availableBoxes.length}>
                    Entire Fretboard
                  </option>
                </select>
              </div>
            )}

            {instrument === 'bass' && availableBassBoxes.length > 0 && (
              <div className="control-section">
                <label className="control-label">Position</label>
                <select
                  value={selectedBoxIndex}
                  onChange={(e) => handleBoxChange(parseInt(e.target.value))}
                  className="control-select"
                >
                  {availableBassBoxes.map((box, index) => (
                    <option key={index} value={index}>
                      Frets {box.minFret}-{box.maxFret}
                    </option>
                  ))}
                  <option key="entire" value={availableBassBoxes.length}>
                    Entire Fretboard
                  </option>
                </select>
              </div>
            )}

            <div className="control-section">
              <button
                onClick={handleApplyScale}
                className="apply-button"
                title={`Apply scale to ${instrument}`}
              >
                Apply Scale
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ScaleOptions
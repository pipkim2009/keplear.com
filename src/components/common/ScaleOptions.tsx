import React, { useState, useEffect } from 'react'
import { ChevronRight, ChevronDown } from 'lucide-react'
import { ROOT_NOTES, GUITAR_SCALES, getScaleBoxes, type GuitarScale, type ScaleBox } from '../../utils/guitarScales'
import { guitarNotes } from '../../utils/guitarNotes'
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
  const [keyboardSelectedScale, setKeyboardSelectedScale] = useState<KeyboardScale>(KEYBOARD_SCALES[0])
  const [availableBoxes, setAvailableBoxes] = useState<ScaleBox[]>([])
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
    }
  }, [selectedRoot, selectedScale, instrument])

  const handleScaleChange = (scale: GuitarScale) => {
    setSelectedScale(scale)
  }

  const handleKeyboardScaleChange = (scale: KeyboardScale) => {
    setKeyboardSelectedScale(scale)
  }

  const handleBoxChange = (boxIndex: number) => {
    setSelectedBoxIndex(boxIndex)
    // If "Entire Fretboard" is selected (index equals availableBoxes.length), use full scale
    if (boxIndex >= availableBoxes.length) {
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
    } else if (instrument === 'keyboard' && onKeyboardScaleApply) {
      onKeyboardScaleApply(selectedRoot, keyboardSelectedScale)
    }
  }

  // Common scale types that could be used for both instruments
  const scaleTypes = [
    'Major',
    'Minor',
    'Dorian',
    'Phrygian',
    'Lydian',
    'Mixolydian',
    'Aeolian',
    'Locrian',
    'Blues',
    'Pentatonic Major',
    'Pentatonic Minor',
    'Harmonic Minor',
    'Melodic Minor'
  ]

  return (
    <div className={`scale-options-container ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <button
        className="scale-options-toggle"
        onClick={toggleExpanded}
        title={isExpanded ? 'Collapse Scale Options' : 'Expand Scale Options'}
      >
        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <span className="toggle-text">Scale Options</span>
      </button>

      {isExpanded && (
        <div className="scale-options-content">
          <div className="scale-options-header">
            <h3>Scale Options</h3>
            <p>Root note and scale reference for {instrument}</p>
          </div>

          <div className="scale-controls">
            <div className="control-section">
              <label className="control-label">Root Note</label>
              <select
                value={selectedRoot}
                onChange={(e) => onRootChange && onRootChange(e.target.value)}
                className="control-select"
              >
                {ROOT_NOTES.map(note => (
                  <option key={note} value={note}>{note}</option>
                ))}
              </select>
            </div>

            <div className="control-section">
              <label className="control-label">Scale</label>
              <select
                value={instrument === 'guitar' ? selectedScale.name : keyboardSelectedScale.name}
                onChange={(e) => {
                  if (instrument === 'guitar') {
                    const scale = GUITAR_SCALES.find(s => s.name === e.target.value)
                    if (scale) handleScaleChange(scale)
                  } else {
                    const scale = KEYBOARD_SCALES.find(s => s.name === e.target.value)
                    if (scale) handleKeyboardScaleChange(scale)
                  }
                }}
                className="control-select"
              >
                {(instrument === 'guitar' ? GUITAR_SCALES : KEYBOARD_SCALES).map(scale => (
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

          <div className="scale-reference">
            <h4>Scale Reference</h4>
            {scaleTypes.map((scale, index) => (
              <div key={index} className="scale-item">
                <span className="scale-name">{scale}</span>
                <div className="scale-info">
                  <span className="scale-description">
                    {scale === 'Major' && 'Happy, bright sound'}
                    {scale === 'Minor' && 'Sad, melancholic sound'}
                    {scale === 'Blues' && 'Soulful, expressive sound'}
                    {scale === 'Pentatonic Major' && 'Simple, versatile scale'}
                    {scale === 'Pentatonic Minor' && 'Rock, blues foundation'}
                    {scale === 'Dorian' && 'Minor with raised 6th'}
                    {scale === 'Phrygian' && 'Spanish, exotic sound'}
                    {scale === 'Lydian' && 'Dreamy, floating sound'}
                    {scale === 'Mixolydian' && 'Dominant, bluesy sound'}
                    {scale === 'Aeolian' && 'Natural minor scale'}
                    {scale === 'Locrian' && 'Rare, diminished sound'}
                    {scale === 'Harmonic Minor' && 'Classical, dramatic'}
                    {scale === 'Melodic Minor' && 'Jazz, ascending melody'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default ScaleOptions
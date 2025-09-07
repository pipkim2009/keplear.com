import React, { useState, useEffect } from 'react'
import { GUITAR_SCALES, ROOT_NOTES, type GuitarScale, type ScaleBox, getScaleBoxes, applyScaleBoxToGuitar } from '../../utils/guitarScales'
import { guitarNotes } from '../../utils/guitarNotes'

interface ScaleSelectorProps {
  onScaleSelect: (rootNote: string, scale: GuitarScale) => void
  onScaleBoxSelect: (scaleBox: ScaleBox) => void
  onClearScale: () => void
  showPositions: boolean
}

const ScaleSelector: React.FC<ScaleSelectorProps> = ({ onScaleSelect, onScaleBoxSelect, onClearScale, showPositions }) => {
  const [selectedRoot, setSelectedRoot] = useState<string>('C')
  const [selectedScale, setSelectedScale] = useState<GuitarScale>(GUITAR_SCALES[0])
  const [isExpanded, setIsExpanded] = useState<boolean>(false)
  const [availableBoxes, setAvailableBoxes] = useState<ScaleBox[]>([])
  const [selectedBoxIndex, setSelectedBoxIndex] = useState<number>(0)

  // Update available boxes when root or scale changes
  useEffect(() => {
    const boxes = getScaleBoxes(selectedRoot, selectedScale, guitarNotes)
    setAvailableBoxes(boxes)
    setSelectedBoxIndex(0)
  }, [selectedRoot, selectedScale])

  const handleRootChange = (rootNote: string) => {
    setSelectedRoot(rootNote)
    if (!showPositions) {
      onScaleSelect(rootNote, selectedScale)
    }
  }

  const handleScaleChange = (scale: GuitarScale) => {
    setSelectedScale(scale)
    if (!showPositions) {
      onScaleSelect(selectedRoot, scale)
    }
  }

  const handleApplyScale = () => {
    if (showPositions && availableBoxes.length > 0) {
      onScaleBoxSelect(availableBoxes[selectedBoxIndex])
    } else {
      onScaleSelect(selectedRoot, selectedScale)
    }
  }

  const handleClearScale = () => {
    onClearScale()
  }


  const handleBoxChange = (boxIndex: number) => {
    setSelectedBoxIndex(boxIndex)
    if (availableBoxes[boxIndex]) {
      onScaleBoxSelect(availableBoxes[boxIndex])
    }
  }

  return (
    <div className="scale-selector">
      <div className="scale-selector-header">
        <button 
          className="scale-toggle-button"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? '▼' : '▶'} Guitar Scales
        </button>
      </div>

      {isExpanded && (
        <div className="scale-selector-content">
          <div className="scale-controls">
            <div className="scale-control-group">
              <label htmlFor="root-select">Root Note:</label>
              <select 
                id="root-select"
                value={selectedRoot}
                onChange={(e) => handleRootChange(e.target.value)}
              >
                {ROOT_NOTES.map(note => (
                  <option key={note} value={note}>{note}</option>
                ))}
              </select>
            </div>

            <div className="scale-control-group">
              <label htmlFor="scale-select">Scale:</label>
              <select 
                id="scale-select"
                value={selectedScale.name}
                onChange={(e) => {
                  const scale = GUITAR_SCALES.find(s => s.name === e.target.value)
                  if (scale) handleScaleChange(scale)
                }}
              >
                {GUITAR_SCALES.map(scale => (
                  <option key={scale.name} value={scale.name}>{scale.name}</option>
                ))}
              </select>
            </div>
          </div>


          {showPositions && availableBoxes.length > 0 && (
            <div className="position-selector">
              <div className="scale-control-group">
                <label htmlFor="position-select">Position:</label>
                <select
                  id="position-select"
                  value={selectedBoxIndex}
                  onChange={(e) => handleBoxChange(parseInt(e.target.value))}
                >
                  {availableBoxes.map((box, index) => (
                    <option key={index} value={index}>
                      {box.name} (Frets {box.minFret}-{box.maxFret})
                    </option>
                  ))}
                </select>
              </div>
              {availableBoxes[selectedBoxIndex] && (
                <div className="position-info">
                  <p><strong>{availableBoxes[selectedBoxIndex].name}</strong></p>
                  <p>Frets: {availableBoxes[selectedBoxIndex].minFret}-{availableBoxes[selectedBoxIndex].maxFret}</p>
                  <p>Notes: {availableBoxes[selectedBoxIndex].positions.length} positions</p>
                </div>
              )}
            </div>
          )}

          <div className="scale-description">
            <p><strong>{selectedScale.name}</strong>: {selectedScale.description}</p>
            <p><strong>Pattern:</strong> {selectedScale.intervals.join(' - ')}</p>
          </div>

          <div className="scale-actions">
            <button className="apply-scale-button" onClick={handleApplyScale}>
              Apply {showPositions && availableBoxes.length > 0 
                ? `${availableBoxes[selectedBoxIndex]?.name || 'Position'}`
                : `${selectedRoot} ${selectedScale.name}`
              }
            </button>
            <button className="clear-scale-button" onClick={handleClearScale}>
              Clear Scale
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ScaleSelector
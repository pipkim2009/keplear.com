import React, { useState } from 'react'
import { GUITAR_SCALES, ROOT_NOTES, type GuitarScale } from '../../utils/guitarScales'

interface ScaleSelectorProps {
  onScaleSelect: (rootNote: string, scale: GuitarScale) => void
  onClearScale: () => void
}

const ScaleSelector: React.FC<ScaleSelectorProps> = ({ onScaleSelect, onClearScale }) => {
  const [selectedRoot, setSelectedRoot] = useState<string>('C')
  const [selectedScale, setSelectedScale] = useState<GuitarScale>(GUITAR_SCALES[0])
  const [isExpanded, setIsExpanded] = useState<boolean>(false)

  const handleRootChange = (rootNote: string) => {
    setSelectedRoot(rootNote)
    onScaleSelect(rootNote, selectedScale)
  }

  const handleScaleChange = (scale: GuitarScale) => {
    setSelectedScale(scale)
    onScaleSelect(selectedRoot, scale)
  }

  const handleApplyScale = () => {
    onScaleSelect(selectedRoot, selectedScale)
  }

  const handleClearScale = () => {
    onClearScale()
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

          <div className="scale-description">
            <p><strong>{selectedScale.name}</strong>: {selectedScale.description}</p>
            <p><strong>Pattern:</strong> {selectedScale.intervals.join(' - ')}</p>
          </div>

          <div className="scale-actions">
            <button className="apply-scale-button" onClick={handleApplyScale}>
              Apply {selectedRoot} {selectedScale.name}
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
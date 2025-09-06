import React, { useState, useEffect, useRef } from 'react'
import '../../styles/Controls.css'
import { GUITAR_SCALES, ROOT_NOTES, type GuitarScale } from '../../utils/guitarScales'

interface InstrumentControlsProps {
  bpm: number
  setBpm: (bpm: number) => void
  numberOfNotes: number
  setNumberOfNotes: (count: number) => void
  instrument: string
  setInstrument: (instrument: string) => void
  clearSelection: () => void
  hasSelectedNotes: boolean
  onScaleSelect?: (rootNote: string, scale: GuitarScale, octaveRange?: { min: number; max: number }) => void
  onClearScale?: () => void
}

const InstrumentControls: React.FC<InstrumentControlsProps> = ({
  bpm,
  setBpm,
  numberOfNotes,
  setNumberOfNotes,
  instrument,
  setInstrument,
  clearSelection,
  hasSelectedNotes,
  onScaleSelect,
  onClearScale
}) => {
  const [bpmDisplay, setBpmDisplay] = useState(bpm.toString())
  const [notesDisplay, setNotesDisplay] = useState(numberOfNotes.toString())
  const [selectedRoot, setSelectedRoot] = useState<string>('C')
  const [selectedScale, setSelectedScale] = useState<GuitarScale>(GUITAR_SCALES[0])
  const [octaveRange, setOctaveRange] = useState<{ min: number; max: number }>({ min: 2, max: 5 })
  const [hasActiveScale, setHasActiveScale] = useState<boolean>(false)
  
  // Original default values
  const DEFAULT_BPM = 120
  const DEFAULT_NOTES = 5
  
  // Refs for hold-down functionality
  const bpmIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const notesIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  // Update display values when props change
  useEffect(() => {
    setBpmDisplay(bpm.toString())
  }, [bpm])
  
  useEffect(() => {
    setNotesDisplay(numberOfNotes.toString())
  }, [numberOfNotes])
  
  const handleBpmChange = (value: string) => {
    // Only allow numbers and empty string
    let numericValue = value.replace(/[^0-9]/g, '')
    // Remove leading zeros but keep single zero
    if (numericValue.length > 1) {
      numericValue = numericValue.replace(/^0+/, '') || '0'
    }
    // Limit to max 999
    if (numericValue !== '' && Number(numericValue) > 999) {
      numericValue = '999'
    }
    setBpmDisplay(numericValue)
    // Don't update actual value while typing - only on blur/enter
  }
  
  const handleNotesChange = (value: string) => {
    // Only allow numbers and empty string
    let numericValue = value.replace(/[^0-9]/g, '')
    // Remove leading zeros but keep single zero
    if (numericValue.length > 1) {
      numericValue = numericValue.replace(/^0+/, '') || '0'
    }
    // Limit to max 999
    if (numericValue !== '' && Number(numericValue) > 999) {
      numericValue = '999'
    }
    setNotesDisplay(numericValue)
    // Don't update actual value while typing - only on blur/enter
  }
  
  const handleBpmKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (bpmDisplay === '') {
        setBpm(DEFAULT_BPM)
        setBpmDisplay(DEFAULT_BPM.toString())
      } else if (!isNaN(Number(bpmDisplay))) {
        setBpm(Number(bpmDisplay))
      }
      // Exit the input field
      e.currentTarget.blur()
    }
  }
  
  const handleNotesKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (notesDisplay === '') {
        setNumberOfNotes(DEFAULT_NOTES)
        setNotesDisplay(DEFAULT_NOTES.toString())
      } else if (!isNaN(Number(notesDisplay))) {
        setNumberOfNotes(Number(notesDisplay))
      }
      // Exit the input field
      e.currentTarget.blur()
    }
  }
  
  const handleBpmBlur = () => {
    if (bpmDisplay !== '' && !isNaN(Number(bpmDisplay))) {
      setBpm(Number(bpmDisplay))
    } else {
      setBpmDisplay(bpm.toString())
    }
  }
  
  const handleNotesBlur = () => {
    if (notesDisplay !== '' && !isNaN(Number(notesDisplay))) {
      setNumberOfNotes(Number(notesDisplay))
    } else {
      setNotesDisplay(numberOfNotes.toString())
    }
  }


  // Hold-down functionality
  const startBpmIncrement = () => {
    const increment = () => {
      const newBpm = Math.min(bpm + 1, 999)
      setBpm(newBpm)
      setBpmDisplay(newBpm.toString())
    }
    
    increment() // First increment immediately
    if (bpmIntervalRef.current) clearInterval(bpmIntervalRef.current)
    bpmIntervalRef.current = setInterval(increment, 225)
  }

  const startBpmDecrement = () => {
    const decrement = () => {
      const newBpm = Math.max(bpm - 1, 1)
      setBpm(newBpm)
      setBpmDisplay(newBpm.toString())
    }
    
    decrement() // First decrement immediately
    if (bpmIntervalRef.current) clearInterval(bpmIntervalRef.current)
    bpmIntervalRef.current = setInterval(decrement, 225)
  }

  const startNotesIncrement = () => {
    const increment = () => {
      const newNotes = Math.min(numberOfNotes + 1, 999)
      setNumberOfNotes(newNotes)
      setNotesDisplay(newNotes.toString())
    }
    
    increment() // First increment immediately
    if (notesIntervalRef.current) clearInterval(notesIntervalRef.current)
    notesIntervalRef.current = setInterval(increment, 225)
  }

  const startNotesDecrement = () => {
    const decrement = () => {
      const newNotes = Math.max(numberOfNotes - 1, 1)
      setNumberOfNotes(newNotes)
      setNotesDisplay(newNotes.toString())
    }
    
    decrement() // First decrement immediately
    if (notesIntervalRef.current) clearInterval(notesIntervalRef.current)
    notesIntervalRef.current = setInterval(decrement, 225)
  }

  const stopBpmInterval = () => {
    if (bpmIntervalRef.current) {
      clearInterval(bpmIntervalRef.current)
      bpmIntervalRef.current = null
    }
  }

  const stopNotesInterval = () => {
    if (notesIntervalRef.current) {
      clearInterval(notesIntervalRef.current)
      notesIntervalRef.current = null
    }
  }

  // Scale control handlers
  const handleRootChange = (rootNote: string) => {
    setSelectedRoot(rootNote)
  }

  const handleScaleChange = (scale: GuitarScale) => {
    setSelectedScale(scale)
  }

  const handleOctaveRangeChange = (newRange: { min: number; max: number }) => {
    setOctaveRange(newRange)
  }

  const handleApplyScale = () => {
    if (onScaleSelect) {
      onScaleSelect(selectedRoot, selectedScale, octaveRange)
      setHasActiveScale(true)
    }
  }

  const handleClearScale = () => {
    if (onClearScale) {
      onClearScale()
      setHasActiveScale(false)
    }
  }

  // Auto-reapply scale when parameters change
  useEffect(() => {
    if (hasActiveScale && onScaleSelect) {
      onScaleSelect(selectedRoot, selectedScale, octaveRange)
    }
  }, [selectedRoot, selectedScale, octaveRange, hasActiveScale, onScaleSelect])

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      stopBpmInterval()
      stopNotesInterval()
    }
  }, [])
  return (
    <div className="instrument-controls">
      <div className="control-group">
        <label className="control-label">Instrument</label>
        <select
          value={instrument}
          onChange={(e) => setInstrument(e.target.value)}
          className="control-input"
        >
          <option value="keyboard">Keyboard</option>
          <option value="guitar">Guitar</option>
        </select>
      </div>

      <div className="control-group">
        <label className="control-label">BPM</label>
        <div className="input-with-buttons">
          <input
            type="text"
            value={bpmDisplay}
            onChange={(e) => handleBpmChange(e.target.value)}
            onKeyPress={handleBpmKeyPress}
            onBlur={handleBpmBlur}
            className="control-input with-internal-buttons"
          />
          <button
            className="control-button-internal minus"
            onMouseDown={startBpmDecrement}
            onMouseUp={stopBpmInterval}
            onMouseLeave={stopBpmInterval}
            onTouchStart={startBpmDecrement}
            onTouchEnd={stopBpmInterval}
          >
            −
          </button>
          <button
            className="control-button-internal plus"
            onMouseDown={startBpmIncrement}
            onMouseUp={stopBpmInterval}
            onMouseLeave={stopBpmInterval}
            onTouchStart={startBpmIncrement}
            onTouchEnd={stopBpmInterval}
          >
            +
          </button>
        </div>
      </div>

      <div className="control-group">
        <label className="control-label">Notes</label>
        <div className="input-with-buttons">
          <input
            type="text"
            value={notesDisplay}
            onChange={(e) => handleNotesChange(e.target.value)}
            onKeyPress={handleNotesKeyPress}
            onBlur={handleNotesBlur}
            className="control-input with-internal-buttons"
          />
          <button
            className="control-button-internal minus"
            onMouseDown={startNotesDecrement}
            onMouseUp={stopNotesInterval}
            onMouseLeave={stopNotesInterval}
            onTouchStart={startNotesDecrement}
            onTouchEnd={stopNotesInterval}
          >
            −
          </button>
          <button
            className="control-button-internal plus"
            onMouseDown={startNotesIncrement}
            onMouseUp={stopNotesInterval}
            onMouseLeave={stopNotesInterval}
            onTouchStart={startNotesIncrement}
            onTouchEnd={stopNotesInterval}
          >
            +
          </button>
        </div>
      </div>

      {instrument === 'guitar' && (
        <>
          <div className="control-group">
            <label className="control-label">Root Note</label>
            <select
              value={selectedRoot}
              onChange={(e) => handleRootChange(e.target.value)}
              className="control-input"
            >
              {ROOT_NOTES.map(note => (
                <option key={note} value={note}>{note}</option>
              ))}
            </select>
          </div>

          <div className="control-group">
            <label className="control-label">Scale</label>
            <select
              value={selectedScale.name}
              onChange={(e) => {
                const scale = GUITAR_SCALES.find(s => s.name === e.target.value)
                if (scale) handleScaleChange(scale)
              }}
              className="control-input"
            >
              {GUITAR_SCALES.map(scale => (
                <option key={scale.name} value={scale.name}>{scale.name}</option>
              ))}
            </select>
          </div>

          <div className="control-group">
            <label className="control-label">Octave Range</label>
            <div className="octave-range-container">
              <div className="dual-range-slider">
                <input
                  type="range"
                  min="2"
                  max="5"
                  value={octaveRange.min}
                  onChange={(e) => {
                    const newMin = parseInt(e.target.value)
                    const newMax = Math.max(newMin, octaveRange.max)
                    handleOctaveRangeChange({ min: newMin, max: newMax })
                  }}
                  className="octave-slider range-min"
                />
                <input
                  type="range"
                  min="2"
                  max="5"
                  value={octaveRange.max}
                  onChange={(e) => {
                    const newMax = parseInt(e.target.value)
                    const newMin = Math.min(octaveRange.min, newMax)
                    handleOctaveRangeChange({ min: newMin, max: newMax })
                  }}
                  className="octave-slider range-max"
                />
                <div className="range-track">
                  <div 
                    className="range-fill"
                    style={{
                      left: `${((octaveRange.min - 2) / 3) * 100}%`,
                      width: `${((octaveRange.max - octaveRange.min) / 3) * 100}%`
                    }}
                  />
                </div>
                <div className="range-labels">
                  <span>2</span>
                  <span>3</span>
                  <span>4</span>
                  <span>5</span>
                </div>
              </div>
            </div>
          </div>

          <div className="control-group">
            <button
              onClick={handleApplyScale}
              className="control-button apply-scale"
              title="Apply scale to guitar"
            >
              Apply Scale
            </button>
          </div>
        </>
      )}

      {hasSelectedNotes && (
        <div className="control-group">
          <button
            onClick={() => {
              clearSelection()
              handleClearScale()
            }}
            className="control-button delete-selection"
            title="Clear selected notes and scales"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M2.5 1a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1H3v9a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V4h.5a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H10a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1H2.5zm3 4a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 .5-.5zM8 5a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7A.5.5 0 0 1 8 5zm3 .5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 1 0z"/>
            </svg>
            Deselect All
          </button>
        </div>
      )}
    </div>
  )
}

export default InstrumentControls
import React, { useState, useEffect, useRef } from 'react'
import '../../styles/Controls.css'

interface InstrumentControlsProps {
  bpm: number
  setBpm: (bpm: number) => void
  numberOfNotes: number
  setNumberOfNotes: (count: number) => void
  instrument: string
  setInstrument: (instrument: string) => void
}

const InstrumentControls: React.FC<InstrumentControlsProps> = ({
  bpm,
  setBpm,
  numberOfNotes,
  setNumberOfNotes,
  instrument,
  setInstrument
}) => {
  const [bpmDisplay, setBpmDisplay] = useState(bpm.toString())
  const [notesDisplay, setNotesDisplay] = useState(numberOfNotes.toString())
  
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

  // Plus/Minus button handlers with hold-down functionality
  const handleBpmIncrement = () => {
    const newBpm = Math.min(bpm + 1, 999)
    setBpm(newBpm)
    setBpmDisplay(newBpm.toString())
  }

  const handleBpmDecrement = () => {
    const newBpm = Math.max(bpm - 1, 1)
    setBpm(newBpm)
    setBpmDisplay(newBpm.toString())
  }

  const handleNotesIncrement = () => {
    const newNotes = Math.min(numberOfNotes + 1, 999)
    setNumberOfNotes(newNotes)
    setNotesDisplay(newNotes.toString())
  }

  const handleNotesDecrement = () => {
    const newNotes = Math.max(numberOfNotes - 1, 1)
    setNumberOfNotes(newNotes)
    setNotesDisplay(newNotes.toString())
  }

  // Hold-down functionality
  const startBpmIncrement = () => {
    const increment = () => {
      setBpm(prev => {
        const newBpm = Math.min(prev + 1, 999)
        setBpmDisplay(newBpm.toString())
        return newBpm
      })
    }
    
    increment() // First increment immediately
    if (bpmIntervalRef.current) clearInterval(bpmIntervalRef.current)
    bpmIntervalRef.current = setInterval(increment, 225)
  }

  const startBpmDecrement = () => {
    const decrement = () => {
      setBpm(prev => {
        const newBpm = Math.max(prev - 1, 1)
        setBpmDisplay(newBpm.toString())
        return newBpm
      })
    }
    
    decrement() // First decrement immediately
    if (bpmIntervalRef.current) clearInterval(bpmIntervalRef.current)
    bpmIntervalRef.current = setInterval(decrement, 225)
  }

  const startNotesIncrement = () => {
    const increment = () => {
      setNumberOfNotes(prev => {
        const newNotes = Math.min(prev + 1, 999)
        setNotesDisplay(newNotes.toString())
        return newNotes
      })
    }
    
    increment() // First increment immediately
    if (notesIntervalRef.current) clearInterval(notesIntervalRef.current)
    notesIntervalRef.current = setInterval(increment, 225)
  }

  const startNotesDecrement = () => {
    const decrement = () => {
      setNumberOfNotes(prev => {
        const newNotes = Math.max(prev - 1, 1)
        setNotesDisplay(newNotes.toString())
        return newNotes
      })
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
    </div>
  )
}

export default InstrumentControls
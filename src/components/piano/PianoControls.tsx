import React from 'react'
import '../../styles/Controls.css'

interface PianoControlsProps {
  bpm: number
  setBpm: (bpm: number) => void
  numberOfNotes: number
  setNumberOfNotes: (count: number) => void
}

const PianoControls: React.FC<PianoControlsProps> = ({
  bpm,
  setBpm,
  numberOfNotes,
  setNumberOfNotes
}) => {
  return (
    <div className="piano-controls">
      <div className="control-group">
        <label className="control-label">BPM</label>
        <input
          type="number"
          min="1"
          max="999"
          value={bpm}
          onChange={(e) => setBpm(Number(e.target.value))}
          className="control-input"
        />
      </div>

      <div className="control-group">
        <label className="control-label">Notes</label>
        <input
          type="number"
          min="1"
          max="25"
          value={numberOfNotes}
          onChange={(e) => setNumberOfNotes(Number(e.target.value))}
          className="control-input"
        />
      </div>
    </div>
  )
}

export default PianoControls
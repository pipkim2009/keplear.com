import { memo } from 'react'
import { useInstrument } from '../../contexts/InstrumentContext'
import { IoSettingsSharp } from 'react-icons/io5'
import { IoMusicalNotes } from 'react-icons/io5'
import { MdMusicNote } from 'react-icons/md'

/**
 * Component for controlling melody parameters (BPM, number of notes, etc.)
 * Extracted from InstrumentControls for better organization
 * Optimized with React.memo
 */
const ParameterControls = memo(function ParameterControls() {
  const {
    bpm,
    setBpm,
    numberOfNotes,
    setNumberOfNotes,
    flashingInputs,
    activeInputs,
    triggerInputFlash,
    setInputActive
  } = useInstrument()

  const handleBpmChange = (newBpm: number) => {
    // Validate input to prevent NaN
    const validBpm = isNaN(newBpm) ? bpm : newBpm
    setBpm(validBpm)
    triggerInputFlash('bpm')
  }

  const handleNotesChange = (newNotes: number) => {
    // Validate input to prevent NaN
    const validNotes = isNaN(newNotes) ? numberOfNotes : newNotes
    setNumberOfNotes(validNotes)
    triggerInputFlash('notes')
  }

  return (
    <div className="parameter-controls">
      <h3><IoSettingsSharp /> Melody Settings</h3>

      <div className="control-group">
        <label htmlFor="bpm-control"><IoMusicalNotes /> BPM (Beats Per Minute)</label>
        <div className="input-container">
          <input
            id="bpm-control"
            name="bpm"
            type="range"
            min="60"
            max="200"
            value={bpm}
            onChange={(e) => {
              const value = Number(e.target.value)
              handleBpmChange(value)
            }}
            onFocus={() => setInputActive('bpm', true)}
            onBlur={() => setInputActive('bpm', false)}
            className={`slider ${flashingInputs.bpm || activeInputs.bpm ? 'flashing' : ''}`}
          />
          <span className="value-display">{bpm}</span>
        </div>
      </div>

      <div className="control-group">
        <label htmlFor="notes-control"><MdMusicNote /> Number of Notes</label>
        <div className="input-container">
          <input
            id="notes-control"
            name="numberOfNotes"
            type="range"
            min="4"
            max="16"
            value={numberOfNotes}
            onChange={(e) => {
              const value = Number(e.target.value)
              handleNotesChange(value)
            }}
            onFocus={() => setInputActive('notes', true)}
            onBlur={() => setInputActive('notes', false)}
            className={`slider ${flashingInputs.notes || activeInputs.notes ? 'flashing' : ''}`}
          />
          <span className="value-display">{numberOfNotes}</span>
        </div>
      </div>
    </div>
  )
})

export default ParameterControls
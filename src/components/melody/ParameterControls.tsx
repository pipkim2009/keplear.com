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
    numberOfBeats,
    setNumberOfBeats,
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

  const handleBeatsChange = (newBeats: number) => {
    // Validate input to prevent NaN
    const validBeats = isNaN(newBeats) ? numberOfBeats : newBeats
    setNumberOfBeats(validBeats)
    triggerInputFlash('beats')
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
        <label htmlFor="beats-control"><MdMusicNote /> Number of Beats</label>
        <div className="input-container">
          <input
            id="beats-control"
            name="numberOfBeats"
            type="range"
            min="4"
            max="16"
            value={numberOfBeats}
            onChange={(e) => {
              const value = Number(e.target.value)
              handleBeatsChange(value)
            }}
            onFocus={() => setInputActive('beats', true)}
            onBlur={() => setInputActive('beats', false)}
            className={`slider ${flashingInputs.beats || activeInputs.beats ? 'flashing' : ''}`}
          />
          <span className="value-display">{numberOfBeats}</span>
        </div>
      </div>
    </div>
  )
})

export default ParameterControls
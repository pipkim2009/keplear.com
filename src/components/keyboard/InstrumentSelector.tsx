import React from 'react'
import { useInstrument } from '../../contexts/InstrumentContext'

/**
 * Component for selecting different instruments
 * Extracted from InstrumentControls for better modularity
 */
const InstrumentSelector: React.FC = () => {
  const { instrument, handleInstrumentChange } = useInstrument()

  const instruments = [
    { value: 'keyboard', label: '🎹 Keyboard', emoji: '🎹' },
    { value: 'guitar', label: '🎸 Guitar', emoji: '🎸' },
    { value: 'bass', label: '🎸 Bass', emoji: '🎸' }
  ]

  return (
    <div className="instrument-selector">
      <h3>🎵 Choose Your Instrument</h3>
      <div className="instrument-options">
        {instruments.map((inst) => (
          <button
            key={inst.value}
            className={`instrument-button ${instrument === inst.value ? 'active' : ''}`}
            onClick={() => handleInstrumentChange(inst.value)}
          >
            <span className="instrument-emoji">{inst.emoji}</span>
            <span className="instrument-name">{inst.label.replace(/🎹|🎸/, '').trim()}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default InstrumentSelector
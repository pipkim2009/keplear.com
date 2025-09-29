import { memo, useMemo, useCallback } from 'react'
import { useInstrument } from '../../contexts/InstrumentContext'
import type { InstrumentType } from '../../types/instrument'

const INSTRUMENTS = [
  { value: 'keyboard' as const, label: '🎹 Keyboard', emoji: '🎹' },
  { value: 'guitar' as const, label: '🎸 Guitar', emoji: '🎸' },
  { value: 'bass' as const, label: '🎸 Bass', emoji: '🎸' }
] as const

/**
 * Component for selecting different instruments
 * Extracted from InstrumentControls for better modularity
 * Optimized with memo and useMemo
 */
const InstrumentSelector = memo(function InstrumentSelector() {
  const { instrument, handleInstrumentChange } = useInstrument()

  // Memoize click handlers to prevent recreation on every render
  const handleKeyboardClick = useCallback(() => handleInstrumentChange('keyboard'), [handleInstrumentChange])
  const handleGuitarClick = useCallback(() => handleInstrumentChange('guitar'), [handleInstrumentChange])
  const handleBassClick = useCallback(() => handleInstrumentChange('bass'), [handleInstrumentChange])

  const handlers = useMemo(() => ({
    keyboard: handleKeyboardClick,
    guitar: handleGuitarClick,
    bass: handleBassClick
  }), [handleKeyboardClick, handleGuitarClick, handleBassClick])

  return (
    <div className="instrument-selector">
      <h3>🎵 Choose Your Instrument</h3>
      <div className="instrument-options">
        {INSTRUMENTS.map((inst) => (
          <button
            key={inst.value}
            className={`instrument-button ${instrument === inst.value ? 'active' : ''}`}
            onClick={handlers[inst.value]}
          >
            <span className="instrument-emoji">{inst.emoji}</span>
            <span className="instrument-name">{inst.label.replace(/🎹|🎸/, '').trim()}</span>
          </button>
        ))}
      </div>
    </div>
  )
})

export default InstrumentSelector
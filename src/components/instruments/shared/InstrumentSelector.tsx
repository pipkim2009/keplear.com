import { memo, useMemo, useCallback } from 'react'
import { useInstrument } from '../../../contexts/InstrumentContext'
import type { InstrumentType } from '../../../types/instrument'
import { PiPianoKeysFill } from 'react-icons/pi'
import { GiGuitarBassHead, GiGuitarHead } from 'react-icons/gi'
import { IoMusicalNotes } from 'react-icons/io5'

const INSTRUMENTS = [
  { value: 'keyboard' as const, label: 'Keyboard', icon: PiPianoKeysFill },
  { value: 'guitar' as const, label: 'Guitar', icon: GiGuitarHead },
  { value: 'bass' as const, label: 'Bass', icon: GiGuitarBassHead }
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
      <h3><IoMusicalNotes /> Choose Your Instrument</h3>
      <div className="instrument-options">
        {INSTRUMENTS.map((inst) => {
          const Icon = inst.icon
          return (
            <button
              key={inst.value}
              className={`instrument-button ${instrument === inst.value ? 'active' : ''}`}
              onClick={handlers[inst.value]}
            >
              <span className="instrument-emoji"><Icon /></span>
              <span className="instrument-name">{inst.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
})

export default InstrumentSelector
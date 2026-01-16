import { memo, useMemo, useCallback } from 'react'
import { useInstrumentType } from '../../../hooks'
import type { InstrumentType } from '../../../types/instrument'
import { PiPianoKeysFill } from 'react-icons/pi'
import { GiGuitarBassHead, GiGuitarHead } from 'react-icons/gi'
import { IoMusicalNotes } from 'react-icons/io5'
import { useTranslation } from '../../../contexts/TranslationContext'

const INSTRUMENTS = [
  { value: 'keyboard' as const, labelKey: 'sandbox.keyboard', icon: PiPianoKeysFill },
  { value: 'guitar' as const, labelKey: 'sandbox.guitar', icon: GiGuitarHead },
  { value: 'bass' as const, labelKey: 'sandbox.bass', icon: GiGuitarBassHead }
] as const

/**
 * Component for selecting different instruments
 * Extracted from InstrumentControls for better modularity
 * Optimized with memo, useMemo, and focused context hook
 */
const InstrumentSelector = memo(function InstrumentSelector() {
  const { t } = useTranslation()
  // Use focused instrument type hook instead of full context
  const { instrument, handleInstrumentChange } = useInstrumentType()

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
      <h3><IoMusicalNotes /> {t('sandbox.chooseInstrument')}</h3>
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
              <span className="instrument-name">{t(inst.labelKey)}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
})

export default InstrumentSelector
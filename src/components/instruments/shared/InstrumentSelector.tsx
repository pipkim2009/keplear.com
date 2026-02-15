import { memo, useMemo, useEffect } from 'react'
import { useInstrumentType } from '../../../hooks'
import { PiPianoKeysFill } from 'react-icons/pi'
import { GiGuitarBassHead, GiGuitarHead } from 'react-icons/gi'
import { useTranslation } from '../../../contexts/TranslationContext'
import '../../../styles/components/InstrumentSelector.css'

type InstrumentValue = 'keyboard' | 'guitar' | 'bass'

const ALL_INSTRUMENTS = [
  { value: 'keyboard' as const, labelKey: 'generator.keyboard', icon: PiPianoKeysFill },
  { value: 'guitar' as const, labelKey: 'generator.guitar', icon: GiGuitarHead },
  { value: 'bass' as const, labelKey: 'generator.bass', icon: GiGuitarBassHead },
] as const

interface InstrumentSelectorProps {
  exclude?: InstrumentValue[]
}

const InstrumentSelector = memo(function InstrumentSelector({ exclude }: InstrumentSelectorProps) {
  const { t } = useTranslation()
  const { instrument, handleInstrumentChange } = useInstrumentType()

  const instruments = useMemo(
    () =>
      exclude ? ALL_INSTRUMENTS.filter(inst => !exclude.includes(inst.value)) : ALL_INSTRUMENTS,
    [exclude]
  )

  // If the current instrument is excluded, auto-select the first available one
  useEffect(() => {
    if (exclude?.includes(instrument as InstrumentValue) && instruments.length > 0) {
      handleInstrumentChange(instruments[0].value)
    }
  }, [instrument, exclude, instruments, handleInstrumentChange])

  return (
    <div className="control-group instrument-selector-group">
      <div className="instrument-selector desktop-selector">
        {instruments.map(inst => {
          const Icon = inst.icon
          return (
            <div
              key={inst.value}
              className={`instrument-card ${inst.value}-theme ${instrument === inst.value ? 'active' : ''}`}
              onClick={() => handleInstrumentChange(inst.value)}
            >
              <div className="instrument-icon">
                <Icon />
              </div>
              <div className="instrument-name">{t(inst.labelKey)}</div>
              <div className="instrument-glow"></div>
            </div>
          )
        })}
      </div>
    </div>
  )
})

export default InstrumentSelector

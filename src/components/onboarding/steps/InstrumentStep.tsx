import { PiPianoKeysFill, PiCheckCircleFill, PiMusicNotesFill } from 'react-icons/pi'
import { GiGuitarHead, GiGuitarBassHead } from 'react-icons/gi'
import type { InstrumentType } from '../../../types/instrument'
import styles from '../Onboarding.module.css'

interface InstrumentStepProps {
  selectedInstruments: InstrumentType[]
  onToggleInstrument: (instrument: InstrumentType) => void
  onNext: () => void
}

const INSTRUMENTS: { type: InstrumentType; name: string; description: string; icon: React.ReactNode }[] = [
  {
    type: 'keyboard',
    name: 'Keyboard',
    description: 'Piano, synthesizer, or any keys',
    icon: <PiPianoKeysFill />
  },
  {
    type: 'guitar',
    name: 'Guitar',
    description: 'Acoustic or electric guitar',
    icon: <GiGuitarHead />
  },
  {
    type: 'bass',
    name: 'Bass',
    description: 'Bass guitar or upright bass',
    icon: <GiGuitarBassHead />
  }
]

/**
 * First onboarding step - instrument selection
 * Requires at least one instrument to proceed
 */
const InstrumentStep = ({
  selectedInstruments,
  onToggleInstrument,
  onNext
}: InstrumentStepProps) => {
  const canProceed = selectedInstruments.length > 0

  return (
    <div className={styles.stepContent}>
      <div className={styles.stepHeader}>
        <span className={styles.stepIcon}>
          <PiMusicNotesFill />
        </span>
        <h2 className={styles.stepTitle}>What do you play?</h2>
        <p className={styles.stepDescription}>
          Select all the instruments you want to practice with. You can change this later.
        </p>
      </div>

      <div className={styles.instrumentGrid}>
        {INSTRUMENTS.map(({ type, name, description, icon }) => {
          const isSelected = selectedInstruments.includes(type)
          return (
            <button
              key={type}
              className={`${styles.instrumentButton} ${isSelected ? styles.selected : ''}`}
              onClick={() => onToggleInstrument(type)}
              type="button"
              aria-pressed={isSelected}
            >
              <span className={styles.instrumentIcon}>{icon}</span>
              <div className={styles.instrumentInfo}>
                <p className={styles.instrumentName}>{name}</p>
                <p className={styles.instrumentDesc}>{description}</p>
              </div>
              <span className={styles.checkmark}>
                <PiCheckCircleFill />
              </span>
            </button>
          )
        })}
      </div>

      <div className={styles.buttonGroup}>
        <button
          className={styles.primaryButton}
          onClick={onNext}
          disabled={!canProceed}
          type="button"
        >
          {canProceed ? 'Next' : 'Select at least one instrument'}
        </button>
      </div>
    </div>
  )
}

export default InstrumentStep

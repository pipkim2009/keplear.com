/**
 * Daily Challenge Card - Shown on the Dashboard
 * Displays today's challenge focus and allows instrument selection + start
 */

import { useState } from 'react'
import {
  generateDailyChallenge,
  isDailyChallengeCompleted,
  getTodayDateString,
} from '../../utils/dailyChallengeGenerator'
import type { InstrumentType } from '../../types/instrument'
import { PiPlayFill, PiCheckCircleFill, PiLightningFill } from 'react-icons/pi'
import { PiPianoKeysFill } from 'react-icons/pi'
import { GiGuitarHead, GiGuitarBassHead } from 'react-icons/gi'
import styles from '../../styles/DailyChallenge.module.css'

interface DailyChallengeCardProps {
  onStart: (instrument: InstrumentType) => void
}

const DailyChallengeCard: React.FC<DailyChallengeCardProps> = ({ onStart }) => {
  const [selectedInstrument, setSelectedInstrument] = useState<InstrumentType>('keyboard')

  const todayDate = getTodayDateString()
  const completed = isDailyChallengeCompleted(todayDate)

  // Generate with keyboard just to get title/description (root+scale same for all instruments)
  const challenge = generateDailyChallenge('keyboard', todayDate)
  const exerciseCount = challenge.exercises.length

  const handleStart = () => {
    onStart(selectedInstrument)
  }

  return (
    <section className={styles.dailyChallengeCard}>
      <div className={styles.cardHeader}>
        <div className={styles.cardTitleRow}>
          <div className={styles.cardIcon}>
            <PiLightningFill />
          </div>
          <div>
            <h3 className={styles.cardTitle}>{challenge.title}</h3>
            <p className={styles.cardDescription}>New challenge every day</p>
          </div>
        </div>
        {completed && (
          <div className={styles.completedBadge}>
            <PiCheckCircleFill />
            Completed
          </div>
        )}
      </div>

      <div className={styles.cardBody}>
        <div className={styles.focusBadge}>{challenge.description}</div>
        <span className={styles.exerciseCount}>
          {exerciseCount} exercise{exerciseCount !== 1 ? 's' : ''}
        </span>
      </div>

      <div className={styles.cardActions}>
        <div className={styles.instrumentPicker}>
          <button
            className={`${styles.instrumentButton} ${selectedInstrument === 'keyboard' ? styles.instrumentButtonActive : ''}`}
            onClick={() => setSelectedInstrument('keyboard')}
            title="Keyboard"
            aria-label="Select keyboard"
          >
            <PiPianoKeysFill />
          </button>
          <button
            className={`${styles.instrumentButton} ${selectedInstrument === 'guitar' ? styles.instrumentButtonActive : ''}`}
            onClick={() => setSelectedInstrument('guitar')}
            title="Guitar"
            aria-label="Select guitar"
          >
            <GiGuitarHead />
          </button>
          <button
            className={`${styles.instrumentButton} ${selectedInstrument === 'bass' ? styles.instrumentButtonActive : ''}`}
            onClick={() => setSelectedInstrument('bass')}
            title="Bass"
            aria-label="Select bass"
          >
            <GiGuitarBassHead />
          </button>
        </div>

        {completed ? (
          <button className={styles.practiceAgainButton} onClick={handleStart}>
            <PiPlayFill />
            Practice Again
          </button>
        ) : (
          <button className={styles.startButton} onClick={handleStart}>
            <PiPlayFill />
            Start
          </button>
        )}
      </div>
    </section>
  )
}

export default DailyChallengeCard

import { useState, useRef, useEffect } from 'react'
import { PiPianoKeysFill, PiLockSimpleFill, PiCheckCircleFill, PiPlayFill } from 'react-icons/pi'
import { GiGuitarHead, GiGuitarBassHead } from 'react-icons/gi'
import { GUITAR_SCALES } from '../../utils/instruments/guitar/guitarScales'
import { GUITAR_CHORDS } from '../../utils/instruments/guitar/guitarChords'
import { BASS_SCALES } from '../../utils/instruments/bass/bassScales'
import { BASS_CHORDS } from '../../utils/instruments/bass/bassChords'
import { useInstrument, type SkillLessonSettings } from '../../contexts/InstrumentContext'
import styles from '../../styles/Skills.module.css'

interface SkillsProps {
  onNavigateToHome: () => void
}

interface BadgeProps {
  name: string
  description: string
  isUnlocked: boolean
  instrument: 'keyboard' | 'guitar' | 'bass'
  skillType: 'scales' | 'chords'
  onStartLesson: (instrument: 'keyboard' | 'guitar' | 'bass', skillType: 'scales' | 'chords', name: string) => void
}

const Badge: React.FC<BadgeProps> = ({ name, description, isUnlocked, instrument, skillType, onStartLesson }) => {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleBadgeClick = () => {
    setIsOpen(!isOpen)
  }

  const handleStartLesson = () => {
    setIsOpen(false)
    onStartLesson(instrument, skillType, name)
  }

  return (
    <div className={styles.badgeContainer} ref={containerRef}>
      <div
        className={`${styles.badge} ${isUnlocked ? styles.unlocked : styles.locked} ${isOpen ? styles.active : ''}`}
        onClick={handleBadgeClick}
      >
        {isUnlocked ? (
          <PiCheckCircleFill className={styles.badgeIcon} />
        ) : (
          <PiLockSimpleFill className={styles.badgeIcon} />
        )}
        <span>{name}</span>
      </div>

      {isOpen && (
        <div className={styles.badgePopup}>
          <div className={styles.popupTitle}>Learn {name}</div>
          <div className={styles.popupDescription}>{description}</div>
          <button className={styles.startLessonButton} onClick={handleStartLesson}>
            <PiPlayFill />
            Start Lesson
          </button>
        </div>
      )}
    </div>
  )
}

const Skills: React.FC<SkillsProps> = () => {
  const { startSkillLesson } = useInstrument()

  // Keyboard uses the same scales and chords as guitar
  const keyboardScales = GUITAR_SCALES
  const keyboardChords = GUITAR_CHORDS

  // TODO: Replace with actual unlocked state from user progress
  const unlockedSkills = {
    keyboard: { scales: [] as string[], chords: [] as string[] },
    guitar: { scales: [] as string[], chords: [] as string[] },
    bass: { scales: [] as string[], chords: [] as string[] }
  }

  const isUnlocked = (instrument: 'keyboard' | 'guitar' | 'bass', type: 'scales' | 'chords', name: string) => {
    return unlockedSkills[instrument][type].includes(name)
  }

  const handleStartLesson = (instrument: 'keyboard' | 'guitar' | 'bass', skillType: 'scales' | 'chords', skillName: string) => {
    const settings: SkillLessonSettings = {
      instrument,
      skillType,
      skillName,
      octaveLow: 4,
      octaveHigh: 5,
      fretLow: 0,
      fretHigh: 12,
      bpm: 120,
      beats: 4,
      chordCount: 4
    }
    startSkillLesson(settings)
  }

  return (
    <div className={styles.skills}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>Skills</h1>
          <p className={styles.subtitle}>
            Track your musical progression through Skill Badges.
          </p>
        </header>

        <div className={styles.content}>
          {/* Keyboard Section */}
          <section className={styles.instrumentSection}>
            <div className={styles.instrumentHeader}>
              <div className={`${styles.instrumentIcon} ${styles.keyboard}`}>
                <PiPianoKeysFill />
              </div>
              <h2 className={styles.instrumentTitle}>Keyboard</h2>
            </div>

            <div className={styles.skillGroup}>
              <h3 className={styles.skillGroupTitle}>Scales</h3>
              <div className={styles.badgeGrid}>
                {keyboardScales.map((scale) => (
                  <Badge
                    key={scale.name}
                    name={scale.name}
                    description={scale.description}
                    isUnlocked={isUnlocked('keyboard', 'scales', scale.name)}
                    instrument="keyboard"
                    skillType="scales"
                    onStartLesson={handleStartLesson}
                  />
                ))}
              </div>
            </div>

            <div className={styles.skillGroup}>
              <h3 className={styles.skillGroupTitle}>Chords</h3>
              <div className={styles.badgeGrid}>
                {keyboardChords.map((chord) => (
                  <Badge
                    key={chord.name}
                    name={chord.name}
                    description={chord.description}
                    isUnlocked={isUnlocked('keyboard', 'chords', chord.name)}
                    instrument="keyboard"
                    skillType="chords"
                    onStartLesson={handleStartLesson}
                  />
                ))}
              </div>
            </div>
          </section>

          {/* Guitar Section */}
          <section className={styles.instrumentSection}>
            <div className={styles.instrumentHeader}>
              <div className={`${styles.instrumentIcon} ${styles.guitar}`}>
                <GiGuitarHead />
              </div>
              <h2 className={styles.instrumentTitle}>Guitar</h2>
            </div>

            <div className={styles.skillGroup}>
              <h3 className={styles.skillGroupTitle}>Scales</h3>
              <div className={styles.badgeGrid}>
                {GUITAR_SCALES.map((scale) => (
                  <Badge
                    key={scale.name}
                    name={scale.name}
                    description={scale.description}
                    isUnlocked={isUnlocked('guitar', 'scales', scale.name)}
                    instrument="guitar"
                    skillType="scales"
                    onStartLesson={handleStartLesson}
                  />
                ))}
              </div>
            </div>

            <div className={styles.skillGroup}>
              <h3 className={styles.skillGroupTitle}>Chords</h3>
              <div className={styles.badgeGrid}>
                {GUITAR_CHORDS.map((chord) => (
                  <Badge
                    key={chord.name}
                    name={chord.name}
                    description={chord.description}
                    isUnlocked={isUnlocked('guitar', 'chords', chord.name)}
                    instrument="guitar"
                    skillType="chords"
                    onStartLesson={handleStartLesson}
                  />
                ))}
              </div>
            </div>
          </section>

          {/* Bass Section */}
          <section className={styles.instrumentSection}>
            <div className={styles.instrumentHeader}>
              <div className={`${styles.instrumentIcon} ${styles.bass}`}>
                <GiGuitarBassHead />
              </div>
              <h2 className={styles.instrumentTitle}>Bass</h2>
            </div>

            <div className={styles.skillGroup}>
              <h3 className={styles.skillGroupTitle}>Scales</h3>
              <div className={styles.badgeGrid}>
                {BASS_SCALES.map((scale) => (
                  <Badge
                    key={scale.name}
                    name={scale.name}
                    description={scale.description}
                    isUnlocked={isUnlocked('bass', 'scales', scale.name)}
                    instrument="bass"
                    skillType="scales"
                    onStartLesson={handleStartLesson}
                  />
                ))}
              </div>
            </div>

            <div className={styles.skillGroup}>
              <h3 className={styles.skillGroupTitle}>Chords</h3>
              <div className={styles.badgeGrid}>
                {BASS_CHORDS.map((chord) => (
                  <Badge
                    key={chord.name}
                    name={chord.name}
                    description={chord.description}
                    isUnlocked={isUnlocked('bass', 'chords', chord.name)}
                    instrument="bass"
                    skillType="chords"
                    onStartLesson={handleStartLesson}
                  />
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

export default Skills

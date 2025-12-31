import { PiPianoKeysFill, PiMusicNoteSimple, PiLockSimpleFill, PiCheckCircleFill } from 'react-icons/pi'
import { GiGuitarHead, GiGuitarBassHead } from 'react-icons/gi'
import { GUITAR_SCALES } from '../../utils/instruments/guitar/guitarScales'
import { GUITAR_CHORDS } from '../../utils/instruments/guitar/guitarChords'
import { BASS_SCALES } from '../../utils/instruments/bass/bassScales'
import { BASS_CHORDS } from '../../utils/instruments/bass/bassChords'
import styles from '../../styles/Skills.module.css'

interface SkillsProps {
  onNavigateToHome: () => void
}

interface BadgeProps {
  name: string
  description: string
  isUnlocked: boolean
}

const Badge: React.FC<BadgeProps> = ({ name, description, isUnlocked }) => (
  <div
    className={`${styles.badge} ${isUnlocked ? styles.unlocked : styles.locked}`}
    title={description}
  >
    {isUnlocked ? (
      <PiCheckCircleFill className={styles.badgeIcon} />
    ) : (
      <PiLockSimpleFill className={styles.badgeIcon} />
    )}
    <span>{name}</span>
  </div>
)

const Skills: React.FC<SkillsProps> = () => {
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

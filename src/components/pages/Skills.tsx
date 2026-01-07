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
  isHighlighted?: boolean
}

const Badge: React.FC<BadgeProps> = ({ name, description, isUnlocked, instrument, skillType, onStartLesson, isHighlighted = false }) => {
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
        className={`${styles.badge} ${isUnlocked ? styles.unlocked : styles.locked} ${isOpen ? styles.active : ''} ${isHighlighted ? styles.highlighted : ''}`}
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

type InstrumentType = 'keyboard' | 'guitar' | 'bass'

const INSTRUMENTS: { value: InstrumentType; label: string; icon: React.FC<{ className?: string }> }[] = [
  { value: 'keyboard', label: 'Keyboard', icon: PiPianoKeysFill },
  { value: 'guitar', label: 'Guitar', icon: GiGuitarHead },
  { value: 'bass', label: 'Bass', icon: GiGuitarBassHead }
]

const Skills: React.FC<SkillsProps> = () => {
  const { startSkillLesson } = useInstrument()
  const [selectedInstrument, setSelectedInstrument] = useState<InstrumentType>('keyboard')

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

  // Get scales and chords for the selected instrument
  const getScalesForInstrument = () => {
    switch (selectedInstrument) {
      case 'keyboard':
        return keyboardScales
      case 'guitar':
        return GUITAR_SCALES
      case 'bass':
        return BASS_SCALES
    }
  }

  const getChordsForInstrument = () => {
    switch (selectedInstrument) {
      case 'keyboard':
        return keyboardChords
      case 'guitar':
        return GUITAR_CHORDS
      case 'bass':
        return BASS_CHORDS
    }
  }

  const scales = getScalesForInstrument()
  const chords = getChordsForInstrument()

  // Helper to find scale/chord data by name
  const findScaleByName = (name: string) => scales.find(s => s.name === name)
  const findChordByName = (name: string) => chords.find(c => c.name === name)

  // Helper to render a badge if the scale/chord exists
  const renderScaleBadge = (name: string, isHighlighted: boolean = false) => {
    const scale = findScaleByName(name)
    if (!scale) return null
    return (
      <Badge
        name={name}
        description={scale.description}
        isUnlocked={isUnlocked(selectedInstrument, 'scales', name)}
        instrument={selectedInstrument}
        skillType="scales"
        onStartLesson={handleStartLesson}
        isHighlighted={isHighlighted}
      />
    )
  }

  const renderChordBadge = (name: string, isHighlighted: boolean = false) => {
    const chord = findChordByName(name)
    if (!chord) return null
    return (
      <Badge
        name={name}
        description={chord.description}
        isUnlocked={isUnlocked(selectedInstrument, 'chords', name)}
        instrument={selectedInstrument}
        skillType="chords"
        onStartLesson={handleStartLesson}
        isHighlighted={isHighlighted}
      />
    )
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

        {/* Instrument Selector */}
        <div className={styles.instrumentSelector}>
          {INSTRUMENTS.map((inst) => {
            const Icon = inst.icon
            return (
              <button
                key={inst.value}
                className={`${styles.instrumentButton} ${selectedInstrument === inst.value ? styles.active : ''}`}
                onClick={() => setSelectedInstrument(inst.value)}
              >
                <Icon className={styles.instrumentButtonIcon} />
                <span>{inst.label}</span>
              </button>
            )
          })}
        </div>

        <div className={styles.content}>
          {/* Selected Instrument Section */}
          <section className={styles.instrumentSection}>
            <div className={styles.instrumentHeader}>
              <div className={`${styles.instrumentIcon} ${styles[selectedInstrument]}`}>
                {selectedInstrument === 'keyboard' && <PiPianoKeysFill />}
                {selectedInstrument === 'guitar' && <GiGuitarHead />}
                {selectedInstrument === 'bass' && <GiGuitarBassHead />}
              </div>
              <h2 className={styles.instrumentTitle}>
                {selectedInstrument.charAt(0).toUpperCase() + selectedInstrument.slice(1)}
              </h2>
            </div>

            {/* Melodies Tree */}
            <div className={styles.skillGroup}>
              <h3 className={styles.skillGroupTitle}>Melodies</h3>
              <div className={styles.skillTree}>
                {/* Level 1: Major */}
                <div className={styles.treeLevel}>
                  <div className={styles.treeNode}>
                    {renderScaleBadge('Major', true)}
                    <div className={styles.treeLine} />
                  </div>
                </div>

                {/* Level 2: Minor */}
                <div className={styles.treeLevel}>
                  <div className={styles.treeNode}>
                    {renderScaleBadge('Minor')}
                    <div className={styles.treeLineBranch} />
                  </div>
                </div>

                {/* Level 3: Branches */}
                <div className={styles.treeBranches}>
                  {/* Modes Branch */}
                  <div className={styles.treeBranch}>
                    <div className={styles.branchLabel}>Modes</div>
                    <div className={styles.branchNodes}>
                      <div className={styles.treeNode}>{renderScaleBadge('Dorian')}<div className={styles.treeLine} /></div>
                      <div className={styles.treeNode}>{renderScaleBadge('Phrygian')}<div className={styles.treeLine} /></div>
                      <div className={styles.treeNode}>{renderScaleBadge('Lydian')}<div className={styles.treeLine} /></div>
                      <div className={styles.treeNode}>{renderScaleBadge('Mixolydian')}<div className={styles.treeLine} /></div>
                      <div className={styles.treeNode}>{renderScaleBadge('Locrian')}</div>
                    </div>
                  </div>

                  {/* Pentatonic Branch */}
                  <div className={styles.treeBranch}>
                    <div className={styles.branchLabel}>Pentatonic</div>
                    <div className={styles.branchNodes}>
                      <div className={styles.treeNode}>{renderScaleBadge('Pentatonic Major')}<div className={styles.treeLine} /></div>
                      <div className={styles.treeNode}>{renderScaleBadge('Pentatonic Minor')}</div>
                    </div>
                  </div>

                  {/* Advanced Branch */}
                  <div className={styles.treeBranch}>
                    <div className={styles.branchLabel}>Advanced</div>
                    <div className={styles.branchNodes}>
                      <div className={styles.treeNode}>{renderScaleBadge('Harmonic Minor')}<div className={styles.treeLine} /></div>
                      <div className={styles.treeNode}>{renderScaleBadge('Blues Scale')}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Chords Tree */}
            <div className={styles.skillGroup}>
              <h3 className={styles.skillGroupTitle}>Chords</h3>
              <div className={styles.skillTree}>
                {/* Level 1: Major */}
                <div className={styles.treeLevel}>
                  <div className={styles.treeNode}>
                    {renderChordBadge('Major', true)}
                    <div className={styles.treeLine} />
                  </div>
                </div>

                {/* Level 2: Minor */}
                <div className={styles.treeLevel}>
                  <div className={styles.treeNode}>
                    {renderChordBadge('Minor')}
                    <div className={styles.treeLineBranch} />
                  </div>
                </div>

                {/* Level 3: Branches */}
                <div className={styles.treeBranches}>
                  {/* 7th Chords Branch */}
                  <div className={styles.treeBranch}>
                    <div className={styles.branchLabel}>7th Chords</div>
                    <div className={styles.branchNodes}>
                      <div className={styles.treeNode}>{renderChordBadge('Dominant 7th')}<div className={styles.treeLine} /></div>
                      <div className={styles.treeNode}>{renderChordBadge('Major 7th')}<div className={styles.treeLine} /></div>
                      <div className={styles.treeNode}>{renderChordBadge('Minor 7th')}</div>
                    </div>
                  </div>

                  {/* Suspended Branch */}
                  <div className={styles.treeBranch}>
                    <div className={styles.branchLabel}>Suspended</div>
                    <div className={styles.branchNodes}>
                      <div className={styles.treeNode}>{renderChordBadge('Sus2')}<div className={styles.treeLine} /></div>
                      <div className={styles.treeNode}>{renderChordBadge('Sus4')}</div>
                    </div>
                  </div>

                  {/* Altered Branch */}
                  <div className={styles.treeBranch}>
                    <div className={styles.branchLabel}>Altered</div>
                    <div className={styles.branchNodes}>
                      <div className={styles.treeNode}>{renderChordBadge('Augmented')}<div className={styles.treeLine} /></div>
                      <div className={styles.treeNode}>{renderChordBadge('Diminished')}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

export default Skills

import { useState } from 'react'
import styles from '../../styles/PracticeOptionsModal.module.css'

interface PracticeOption {
  id: string
  label: string
  description: string
}

const practiceOptions: PracticeOption[] = [
  {
    id: 'simple-melodies',
    label: 'Simple Melodies',
    description: 'Practice creating basic melodic phrases'
  },
  {
    id: 'scales',
    label: 'Scales',
    description: 'Master scale patterns and fingerings'
  },
  {
    id: 'chords',
    label: 'Chords',
    description: 'Practice chords and transitions'
  }
]

const difficultyLabels = ['Beginner', 'Intermediate', 'Hard', 'Advanced', 'Expert']

const scaleOptions = [
  { id: 'major', label: 'Major' },
  { id: 'major-minor', label: 'Major/Minor' },
  { id: 'modes', label: 'Modes' },
  { id: 'all', label: 'All' }
]

const chordOptions = [
  { id: 'major', label: 'Major' },
  { id: 'major-minor', label: 'Major/Minor' },
  { id: 'all', label: 'All' }
]

const bpmOptions = [30, 60, 90, 120, 150, 180, 210, 240]

export interface LessonSettings {
  lessonType: string
  difficulty: number
  bpm: number
  notes: number
  scale?: string
  chord?: string
}

interface PracticeOptionsModalProps {
  instrumentName: string
  onStart: (selectedOptions: string[], difficulty: number, settings: LessonSettings) => void
  onCancel: () => void
}

const PracticeOptionsModal: React.FC<PracticeOptionsModalProps> = ({
  instrumentName,
  onStart,
  onCancel
}) => {
  const [selectedOption, setSelectedOption] = useState<string>('simple-melodies')
  const [difficulty, setDifficulty] = useState<number>(2)
  const [bpm, setBpm] = useState<number>(120)
  const [notes, setNotes] = useState<number>(4)
  const [selectedScale, setSelectedScale] = useState<string>('random')
  const [selectedChord, setSelectedChord] = useState<string>('random')

  const handleStart = () => {
    if (selectedOption) {
      const settings: LessonSettings = {
        lessonType: selectedOption,
        difficulty,
        bpm,
        notes,
        scale: selectedOption === 'scales' ? selectedScale : undefined,
        chord: selectedOption === 'chords' ? selectedChord : undefined
      }
      onStart([selectedOption], difficulty, settings)
    }
  }

  const selectedDescription = practiceOptions.find(opt => opt.id === selectedOption)?.description || ''

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <button
          className={styles.closeButton}
          onClick={onCancel}
          aria-label="Close"
        >
          ×
        </button>

        <h2 className={styles.modalTitle}>
          {instrumentName} Session
        </h2>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Lesson Type</label>
          <div className={styles.selectWrapper}>
            <select
              className={styles.select}
              value={selectedOption}
              onChange={(e) => setSelectedOption(e.target.value)}
            >
              {practiceOptions.map(option => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            <div className={styles.selectArrow}>
              <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
                <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
          {selectedDescription && (
            <p className={styles.optionDescription}>{selectedDescription}</p>
          )}
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>
            Difficulty: <span className={styles.difficultyValue}>{difficultyLabels[difficulty]}</span>
          </label>
          <div className={styles.sliderContainer}>
            <input
              type="range"
              min="0"
              max="4"
              value={difficulty}
              onChange={(e) => setDifficulty(Number(e.target.value))}
              className={styles.slider}
            />
            <div className={styles.sliderLabels}>
              {difficultyLabels.map((label, index) => (
                <span
                  key={label}
                  className={`${styles.sliderLabel} ${index === difficulty ? styles.activeLabel : ''}`}
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Lesson-specific fields */}
        <div className={styles.settingsGrid}>
          {/* Scales dropdown - only for scales lesson */}
          {selectedOption === 'scales' && (
            <div className={styles.formGroupFull}>
              <label className={styles.formLabel}>Scale</label>
              <div className={styles.selectWrapper}>
                <select
                  className={styles.select}
                  value={selectedScale}
                  onChange={(e) => setSelectedScale(e.target.value)}
                >
                  {scaleOptions.map(option => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <div className={styles.selectArrow}>
                  <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
                    <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
            </div>
          )}

          {/* Chords dropdown - only for chords lesson */}
          {selectedOption === 'chords' && (
            <div className={styles.formGroupFull}>
              <label className={styles.formLabel}>Chord</label>
              <div className={styles.selectWrapper}>
                <select
                  className={styles.select}
                  value={selectedChord}
                  onChange={(e) => setSelectedChord(e.target.value)}
                >
                  {chordOptions.map(option => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <div className={styles.selectArrow}>
                  <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
                    <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
            </div>
          )}

          {/* BPM dropdown - all lesson types */}
          <div className={styles.formGroupSmall}>
            <label className={styles.formLabel}>BPM</label>
            <div className={styles.selectWrapper}>
              <select
                className={styles.select}
                value={bpm}
                onChange={(e) => setBpm(Number(e.target.value))}
              >
                {bpmOptions.map(option => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <div className={styles.selectArrow}>
                <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
                  <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          </div>

          {/* Notes dropdown - all lesson types */}
          <div className={styles.formGroupSmall}>
            <label className={styles.formLabel}>Notes</label>
            <div className={styles.selectWrapper}>
              <select
                className={styles.select}
                value={notes}
                onChange={(e) => setNotes(Number(e.target.value))}
              >
                {[3, 4, 5, 6, 7, 8].map(option => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <div className={styles.selectArrow}>
                <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
                  <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.modalActions}>
          <button
            onClick={handleStart}
            className={styles.startButton}
          >
            Begin
          </button>
        </div>
      </div>
    </div>
  )
}

export default PracticeOptionsModal

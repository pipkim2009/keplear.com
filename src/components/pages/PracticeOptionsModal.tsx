import { useState } from 'react'
import styles from '../../styles/PracticeOptionsModal.module.css'
import '../../styles/Controls.css'

interface InstrumentOption {
  id: string
  label: string
}

const instrumentOptions: InstrumentOption[] = [
  { id: 'keyboard', label: 'Keyboard' },
  { id: 'guitar', label: 'Guitar' },
  { id: 'bass', label: 'Bass' }
]

interface PracticeOption {
  id: string
  label: string
}

const practiceOptions: PracticeOption[] = [
  { id: 'simple-melodies', label: 'Simple Melodies' },
  { id: 'scales', label: 'Scales' },
  { id: 'chords', label: 'Chords' }
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
  octaveLow?: number
  octaveHigh?: number
}

interface PracticeOptionsModalProps {
  onStart: (instrument: string, selectedOptions: string[], difficulty: number, settings: LessonSettings) => void
  onCancel: () => void
}

const PracticeOptionsModal: React.FC<PracticeOptionsModalProps> = ({
  onStart,
  onCancel
}) => {
  const [selectedInstrument, setSelectedInstrument] = useState<string>('keyboard')
  const [selectedOption, setSelectedOption] = useState<string>('simple-melodies')
  const [difficulty, setDifficulty] = useState<number>(2)
  const [bpm, setBpm] = useState<number>(120)
  const [notes, setNotes] = useState<number>(4)
  const [selectedScale, setSelectedScale] = useState<string>('major')
  const [selectedChord, setSelectedChord] = useState<string>('major')
  const [octaveLow, setOctaveLow] = useState<number>(3)
  const [octaveHigh, setOctaveHigh] = useState<number>(5)

  const isKeyboard = selectedInstrument === 'keyboard'

  const handleStart = () => {
    if (selectedOption && selectedInstrument) {
      const settings: LessonSettings = {
        lessonType: selectedOption,
        difficulty,
        bpm,
        notes,
        scale: selectedOption === 'scales' ? selectedScale : undefined,
        chord: selectedOption === 'chords' ? selectedChord : undefined,
        octaveLow: isKeyboard ? octaveLow : undefined,
        octaveHigh: isKeyboard ? octaveHigh : undefined
      }
      onStart(selectedInstrument, [selectedOption], difficulty, settings)
    }
  }

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
          Practice Session
        </h2>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Instrument</label>
          <div className={styles.selectWrapper}>
            <select
              className={styles.select}
              value={selectedInstrument}
              onChange={(e) => setSelectedInstrument(e.target.value)}
            >
              {instrumentOptions.map(option => (
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

        {/* Octave range slider - only for keyboard (using sandbox mode UI) */}
        {isKeyboard && (
          <div className="control-group octave-range-control">
            <div className="label-with-tooltip">
              <label className="control-label">Octave Range</label>
            </div>
            <div className="octave-range-slider">
              <div className="range-labels-center">
                <span className="range-label-center">
                  {octaveLow} - {octaveHigh}
                </span>
              </div>
              <div className="dual-range-container">
                <div
                  className="range-fill"
                  style={{
                    left: `${((octaveLow - 1) / 7) * 100}%`,
                    right: `${((8 - octaveHigh) / 7) * 100}%`
                  }}
                />
                <input
                  type="range"
                  min="1"
                  max="8"
                  value={octaveLow}
                  onChange={(e) => {
                    const val = Number(e.target.value)
                    if (val <= octaveHigh) setOctaveLow(val)
                  }}
                  className={`range-slider range-low ${octaveLow === octaveHigh ? 'same-position' : ''}`}
                  title="Set lowest octave"
                />
                <input
                  type="range"
                  min="1"
                  max="8"
                  value={octaveHigh}
                  onChange={(e) => {
                    const val = Number(e.target.value)
                    if (val >= octaveLow) setOctaveHigh(val)
                  }}
                  className={`range-slider range-high ${octaveLow === octaveHigh ? 'same-position' : ''}`}
                  title="Set highest octave"
                />
              </div>
              <div className="octave-visual">
                {Array.from({ length: 8 }, (_, i) => {
                  const octaveNumber = i + 1
                  const isSelected = octaveNumber >= octaveLow && octaveNumber <= octaveHigh
                  return (
                    <div
                      key={octaveNumber}
                      className={`octave-mini ${isSelected ? 'highlight' : 'dim'}`}
                    >
                      <img
                        src="/Octave-icon.png"
                        alt={`Octave ${octaveNumber}`}
                        className="octave-icon"
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

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

          {/* Notes/Chords dropdown - all lesson types */}
          <div className={styles.formGroupSmall}>
            <label className={styles.formLabel}>{selectedOption === 'chords' ? 'Chords' : 'Notes'}</label>
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

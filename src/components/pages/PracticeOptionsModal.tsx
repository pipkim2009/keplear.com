import { useState } from 'react'
import styles from '../../styles/PracticeOptionsModal.module.css'
import '../../styles/Controls.css'
import '../../styles/Tooltip.css'
import { PiPianoKeysFill } from 'react-icons/pi'
import { GiGuitarBassHead, GiGuitarHead } from 'react-icons/gi'
import { IoMdArrowDropdown } from 'react-icons/io'
import Tooltip from '../common/Tooltip'

interface PracticeOption {
  id: string
  label: string
}

const practiceOptions: PracticeOption[] = [
  { id: 'melodies', label: 'Melodies' },
  { id: 'chords', label: 'Chords' }
]

const difficultyLabels = ['Beginner', 'Intermediate', 'Advanced', 'Professional', 'Custom']

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

export interface LessonSettings {
  lessonType: string
  difficulty: number
  bpm: number
  beats: number
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
  const [selectedOption, setSelectedOption] = useState<string>('melodies')
  const [difficulty, setDifficulty] = useState<number>(1)
  const [bpm, setBpm] = useState<number>(120)
  const [beats, setBeats] = useState<number>(4)
  const [selectedScale, setSelectedScale] = useState<string>('major-minor')
  const [selectedChord, setSelectedChord] = useState<string>('major-minor')
  const [octaveLow, setOctaveLow] = useState<number>(4)
  const [octaveHigh, setOctaveHigh] = useState<number>(5)
  const [isInstrumentDropdownOpen, setIsInstrumentDropdownOpen] = useState<boolean>(false)

  // Difficulty presets
  const difficultyPresets = [
    { bpm: 60, beats: 3, scale: 'major', chord: 'major' },           // Beginner
    { bpm: 120, beats: 4, scale: 'major-minor', chord: 'major-minor' }, // Intermediate
    { bpm: 180, beats: 6, scale: 'modes', chord: 'all' },            // Advanced
    { bpm: 240, beats: 8, scale: 'all', chord: 'all' }               // Professional
  ]

  const handleDifficultyChange = (newDifficulty: number) => {
    setDifficulty(newDifficulty)
    // Custom mode (4) doesn't apply presets - user controls all settings
    const preset = difficultyPresets[newDifficulty]
    if (preset) {
      setBpm(preset.bpm)
      setBeats(preset.beats)
      setSelectedScale(preset.scale)
      setSelectedChord(preset.chord)
    }
  }

  // Switch to Custom mode when user manually changes any setting
  const handleManualChange = () => {
    if (difficulty !== 4) {
      setDifficulty(4)
    }
  }

  const isKeyboard = selectedInstrument === 'keyboard'

  const handleStart = () => {
    if (selectedOption && selectedInstrument) {
      const settings: LessonSettings = {
        lessonType: selectedOption,
        difficulty,
        bpm,
        beats,
        scale: selectedOption === 'melodies' ? selectedScale : undefined,
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

        <div className="control-group instrument-selector-group" style={{ marginBottom: 20 }}>
          {/* Desktop view - Cards */}
          <div className="instrument-selector desktop-selector" style={{ justifyContent: 'center' }}>
            <div
              className={`instrument-card ${selectedInstrument === 'keyboard' ? 'active' : ''}`}
              onClick={() => setSelectedInstrument('keyboard')}
            >
              <div className="instrument-icon"><PiPianoKeysFill /></div>
              <div className="instrument-name">Keyboard</div>
              <div className="instrument-glow"></div>
            </div>
            <div
              className={`instrument-card ${selectedInstrument === 'guitar' ? 'active' : ''}`}
              onClick={() => setSelectedInstrument('guitar')}
            >
              <div className="instrument-icon"><GiGuitarHead /></div>
              <div className="instrument-name">Guitar</div>
              <div className="instrument-glow"></div>
            </div>
            <div
              className={`instrument-card ${selectedInstrument === 'bass' ? 'active' : ''}`}
              onClick={() => setSelectedInstrument('bass')}
            >
              <div className="instrument-icon"><GiGuitarBassHead /></div>
              <div className="instrument-name">Bass</div>
              <div className="instrument-glow"></div>
            </div>
          </div>

          {/* Mobile view - Dropdown */}
          <div className="instrument-selector mobile-selector">
            <div
              className={`instrument-dropdown ${isInstrumentDropdownOpen ? 'open' : ''} ${selectedInstrument}-active`}
              onClick={() => setIsInstrumentDropdownOpen(!isInstrumentDropdownOpen)}
            >
              <div className="current-instrument">
                <div className="instrument-icon">
                  {selectedInstrument === 'keyboard' && <PiPianoKeysFill />}
                  {selectedInstrument === 'guitar' && <GiGuitarHead />}
                  {selectedInstrument === 'bass' && <GiGuitarBassHead />}
                </div>
                <div className="instrument-name">
                  {selectedInstrument === 'keyboard' && 'Keyboard'}
                  {selectedInstrument === 'guitar' && 'Guitar'}
                  {selectedInstrument === 'bass' && 'Bass'}
                </div>
                <div className={`dropdown-arrow ${isInstrumentDropdownOpen ? 'rotated' : ''}`}><IoMdArrowDropdown /></div>
              </div>
              {isInstrumentDropdownOpen && (
                <div className="dropdown-options">
                  {selectedInstrument !== 'keyboard' && (
                    <div
                      className="dropdown-option keyboard-option"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedInstrument('keyboard');
                        setIsInstrumentDropdownOpen(false);
                      }}
                    >
                      <div className="instrument-icon"><PiPianoKeysFill /></div>
                      <div className="instrument-name">Keyboard</div>
                    </div>
                  )}
                  {selectedInstrument !== 'guitar' && (
                    <div
                      className="dropdown-option guitar-option"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedInstrument('guitar');
                        setIsInstrumentDropdownOpen(false);
                      }}
                    >
                      <div className="instrument-icon"><GiGuitarHead /></div>
                      <div className="instrument-name">Guitar</div>
                    </div>
                  )}
                  {selectedInstrument !== 'bass' && (
                    <div
                      className="dropdown-option bass-option"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedInstrument('bass');
                        setIsInstrumentDropdownOpen(false);
                      }}
                    >
                      <div className="instrument-icon"><GiGuitarBassHead /></div>
                      <div className="instrument-name">Bass</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Lesson Type</label>
          <div className={styles.lessonTypeSwitch}>
            <button
              type="button"
              className={`${styles.switchOption} ${selectedOption === 'melodies' ? styles.switchOptionActive : ''}`}
              onClick={() => setSelectedOption('melodies')}
            >
              Melodies
            </button>
            <button
              type="button"
              className={`${styles.switchOption} ${selectedOption === 'chords' ? styles.switchOptionActive : ''}`}
              onClick={() => setSelectedOption('chords')}
            >
              Chords
            </button>
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
              onChange={(e) => handleDifficultyChange(Number(e.target.value))}
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
          <div style={{ marginBottom: 20 }}>
            <div className="control-group octave-range-control">
              <div className="label-with-tooltip">
                <label className="control-label">Octave Range</label>
                <Tooltip title="Octave Range" text="Select which octaves are visible in the keyboard interface">
                  <div className="tooltip-icon">?</div>
                </Tooltip>
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
                    if (val <= octaveHigh) { setOctaveLow(val); handleManualChange() }
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
                    if (val >= octaveLow) { setOctaveHigh(val); handleManualChange() }
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
          </div>
        )}

        {/* Scales dropdown - only for scales lesson */}
        {selectedOption === 'melodies' && (
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Scale</label>
            <div className={styles.selectWrapper}>
              <select
                className={styles.select}
                value={selectedScale}
                onChange={(e) => { setSelectedScale(e.target.value); handleManualChange() }}
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
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Chord</label>
            <div className={styles.selectWrapper}>
              <select
                className={styles.select}
                value={selectedChord}
                onChange={(e) => { setSelectedChord(e.target.value); handleManualChange() }}
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

        {/* BPM and Beats - Single row that wraps on small screens */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 20, flexWrap: 'wrap' }}>
          {/* BPM control */}
          <div className="modern-control-item" style={{ flex: '0 0 auto' }}>
            <div className="label-with-tooltip">
              <label className="control-label">BPM</label>
              <Tooltip title="BPM" text="Specify the speed of the melody (BEATS PER MINUTE)">
                <div className="tooltip-icon">?</div>
              </Tooltip>
            </div>
            <div className="input-with-buttons">
              <input
                type="text"
                value={bpm}
                onChange={(e) => {
                  const val = Number(e.target.value)
                  if (!isNaN(val) && val > 0) { setBpm(val); handleManualChange() }
                }}
                className="control-input with-internal-buttons"
              />
              <button
                className="control-button-internal minus"
                onClick={() => { setBpm(Math.max(30, bpm - 10)); handleManualChange() }}
              >
                −
              </button>
              <button
                className="control-button-internal plus"
                onClick={() => { setBpm(Math.min(300, bpm + 10)); handleManualChange() }}
              >
                +
              </button>
            </div>
          </div>

          {/* Beats control */}
          <div className="modern-control-item" style={{ flex: '0 0 auto' }}>
            <div className="label-with-tooltip">
              <label className="control-label">Beats</label>
              <Tooltip title="Beats" text="Specify the number of beats in the melody">
                <div className="tooltip-icon">?</div>
              </Tooltip>
            </div>
            <div className="input-with-buttons">
              <input
                type="text"
                value={beats}
                onChange={(e) => {
                  const val = Number(e.target.value)
                  if (!isNaN(val) && val > 0) { setBeats(val); handleManualChange() }
                }}
                className="control-input with-internal-buttons"
              />
              <button
                className="control-button-internal minus"
                onClick={() => { setBeats(Math.max(1, beats - 1)); handleManualChange() }}
              >
                −
              </button>
              <button
                className="control-button-internal plus"
                onClick={() => { setBeats(Math.min(16, beats + 1)); handleManualChange() }}
              >
                +
              </button>
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

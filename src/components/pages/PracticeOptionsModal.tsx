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
  chordCount: number
  scale?: string
  chord?: string
  octaveLow?: number
  octaveHigh?: number
  fretLow?: number
  fretHigh?: number
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
  const [chordCount, setChordCount] = useState<number>(4)
  const [selectedScale, setSelectedScale] = useState<string>('major-minor')
  const [selectedChord, setSelectedChord] = useState<string>('major-minor')
  const [octaveLow, setOctaveLow] = useState<number>(4)
  const [octaveHigh, setOctaveHigh] = useState<number>(5)
  const [fretLow, setFretLow] = useState<number>(0)
  const [fretHigh, setFretHigh] = useState<number>(12)
  const [isInstrumentDropdownOpen, setIsInstrumentDropdownOpen] = useState<boolean>(false)

  // Difficulty presets
  const difficultyPresets = [
    { bpm: 60, beats: 3, chordCount: 2, scale: 'major', chord: 'major' },           // Beginner
    { bpm: 120, beats: 4, chordCount: 4, scale: 'major-minor', chord: 'major-minor' }, // Intermediate
    { bpm: 180, beats: 6, chordCount: 6, scale: 'modes', chord: 'all' },            // Advanced
    { bpm: 240, beats: 8, chordCount: 8, scale: 'all', chord: 'all' }               // Professional
  ]

  const handleDifficultyChange = (newDifficulty: number) => {
    setDifficulty(newDifficulty)
    // Custom mode (4) doesn't apply presets - user controls all settings
    const preset = difficultyPresets[newDifficulty]
    if (preset) {
      setBpm(preset.bpm)
      setBeats(preset.beats)
      setChordCount(preset.chordCount)
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
  const isGuitar = selectedInstrument === 'guitar'
  const isBass = selectedInstrument === 'bass'
  const isStringInstrument = isGuitar || isBass

  const handleStart = () => {
    if (selectedOption && selectedInstrument) {
      const settings: LessonSettings = {
        lessonType: selectedOption,
        difficulty,
        bpm,
        beats,
        chordCount,
        scale: selectedOption === 'melodies' ? selectedScale : undefined,
        chord: selectedOption === 'chords' ? selectedChord : undefined,
        octaveLow: isKeyboard ? octaveLow : undefined,
        octaveHigh: isKeyboard ? octaveHigh : undefined,
        fretLow: isStringInstrument ? fretLow : undefined,
        fretHigh: isStringInstrument ? fretHigh : undefined
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
                    left: `${((octaveLow - 1) / 8) * 100}%`,
                    right: `${((8 - octaveHigh) / 8) * 100}%`
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
                  className="range-slider range-low"
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
                  className="range-slider range-high"
                  title="Set highest octave"
                />
              </div>
              <div className="octave-visual">
                {(() => {
                  const leftDimPercent = ((octaveLow - 1) / 8) * 100
                  const rightDimPercent = ((8 - octaveHigh) / 8) * 100

                  return (
                    <div className="keyboard-range-container">
                      <img
                        src="/Keyboard.png"
                        alt="Keyboard octave range"
                        className="keyboard-range-image"
                      />
                      <div
                        className="keyboard-dim-overlay keyboard-dim-left"
                        style={{ width: `${leftDimPercent}%` }}
                      />
                      <div
                        className="keyboard-dim-overlay keyboard-dim-right"
                        style={{ width: `${rightDimPercent}%` }}
                      />
                    </div>
                  )
                })()}
              </div>
            </div>
            </div>
          </div>
        )}

        {/* Fretboard range slider - only for guitar/bass */}
        {isStringInstrument && (
          <div style={{ marginBottom: 20 }}>
            <div className="control-group fret-range-control">
              <div className="label-with-tooltip">
                <label className="control-label">Fret Range</label>
                <Tooltip title="Fret Range" text="Select the fret range for practice">
                  <div className="tooltip-icon">?</div>
                </Tooltip>
              </div>
              <div className="fret-range-slider">
                <div className="range-labels-center">
                  <span className="range-label-center">
                    {fretLow} - {fretHigh}
                  </span>
                </div>
                <div className="dual-range-container fret-range-container">
                  <div
                    className="range-fill"
                    style={{
                      left: `${(fretLow / 24) * 100}%`,
                      right: `${((24 - fretHigh) / 24) * 100}%`
                    }}
                  />
                  <input
                    type="range"
                    min="0"
                    max="24"
                    step="4"
                    value={fretLow}
                    onChange={(e) => {
                      const val = Number(e.target.value)
                      if (val < fretHigh) { setFretLow(val); handleManualChange() }
                    }}
                    className="range-slider range-low fret-slider-low"
                    title="Set lowest fret"
                  />
                  <input
                    type="range"
                    min="0"
                    max="24"
                    step="4"
                    value={fretHigh}
                    onChange={(e) => {
                      const val = Number(e.target.value)
                      if (val > fretLow) { setFretHigh(val); handleManualChange() }
                    }}
                    className="range-slider range-high fret-slider-high"
                    title="Set highest fret"
                  />
                </div>
                <div className="fret-visual">
                  {(() => {
                    const leftDimPercent = (fretLow / 24) * 100
                    const rightDimPercent = ((24 - fretHigh) / 24) * 100

                    return (
                      <div className="fretboard-range-container">
                        <img
                          src={isGuitar ? "/Guitar-fretboard.png" : "/Bass-fretboard.png"}
                          alt={`${isGuitar ? 'Guitar' : 'Bass'} fretboard range`}
                          className="fretboard-range-image"
                        />
                        <div
                          className="fretboard-dim-overlay fretboard-dim-left"
                          style={{ width: `${leftDimPercent}%` }}
                        />
                        <div
                          className="fretboard-dim-overlay fretboard-dim-right"
                          style={{ width: `${rightDimPercent}%` }}
                        />
                      </div>
                    )
                  })()}
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

        {/* BPM, Beats, and Chords - Single row that wraps on small screens */}
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

          {/* Beats control - for both melodies and chords */}
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

          {/* Chords control - for chords lessons */}
          {selectedOption === 'chords' && (
            <div className="modern-control-item" style={{ flex: '0 0 auto' }}>
              <div className="label-with-tooltip">
                <label className="control-label">Chords</label>
                <Tooltip title="Chords" text="Specify the number of chords in the progression">
                  <div className="tooltip-icon">?</div>
                </Tooltip>
              </div>
              <div className="input-with-buttons">
                <input
                  type="text"
                  value={chordCount}
                  onChange={(e) => {
                    const val = Number(e.target.value)
                    if (!isNaN(val) && val > 0) { setChordCount(val); handleManualChange() }
                  }}
                  className="control-input with-internal-buttons"
                />
                <button
                  className="control-button-internal minus"
                  onClick={() => { setChordCount(Math.max(1, chordCount - 1)); handleManualChange() }}
                >
                  −
                </button>
                <button
                  className="control-button-internal plus"
                  onClick={() => { setChordCount(Math.min(16, chordCount + 1)); handleManualChange() }}
                >
                  +
                </button>
              </div>
            </div>
          )}
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

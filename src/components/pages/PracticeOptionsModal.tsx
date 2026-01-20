import { useState } from 'react'
import { useTranslation } from '../../contexts/TranslationContext'
import styles from '../../styles/PracticeOptionsModal.module.css'
import '../../styles/Controls.css'
import '../../styles/Tooltip.css'
import { PiPianoKeysFill } from 'react-icons/pi'
import { GiGuitarBassHead, GiGuitarHead } from 'react-icons/gi'
import { IoMdArrowDropdown } from 'react-icons/io'
import Tooltip from '../common/Tooltip'
import { GUITAR_SCALES } from '../../utils/instruments/guitar/guitarScales'
import { GUITAR_CHORDS } from '../../utils/instruments/guitar/guitarChords'

const difficultyLabels = ['Learn', 'Custom']

// Get scale and chord names from the definitions
const scaleNames = GUITAR_SCALES.map(s => s.name)
const chordNames = GUITAR_CHORDS.map(c => c.name)

export interface SelectionData {
  selectedNoteIds: string[]
  appliedScales: Array<{
    root: string
    scaleName: string
    octave?: number
    displayName: string
  }>
  appliedChords: Array<{
    root: string
    chordName: string
    octave?: number
    fretZone?: number
    displayName: string
  }>
}

export interface LessonSettings {
  lessonType: string
  difficulty: number
  bpm: number
  beats: number
  chordCount: number
  scales?: string[]
  chords?: string[]
  octaveLow?: number
  octaveHigh?: number
  fretLow?: number
  fretHigh?: number
  selectionData?: SelectionData | null
}

interface PracticeOptionsModalProps {
  onStart: (instrument: string, selectedOptions: string[], difficulty: number, settings: LessonSettings) => void
  onCancel: () => void
}

const PracticeOptionsModal: React.FC<PracticeOptionsModalProps> = ({
  onStart,
  onCancel
}) => {
  const { t } = useTranslation()
  const [selectedInstrument, setSelectedInstrument] = useState<string>('keyboard')
  const [selectedOption, setSelectedOption] = useState<string>('melodies')
  const [difficulty, setDifficulty] = useState<number>(0) // 0 = Learn, 1 = Custom
  const [bpm, setBpm] = useState<number>(120)
  const [beats, setBeats] = useState<number>(5)
  const [chordCount, setChordCount] = useState<number>(4)
  const [selectedScales, setSelectedScales] = useState<string[]>(['Major', 'Minor'])
  const [selectedChords, setSelectedChords] = useState<string[]>(['Major', 'Minor'])
  const [octaveLow, setOctaveLow] = useState<number>(4)
  const [octaveHigh, setOctaveHigh] = useState<number>(5)
  const [fretLow, setFretLow] = useState<number>(0)
  const [fretHigh, setFretHigh] = useState<number>(12)
  const [isInstrumentDropdownOpen, setIsInstrumentDropdownOpen] = useState<boolean>(false)

  // Preset for Learn mode
  const learnPreset = {
    bpm: 120,
    beats: 5,
    chordCount: 4,
    scales: ['Major', 'Minor'],
    chords: ['Major', 'Minor'],
    octaveLow: 4,
    octaveHigh: 5,
    fretLow: 0,
    fretHigh: 12
  }

  const handleDifficultyChange = (newDifficulty: number) => {
    setDifficulty(newDifficulty)
    // Learn mode (0) applies preset, Custom mode (1) keeps current settings
    if (newDifficulty === 0) {
      setBpm(learnPreset.bpm)
      setBeats(learnPreset.beats)
      setChordCount(learnPreset.chordCount)
      setSelectedScales(learnPreset.scales)
      setSelectedChords(learnPreset.chords)
      setOctaveLow(learnPreset.octaveLow)
      setOctaveHigh(learnPreset.octaveHigh)
      setFretLow(learnPreset.fretLow)
      setFretHigh(learnPreset.fretHigh)
    }
  }

  // Toggle scale selection
  const toggleScale = (scaleName: string) => {
    handleManualChange()
    setSelectedScales(prev =>
      prev.includes(scaleName)
        ? prev.filter(s => s !== scaleName)
        : [...prev, scaleName]
    )
  }

  // Toggle chord selection
  const toggleChord = (chordName: string) => {
    handleManualChange()
    setSelectedChords(prev =>
      prev.includes(chordName)
        ? prev.filter(c => c !== chordName)
        : [...prev, chordName]
    )
  }

  // Switch to Custom mode when user manually changes any setting
  const handleManualChange = () => {
    if (difficulty !== 1) {
      setDifficulty(1)
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
        scales: selectedOption === 'melodies' ? selectedScales : undefined,
        chords: selectedOption === 'chords' ? selectedChords : undefined,
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

        {/* Scales checkboxes - only for melodies lesson */}
        {selectedOption === 'melodies' && (
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Scales</label>
            <div className={styles.checkboxGrid}>
              {scaleNames.map(scaleName => (
                <label key={scaleName} className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={selectedScales.includes(scaleName)}
                    onChange={() => toggleScale(scaleName)}
                    className={styles.checkbox}
                  />
                  <span className={styles.checkboxText}>{scaleName}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Chords checkboxes - only for chords lesson */}
        {selectedOption === 'chords' && (
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Chords</label>
            <div className={styles.checkboxGrid}>
              {chordNames.map(chordName => (
                <label key={chordName} className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={selectedChords.includes(chordName)}
                    onChange={() => toggleChord(chordName)}
                    className={styles.checkbox}
                  />
                  <span className={styles.checkboxText}>{chordName}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* BPM, Beats, and Chords - Single row that wraps on small screens */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 20, flexWrap: 'wrap' }}>
          {/* BPM control */}
          <div className="modern-control-item" style={{ flex: '0 0 auto' }}>
            <div className="label-with-tooltip">
              <label className="control-label">{t('bpm')}</label>
              <Tooltip title={t('bpm')} text={t('bpmTooltip')}>
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
                onClick={() => { setBpm(Math.max(30, bpm - 1)); handleManualChange() }}
              >
                −
              </button>
              <button
                className="control-button-internal plus"
                onClick={() => { setBpm(Math.min(300, bpm + 1)); handleManualChange() }}
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

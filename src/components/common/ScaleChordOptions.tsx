import React, { useState, useEffect } from 'react'
import { ROOT_NOTES, GUITAR_SCALES, getScaleBoxes, type GuitarScale, type ScaleBox } from '../../utils/guitarScales'
import { guitarNotes } from '../../utils/guitarNotes'
import { BASS_ROOT_NOTES, BASS_SCALES, getBassScaleBoxes, type BassScale, type BassScaleBox } from '../../utils/bassScales'
import { bassNotes } from '../../utils/bassNotes'
import { KEYBOARD_SCALES, type KeyboardScale } from '../../utils/keyboardScales'
import { CHORD_ROOT_NOTES, GUITAR_CHORDS, getChordShapes, type GuitarChord, type ChordShape } from '../../utils/guitarChords'
import { BASS_CHORD_ROOT_NOTES, BASS_CHORDS, getBassChordShapes, type BassChord, type BassChordShape } from '../../utils/bassChords'
import { KEYBOARD_CHORDS, type KeyboardChord } from '../../utils/keyboardChords'
import '../../styles/ScaleOptions.css'

interface ScaleChordOptionsProps {
  instrument: string
  selectedRoot?: string
  selectedChordRoot?: string
  onRootChange?: (rootNote: string) => void
  onChordRootChange?: (rootNote: string) => void
  onScaleSelect?: (rootNote: string, scale: GuitarScale) => void
  onScaleBoxSelect?: (scaleBox: ScaleBox) => void
  onKeyboardScaleApply?: (rootNote: string, scale: KeyboardScale) => void
  onChordSelect?: (rootNote: string, chord: GuitarChord) => void
  onChordShapeSelect?: (chordShape: ChordShape) => void
  onKeyboardChordApply?: (rootNote: string, chord: KeyboardChord) => void
}

const ScaleChordOptions: React.FC<ScaleChordOptionsProps> = ({
  instrument,
  selectedRoot = 'C',
  selectedChordRoot = 'C',
  onRootChange,
  onChordRootChange,
  onScaleSelect,
  onScaleBoxSelect,
  onKeyboardScaleApply,
  onChordSelect,
  onChordShapeSelect,
  onKeyboardChordApply
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isScaleMode, setIsScaleMode] = useState(true) // true for scales, false for chords

  // Scale states
  const [selectedScale, setSelectedScale] = useState<GuitarScale>(GUITAR_SCALES[0])
  const [selectedBassScale, setSelectedBassScale] = useState<BassScale>(BASS_SCALES[0])
  const [keyboardSelectedScale, setKeyboardSelectedScale] = useState<KeyboardScale>(KEYBOARD_SCALES[0])
  const [availableBoxes, setAvailableBoxes] = useState<ScaleBox[]>([])
  const [availableBassBoxes, setAvailableBassBoxes] = useState<BassScaleBox[]>([])
  const [selectedBoxIndex, setSelectedBoxIndex] = useState<number>(0)
  const [showPositions, setShowPositions] = useState<boolean>(true)

  // Chord states
  const [selectedChord, setSelectedChord] = useState<GuitarChord>(GUITAR_CHORDS[0])
  const [selectedBassChord, setSelectedBassChord] = useState<BassChord>(BASS_CHORDS[0])
  const [keyboardSelectedChord, setKeyboardSelectedChord] = useState<KeyboardChord>(KEYBOARD_CHORDS[0])
  const [availableShapes, setAvailableShapes] = useState<ChordShape[]>([])
  const [availableBassShapes, setAvailableBassShapes] = useState<BassChordShape[]>([])
  const [selectedShapeIndex, setSelectedShapeIndex] = useState<number>(0)
  const [showShapes, setShowShapes] = useState<boolean>(true)

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded)
  }

  // Update available boxes when root or scale changes (Scale mode)
  useEffect(() => {
    if (isScaleMode) {
      if (instrument === 'guitar') {
        const boxes = getScaleBoxes(selectedRoot, selectedScale, guitarNotes)
        setAvailableBoxes(boxes)
        setSelectedBoxIndex(0)
      } else if (instrument === 'bass') {
        const boxes = getBassScaleBoxes(selectedRoot, selectedBassScale, bassNotes)
        setAvailableBassBoxes(boxes)
        setSelectedBoxIndex(0)
      }
    }
  }, [selectedRoot, selectedScale, selectedBassScale, instrument, isScaleMode])

  // Update available shapes when root or chord changes (Chord mode)
  useEffect(() => {
    if (!isScaleMode) {
      if (instrument === 'guitar') {
        const shapes = getChordShapes(selectedChordRoot, selectedChord, guitarNotes)
        setAvailableShapes(shapes)
        setSelectedShapeIndex(0)
      } else if (instrument === 'bass') {
        const shapes = getBassChordShapes(selectedChordRoot, selectedBassChord, bassNotes)
        setAvailableBassShapes(shapes)
        setSelectedShapeIndex(0)
      }
    }
  }, [selectedChordRoot, selectedChord, selectedBassChord, instrument, isScaleMode])

  // Scale handlers
  const handleScaleChange = (scale: GuitarScale) => {
    setSelectedScale(scale)
  }

  const handleBassScaleChange = (scale: BassScale) => {
    setSelectedBassScale(scale)
  }

  const handleKeyboardScaleChange = (scale: KeyboardScale) => {
    setKeyboardSelectedScale(scale)
  }

  const handleBoxChange = (boxIndex: number) => {
    setSelectedBoxIndex(boxIndex)
    const currentBoxes = instrument === 'bass' ? availableBassBoxes : availableBoxes
    if (boxIndex >= currentBoxes.length) {
      setShowPositions(false)
    } else {
      setShowPositions(true)
    }
  }

  const handleApplyScale = () => {
    if (instrument === 'guitar') {
      if (showPositions && availableBoxes.length > 0 && onScaleBoxSelect) {
        onScaleBoxSelect(availableBoxes[selectedBoxIndex])
      } else if (onScaleSelect) {
        onScaleSelect(selectedRoot, selectedScale)
      }
    } else if (instrument === 'bass') {
      if (showPositions && availableBassBoxes.length > 0 && onScaleBoxSelect) {
        onScaleBoxSelect(availableBassBoxes[selectedBoxIndex] as any)
      } else if (onScaleSelect) {
        onScaleSelect(selectedRoot, selectedBassScale as any)
      }
    } else if (instrument === 'keyboard' && onKeyboardScaleApply) {
      onKeyboardScaleApply(selectedRoot, keyboardSelectedScale)
    }
  }

  // Chord handlers
  const handleChordChange = (chord: GuitarChord) => {
    setSelectedChord(chord)
  }

  const handleBassChordChange = (chord: BassChord) => {
    setSelectedBassChord(chord)
  }

  const handleKeyboardChordChange = (chord: KeyboardChord) => {
    setKeyboardSelectedChord(chord)
  }

  const handleShapeChange = (shapeIndex: number) => {
    setSelectedShapeIndex(shapeIndex)
    setShowShapes(true)
  }

  const handleApplyChord = () => {
    if (instrument === 'guitar') {
      if (showShapes && availableShapes.length > 0 && onChordShapeSelect) {
        onChordShapeSelect(availableShapes[selectedShapeIndex])
      } else if (onChordSelect) {
        onChordSelect(selectedChordRoot, selectedChord)
      }
    } else if (instrument === 'bass') {
      if (showShapes && availableBassShapes.length > 0 && onChordShapeSelect) {
        onChordShapeSelect(availableBassShapes[selectedShapeIndex] as any)
      } else if (onChordSelect) {
        onChordSelect(selectedChordRoot, selectedBassChord as any)
      }
    } else if (instrument === 'keyboard' && onKeyboardChordApply) {
      onKeyboardChordApply(selectedChordRoot, keyboardSelectedChord)
    }
  }

  const currentRoot = isScaleMode ? selectedRoot : selectedChordRoot
  const currentRootNotes = isScaleMode
    ? (instrument === 'bass' ? BASS_ROOT_NOTES : ROOT_NOTES)
    : (instrument === 'bass' ? BASS_CHORD_ROOT_NOTES : CHORD_ROOT_NOTES)

  return (
    <div className={`scale-options-container ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <button
        className="scale-options-toggle"
        onClick={toggleExpanded}
        title={isExpanded ? 'Collapse Scale/Chord Options' : 'Expand Scale/Chord Options'}
      >
        {isExpanded ? '▼' : '▶'}
        <span className="toggle-text">{isExpanded ? 'Scale/Chord Options' : '\u00A0\u00A0\u00A0Scale/Chord Options'}</span>
      </button>

      {isExpanded && (
        <div className="scale-options-content">
          {/* Mode Toggle Slider */}
          <div className="control-section">
            <label className="control-label">Mode</label>
            <div className="mode-toggle">
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={!isScaleMode}
                  onChange={(e) => setIsScaleMode(!e.target.checked)}
                />
                <span className="toggle-slider">
                  <span className="toggle-text left">Scales</span>
                  <span className="toggle-text right">Chords</span>
                </span>
              </label>
            </div>
          </div>

          <div className="scale-controls">
            <div className="control-section">
              <label className="control-label">Root Note</label>
              <select
                value={currentRoot}
                onChange={(e) => {
                  if (isScaleMode && onRootChange) {
                    onRootChange(e.target.value)
                  } else if (!isScaleMode && onChordRootChange) {
                    onChordRootChange(e.target.value)
                  }
                }}
                className="control-select"
              >
                {currentRootNotes.map(note => (
                  <option key={note} value={note}>{note}</option>
                ))}
              </select>
            </div>

            {isScaleMode ? (
              <>
                <div className="control-section">
                  <label className="control-label">Scale</label>
                  <select
                    value={instrument === 'guitar' ? selectedScale.name : instrument === 'bass' ? selectedBassScale.name : keyboardSelectedScale.name}
                    onChange={(e) => {
                      if (instrument === 'guitar') {
                        const scale = GUITAR_SCALES.find(s => s.name === e.target.value)
                        if (scale) handleScaleChange(scale)
                      } else if (instrument === 'bass') {
                        const scale = BASS_SCALES.find(s => s.name === e.target.value)
                        if (scale) handleBassScaleChange(scale)
                      } else {
                        const scale = KEYBOARD_SCALES.find(s => s.name === e.target.value)
                        if (scale) handleKeyboardScaleChange(scale)
                      }
                    }}
                    className="control-select"
                  >
                    {(instrument === 'guitar' ? GUITAR_SCALES : instrument === 'bass' ? BASS_SCALES : KEYBOARD_SCALES).map(scale => (
                      <option key={scale.name} value={scale.name}>{scale.name}</option>
                    ))}
                  </select>
                </div>

                {instrument === 'guitar' && availableBoxes.length > 0 && (
                  <div className="control-section">
                    <label className="control-label">Position</label>
                    <select
                      value={selectedBoxIndex}
                      onChange={(e) => handleBoxChange(parseInt(e.target.value))}
                      className="control-select"
                    >
                      {availableBoxes.map((box, index) => (
                        <option key={index} value={index}>
                          Frets {box.minFret}-{box.maxFret}
                        </option>
                      ))}
                      <option key="entire" value={availableBoxes.length}>
                        Entire Fretboard
                      </option>
                    </select>
                  </div>
                )}

                {instrument === 'bass' && availableBassBoxes.length > 0 && (
                  <div className="control-section">
                    <label className="control-label">Position</label>
                    <select
                      value={selectedBoxIndex}
                      onChange={(e) => handleBoxChange(parseInt(e.target.value))}
                      className="control-select"
                    >
                      {availableBassBoxes.map((box, index) => (
                        <option key={index} value={index}>
                          Frets {box.minFret}-{box.maxFret}
                        </option>
                      ))}
                      <option key="entire" value={availableBassBoxes.length}>
                        Entire Fretboard
                      </option>
                    </select>
                  </div>
                )}

                <div className="control-section">
                  <button
                    onClick={handleApplyScale}
                    className="apply-button"
                    title={`Apply scale to ${instrument}`}
                  >
                    Apply Scale
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="control-section">
                  <label className="control-label">Chord</label>
                  <select
                    value={instrument === 'guitar' ? selectedChord.name : instrument === 'bass' ? selectedBassChord.name : keyboardSelectedChord.name}
                    onChange={(e) => {
                      if (instrument === 'guitar') {
                        const chord = GUITAR_CHORDS.find(c => c.name === e.target.value)
                        if (chord) handleChordChange(chord)
                      } else if (instrument === 'bass') {
                        const chord = BASS_CHORDS.find(c => c.name === e.target.value)
                        if (chord) handleBassChordChange(chord)
                      } else {
                        const chord = KEYBOARD_CHORDS.find(c => c.name === e.target.value)
                        if (chord) handleKeyboardChordChange(chord)
                      }
                    }}
                    className="control-select"
                  >
                    {(instrument === 'guitar' ? GUITAR_CHORDS : instrument === 'bass' ? BASS_CHORDS : KEYBOARD_CHORDS).map(chord => (
                      <option key={chord.name} value={chord.name}>{chord.name}</option>
                    ))}
                  </select>
                </div>

                {instrument === 'guitar' && availableShapes.length > 0 && (
                  <div className="control-section">
                    <label className="control-label">Shape</label>
                    <select
                      value={selectedShapeIndex}
                      onChange={(e) => handleShapeChange(parseInt(e.target.value))}
                      className="control-select"
                    >
                      {availableShapes.map((shape, index) => (
                        <option key={index} value={index}>
                          {shape.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {instrument === 'bass' && availableBassShapes.length > 0 && (
                  <div className="control-section">
                    <label className="control-label">Shape</label>
                    <select
                      value={selectedShapeIndex}
                      onChange={(e) => handleShapeChange(parseInt(e.target.value))}
                      className="control-select"
                    >
                      {availableBassShapes.map((shape, index) => (
                        <option key={index} value={index}>
                          {shape.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="control-section">
                  <button
                    onClick={handleApplyChord}
                    className="apply-button"
                    title={`Apply chord to ${instrument}`}
                  >
                    Apply Chord
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default ScaleChordOptions
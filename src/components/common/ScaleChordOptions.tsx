import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { ROOT_NOTES, GUITAR_SCALES, getScaleBoxes, type GuitarScale, type ScaleBox } from '../../utils/guitarScales'
import { guitarNotes } from '../../utils/guitarNotes'
import { BASS_ROOT_NOTES, BASS_SCALES, getBassScaleBoxes, type BassScale, type BassScaleBox } from '../../utils/bassScales'
import { bassNotes } from '../../utils/bassNotes'
import { KEYBOARD_SCALES, type KeyboardScale } from '../../utils/keyboardScales'
import { CHORD_ROOT_NOTES, GUITAR_CHORDS, getChordShapes, type GuitarChord, type ChordShape } from '../../utils/guitarChords'
import { BASS_CHORD_ROOT_NOTES, BASS_CHORDS, getBassChordShapes, type BassChord, type BassChordShape } from '../../utils/bassChords'
import { KEYBOARD_CHORDS, type KeyboardChord } from '../../utils/keyboardChords'
import '../../styles/ScaleOptions.css'
import { MdExpandMore, MdChevronRight } from 'react-icons/md'

export interface AppliedChord {
  id: string
  root: string
  chord: GuitarChord | BassChord | KeyboardChord
  displayName: string
  noteKeys?: string[] // For guitar/bass: note keys like "0-open", "1-2" etc.
  notes?: any[] // For keyboard: actual Note objects
}

export interface AppliedScale {
  id: string
  root: string
  scale: GuitarScale | BassScale | KeyboardScale
  displayName: string
  noteKeys?: string[] // For guitar/bass: note keys like "0-open", "1-2" etc.
  notes?: any[] // For keyboard: actual Note objects
}

interface ScaleChordOptionsProps {
  instrument: string
  selectedRoot?: string
  selectedChordRoot?: string
  onRootChange?: (rootNote: string) => void
  onChordRootChange?: (rootNote: string) => void
  onScaleSelect?: (rootNote: string, scale: GuitarScale) => void
  onScaleBoxSelect?: (scaleBox: ScaleBox) => void
  onClearScale?: () => void
  onKeyboardScaleApply?: (rootNote: string, scale: KeyboardScale) => void
  onKeyboardScaleClear?: () => void
  onChordSelect?: (rootNote: string, chord: GuitarChord) => void
  onChordShapeSelect?: (chordShape: ChordShape) => void
  onClearChord?: () => void
  onKeyboardChordApply?: (rootNote: string, chord: KeyboardChord) => void
  onKeyboardChordClear?: () => void
  appliedChords?: AppliedChord[]
  onChordDelete?: (chordId: string) => void
  appliedScales?: AppliedScale[]
  onScaleDelete?: (scaleId: string) => void
}

const ScaleChordOptions: React.FC<ScaleChordOptionsProps> = ({
  instrument,
  selectedRoot = 'C',
  selectedChordRoot = 'C',
  onRootChange,
  onChordRootChange,
  onScaleSelect,
  onScaleBoxSelect,
  onClearScale,
  onKeyboardScaleApply,
  onKeyboardScaleClear,
  onChordSelect,
  onChordShapeSelect,
  onClearChord,
  onKeyboardChordApply,
  onKeyboardChordClear,
  appliedChords = [],
  onChordDelete,
  appliedScales = [],
  onScaleDelete
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isScaleMode, setIsScaleMode] = useState(true) // true for scales, false for chords
  const containerRef = useRef<HTMLDivElement>(null)
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 })

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
    if (!isExpanded && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setPopupPosition({
        top: rect.bottom + 4,
        left: rect.left
      })
    }
    setIsExpanded(!isExpanded)
  }

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      const popup = document.querySelector('.scale-options-popup')

      if (containerRef.current &&
          !containerRef.current.contains(target) &&
          popup &&
          !popup.contains(target)) {
        setIsExpanded(false)
      }
    }

    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isExpanded])

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
      if (showPositions && availableBoxes.length > 0 && selectedBoxIndex < availableBoxes.length && onScaleBoxSelect) {
        onScaleBoxSelect(availableBoxes[selectedBoxIndex])
      } else if (onScaleSelect) {
        onScaleSelect(selectedRoot, selectedScale)
      }
    } else if (instrument === 'bass') {
      if (showPositions && availableBassBoxes.length > 0 && selectedBoxIndex < availableBassBoxes.length && onScaleBoxSelect) {
        onScaleBoxSelect(availableBassBoxes[selectedBoxIndex] as any)
      } else if (onScaleSelect) {
        onScaleSelect(selectedRoot, selectedBassScale as any)
      }
    } else if (instrument === 'keyboard' && onKeyboardScaleApply) {
      onKeyboardScaleApply(selectedRoot, keyboardSelectedScale)
    }

    // Keep popup open for multiple scale application
    // setIsExpanded(false)
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
        // Add root note context to chord shape
        const chordShapeWithRoot = { ...availableShapes[selectedShapeIndex], root: selectedChordRoot }
        onChordShapeSelect(chordShapeWithRoot as any)
      } else if (onChordSelect) {
        onChordSelect(selectedChordRoot, selectedChord)
      }
    } else if (instrument === 'bass') {
      if (showShapes && availableBassShapes.length > 0 && onChordShapeSelect) {
        // Add root note context to bass chord shape
        const bassChordShapeWithRoot = { ...availableBassShapes[selectedShapeIndex], root: selectedChordRoot }
        onChordShapeSelect(bassChordShapeWithRoot as any)
      } else if (onChordSelect) {
        onChordSelect(selectedChordRoot, selectedBassChord as any)
      }
    } else if (instrument === 'keyboard' && onKeyboardChordApply) {
      onKeyboardChordApply(selectedChordRoot, keyboardSelectedChord)
    }

    // Don't auto-close the popup to allow adding multiple chords
    // setIsExpanded(false)
  }

  const currentRoot = isScaleMode ? selectedRoot : selectedChordRoot
  const currentRootNotes = isScaleMode
    ? (instrument === 'bass' ? BASS_ROOT_NOTES : ROOT_NOTES)
    : (instrument === 'bass' ? BASS_CHORD_ROOT_NOTES : CHORD_ROOT_NOTES)

  return (
    <div ref={containerRef} className={`scale-options-container ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <button
        className={`scale-options-toggle instrument-${instrument}`}
        onClick={toggleExpanded}
        title={isExpanded ? 'Close Scales/Chords' : 'Open Scales/Chords'}
      >
        <span className="toggle-arrow">{isExpanded ? <MdExpandMore /> : <MdChevronRight />}</span>
        <span className="toggle-text">Scales/Chords</span>
      </button>

      {isExpanded && (
        <div
          className={`scale-options-popup ${!isScaleMode ? 'chord-mode' : ''}`}
        >
          <div className={`scale-options-content ${!isScaleMode ? 'chord-mode' : ''}`}>
            {/* Mode Toggle Slider */}
            <div className="control-section">
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

          <div className={`scale-controls ${!isScaleMode ? 'chord-mode' : ''}`}>
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
                className={`control-select ${!isScaleMode ? 'chord-mode' : ''}`}
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
                    className={`control-select ${!isScaleMode ? 'chord-mode' : ''}`}
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
                      className={`control-select ${!isScaleMode ? 'chord-mode' : ''}`}
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
                      className={`control-select ${!isScaleMode ? 'chord-mode' : ''}`}
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

                {/* Applied Scales List */}
                {appliedScales.length > 0 && (
                  <div className="control-section">
                    <label className="control-label">Applied Scales</label>
                    <div className="applied-chords-list">
                      {appliedScales.map((appliedScale) => (
                        <div key={appliedScale.id} className="applied-chord-item">
                          <span className="chord-name">{appliedScale.displayName}</span>
                          <button
                            onClick={() => onScaleDelete?.(appliedScale.id)}
                            className="delete-chord-button"
                            title={`Remove ${appliedScale.displayName}`}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
                    className={`control-select ${!isScaleMode ? 'chord-mode' : ''}`}
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
                      className={`control-select ${!isScaleMode ? 'chord-mode' : ''}`}
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
                      className={`control-select ${!isScaleMode ? 'chord-mode' : ''}`}
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

                {/* Applied Chords List */}
                {appliedChords.length > 0 && (
                  <div className="control-section">
                    <label className="control-label">Applied Chords</label>
                    <div className="applied-chords-list">
                      {appliedChords.map((appliedChord) => (
                        <div key={appliedChord.id} className="applied-chord-item">
                          <span className="chord-name">{appliedChord.displayName}</span>
                          <button
                            onClick={() => onChordDelete?.(appliedChord.id)}
                            className="delete-chord-button"
                            title={`Remove ${appliedChord.displayName}`}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ScaleChordOptions
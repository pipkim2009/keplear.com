import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { IoMusicalNotes } from 'react-icons/io5'
import { ROOT_NOTES, GUITAR_SCALES, getScaleBoxes, applyScaleToGuitar, applyScaleBoxToGuitar, type GuitarScale, type ScaleBox } from '../../utils/instruments/guitar/guitarScales'
import { guitarNotes } from '../../utils/instruments/guitar/guitarNotes'
import { BASS_ROOT_NOTES, BASS_SCALES, getBassScaleBoxes, applyScaleToBass, applyScaleBoxToBass, type BassScale, type BassScaleBox } from '../../utils/instruments/bass/bassScales'
import { bassNotes } from '../../utils/instruments/bass/bassNotes'
import { KEYBOARD_SCALES, type KeyboardScale, applyScaleToKeyboard } from '../../utils/instruments/keyboard/keyboardScales'
import { CHORD_ROOT_NOTES, GUITAR_CHORDS, getChordShapes, applyChordToGuitar, applyChordShapeToGuitar, type GuitarChord, type ChordShape } from '../../utils/instruments/guitar/guitarChords'
import { BASS_CHORD_ROOT_NOTES, BASS_CHORDS, getBassChordShapes, applyChordToBass, applyBassChordShapeToBass, type BassChord, type BassChordShape } from '../../utils/instruments/bass/bassChords'
import { KEYBOARD_CHORDS, type KeyboardChord, applyChordToKeyboard } from '../../utils/instruments/keyboard/keyboardChords'
import type { Note } from '../../utils/notes'
import '../../styles/ScaleOptions.css'

// Preview data for guitar/bass (fret positions)
export interface FretboardPreview {
  positions: { stringIndex: number; fretIndex: number }[]
  rootPositions: { stringIndex: number; fretIndex: number }[]
  isChord: boolean
}

// Preview data for keyboard (note objects)
export interface KeyboardPreview {
  notes: Note[]
  rootNotes: Note[]
  isChord: boolean
}

export interface AppliedChord {
  id: string
  root: string
  chord: GuitarChord | BassChord | KeyboardChord
  displayName: string
  noteKeys?: string[] // For guitar/bass: note keys like "0-open", "1-2" etc.
  notes?: any[] // For keyboard: actual Note objects
  octave?: number // For keyboard: specific octave position
}

export interface AppliedScale {
  id: string
  root: string
  scale: GuitarScale | BassScale | KeyboardScale
  displayName: string
  noteKeys?: string[] // For guitar/bass: note keys like "0-open", "1-2" etc.
  notes?: any[] // For keyboard: actual Note objects
  octave?: number // For keyboard: specific octave position
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
  onKeyboardScaleApply?: (rootNote: string, scale: KeyboardScale, octave?: number) => void
  onKeyboardScaleClear?: () => void
  onChordSelect?: (rootNote: string, chord: GuitarChord) => void
  onChordShapeSelect?: (chordShape: ChordShape) => void
  onClearChord?: () => void
  onKeyboardChordApply?: (rootNote: string, chord: KeyboardChord, octave?: number) => void
  onKeyboardChordClear?: () => void
  appliedChords?: AppliedChord[]
  onChordDelete?: (chordId: string) => void
  appliedScales?: AppliedScale[]
  onScaleDelete?: (scaleId: string) => void
  lowerOctaves?: number
  higherOctaves?: number
  showOnlyAppliedList?: boolean
  disableDelete?: boolean
  // Preview callbacks
  onFretboardPreviewChange?: (preview: FretboardPreview | null) => void
  onKeyboardPreviewChange?: (preview: KeyboardPreview | null) => void
  // Available keyboard notes for preview calculation
  availableKeyboardNotes?: readonly Note[]
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
  onScaleDelete,
  lowerOctaves = 0,
  higherOctaves = 0,
  showOnlyAppliedList = false,
  disableDelete = false,
  onFretboardPreviewChange,
  onKeyboardPreviewChange,
  availableKeyboardNotes = []
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

  // Keyboard position (octave) states
  const [selectedScaleOctave, setSelectedScaleOctave] = useState<number>(4)
  const [selectedChordOctave, setSelectedChordOctave] = useState<number>(4)

  // Calculate available octaves based on octave range
  const minOctave = Math.max(1, 4 - lowerOctaves)
  const maxOctave = Math.min(8, 5 + higherOctaves)
  const availableOctaves = Array.from(
    { length: maxOctave - minOctave + 1 },
    (_, i) => minOctave + i
  )

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

  // Calculate and send preview data when popup is open and selections change
  useEffect(() => {
    // Clear preview when popup closes
    if (!isExpanded) {
      onFretboardPreviewChange?.(null)
      onKeyboardPreviewChange?.(null)
      return
    }

    // Skip previews in showOnlyAppliedList mode (practice mode)
    if (showOnlyAppliedList) {
      onFretboardPreviewChange?.(null)
      onKeyboardPreviewChange?.(null)
      return
    }

    // Skip if callbacks aren't provided
    if (!onFretboardPreviewChange && !onKeyboardPreviewChange) {
      return
    }

    try {
    // Calculate preview based on current selections
    if (instrument === 'guitar') {
      let positions: { stringIndex: number; fretIndex: number }[] = []
      const rootPositions: { stringIndex: number; fretIndex: number }[] = []

      if (isScaleMode) {
        // Scale preview for guitar
        if (showPositions && availableBoxes.length > 0 && selectedBoxIndex < availableBoxes.length) {
          positions = applyScaleBoxToGuitar(availableBoxes[selectedBoxIndex])
        } else {
          positions = applyScaleToGuitar(selectedRoot, selectedScale, guitarNotes)
        }
        // Find root positions
        positions.forEach(pos => {
          const note = guitarNotes.find((n: any) => {
            const stringIdx = 6 - n.string
            return stringIdx === pos.stringIndex && n.fret === pos.fretIndex
          })
          if (note && note.name.replace(/\d+$/, '') === selectedRoot) {
            rootPositions.push(pos)
          }
        })
      } else {
        // Chord preview for guitar
        if (showShapes && availableShapes.length > 0 && selectedShapeIndex < availableShapes.length) {
          positions = applyChordShapeToGuitar(availableShapes[selectedShapeIndex])
        } else {
          positions = applyChordToGuitar(selectedChordRoot, selectedChord, guitarNotes)
        }
        // Find root positions
        positions.forEach(pos => {
          const note = guitarNotes.find((n: any) => {
            const stringIdx = 6 - n.string
            return stringIdx === pos.stringIndex && n.fret === pos.fretIndex
          })
          if (note && note.name.replace(/\d+$/, '') === selectedChordRoot) {
            rootPositions.push(pos)
          }
        })
      }

      onFretboardPreviewChange?.({ positions, rootPositions, isChord: !isScaleMode })
    } else if (instrument === 'bass') {
      let positions: { stringIndex: number; fretIndex: number }[] = []
      const rootPositions: { stringIndex: number; fretIndex: number }[] = []

      if (isScaleMode) {
        // Scale preview for bass
        if (showPositions && availableBassBoxes.length > 0 && selectedBoxIndex < availableBassBoxes.length) {
          positions = applyScaleBoxToBass(availableBassBoxes[selectedBoxIndex])
        } else {
          positions = applyScaleToBass(selectedRoot, selectedBassScale as any, bassNotes)
        }
        // Find root positions
        positions.forEach(pos => {
          const note = bassNotes.find((n: any) => {
            // Bass mapping: visual stringIndex 0-3 maps to n.string 4-1 (top G to bottom E)
            // So n.string 4 → stringIndex 0, n.string 1 → stringIndex 3
            // Therefore: stringIndex = 4 - n.string
            return (4 - n.string) === pos.stringIndex && n.fret === pos.fretIndex
          })
          if (note && note.name.replace(/\d+$/, '') === selectedRoot) {
            rootPositions.push(pos)
          }
        })
      } else {
        // Chord preview for bass
        if (showShapes && availableBassShapes.length > 0 && selectedShapeIndex < availableBassShapes.length) {
          positions = applyBassChordShapeToBass(availableBassShapes[selectedShapeIndex])
        } else {
          positions = applyChordToBass(selectedChordRoot, selectedBassChord, bassNotes)
        }
        // Find root positions
        positions.forEach(pos => {
          const note = bassNotes.find((n: any) => {
            // Bass mapping: visual stringIndex 0-3 maps to n.string 4-1 (top G to bottom E)
            return (4 - n.string) === pos.stringIndex && n.fret === pos.fretIndex
          })
          if (note && note.name.replace(/\d+$/, '') === selectedChordRoot) {
            rootPositions.push(pos)
          }
        })
      }

      onFretboardPreviewChange?.({ positions, rootPositions, isChord: !isScaleMode })
    } else if (instrument === 'keyboard' && availableKeyboardNotes.length > 0) {
      let notes: Note[] = []
      const rootNotes: Note[] = []
      const currentRoot = isScaleMode ? selectedRoot : selectedChordRoot
      const currentOctave = isScaleMode ? selectedScaleOctave : selectedChordOctave

      if (isScaleMode) {
        // Scale preview for keyboard
        notes = applyScaleToKeyboard(selectedRoot, keyboardSelectedScale, availableKeyboardNotes)
      } else {
        // Chord preview for keyboard
        notes = applyChordToKeyboard(selectedChordRoot, keyboardSelectedChord, availableKeyboardNotes)
      }

      // Filter by selected octave (same logic as handleKeyboardScaleApply)
      notes = notes.filter(note => {
        const noteOctave = parseInt(note.name.replace(/[^0-9]/g, ''), 10)
        return noteOctave === currentOctave
      })

      // Find root notes
      notes.forEach(note => {
        const noteName = note.name.replace(/\d+$/, '')
        if (noteName === currentRoot) {
          rootNotes.push(note)
        }
      })

      onKeyboardPreviewChange?.({ notes, rootNotes, isChord: !isScaleMode })
    }
    } catch (error) {
      // Silently handle preview calculation errors
      console.error('Preview calculation error:', error)
    }
  }, [
    isExpanded,
    instrument,
    isScaleMode,
    selectedRoot,
    selectedChordRoot,
    selectedScale,
    selectedBassScale,
    keyboardSelectedScale,
    selectedChord,
    selectedBassChord,
    keyboardSelectedChord,
    selectedBoxIndex,
    selectedShapeIndex,
    showPositions,
    showShapes,
    availableBoxes,
    availableBassBoxes,
    availableShapes,
    availableBassShapes,
    availableKeyboardNotes,
    selectedScaleOctave,
    selectedChordOctave,
    onFretboardPreviewChange,
    onKeyboardPreviewChange,
    showOnlyAppliedList
  ])

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
      onKeyboardScaleApply(selectedRoot, keyboardSelectedScale, selectedScaleOctave)
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
      onKeyboardChordApply(selectedChordRoot, keyboardSelectedChord, selectedChordOctave)
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
        <IoMusicalNotes size={16} />
        Scales/Chords
      </button>

      {isExpanded && (
        <div
          className={`scale-options-popup ${showOnlyAppliedList ? (appliedChords.length > 0 && appliedScales.length === 0 ? 'chord-mode' : '') : (!isScaleMode ? 'chord-mode' : '')} instrument-${instrument}`}
        >
          <div className={`scale-options-content ${showOnlyAppliedList ? (appliedChords.length > 0 && appliedScales.length === 0 ? 'chord-mode' : '') : (!isScaleMode ? 'chord-mode' : '')}`}>
            {showOnlyAppliedList ? (
              <>
                {/* Applied Scales List */}
                {appliedScales.length > 0 && (
                  <div className="control-section scale-theme">
                    <label className="control-label scale-label">Applied Scales</label>
                    <div className="applied-scales-list">
                      {appliedScales.map((appliedScale) => (
                        <div key={appliedScale.id} className="applied-scale-item">
                          <span className="scale-name">{appliedScale.displayName}</span>
                          {!disableDelete && (
                            <button
                              onClick={() => onScaleDelete?.(appliedScale.id)}
                              className="delete-scale-button"
                              title={`Remove ${appliedScale.displayName}`}
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Applied Chords List */}
                {appliedChords.length > 0 && (
                  <div className="control-section chord-theme">
                    <label className="control-label chord-label">Applied Chords</label>
                    <div className="applied-chords-list">
                      {appliedChords.map((appliedChord) => (
                        <div key={appliedChord.id} className="applied-chord-item">
                          <span className="chord-name">{appliedChord.displayName}</span>
                          {!disableDelete && (
                            <button
                              onClick={() => onChordDelete?.(appliedChord.id)}
                              className="delete-chord-button"
                              title={`Remove ${appliedChord.displayName}`}
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Show message if nothing applied */}
                {appliedScales.length === 0 && appliedChords.length === 0 && (
                  <div className="control-section">
                    <div className="empty-list-message">No scales or chords applied</div>
                  </div>
                )}
              </>
            ) : (
              <>
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

                {instrument === 'keyboard' && availableOctaves.length > 0 && (
                  <div className="control-section">
                    <label className="control-label">Position</label>
                    <select
                      value={selectedScaleOctave}
                      onChange={(e) => setSelectedScaleOctave(parseInt(e.target.value))}
                      className={`control-select ${!isScaleMode ? 'chord-mode' : ''}`}
                    >
                      {availableOctaves.map((octave) => (
                        <option key={octave} value={octave}>
                          Octave {octave}
                        </option>
                      ))}
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
                <div className="control-section">
                  <label className="control-label">Applied Scales</label>
                  <div className="applied-scales-list">
                    {appliedScales.length > 0 ? (
                      appliedScales.map((appliedScale) => (
                        <div key={appliedScale.id} className="applied-scale-item">
                          <span className="scale-name">{appliedScale.displayName}</span>
                          <button
                            onClick={() => onScaleDelete?.(appliedScale.id)}
                            className="delete-scale-button"
                            title={`Remove ${appliedScale.displayName}`}
                          >
                            ×
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="empty-list-message">Empty</div>
                    )}
                  </div>
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
                    className={`control-select ${!isScaleMode ? 'chord-mode' : ''}`}
                  >
                    {(instrument === 'guitar' ? GUITAR_CHORDS : instrument === 'bass' ? BASS_CHORDS : KEYBOARD_CHORDS).map(chord => (
                      <option key={chord.name} value={chord.name}>{chord.name}</option>
                    ))}
                  </select>
                </div>

                {instrument === 'guitar' && availableShapes.length > 0 && (
                  <div className="control-section">
                    <label className="control-label">Position</label>
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
                    <label className="control-label">Position</label>
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

                {instrument === 'keyboard' && availableOctaves.length > 0 && (
                  <div className="control-section">
                    <label className="control-label">Position</label>
                    <select
                      value={selectedChordOctave}
                      onChange={(e) => setSelectedChordOctave(parseInt(e.target.value))}
                      className={`control-select ${!isScaleMode ? 'chord-mode' : ''}`}
                    >
                      {availableOctaves.map((octave) => (
                        <option key={octave} value={octave}>
                          Octave {octave}
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
                <div className="control-section">
                  <label className="control-label">Applied Chords</label>
                  <div className="applied-chords-list">
                    {appliedChords.length > 0 ? (
                      appliedChords.map((appliedChord) => (
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
                      ))
                    ) : (
                      <div className="empty-list-message">Empty</div>
                    )}
                  </div>
                </div>
              </>
            )}
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
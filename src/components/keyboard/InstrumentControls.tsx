import React, { useState, useEffect, useRef, useCallback } from 'react'
import '../../styles/Controls.css'
import { GUITAR_SCALES, ROOT_NOTES, getScaleBoxes, type GuitarScale, type ScaleBox } from '../../utils/guitarScales'
import { guitarNotes } from '../../utils/guitarNotes'
import { KEYBOARD_SCALES, type KeyboardScale } from '../../utils/keyboardScales'
import NotesToggle from '../common/NotesToggle'

export type KeyboardSelectionMode = 'range' | 'multi'

interface InstrumentControlsProps {
  bpm: number
  setBpm: (bpm: number) => void
  numberOfNotes: number
  setNumberOfNotes: (count: number) => void
  instrument: string
  setInstrument: (instrument: string) => void
  clearSelection: () => void
  hasSelectedNotes: boolean
  onScaleSelect?: (rootNote: string, scale: GuitarScale) => void
  onScaleBoxSelect?: (scaleBox: ScaleBox) => void
  onClearScale?: () => void
  lowerOctaves?: number
  higherOctaves?: number
  onAddLowerOctave?: () => void
  onRemoveLowerOctave?: () => void
  onAddHigherOctave?: () => void
  onRemoveHigherOctave?: () => void
  keyboardSelectionMode?: KeyboardSelectionMode
  onKeyboardSelectionModeChange?: (mode: KeyboardSelectionMode) => void
  onKeyboardScaleApply?: (rootNote: string, scale: KeyboardScale) => void
  onKeyboardScaleClear?: () => void
  flashingInputs: { bpm: boolean; notes: boolean; mode: boolean }
  triggerInputFlash: (inputType: 'bpm' | 'notes' | 'mode') => void
  setInputActive: (inputType: 'bpm' | 'notes' | 'mode', active: boolean) => void
  selectedNotesCount?: number
  onGenerateMelody?: () => void
  onPlayMelody?: () => void
  isPlaying?: boolean
  hasGeneratedMelody?: boolean
  showNotes?: boolean
  onToggleNotes?: () => void
  playbackProgress?: number
  melodyDuration?: number
  onProgressChange?: (progress: number) => void
}

const InstrumentControls: React.FC<InstrumentControlsProps> = ({
  bpm,
  setBpm,
  numberOfNotes,
  setNumberOfNotes,
  instrument,
  setInstrument,
  clearSelection,
  hasSelectedNotes,
  onScaleSelect,
  onScaleBoxSelect,
  onClearScale,
  lowerOctaves = 0,
  higherOctaves = 0,
  onAddLowerOctave,
  onRemoveLowerOctave,
  onAddHigherOctave,
  onRemoveHigherOctave,
  keyboardSelectionMode = 'range',
  onKeyboardSelectionModeChange,
  onKeyboardScaleApply,
  onKeyboardScaleClear,
  flashingInputs,
  triggerInputFlash,
  setInputActive,
  selectedNotesCount = 0,
  onGenerateMelody,
  onPlayMelody,
  isPlaying = false,
  hasGeneratedMelody = false,
  showNotes = false,
  onToggleNotes,
  playbackProgress = 0,
  melodyDuration = 0,
  onProgressChange
}) => {
  const [bpmDisplay, setBpmDisplay] = useState(bpm.toString())
  const [notesDisplay, setNotesDisplay] = useState(numberOfNotes.toString())
  const [selectedRoot, setSelectedRoot] = useState<string>('C')
  const [selectedScale, setSelectedScale] = useState<GuitarScale>(GUITAR_SCALES[0])
  const [hasActiveScale, setHasActiveScale] = useState<boolean>(false)
  const [keyboardSelectedRoot, setKeyboardSelectedRoot] = useState<string>('C')
  const [keyboardSelectedScale, setKeyboardSelectedScale] = useState<KeyboardScale>(KEYBOARD_SCALES[0])
  const [hasActiveKeyboardScale, setHasActiveKeyboardScale] = useState<boolean>(false)
  const [showPositions, setShowPositions] = useState<boolean>(true)
  const [availableBoxes, setAvailableBoxes] = useState<ScaleBox[]>([])
  const [selectedBoxIndex, setSelectedBoxIndex] = useState<number>(0)
  const [isDragging, setIsDragging] = useState<boolean>(false)

  // Original default values
  const DEFAULT_BPM = 120
  const DEFAULT_NOTES = 5
  
  // Refs for hold-down functionality
  const bpmIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const notesIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isHoldingBpm = useRef<boolean>(false)
  const isHoldingNotes = useRef<boolean>(false)
  
  // Update display values when props change
  useEffect(() => {
    setBpmDisplay(bpm.toString())
  }, [bpm])
  
  useEffect(() => {
    setNotesDisplay(numberOfNotes.toString())
  }, [numberOfNotes])
  
  const handleBpmChange = (value: string) => {
    // Only allow numbers and empty string
    let numericValue = value.replace(/[^0-9]/g, '')
    // Remove leading zeros but keep single zero
    if (numericValue.length > 1) {
      numericValue = numericValue.replace(/^0+/, '') || '0'
    }
    // Limit to max 999
    if (numericValue !== '' && Number(numericValue) > 999) {
      numericValue = '999'
    }
    setBpmDisplay(numericValue)
    // Don't update actual value while typing - only on blur/enter
  }
  
  const handleNotesChange = (value: string) => {
    // Only allow numbers and empty string
    let numericValue = value.replace(/[^0-9]/g, '')
    // Remove leading zeros but keep single zero
    if (numericValue.length > 1) {
      numericValue = numericValue.replace(/^0+/, '') || '0'
    }
    // Limit to max 999
    if (numericValue !== '' && Number(numericValue) > 999) {
      numericValue = '999'
    }
    setNotesDisplay(numericValue)
    // Don't update actual value while typing - only on blur/enter
  }
  
  const handleBpmKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (bpmDisplay === '') {
        setBpm(DEFAULT_BPM)
        setBpmDisplay(DEFAULT_BPM.toString())
      } else if (!isNaN(Number(bpmDisplay))) {
        setBpm(Number(bpmDisplay))
      }
      // Exit the input field
      e.currentTarget.blur()
    }
  }
  
  const handleNotesKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (notesDisplay === '') {
        setNumberOfNotes(DEFAULT_NOTES)
        setNotesDisplay(DEFAULT_NOTES.toString())
      } else if (!isNaN(Number(notesDisplay))) {
        setNumberOfNotes(Number(notesDisplay))
      }
      // Exit the input field
      e.currentTarget.blur()
    }
  }
  
  const handleBpmBlur = () => {
    if (bpmDisplay !== '' && !isNaN(Number(bpmDisplay))) {
      setBpm(Number(bpmDisplay))
    } else {
      setBpmDisplay(bpm.toString())
    }
  }
  
  const handleNotesBlur = () => {
    if (notesDisplay !== '' && !isNaN(Number(notesDisplay))) {
      setNumberOfNotes(Number(notesDisplay))
    } else {
      setNotesDisplay(numberOfNotes.toString())
    }
  }


  // Hold-down functionality
  const startBpmIncrement = () => {
    isHoldingBpm.current = true
    setInputActive('bpm', true) // Set to green immediately

    const increment = () => {
      setBpm(prevBpm => {
        const newBpm = Math.min(prevBpm + 1, 999)
        setBpmDisplay(newBpm.toString())
        return newBpm
      })
    }

    increment() // First increment immediately
    if (bpmIntervalRef.current) clearInterval(bpmIntervalRef.current)
    bpmIntervalRef.current = setInterval(increment, 200)
  }

  const startBpmDecrement = () => {
    isHoldingBpm.current = true
    setInputActive('bpm', true) // Set to green immediately

    const decrement = () => {
      setBpm(prevBpm => {
        const newBpm = Math.max(prevBpm - 1, 1)
        setBpmDisplay(newBpm.toString())
        return newBpm
      })
    }

    decrement() // First decrement immediately
    if (bpmIntervalRef.current) clearInterval(bpmIntervalRef.current)
    bpmIntervalRef.current = setInterval(decrement, 200)
  }

  const startNotesIncrement = () => {
    isHoldingNotes.current = true
    setInputActive('notes', true) // Set to green immediately

    const increment = () => {
      setNumberOfNotes(prevNotes => {
        const newNotes = Math.min(prevNotes + 1, 999)
        setNotesDisplay(newNotes.toString())
        return newNotes
      })
    }

    increment() // First increment immediately
    if (notesIntervalRef.current) clearInterval(notesIntervalRef.current)
    notesIntervalRef.current = setInterval(increment, 200)
  }

  const startNotesDecrement = () => {
    isHoldingNotes.current = true
    setInputActive('notes', true) // Set to green immediately

    const decrement = () => {
      setNumberOfNotes(prevNotes => {
        const newNotes = Math.max(prevNotes - 1, 1)
        setNotesDisplay(newNotes.toString())
        return newNotes
      })
    }

    decrement() // First decrement immediately
    if (notesIntervalRef.current) clearInterval(notesIntervalRef.current)
    notesIntervalRef.current = setInterval(decrement, 200)
  }

  const stopBpmInterval = () => {
    isHoldingBpm.current = false
    if (bpmIntervalRef.current) {
      clearInterval(bpmIntervalRef.current)
      bpmIntervalRef.current = null
    }
    // Turn off green immediately
    setInputActive('bpm', false)
  }

  const stopNotesInterval = () => {
    isHoldingNotes.current = false
    if (notesIntervalRef.current) {
      clearInterval(notesIntervalRef.current)
      notesIntervalRef.current = null
    }
    // Turn off green immediately
    setInputActive('notes', false)
  }


  // Update available boxes when root or scale changes
  useEffect(() => {
    const boxes = getScaleBoxes(selectedRoot, selectedScale, guitarNotes)
    setAvailableBoxes(boxes)
    setSelectedBoxIndex(0)
  }, [selectedRoot, selectedScale])

  // Scale control handlers
  const handleRootChange = (rootNote: string) => {
    setSelectedRoot(rootNote)
  }

  const handleScaleChange = (scale: GuitarScale) => {
    setSelectedScale(scale)
  }

  const handleBoxChange = (boxIndex: number) => {
    setSelectedBoxIndex(boxIndex)
    // If "Entire Fretboard" is selected (index equals availableBoxes.length), use full scale
    if (boxIndex >= availableBoxes.length) {
      setShowPositions(false)
    } else {
      setShowPositions(true)
    }
  }


  const handleApplyScale = () => {
    if (showPositions && availableBoxes.length > 0 && onScaleBoxSelect) {
      onScaleBoxSelect(availableBoxes[selectedBoxIndex])
      setHasActiveScale(true)
    } else if (onScaleSelect) {
      onScaleSelect(selectedRoot, selectedScale)
      setHasActiveScale(true)
    }
  }

  const handleClearScale = () => {
    if (onClearScale) {
      onClearScale()
      setHasActiveScale(false)
    }
  }

  // Keyboard scale handlers
  const handleKeyboardRootChange = (rootNote: string) => {
    setKeyboardSelectedRoot(rootNote)
  }

  const handleKeyboardScaleChange = (scale: KeyboardScale) => {
    setKeyboardSelectedScale(scale)
  }

  const handleApplyKeyboardScale = () => {
    if (onKeyboardScaleApply) {
      onKeyboardScaleApply(keyboardSelectedRoot, keyboardSelectedScale)
      setHasActiveKeyboardScale(true)
    }
  }

  const handleClearKeyboardScale = () => {
    if (onKeyboardScaleClear) {
      onKeyboardScaleClear()
      setHasActiveKeyboardScale(false)
    }
  }

  // Remove auto-reapplication - user must click Apply button

  // Progress bar drag handling
  const handleProgressBarClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!onProgressChange || melodyDuration === 0) return

    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const percentage = Math.max(0, Math.min(1, clickX / rect.width))
    const newProgress = percentage * melodyDuration

    onProgressChange(newProgress)
  }, [onProgressChange, melodyDuration])

  const handleProgressBarMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!onProgressChange || melodyDuration === 0) return

    setIsDragging(true)
    handleProgressBarClick(e)
  }, [onProgressChange, melodyDuration, handleProgressBarClick])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !onProgressChange || melodyDuration === 0) return

      const progressBar = document.querySelector('.progress-bar-background') as HTMLElement
      if (!progressBar) return

      const rect = progressBar.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const percentage = Math.max(0, Math.min(1, mouseX / rect.width))
      const newProgress = percentage * melodyDuration

      onProgressChange(newProgress)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, onProgressChange, melodyDuration])

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      stopBpmInterval()
      stopNotesInterval()
    }
  }, [])

  // Determine if melody can be generated based on instrument and selection mode
  const canGenerateMelody = instrument === 'keyboard'
    ? (keyboardSelectionMode === 'range'
        ? selectedNotesCount === 2  // Range mode needs exactly 2 notes
        : selectedNotesCount > 0)   // Multi mode needs at least 1 note
    : selectedNotesCount > 0        // Guitar/Bass needs at least 1 note
  return (
    <div className={`instrument-controls ${instrument === 'guitar' || instrument === 'bass' ? 'guitar-mode' : ''}`}>
      {/* Top row: Instrument selector */}
      <div className="control-group">
        <label className="control-label">Instrument</label>
        <select
          value={instrument}
          onChange={(e) => setInstrument(e.target.value)}
          className={`control-input instrument-select-${instrument}`}
        >
          <option value="keyboard">Keyboard</option>
          <option value="guitar">Guitar</option>
          <option value="bass">Bass</option>
        </select>
      </div>

      {/* Second row: Octave range (keyboard only) */}
      {instrument === 'keyboard' && (
        <div className="control-group octave-range-control">
          <label className="control-label">Octave Range</label>
          <div className="octave-range-slider">
            <div className="range-labels-center">
              <span className="range-label-center">
                {Math.max(1, 4 - lowerOctaves)} - {Math.min(8, 5 + higherOctaves)}
              </span>
            </div>
            <div className="dual-range-container">
              <div
                className="range-fill"
                style={{
                  left: `${((Math.max(1, 4 - lowerOctaves) - 1) / 7) * 100}%`,
                  right: `${(1 - (Math.min(8, 5 + higherOctaves) - 1) / 7) * 100}%`
                }}
              />
              <input
                type="range"
                min="1"
                max="8"
                value={Math.max(1, 4 - lowerOctaves)}
                onChange={(e) => {
                  const newLowOctave = parseInt(e.target.value)
                  const currentHighOctave = Math.min(8, 5 + higherOctaves)

                  // Prevent low octave from going higher than high octave
                  if (newLowOctave > currentHighOctave) return

                  const currentLowOctave = Math.max(1, 4 - lowerOctaves)
                  const targetLowerOctaves = 4 - newLowOctave

                  if (targetLowerOctaves !== lowerOctaves) {
                    if (targetLowerOctaves > lowerOctaves) {
                      for (let i = 0; i < targetLowerOctaves - lowerOctaves; i++) {
                        onAddLowerOctave && onAddLowerOctave()
                      }
                    } else if (targetLowerOctaves < lowerOctaves) {
                      for (let i = 0; i < lowerOctaves - targetLowerOctaves; i++) {
                        onRemoveLowerOctave && onRemoveLowerOctave()
                      }
                    }
                  }
                }}
                className="range-slider range-low"
                title="Set lowest octave"
              />
              <input
                type="range"
                min="1"
                max="8"
                value={Math.min(8, 5 + higherOctaves)}
                onChange={(e) => {
                  const newHighOctave = parseInt(e.target.value)
                  const currentLowOctave = Math.max(1, 4 - lowerOctaves)

                  // Prevent high octave from going lower than low octave
                  if (newHighOctave < currentLowOctave) return

                  const targetHigherOctaves = newHighOctave - 5
                  if (onAddHigherOctave && onRemoveHigherOctave) {
                    if (targetHigherOctaves > higherOctaves) {
                      for (let i = 0; i < targetHigherOctaves - higherOctaves; i++) {
                        onAddHigherOctave()
                      }
                    } else if (targetHigherOctaves < higherOctaves) {
                      for (let i = 0; i < higherOctaves - targetHigherOctaves; i++) {
                        onRemoveHigherOctave()
                      }
                    }
                  }
                }}
                className="range-slider range-high"
                title="Set highest octave"
              />
            </div>
            <div className="octave-visual">
              {Array.from({ length: 8 }, (_, i) => {
                const octaveNumber = i + 1
                const currentLowOctave = Math.max(1, 4 - lowerOctaves)
                const currentHighOctave = Math.min(8, 5 + higherOctaves)
                const isSelected = octaveNumber >= currentLowOctave && octaveNumber <= currentHighOctave

                return (
                  <div
                    key={octaveNumber}
                    className={`octave-mini ${isSelected ? 'highlight' : 'dim'}`}
                  >
                    <img
                      src="https://openclipart.org/download/304838/1533631532.svg"
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



      {/* Play, Generate Melody, BPM, Notes - Combined row */}
      <div className="control-group bpm-notes-melody-row">
        <div className="melody-controls-top">
          <button
            onClick={onPlayMelody}
            disabled={!hasGeneratedMelody}
            className={`control-subgroup control-button play-melody ${isPlaying ? 'playing' : ''} ${!hasGeneratedMelody ? 'disabled' : ''}`}
            title={!hasGeneratedMelody ? 'Generate a melody first' : (isPlaying ? 'Stop playing melody' : 'Play generated melody')}
          >
            <div className="play-icon">
              {isPlaying ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16" rx="2"/>
                  <rect x="14" y="4" width="4" height="16" rx="2"/>
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              )}
            </div>
          </button>

          <button
            onClick={onGenerateMelody}
            disabled={!canGenerateMelody}
            className="control-subgroup control-button generate-melody"
            title="Generate a melody from selected notes"
          >
            Generate Melody
          </button>

          <div className="control-subgroup">
            <label className="control-label">BPM</label>
            <div className="input-with-buttons">
              <input
                type="text"
                value={bpmDisplay}
                onChange={(e) => handleBpmChange(e.target.value)}
                onKeyPress={handleBpmKeyPress}
                onBlur={handleBpmBlur}
                className={`control-input with-internal-buttons ${flashingInputs.bpm ? 'flashing' : ''}`}
              />
              <button
                className="control-button-internal minus"
                onMouseDown={(e) => {
                  e.preventDefault();
                  startBpmDecrement();
                }}
                onMouseUp={(e) => {
                  e.preventDefault();
                  stopBpmInterval();
                }}
                onTouchStart={(e) => {
                  e.preventDefault();
                  startBpmDecrement();
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  stopBpmInterval();
                }}
                style={{ userSelect: 'none', touchAction: 'none' }}
              >
                −
              </button>
              <button
                className="control-button-internal plus"
                onMouseDown={(e) => {
                  e.preventDefault();
                  startBpmIncrement();
                }}
                onMouseUp={(e) => {
                  e.preventDefault();
                  stopBpmInterval();
                }}
                onTouchStart={(e) => {
                  e.preventDefault();
                  startBpmIncrement();
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  stopBpmInterval();
                }}
                style={{ userSelect: 'none', touchAction: 'none' }}
              >
                +
              </button>
            </div>
          </div>

          <div className="control-subgroup">
            <label className="control-label">Notes</label>
            <div className="input-with-buttons">
              <input
                type="text"
                value={notesDisplay}
                onChange={(e) => handleNotesChange(e.target.value)}
                onKeyPress={handleNotesKeyPress}
                onBlur={handleNotesBlur}
                className={`control-input with-internal-buttons ${flashingInputs.notes ? 'flashing' : ''}`}
              />
              <button
                className="control-button-internal minus"
                onMouseDown={(e) => {
                  e.preventDefault();
                  startNotesDecrement();
                }}
                onMouseUp={(e) => {
                  e.preventDefault();
                  stopNotesInterval();
                }}
                onTouchStart={(e) => {
                  e.preventDefault();
                  stopNotesInterval();
                }}
                onTouchStart={(e) => {
                  e.preventDefault();
                  startNotesDecrement();
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  stopNotesInterval();
                }}
                style={{ userSelect: 'none', touchAction: 'none' }}
              >
                −
              </button>
              <button
                className="control-button-internal plus"
                onMouseDown={(e) => {
                  e.preventDefault();
                  startNotesIncrement();
                }}
                onMouseUp={(e) => {
                  e.preventDefault();
                  stopNotesInterval();
                }}
                onTouchStart={(e) => {
                  e.preventDefault();
                  startNotesIncrement();
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  stopNotesInterval();
                }}
                style={{ userSelect: 'none', touchAction: 'none' }}
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className={`progress-bar-container ${!hasGeneratedMelody ? 'disabled' : ''}`}>
          <div
            className="progress-bar-background"
            onClick={hasGeneratedMelody ? handleProgressBarClick : undefined}
            onMouseDown={hasGeneratedMelody ? handleProgressBarMouseDown : undefined}
            style={{ cursor: hasGeneratedMelody ? 'pointer' : 'not-allowed' }}
          >
            <div
              className="progress-bar-fill"
              style={{
                width: hasGeneratedMelody && melodyDuration > 0
                  ? `${Math.min((playbackProgress / melodyDuration) * 100, 100)}%`
                  : '0%'
              }}
            />
            <div
              className="progress-bar-head"
              style={{
                left: hasGeneratedMelody && melodyDuration > 0
                  ? `${Math.min((playbackProgress / melodyDuration) * 100, 100)}%`
                  : '0%'
              }}
            />
          </div>
          <div className="progress-time-info">
            <span className="progress-current">
              {hasGeneratedMelody ? (playbackProgress / 1000).toFixed(2) : '0.00'}s
            </span>
            <span className="progress-total">
              {hasGeneratedMelody ? (melodyDuration / 1000).toFixed(2) : '0.00'}s
            </span>
          </div>
        </div>
      </div>

    </div>
  )
}

export default InstrumentControls
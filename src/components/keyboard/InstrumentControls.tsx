import React, { useState, useEffect, useRef, useCallback } from 'react'
import '../../styles/Controls.css'
import { GUITAR_SCALES, ROOT_NOTES, getScaleBoxes, type GuitarScale, type ScaleBox } from '../../utils/guitarScales'
import { guitarNotes } from '../../utils/guitarNotes'
import { KEYBOARD_SCALES, type KeyboardScale } from '../../utils/keyboardScales'
import NotesToggle from '../common/NotesToggle'
import type { Note } from '../../utils/notes'
import MelodyDisplay from '../MelodyDisplay'
import CustomAudioPlayer from '../common/CustomAudioPlayer'
import '../../styles/CustomAudioPlayer.css'

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
  onRecordMelody?: () => Promise<Blob | null>
  isPlaying?: boolean
  isRecording?: boolean
  hasGeneratedMelody?: boolean
  showNotes?: boolean
  onToggleNotes?: () => void
  playbackProgress?: number
  melodyDuration?: number
  onProgressChange?: (progress: number) => void
  onClearRecordedAudio?: () => void
  recordedAudioBlob?: Blob | null
  generatedMelody?: Note[]
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
  onRecordMelody,
  isPlaying = false,
  isRecording = false,
  hasGeneratedMelody = false,
  showNotes = false,
  onToggleNotes,
  playbackProgress = 0,
  melodyDuration = 0,
  onProgressChange,
  onClearRecordedAudio,
  recordedAudioBlob,
  generatedMelody
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
  const [audioFileBlob, setAudioFileBlob] = useState<Blob | null>(null)
  const [audioFileUrl, setAudioFileUrl] = useState<string | null>(null)
  const [isInstrumentDropdownOpen, setIsInstrumentDropdownOpen] = useState<boolean>(false)

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
        // Ensure prevBpm is a valid number
        const safePrevBpm = isNaN(prevBpm) ? 120 : prevBpm
        const newBpm = Math.min(safePrevBpm + 1, 200)
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
        // Ensure prevBpm is a valid number
        const safePrevBpm = isNaN(prevBpm) ? 120 : prevBpm
        const newBpm = Math.max(safePrevBpm - 1, 60)
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
        // Ensure prevNotes is a valid number
        const safePrevNotes = isNaN(prevNotes) ? 5 : prevNotes
        const newNotes = Math.min(safePrevNotes + 1, 16)
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
        // Ensure prevNotes is a valid number
        const safePrevNotes = isNaN(prevNotes) ? 5 : prevNotes
        const newNotes = Math.max(safePrevNotes - 1, 4)
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
      if (!isDragging) return

      const progressBar = document.querySelector('.progress-bar-background') as HTMLElement
      if (!progressBar) return

      const rect = progressBar.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const percentage = Math.max(0, Math.min(1, mouseX / rect.width))

      if (onProgressChange && melodyDuration > 0) {
        const newProgress = percentage * melodyDuration
        onProgressChange(newProgress)
      }
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

  // Recording handlers
  const handleRecordForPlayback = async () => {
    if (!onRecordMelody) return

    try {
      const audioBlob = await onRecordMelody()
      if (audioBlob) {
        // Create URL for HTML audio element (no download)
        const url = URL.createObjectURL(audioBlob)
        setAudioFileBlob(audioBlob)
        setAudioFileUrl(url)
      }
    } catch (error) {
      console.error('Failed to record melody:', error)
    }
  }


  // Handle auto-recorded audio from parent
  React.useEffect(() => {
    if (recordedAudioBlob) {
      // Clean up previous URL
      if (audioFileUrl) {
        URL.revokeObjectURL(audioFileUrl)
      }

      // Create new URL for the recorded audio
      const url = URL.createObjectURL(recordedAudioBlob)
      setAudioFileBlob(recordedAudioBlob)
      setAudioFileUrl(url)
    }
  }, [recordedAudioBlob])

  // Cleanup audio URL when component unmounts or audio changes
  React.useEffect(() => {
    return () => {
      if (audioFileUrl) {
        URL.revokeObjectURL(audioFileUrl)
      }
    }
  }, [audioFileUrl])

  // Determine if melody can be generated based on instrument and selection mode
  const canGenerateMelody = instrument === 'keyboard'
    ? (keyboardSelectionMode === 'range'
        ? selectedNotesCount === 2  // Range mode needs exactly 2 notes
        : selectedNotesCount > 0)   // Multi mode needs at least 1 note
    : selectedNotesCount > 0        // Guitar/Bass needs at least 1 note
  return (
    <div className={`instrument-controls ${instrument === 'guitar' || instrument === 'bass' ? 'guitar-mode' : ''}`}>
      {/* Top row: Instrument selector */}
      <div className="control-group instrument-selector-group">
        {/* Desktop/Tablet view - Cards */}
        <div className="instrument-selector desktop-selector">
          <div
            className={`instrument-card ${instrument === 'keyboard' ? 'active' : ''}`}
            onClick={() => {
              // Clear recorded audio when switching instruments
              if (audioFileUrl) {
                URL.revokeObjectURL(audioFileUrl)
                setAudioFileUrl(null)
              }
              setAudioFileBlob(null)
              if (onClearRecordedAudio) {
                onClearRecordedAudio()
              }
              setInstrument('keyboard')
            }}
          >
            <div className="instrument-icon">🎹</div>
            <div className="instrument-name">Keyboard</div>
            <div className="instrument-glow"></div>
          </div>
          <div
            className={`instrument-card ${instrument === 'guitar' ? 'active' : ''}`}
            onClick={() => {
              // Clear recorded audio when switching instruments
              if (audioFileUrl) {
                URL.revokeObjectURL(audioFileUrl)
                setAudioFileUrl(null)
              }
              setAudioFileBlob(null)
              if (onClearRecordedAudio) {
                onClearRecordedAudio()
              }
              setInstrument('guitar')
            }}
          >
            <div className="instrument-icon">🎸</div>
            <div className="instrument-name">Guitar</div>
            <div className="instrument-glow"></div>
          </div>
          <div
            className={`instrument-card ${instrument === 'bass' ? 'active' : ''}`}
            onClick={() => {
              // Clear recorded audio when switching instruments
              if (audioFileUrl) {
                URL.revokeObjectURL(audioFileUrl)
                setAudioFileUrl(null)
              }
              setAudioFileBlob(null)
              if (onClearRecordedAudio) {
                onClearRecordedAudio()
              }
              setInstrument('bass')
            }}
          >
            <div className="instrument-icon">🎸</div>
            <div className="instrument-name">Bass</div>
            <div className="instrument-glow"></div>
          </div>
        </div>

        {/* Mobile view - Dropdown */}
        <div className="instrument-selector mobile-selector">
          <div
            className={`instrument-dropdown ${isInstrumentDropdownOpen ? 'open' : ''} ${instrument}-active`}
            onClick={() => setIsInstrumentDropdownOpen(!isInstrumentDropdownOpen)}
          >
            <div className="current-instrument">
              <div className="instrument-icon">
                {instrument === 'keyboard' && '🎹'}
                {instrument === 'guitar' && '🎸'}
                {instrument === 'bass' && '🎸'}
              </div>
              <div className="instrument-name">
                {instrument === 'keyboard' && 'Keyboard'}
                {instrument === 'guitar' && 'Guitar'}
                {instrument === 'bass' && 'Bass'}
              </div>
              <div className={`dropdown-arrow ${isInstrumentDropdownOpen ? 'rotated' : ''}`}>▼</div>
            </div>
            {isInstrumentDropdownOpen && (
              <div className="dropdown-options">
                {instrument !== 'keyboard' && (
                  <div
                    className="dropdown-option keyboard-option"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Clear recorded audio when switching instruments
                      if (audioFileUrl) {
                        URL.revokeObjectURL(audioFileUrl)
                        setAudioFileUrl(null)
                      }
                      setAudioFileBlob(null)
                      if (onClearRecordedAudio) {
                        onClearRecordedAudio()
                      }
                      setInstrument('keyboard');
                      setIsInstrumentDropdownOpen(false);
                    }}
                  >
                    <div className="instrument-icon">🎹</div>
                    <div className="instrument-name">Keyboard</div>
                  </div>
                )}
                {instrument !== 'guitar' && (
                  <div
                    className="dropdown-option guitar-option"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Clear recorded audio when switching instruments
                      if (audioFileUrl) {
                        URL.revokeObjectURL(audioFileUrl)
                        setAudioFileUrl(null)
                      }
                      setAudioFileBlob(null)
                      if (onClearRecordedAudio) {
                        onClearRecordedAudio()
                      }
                      setInstrument('guitar');
                      setIsInstrumentDropdownOpen(false);
                    }}
                  >
                    <div className="instrument-icon">🎸</div>
                    <div className="instrument-name">Guitar</div>
                  </div>
                )}
                {instrument !== 'bass' && (
                  <div
                    className="dropdown-option bass-option"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Clear recorded audio when switching instruments
                      if (audioFileUrl) {
                        URL.revokeObjectURL(audioFileUrl)
                        setAudioFileUrl(null)
                      }
                      setAudioFileBlob(null)
                      if (onClearRecordedAudio) {
                        onClearRecordedAudio()
                      }
                      setInstrument('bass');
                      setIsInstrumentDropdownOpen(false);
                    }}
                  >
                    <div className="instrument-icon">🎸</div>
                    <div className="instrument-name">Bass</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
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



      {/* Generate Melody, BPM, Notes - Modern styled row */}
      <div className="control-group modern-controls-row">
        <div className="controls-container">
          <div className="modern-control-item">
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
                onClick={(e) => {
                  console.log('BPM - button clicked')
                  e.preventDefault();
                  e.stopPropagation();
                  // Single click decrement
                  setBpm(prevBpm => {
                    console.log('BPM - decrementing from:', prevBpm)
                    const safePrevBpm = isNaN(prevBpm) ? 120 : prevBpm
                    const newBpm = Math.max(safePrevBpm - 1, 60)
                    console.log('BPM - new value:', newBpm)
                    setBpmDisplay(newBpm.toString())
                    return newBpm
                  })
                }}
                style={{ userSelect: 'none', touchAction: 'none' }}
              >
                −
              </button>
              <button
                className="control-button-internal plus"
                onClick={(e) => {
                  console.log('BPM + button clicked')
                  e.preventDefault();
                  e.stopPropagation();
                  // Single click increment
                  setBpm(prevBpm => {
                    console.log('BPM + incrementing from:', prevBpm)
                    const safePrevBpm = isNaN(prevBpm) ? 120 : prevBpm
                    const newBpm = Math.min(safePrevBpm + 1, 200)
                    console.log('BPM + new value:', newBpm)
                    setBpmDisplay(newBpm.toString())
                    return newBpm
                  })
                }}
                style={{ userSelect: 'none', touchAction: 'none' }}
              >
                +
              </button>
            </div>
          </div>

          <div className="modern-control-item">
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
                onClick={(e) => {
                  console.log('Notes - button clicked')
                  e.preventDefault();
                  e.stopPropagation();
                  // Single click decrement
                  setNumberOfNotes(prevNotes => {
                    console.log('Notes - decrementing from:', prevNotes)
                    const safePrevNotes = isNaN(prevNotes) ? 5 : prevNotes
                    const newNotes = Math.max(safePrevNotes - 1, 4)
                    console.log('Notes - new value:', newNotes)
                    setNotesDisplay(newNotes.toString())
                    return newNotes
                  })
                }}
                style={{ userSelect: 'none', touchAction: 'none' }}
              >
                −
              </button>
              <button
                className="control-button-internal plus"
                onClick={(e) => {
                  console.log('Notes + button clicked')
                  e.preventDefault();
                  e.stopPropagation();
                  // Single click increment
                  setNumberOfNotes(prevNotes => {
                    console.log('Notes + incrementing from:', prevNotes)
                    const safePrevNotes = isNaN(prevNotes) ? 5 : prevNotes
                    const newNotes = Math.min(safePrevNotes + 1, 16)
                    console.log('Notes + new value:', newNotes)
                    setNotesDisplay(newNotes.toString())
                    return newNotes
                  })
                }}
                style={{ userSelect: 'none', touchAction: 'none' }}
              >
                +
              </button>
            </div>
          </div>

          <button
            onClick={() => {
              // Clear recorded audio when generating new melody
              if (audioFileUrl) {
                URL.revokeObjectURL(audioFileUrl)
                setAudioFileUrl(null)
              }
              setAudioFileBlob(null)
              if (onClearRecordedAudio) {
                onClearRecordedAudio()
              }
              if (onGenerateMelody) {
                onGenerateMelody()
              }
            }}
            disabled={!canGenerateMelody}
            className="modern-generate-button"
            title="Generate a melody from selected notes"
          >
            Generate Melody
          </button>

        </div>

        {/* Second row - Auto-recorded audio player */}
        {audioFileBlob && (
          <div className="controls-container second-row">
            <div className="modern-control-item audio-player-section centered">
              {audioFileUrl && (
                <CustomAudioPlayer
                  src={audioFileUrl}
                  preload="metadata"
                />
              )}
            </div>
          </div>
        )}

        {/* Third row - Expandable Reveal/Hide Notes Button */}
        {audioFileBlob && (
          <div className="controls-container third-row">
            <div className={`modern-notes-toggle-button ${showNotes ? 'expanded' : ''}`}>
              <button
                className="toggle-content"
                onClick={onToggleNotes}
                title={showNotes ? 'Hide notes' : 'Reveal notes'}
                aria-label={showNotes ? 'Hide notes' : 'Reveal notes'}
              >
                <NotesToggle showNotes={showNotes} onToggle={() => {}} />
              </button>

              {/* Expanded melody content */}
              {showNotes && generatedMelody && generatedMelody.length > 0 && (
                <div className="expanded-melody-content">
                  <div className="melody-title">Generated Melody:</div>
                  <div className="melody-notes">
                    {generatedMelody.map((note, index) => (
                      <span key={`${note.name}-${index}`} className="melody-note">
                        {note.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </div>


    </div>
  )
}

export default InstrumentControls
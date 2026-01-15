import React, { useState, useEffect, useRef, useCallback, memo, useMemo } from 'react'
import '../../../styles/Controls.css'
import '../../../styles/MelodyControls.css'
import { GUITAR_SCALES, ROOT_NOTES, getScaleBoxes, type GuitarScale, type ScaleBox } from '../../../utils/instruments/guitar/guitarScales'
import { guitarNotes } from '../../../utils/instruments/guitar/guitarNotes'
import { KEYBOARD_SCALES, type KeyboardScale } from '../../../utils/instruments/keyboard/keyboardScales'
import Tooltip from '../../common/Tooltip'
import type { Note } from '../../../utils/notes'
import type { ChordMode } from '../../../reducers/uiReducer'
import CustomAudioPlayer from '../../common/CustomAudioPlayer'
import '../../../styles/CustomAudioPlayer.css'
import { PiPianoKeysFill } from 'react-icons/pi'
import { GiGuitarBassHead, GiGuitarHead } from 'react-icons/gi'
import { IoMdArrowDropdown } from 'react-icons/io'
import { useIncrementDecrement } from '../../../hooks/useHoldButton'
import { sanitizeNumericInput } from '../../../utils/inputValidation'

interface InstrumentControlsProps {
  bpm: number
  setBpm: (bpm: number) => void
  numberOfBeats: number
  setNumberOfBeats: (count: number) => void
  chordMode?: ChordMode
  setChordMode?: (mode: ChordMode) => void
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
  onKeyboardScaleApply?: (rootNote: string, scale: KeyboardScale) => void
  onKeyboardScaleClear?: () => void
  flashingInputs: { bpm: boolean; beats: boolean; mode: boolean }
  triggerInputFlash: (inputType: 'bpm' | 'beats' | 'mode') => void
  setInputActive: (inputType: 'bpm' | 'beats' | 'mode', active: boolean) => void
  selectedNotesCount?: number
  appliedChordsCount?: number
  appliedScalesCount?: number
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
  hasChanges?: boolean
  isGeneratingMelody?: boolean
  isAutoRecording?: boolean
  onCurrentlyPlayingNoteChange?: (index: number | null) => void
  currentlyPlayingNoteIndex?: number | null
  hideInstrumentSelector?: boolean
  hideOctaveRange?: boolean
  disableOctaveRange?: boolean
  hideBpmButtons?: boolean
  hideBeatsButtons?: boolean
  hideGenerateButton?: boolean
  hideChordMode?: boolean
  disableBpmInput?: boolean
  disableBeatsInput?: boolean
  disableChordMode?: boolean
  autoPlayAudio?: boolean
  // Feedback props
  isListening?: boolean
  onStartFeedback?: () => void
  onStopFeedback?: () => void
  performanceState?: any
  volumeLevel?: number
}

const InstrumentControls = memo(function InstrumentControls({
  bpm,
  setBpm,
  numberOfBeats,
  setNumberOfBeats,
  chordMode = 'progression',
  setChordMode,
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
  onKeyboardScaleApply,
  onKeyboardScaleClear,
  flashingInputs,
  triggerInputFlash,
  setInputActive,
  selectedNotesCount = 0,
  appliedChordsCount = 0,
  appliedScalesCount = 0,
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
  generatedMelody,
  hasChanges = false,
  isGeneratingMelody = false,
  isAutoRecording = false,
  onCurrentlyPlayingNoteChange,
  currentlyPlayingNoteIndex,
  hideInstrumentSelector = false,
  hideOctaveRange = false,
  disableOctaveRange = false,
  hideBpmButtons = false,
  hideBeatsButtons = false,
  hideGenerateButton = false,
  hideChordMode = false,
  disableBpmInput = false,
  disableBeatsInput = false,
  disableChordMode = false,
  autoPlayAudio = false,
  isListening = false,
  onStartFeedback,
  onStopFeedback,
  performanceState,
  volumeLevel = 0
}: InstrumentControlsProps) {

  const [bpmDisplay, setBpmDisplay] = useState(bpm.toString())
  const [beatsDisplay, setBeatsDisplay] = useState(numberOfBeats.toString())
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
  const [isChordModeFlashing, setIsChordModeFlashing] = useState<boolean>(false)

  const audioPlayerRef = useRef<HTMLAudioElement>(null)

  // Original default values
  const DEFAULT_BPM = 120
  const DEFAULT_NOTES = 5
  
  // Refs for hold-down functionality
  const bpmIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const notesIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isHoldingBpm = useRef<boolean>(false)
  const isHoldingNotes = useRef<boolean>(false)
  const currentBpmRef = useRef<number>(bpm)
  const currentNotesRef = useRef<number>(numberOfBeats)
  
  // Update display values when props change
  useEffect(() => {
    setBpmDisplay(bpm.toString())
    currentBpmRef.current = bpm
  }, [bpm])

  useEffect(() => {
    setBeatsDisplay(numberOfBeats.toString())
    currentNotesRef.current = numberOfBeats
  }, [numberOfBeats])
  
  // Use centralized input validation
  const handleBpmChange = useCallback((value: string) => {
    setBpmDisplay(sanitizeNumericInput(value, { max: 999 }))
  }, [])

  const handleNotesChange = useCallback((value: string) => {
    setBeatsDisplay(sanitizeNumericInput(value, { max: 999 }))
  }, [])
  
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
      if (beatsDisplay === '') {
        setNumberOfBeats(DEFAULT_NOTES)
        setBeatsDisplay(DEFAULT_NOTES.toString())
      } else if (!isNaN(Number(beatsDisplay))) {
        setNumberOfBeats(Number(beatsDisplay))
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
    if (beatsDisplay !== '' && !isNaN(Number(beatsDisplay))) {
      setNumberOfBeats(Number(beatsDisplay))
    } else {
      setBeatsDisplay(numberOfBeats.toString())
    }
  }


  // Hold-down functionality
  const startBpmIncrement = () => {
    isHoldingBpm.current = true
    setInputActive('bpm', true) // Set to green immediately
    triggerInputFlash('bpm') // Flash the input border green

    // First increment immediately
    const newBpm = Math.min(currentBpmRef.current + 1, 999)
    currentBpmRef.current = newBpm
    setBpm(newBpm)
    setBpmDisplay(newBpm.toString())

    if (bpmIntervalRef.current) clearInterval(bpmIntervalRef.current)
    bpmIntervalRef.current = setInterval(() => {
      const newBpm = Math.min(currentBpmRef.current + 1, 999)
      currentBpmRef.current = newBpm
      setBpm(newBpm)
      setBpmDisplay(newBpm.toString())
    }, 200)
  }

  const startBpmDecrement = () => {
    isHoldingBpm.current = true
    setInputActive('bpm', true) // Set to green immediately
    triggerInputFlash('bpm') // Flash the input border green

    // First decrement immediately
    const newBpm = Math.max(currentBpmRef.current - 1, 1)
    currentBpmRef.current = newBpm
    setBpm(newBpm)
    setBpmDisplay(newBpm.toString())

    if (bpmIntervalRef.current) clearInterval(bpmIntervalRef.current)
    bpmIntervalRef.current = setInterval(() => {
      const newBpm = Math.max(currentBpmRef.current - 1, 1)
      currentBpmRef.current = newBpm
      setBpm(newBpm)
      setBpmDisplay(newBpm.toString())
    }, 200)
  }

  const startNotesIncrement = () => {
    isHoldingNotes.current = true
    setInputActive('beats', true) // Set to green immediately
    triggerInputFlash('beats') // Flash the input border green

    // First increment immediately
    const newNotes = Math.min(currentNotesRef.current + 1, 100)
    currentNotesRef.current = newNotes
    setNumberOfBeats(newNotes)
    setBeatsDisplay(newNotes.toString())

    if (notesIntervalRef.current) clearInterval(notesIntervalRef.current)
    notesIntervalRef.current = setInterval(() => {
      const newNotes = Math.min(currentNotesRef.current + 1, 100)
      currentNotesRef.current = newNotes
      setNumberOfBeats(newNotes)
      setBeatsDisplay(newNotes.toString())
    }, 200)
  }

  const startNotesDecrement = () => {
    isHoldingNotes.current = true
    setInputActive('beats', true) // Set to green immediately
    triggerInputFlash('beats') // Flash the input border green

    // First decrement immediately
    const newNotes = Math.max(currentNotesRef.current - 1, 1)
    currentNotesRef.current = newNotes
    setNumberOfBeats(newNotes)
    setBeatsDisplay(newNotes.toString())

    if (notesIntervalRef.current) clearInterval(notesIntervalRef.current)
    notesIntervalRef.current = setInterval(() => {
      const newNotes = Math.max(currentNotesRef.current - 1, 1)
      currentNotesRef.current = newNotes
      setNumberOfBeats(newNotes)
      setBeatsDisplay(newNotes.toString())
    }, 200)
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
    setInputActive('beats', false)
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

  // Determine if melody can be generated
  const canGenerateMelody = appliedChordsCount > 0 || // Can always generate with applied chords
    appliedScalesCount > 0 || // Can always generate with applied scales
    selectedNotesCount > 0    // Need at least 1 note selected
  return (
    <div className={`instrument-controls ${instrument === 'guitar' || instrument === 'bass' ? 'guitar-mode' : ''}`}>
      {/* Top row: Instrument selector */}
      {!hideInstrumentSelector && (
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
            <div className="instrument-icon"><PiPianoKeysFill /></div>
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
            <div className="instrument-icon"><GiGuitarHead /></div>
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
            <div className="instrument-icon"><GiGuitarBassHead /></div>
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
                {instrument === 'keyboard' && <PiPianoKeysFill />}
                {instrument === 'guitar' && <GiGuitarHead />}
                {instrument === 'bass' && <GiGuitarBassHead />}
              </div>
              <div className="instrument-name">
                {instrument === 'keyboard' && 'Keyboard'}
                {instrument === 'guitar' && 'Guitar'}
                {instrument === 'bass' && 'Bass'}
              </div>
              <div className={`dropdown-arrow ${isInstrumentDropdownOpen ? 'rotated' : ''}`}><IoMdArrowDropdown /></div>
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
                    <div className="instrument-icon"><PiPianoKeysFill /></div>
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
                    <div className="instrument-icon"><GiGuitarHead /></div>
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
                    <div className="instrument-icon"><GiGuitarBassHead /></div>
                    <div className="instrument-name">Bass</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      )}

      {/* Second row: Octave range (keyboard only) */}
      {!hideOctaveRange && instrument === 'keyboard' && (
        <div className="control-group octave-range-control">
          <div className="label-with-tooltip">
            <label className="control-label">Octave Range</label>
            <Tooltip title="Octave Range" text="Select which octaves are visible in the keyboard interface">
              <div className="tooltip-icon">?</div>
            </Tooltip>
          </div>
          <div className={`octave-range-slider${disableOctaveRange ? ' slider-hidden' : ''}`}>
            <div className="range-labels-center">
              <span className="range-label-center">
                {Math.max(1, 4 - lowerOctaves)} - {Math.min(8, 5 + higherOctaves)}
              </span>
            </div>
            {!disableOctaveRange && (
            <div className="dual-range-container">
              <div
                className="range-fill"
                style={{
                  left: `${((Math.max(1, 4 - lowerOctaves) - 1) / 8) * 100}%`,
                  right: `${((8 - Math.min(8, 5 + higherOctaves)) / 8) * 100}%`
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
            )}
            <div className="octave-visual">
              {(() => {
                const currentLowOctave = Math.max(1, 4 - lowerOctaves)
                const currentHighOctave = Math.min(8, 5 + higherOctaves)
                const leftDimPercent = ((currentLowOctave - 1) / 8) * 100
                const rightDimPercent = ((8 - currentHighOctave) / 8) * 100

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
      )}



      {/* Generate Melody, BPM, Notes - Modern styled row */}
      <div className="control-group modern-controls-row">
        <div className="controls-container">
          <div className="modern-control-item">
            <div className="label-with-tooltip">
              <label className="control-label">BPM</label>
              <Tooltip title="BPM" text="Specify the speed of the melody (BEATS PER MINUTE)">
                <div className="tooltip-icon">?</div>
              </Tooltip>
            </div>
            <div className="input-with-buttons">
              <input
                type="text"
                value={bpmDisplay}
                onChange={(e) => !disableBpmInput && handleBpmChange(e.target.value)}
                onKeyPress={(e) => !disableBpmInput && handleBpmKeyPress(e)}
                onBlur={(e) => !disableBpmInput && handleBpmBlur(e)}
                className={`control-input ${hideBpmButtons ? '' : 'with-internal-buttons'} ${flashingInputs.bpm ? 'flashing' : ''}`}
                disabled={disableBpmInput}
                readOnly={disableBpmInput}
              />
              {!hideBpmButtons && (
                <>
                  <button
                    className="control-button-internal minus"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      startBpmDecrement();
                    }}
                    onMouseUp={stopBpmInterval}
                    onMouseLeave={stopBpmInterval}
                    style={{ userSelect: 'none', touchAction: 'none' }}
                  >
                    −
                  </button>
                  <button
                    className="control-button-internal plus"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      startBpmIncrement();
                    }}
                    onMouseUp={stopBpmInterval}
                    onMouseLeave={stopBpmInterval}
                    style={{ userSelect: 'none', touchAction: 'none' }}
                  >
                    +
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="modern-control-item">
            <div className="label-with-tooltip">
              <label className="control-label">Beats</label>
              <Tooltip title="Beats" text="Specify the number of beats within the melody">
                <div className="tooltip-icon">?</div>
              </Tooltip>
            </div>
            <div className="input-with-buttons">
              <input
                type="text"
                value={beatsDisplay}
                onChange={(e) => !disableBeatsInput && handleNotesChange(e.target.value)}
                onKeyPress={(e) => !disableBeatsInput && handleNotesKeyPress(e)}
                onBlur={(e) => !disableBeatsInput && handleNotesBlur(e)}
                className={`control-input ${hideBeatsButtons ? '' : 'with-internal-buttons'} ${flashingInputs.beats ? 'flashing' : ''}`}
                disabled={disableBeatsInput}
                readOnly={disableBeatsInput}
              />
              {!hideBeatsButtons && (
                <>
                  <button
                    className="control-button-internal minus"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      startNotesDecrement();
                    }}
                    onMouseUp={stopNotesInterval}
                    onMouseLeave={stopNotesInterval}
                    style={{ userSelect: 'none', touchAction: 'none' }}
                  >
                    −
                  </button>
                  <button
                    className="control-button-internal plus"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      startNotesIncrement();
                    }}
                    onMouseUp={stopNotesInterval}
                    onMouseLeave={stopNotesInterval}
                    style={{ userSelect: 'none', touchAction: 'none' }}
                  >
                    +
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Chord Mode Select */}
          {setChordMode && !hideChordMode && (
            <div className="modern-control-item">
              <div className="label-with-tooltip">
                <label className="control-label">Chord Mode</label>
                <Tooltip
                  title="Chord Mode"
                  text="Select how chords should be used in the melody.
Arpeggiator - Use individual chord notes
Progression - Use entire chords"
                >
                  <div className="tooltip-icon">?</div>
                </Tooltip>
              </div>
              <div>
                {disableChordMode ? (
                  <div className="chord-mode-switch single-option">
                    <span className="switch-option active">
                      {chordMode === 'arpeggiator' ? 'Arpeggiator' : 'Progression'}
                    </span>
                  </div>
                ) : (
                  <div className={`chord-mode-switch ${isChordModeFlashing ? 'flashing' : ''} ${appliedChordsCount === 0 ? 'disabled' : ''}`}>
                    <button
                      className={`switch-option ${chordMode === 'progression' ? 'active' : ''}`}
                      onClick={() => {
                        if (appliedChordsCount > 0 && chordMode !== 'progression') {
                          setChordMode('progression')
                          setIsChordModeFlashing(true)
                          setTimeout(() => setIsChordModeFlashing(false), 500)
                        }
                      }}
                      title={appliedChordsCount === 0 ? "Apply chords to enable" : "Progression"}
                      disabled={appliedChordsCount === 0}
                    >
                      Progression
                    </button>
                    <button
                      className={`switch-option ${chordMode === 'arpeggiator' ? 'active' : ''}`}
                      onClick={() => {
                        if (appliedChordsCount > 0 && chordMode !== 'arpeggiator') {
                          setChordMode('arpeggiator')
                          setIsChordModeFlashing(true)
                          setTimeout(() => setIsChordModeFlashing(false), 500)
                        }
                      }}
                      title={appliedChordsCount === 0 ? "Apply chords to enable" : "Arpeggiator"}
                      disabled={appliedChordsCount === 0}
                    >
                      Arpeggiator
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {!hideGenerateButton && (
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
              className={`modern-generate-button ${hasChanges ? 'has-changes' : ''}`}
              title="Generate a melody from selected notes"
              style={{ position: 'relative' }}
            >
              Generate
              {hasChanges && <span className="change-badge">●</span>}
            </button>
          )}

        </div>

        {/* Second row - Auto-recorded audio player or generating indicator */}
        {(audioFileBlob || isGeneratingMelody || isAutoRecording) && (
          <div className="controls-container second-row">
            <div className="modern-control-item audio-player-section centered">
              {(isGeneratingMelody || isAutoRecording) ? (
                <div className="generating-indicator">
                  <div className="generating-spinner"></div>
                  <span className="generating-text">Generating melody...</span>
                </div>
              ) : (
                audioFileUrl && (
                  <CustomAudioPlayer
                    src={audioFileUrl}
                    preload="metadata"
                    bpm={bpm}
                    melodyLength={generatedMelody?.length || 0}
                    onNoteIndexChange={onCurrentlyPlayingNoteChange}
                    audioRef={audioPlayerRef}
                    autoPlayAudio={autoPlayAudio}
                    showNotes={showNotes}
                    onToggleNotes={onToggleNotes}
                    melody={generatedMelody}
                    currentlyPlayingNoteIndex={currentlyPlayingNoteIndex}
                    isListening={isListening}
                    onStartFeedback={onStartFeedback}
                    onStopFeedback={onStopFeedback}
                    performanceState={performanceState}
                    volumeLevel={volumeLevel}
                  />
                )
              )}
            </div>
          </div>
        )}

      </div>

    </div>
  )
})

export default InstrumentControls
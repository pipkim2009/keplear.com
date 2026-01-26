import React, { useState, useEffect, useRef, useCallback } from 'react'
import { IoMusicalNotes } from 'react-icons/io5'
import { PiTrashFill, PiEyeFill, PiSpeakerHighFill, PiStopFill } from 'react-icons/pi'
import { createPortal } from 'react-dom'
import { useTranslation } from '../../contexts/TranslationContext'
import { useAudio } from '../../hooks/useAudio'
import { ROOT_NOTES, GUITAR_SCALES, getScaleBoxes, applyScaleToGuitar, applyScaleBoxToGuitar, type GuitarScale, type ScaleBox } from '../../utils/instruments/guitar/guitarScales'
import { guitarNotes } from '../../utils/instruments/guitar/guitarNotes'
import { BASS_ROOT_NOTES, BASS_SCALES, getBassScaleBoxes, applyScaleToBass, applyScaleBoxToBass, type BassScale, type BassScaleBox } from '../../utils/instruments/bass/bassScales'
import { bassNotes } from '../../utils/instruments/bass/bassNotes'
import { KEYBOARD_SCALES, type KeyboardScale, applyScaleToKeyboard } from '../../utils/instruments/keyboard/keyboardScales'
import { CHORD_ROOT_NOTES, GUITAR_CHORDS, getChordShapes, getChordBoxes, applyChordToGuitar, applyChordBoxToGuitar, type GuitarChord, type ChordShape, type ChordBox } from '../../utils/instruments/guitar/guitarChords'
import { BASS_CHORD_ROOT_NOTES, BASS_CHORDS, getBassChordShapes, getBassChordBoxes, applyChordToBass, applyBassChordBoxToBass, type BassChord, type BassChordShape, type BassChordBox } from '../../utils/instruments/bass/bassChords'
import { KEYBOARD_CHORDS, type KeyboardChord, applyChordToKeyboard } from '../../utils/instruments/keyboard/keyboardChords'
import type { Note } from '../../utils/notes'
import MiniFretboard from './MiniFretboard'
import MiniKeyboard from './MiniKeyboard'
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
  notes?: Note[] // For keyboard: actual Note objects
  octave?: number // For keyboard: specific octave position
  fretZone?: number // For guitar/bass: fret zone position
}

export interface AppliedScale {
  id: string
  root: string
  scale: GuitarScale | BassScale | KeyboardScale
  displayName: string
  noteKeys?: string[] // For guitar/bass: note keys like "0-open", "1-2" etc.
  notes?: Note[] // For keyboard: actual Note objects
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
  // Lesson type to show only scales or chords button label
  lessonType?: 'melodies' | 'chords'
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
  availableKeyboardNotes = [],
  lessonType
}) => {
  const { t } = useTranslation()
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

  // Chord box states (fret-based positions like scales)
  const [availableChordBoxes, setAvailableChordBoxes] = useState<ChordBox[]>([])
  const [availableBassChordBoxes, setAvailableBassChordBoxes] = useState<BassChordBox[]>([])
  const [selectedChordBoxIndex, setSelectedChordBoxIndex] = useState<number>(0)
  const [showChordPositions, setShowChordPositions] = useState<boolean>(true)

  // Keyboard position (octave) states
  const [selectedScaleOctave, setSelectedScaleOctave] = useState<number>(4)
  const [selectedChordOctave, setSelectedChordOctave] = useState<number>(4)

  // Learn diagram modal state
  const [learnDiagramData, setLearnDiagramData] = useState<{
    type: 'scale' | 'chord'
    displayName: string
    root: string
    item: AppliedScale | AppliedChord
  } | null>(null)

  // Audio playback for diagrams
  const { playNote, playGuitarNote, playBassNote, stopMelody } = useAudio()
  const [isDiagramPlaying, setIsDiagramPlaying] = useState(false)
  const [playingNotes, setPlayingNotes] = useState<string[]>([])
  const playbackTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const shouldStopRef = useRef(false)

  // Play diagram notes (scales play sequentially, chords play together)
  const playDiagramSound = useCallback(async () => {
    if (!learnDiagramData || isDiagramPlaying) return

    const { type, item } = learnDiagramData
    const isScale = type === 'scale'
    const appliedItem = item as (AppliedScale | AppliedChord)

    // Get notes based on instrument type
    let noteNames: string[] = []

    if (instrument === 'keyboard') {
      // Keyboard notes - already have Note objects with names
      const notes = appliedItem.notes || []
      noteNames = notes.map(n => n.name).sort((a, b) => {
        // Sort by pitch (octave first, then note)
        const octaveA = parseInt(a.replace(/[^0-9]/g, ''), 10)
        const octaveB = parseInt(b.replace(/[^0-9]/g, ''), 10)
        if (octaveA !== octaveB) return octaveA - octaveB
        const noteOrder = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
        const noteA = a.replace(/\d+$/, '')
        const noteB = b.replace(/\d+$/, '')
        return noteOrder.indexOf(noteA) - noteOrder.indexOf(noteB)
      })
    } else {
      // Guitar/Bass notes - need to convert noteKeys to note names
      const noteKeys = appliedItem.noteKeys || []
      const notesData = instrument === 'guitar' ? guitarNotes : bassNotes
      const stringCount = instrument === 'guitar' ? 6 : 4

      // Parse noteKeys and get note names with position info
      const parsedNotes = noteKeys.map(key => {
        const parts = key.split('-')
        const stringIndex = parseInt(parts[0], 10)
        const fret = parts[1] === 'open' ? 0 : parseInt(parts[1], 10) + 1

        // Find the note in notesData
        const note = notesData.find(n => {
          const noteStringIdx = instrument === 'guitar' ? 6 - n.string : 4 - n.string
          return noteStringIdx === stringIndex && n.fret === fret
        })

        return {
          name: note?.name || '',
          stringIndex,
          fret,
          string: note?.string || (stringCount - stringIndex) // Convert back to 1-indexed string number
        }
      }).filter(n => n.name)

      // Sort for scales: string 6 to 1 (low to high), then by fret within each string
      parsedNotes.sort((a, b) => {
        // Sort by string (6 to 1 = low to high pitch)
        if (a.string !== b.string) return a.string - b.string
        // Then by fret (lower frets first = left to right)
        return a.fret - b.fret
      })

      noteNames = parsedNotes.map(n => n.name)
    }

    if (noteNames.length === 0) return

    setIsDiagramPlaying(true)
    shouldStopRef.current = false

    const playFn = instrument === 'guitar' ? playGuitarNote :
                   instrument === 'bass' ? playBassNote : playNote

    try {
      if (isScale) {
        // Play notes sequentially for scales
        const noteDuration = 300 // ms between notes

        for (let i = 0; i < noteNames.length; i++) {
          if (shouldStopRef.current) break
          setPlayingNotes([noteNames[i]])  // Light up current note
          await playFn(noteNames[i])
          if (i < noteNames.length - 1 && !shouldStopRef.current) {
            await new Promise<void>(resolve => {
              playbackTimeoutRef.current = setTimeout(resolve, noteDuration)
            })
          }
        }
      } else {
        // Play all notes together for chords - light up all at once
        setPlayingNotes(noteNames)
        for (const noteName of noteNames) {
          await playFn(noteName)
        }
      }
    } finally {
      // Reset playing state after a delay
      if (!shouldStopRef.current) {
        playbackTimeoutRef.current = setTimeout(() => {
          setIsDiagramPlaying(false)
          setPlayingNotes([])  // Clear highlighted notes
        }, 500)
      }
    }
  }, [learnDiagramData, isDiagramPlaying, instrument, playNote, playGuitarNote, playBassNote])

  // Stop diagram playback
  const stopDiagramSound = useCallback(() => {
    shouldStopRef.current = true
    if (playbackTimeoutRef.current) {
      clearTimeout(playbackTimeoutRef.current)
      playbackTimeoutRef.current = null
    }
    setIsDiagramPlaying(false)
    setPlayingNotes([])
    stopMelody()
  }, [stopMelody])

  // Cleanup on unmount or when modal closes
  useEffect(() => {
    if (!learnDiagramData) {
      stopDiagramSound()
    }
    return () => {
      if (playbackTimeoutRef.current) {
        clearTimeout(playbackTimeoutRef.current)
      }
    }
  }, [learnDiagramData, stopDiagramSound])

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
          const note = guitarNotes.find((n) => {
            const stringIdx = 6 - n.string
            return stringIdx === pos.stringIndex && n.fret === pos.fretIndex
          })
          if (note && note.name.replace(/\d+$/, '') === selectedRoot) {
            rootPositions.push(pos)
          }
        })
      } else {
        // Chord preview for guitar
        if (showChordPositions && availableChordBoxes.length > 0 && selectedChordBoxIndex < availableChordBoxes.length) {
          positions = applyChordBoxToGuitar(availableChordBoxes[selectedChordBoxIndex])
        } else {
          positions = applyChordToGuitar(selectedChordRoot, selectedChord, guitarNotes)
        }
        // Find root positions
        positions.forEach(pos => {
          const note = guitarNotes.find((n) => {
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
          const note = bassNotes.find((n) => {
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
        if (showChordPositions && availableBassChordBoxes.length > 0 && selectedChordBoxIndex < availableBassChordBoxes.length) {
          positions = applyBassChordBoxToBass(availableBassChordBoxes[selectedChordBoxIndex])
        } else {
          positions = applyChordToBass(selectedChordRoot, selectedBassChord, bassNotes)
        }
        // Find root positions
        positions.forEach(pos => {
          const note = bassNotes.find((n) => {
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
    selectedChordBoxIndex,
    showPositions,
    showShapes,
    showChordPositions,
    availableBoxes,
    availableBassBoxes,
    availableShapes,
    availableBassShapes,
    availableChordBoxes,
    availableBassChordBoxes,
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
        setShowPositions(true) // Reset to show positions mode
      } else if (instrument === 'bass') {
        const boxes = getBassScaleBoxes(selectedRoot, selectedBassScale, bassNotes)
        setAvailableBassBoxes(boxes)
        setSelectedBoxIndex(0)
        setShowPositions(true) // Reset to show positions mode
      }
    }
  }, [selectedRoot, selectedScale, selectedBassScale, instrument, isScaleMode])

  // Update available shapes and chord boxes when root or chord changes (Chord mode)
  useEffect(() => {
    if (!isScaleMode) {
      if (instrument === 'guitar') {
        const shapes = getChordShapes(selectedChordRoot, selectedChord, guitarNotes)
        setAvailableShapes(shapes)
        setSelectedShapeIndex(0)
        // Also update chord boxes (fret-based positions)
        const boxes = getChordBoxes(selectedChordRoot, selectedChord, guitarNotes)
        setAvailableChordBoxes(boxes)
        setSelectedChordBoxIndex(0)
        setShowChordPositions(true) // Reset to show positions mode
      } else if (instrument === 'bass') {
        const shapes = getBassChordShapes(selectedChordRoot, selectedBassChord, bassNotes)
        setAvailableBassShapes(shapes)
        setSelectedShapeIndex(0)
        // Also update chord boxes (fret-based positions)
        const boxes = getBassChordBoxes(selectedChordRoot, selectedBassChord, bassNotes)
        setAvailableBassChordBoxes(boxes)
        setSelectedChordBoxIndex(0)
        setShowChordPositions(true) // Reset to show positions mode
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
      // Check if "Entire Fretboard" is selected (index equals array length)
      if (availableBoxes.length > 0 && selectedBoxIndex === availableBoxes.length && onScaleBoxSelect) {
        // Apply all position boxes that aren't already applied
        availableBoxes.forEach((box) => {
          const boxName = `${selectedRoot} ${box.name}`
          const isAlreadyApplied = appliedScales.some(s => s.displayName.includes(boxName) || s.displayName.includes(`Frets ${box.minFret}-${box.maxFret}`))
          if (!isAlreadyApplied) {
            onScaleBoxSelect(box)
          }
        })
      } else if (showPositions && availableBoxes.length > 0 && selectedBoxIndex < availableBoxes.length && onScaleBoxSelect) {
        onScaleBoxSelect(availableBoxes[selectedBoxIndex])
      } else if (onScaleSelect) {
        onScaleSelect(selectedRoot, selectedScale)
      }
    } else if (instrument === 'bass') {
      // Check if "Entire Fretboard" is selected (index equals array length)
      if (availableBassBoxes.length > 0 && selectedBoxIndex === availableBassBoxes.length && onScaleBoxSelect) {
        // Apply all position boxes that aren't already applied
        availableBassBoxes.forEach((box) => {
          const boxName = `${selectedRoot} ${box.name}`
          const isAlreadyApplied = appliedScales.some(s => s.displayName.includes(boxName) || s.displayName.includes(`Frets ${box.minFret}-${box.maxFret}`))
          if (!isAlreadyApplied) {
            onScaleBoxSelect(box as any)
          }
        })
      } else if (showPositions && availableBassBoxes.length > 0 && selectedBoxIndex < availableBassBoxes.length && onScaleBoxSelect) {
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

  const handleChordBoxChange = (boxIndex: number) => {
    setSelectedChordBoxIndex(boxIndex)
    const currentBoxes = instrument === 'bass' ? availableBassChordBoxes : availableChordBoxes
    if (boxIndex >= currentBoxes.length) {
      setShowChordPositions(false)
    } else {
      setShowChordPositions(true)
    }
  }

  const handleApplyChord = () => {
    if (instrument === 'guitar') {
      // Check if "Entire Fretboard" is selected (index equals array length)
      if (availableChordBoxes.length > 0 && selectedChordBoxIndex === availableChordBoxes.length && onChordShapeSelect) {
        // Apply all chord position boxes that aren't already applied
        availableChordBoxes.forEach((chordBox, index) => {
          const chordName = `${selectedChordRoot} ${selectedChord.name} (Frets ${chordBox.minFret}-${chordBox.maxFret})`
          const isAlreadyApplied = appliedChords.some(c => c.displayName === chordName)
          if (!isAlreadyApplied) {
            const chordShapeFromBox = {
              name: chordName,
              minFret: chordBox.minFret,
              maxFret: chordBox.maxFret,
              positions: chordBox.positions,
              difficulty: 'Medium' as const,
              root: selectedChordRoot,
              fretZone: index
            }
            onChordShapeSelect(chordShapeFromBox as any)
          }
        })
      } else if (showChordPositions && availableChordBoxes.length > 0 && selectedChordBoxIndex < availableChordBoxes.length && onChordShapeSelect) {
        // Use chord box (fret-based position) - convert to ChordShape format for compatibility
        const chordBox = availableChordBoxes[selectedChordBoxIndex]
        const chordShapeFromBox = {
          name: `${selectedChordRoot} ${selectedChord.name} (Frets ${chordBox.minFret}-${chordBox.maxFret})`,
          minFret: chordBox.minFret,
          maxFret: chordBox.maxFret,
          positions: chordBox.positions,
          difficulty: 'Medium' as const,
          root: selectedChordRoot,
          fretZone: selectedChordBoxIndex // Store the position index for export
        }
        onChordShapeSelect(chordShapeFromBox as any)
      } else if (onChordSelect) {
        onChordSelect(selectedChordRoot, selectedChord)
      }
    } else if (instrument === 'bass') {
      // Check if "Entire Fretboard" is selected (index equals array length)
      if (availableBassChordBoxes.length > 0 && selectedChordBoxIndex === availableBassChordBoxes.length && onChordShapeSelect) {
        // Apply all chord position boxes that aren't already applied
        availableBassChordBoxes.forEach((chordBox, index) => {
          const chordName = `${selectedChordRoot} ${selectedBassChord.name} (Frets ${chordBox.minFret}-${chordBox.maxFret})`
          const isAlreadyApplied = appliedChords.some(c => c.displayName === chordName)
          if (!isAlreadyApplied) {
            const bassChordShapeFromBox = {
              name: chordName,
              minFret: chordBox.minFret,
              maxFret: chordBox.maxFret,
              positions: chordBox.positions,
              difficulty: 'Medium' as const,
              root: selectedChordRoot,
              fretZone: index
            }
            onChordShapeSelect(bassChordShapeFromBox as any)
          }
        })
      } else if (showChordPositions && availableBassChordBoxes.length > 0 && selectedChordBoxIndex < availableBassChordBoxes.length && onChordShapeSelect) {
        // Use chord box (fret-based position) - convert to BassChordShape format for compatibility
        const chordBox = availableBassChordBoxes[selectedChordBoxIndex]
        const bassChordShapeFromBox = {
          name: `${selectedChordRoot} ${selectedBassChord.name} (Frets ${chordBox.minFret}-${chordBox.maxFret})`,
          minFret: chordBox.minFret,
          maxFret: chordBox.maxFret,
          positions: chordBox.positions,
          difficulty: 'Medium' as const,
          root: selectedChordRoot,
          fretZone: selectedChordBoxIndex // Store the position index for export
        }
        onChordShapeSelect(bassChordShapeFromBox as any)
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
        className={`scale-options-toggle instrument-${instrument} ${lessonType === 'melodies' ? 'type-scales' : lessonType === 'chords' ? 'type-chords' : 'type-both'}`}
        onClick={toggleExpanded}
        title={isExpanded ? `Close ${lessonType === 'melodies' ? t('sandbox.scales') : lessonType === 'chords' ? t('sandbox.chords') : t('sandbox.scaleChordsToggle')}` : `Open ${lessonType === 'melodies' ? t('sandbox.scales') : lessonType === 'chords' ? t('sandbox.chords') : t('sandbox.scaleChordsToggle')}`}
      >
        <IoMusicalNotes size={16} />
        {lessonType === 'melodies' ? t('sandbox.scales') : lessonType === 'chords' ? t('sandbox.chords') : t('sandbox.scaleChordsToggle')}
      </button>

      {isExpanded && (
        <div
          className={`scale-options-popup ${showOnlyAppliedList ? ((appliedChords.length > 0 && appliedScales.length === 0) || (appliedChords.length > 0 && appliedScales.length > 0 && !isScaleMode) ? 'chord-mode' : '') : (!isScaleMode ? 'chord-mode' : '')} instrument-${instrument}`}
        >
          <div className={`scale-options-content ${showOnlyAppliedList ? ((appliedChords.length > 0 && appliedScales.length === 0) || (appliedChords.length > 0 && appliedScales.length > 0 && !isScaleMode) ? 'chord-mode' : '') : (!isScaleMode ? 'chord-mode' : '')}`}>
            {showOnlyAppliedList ? (
              <>
                {/* Show toggle when both scales and chords exist */}
                {appliedScales.length > 0 && appliedChords.length > 0 && (
                  <div className="control-section">
                    <div className="mode-toggle">
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={!isScaleMode}
                          onChange={(e) => setIsScaleMode(!e.target.checked)}
                        />
                        <span className="toggle-slider">
                          <span className="toggle-text left">{t('sandbox.scales')}</span>
                          <span className="toggle-text right">{t('sandbox.chords')}</span>
                        </span>
                      </label>
                    </div>
                  </div>
                )}

                {/* Applied Scales List - show when scales only OR when in scale mode with both */}
                {appliedScales.length > 0 && (appliedChords.length === 0 || isScaleMode) && (
                  <div className="control-section scale-theme">
                    <label className="control-label scale-label">{t('sandbox.appliedScales')}</label>
                    <div className="applied-scales-list">
                      {appliedScales.map((appliedScale) => (
                        <div key={appliedScale.id} className={`applied-scale-item instrument-${instrument}`}>
                          <div className="applied-item-info">
                            <span className="scale-name">{appliedScale.displayName}</span>
                            {!disableDelete && (
                              <button
                                onClick={() => onScaleDelete?.(appliedScale.id)}
                                className="delete-scale-button"
                                title={t('common.delete')}
                              >
                                <PiTrashFill size={16} />
                              </button>
                            )}
                          </div>
                          <div className="applied-item-preview">
                            <div
                              onClick={() => setLearnDiagramData({
                                type: 'scale',
                                displayName: appliedScale.displayName,
                                root: appliedScale.root,
                                item: appliedScale
                              })}
                            >
                              {instrument === 'keyboard' ? (
                                <MiniKeyboard
                                  notes={appliedScale.notes || []}
                                  root={appliedScale.root}
                                  mode="scale"
                                />
                              ) : (
                                <MiniFretboard
                                  noteKeys={appliedScale.noteKeys || []}
                                  instrument={instrument as 'guitar' | 'bass'}
                                  root={appliedScale.root}
                                />
                              )}
                            </div>
                            <button
                              onClick={() => setLearnDiagramData({
                                type: 'scale',
                                displayName: appliedScale.displayName,
                                root: appliedScale.root,
                                item: appliedScale
                              })}
                              className="learn-scale-button"
                              title={t('sandbox.learnScale')}
                            >
                              <PiEyeFill size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Applied Chords List - show when chords only OR when in chord mode with both */}
                {appliedChords.length > 0 && (appliedScales.length === 0 || !isScaleMode) && (
                  <div className="control-section chord-theme">
                    <label className="control-label chord-label">{t('sandbox.appliedChords')}</label>
                    <div className="applied-chords-list">
                      {appliedChords.map((appliedChord) => (
                        <div key={appliedChord.id} className={`applied-chord-item instrument-${instrument}`}>
                          <div className="applied-item-info">
                            <span className="chord-name">{appliedChord.displayName}</span>
                            {!disableDelete && (
                              <button
                                onClick={() => onChordDelete?.(appliedChord.id)}
                                className="delete-chord-button"
                                title={t('common.delete')}
                              >
                                <PiTrashFill size={16} />
                              </button>
                            )}
                          </div>
                          <div className="applied-item-preview">
                            <div
                              onClick={() => setLearnDiagramData({
                                type: 'chord',
                                displayName: appliedChord.displayName,
                                root: appliedChord.root,
                                item: appliedChord
                              })}
                            >
                              {instrument === 'keyboard' ? (
                                <MiniKeyboard
                                  notes={appliedChord.notes || []}
                                  root={appliedChord.root}
                                  mode="chord"
                                />
                              ) : (
                                <MiniFretboard
                                  noteKeys={appliedChord.noteKeys || []}
                                  instrument={instrument as 'guitar' | 'bass'}
                                  root={appliedChord.root}
                                  mode="chord"
                                />
                              )}
                            </div>
                            <button
                              onClick={() => setLearnDiagramData({
                                type: 'chord',
                                displayName: appliedChord.displayName,
                                root: appliedChord.root,
                                item: appliedChord
                              })}
                              className="learn-chord-button"
                              title={t('sandbox.learnChord')}
                            >
                              <PiEyeFill size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Show message if nothing applied */}
                {appliedScales.length === 0 && appliedChords.length === 0 && (
                  <div className="control-section">
                    <div className="empty-list-message">{t('sandbox.noScalesOrChordsApplied')}</div>
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
                      <span className="toggle-text left">{t('sandbox.scales')}</span>
                      <span className="toggle-text right">{t('sandbox.chords')}</span>
                    </span>
                  </label>
                </div>
              </div>

          <div className={`scale-controls ${!isScaleMode ? 'chord-mode' : ''}`}>
            <div className="control-section">
              <label className="control-label">{t('sandbox.rootNote')}</label>
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
                  <label className="control-label">{t('sandbox.scale')}</label>
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
                    <label className="control-label">{t('sandbox.position')}</label>
                    <select
                      value={selectedBoxIndex}
                      onChange={(e) => handleBoxChange(parseInt(e.target.value))}
                      className={`control-select ${!isScaleMode ? 'chord-mode' : ''}`}
                    >
                      {availableBoxes.map((box, index) => (
                        <option key={index} value={index}>
                          {t('sandbox.fretsRange', { start: box.minFret, end: box.maxFret })}
                        </option>
                      ))}
                      <option key="entire" value={availableBoxes.length}>
                        {t('sandbox.entireFretboard')}
                      </option>
                    </select>
                  </div>
                )}

                {instrument === 'bass' && availableBassBoxes.length > 0 && (
                  <div className="control-section">
                    <label className="control-label">{t('sandbox.position')}</label>
                    <select
                      value={selectedBoxIndex}
                      onChange={(e) => handleBoxChange(parseInt(e.target.value))}
                      className={`control-select ${!isScaleMode ? 'chord-mode' : ''}`}
                    >
                      {availableBassBoxes.map((box, index) => (
                        <option key={index} value={index}>
                          {t('sandbox.fretsRange', { start: box.minFret, end: box.maxFret })}
                        </option>
                      ))}
                      <option key="entire" value={availableBassBoxes.length}>
                        {t('sandbox.entireFretboard')}
                      </option>
                    </select>
                  </div>
                )}

                {instrument === 'keyboard' && availableOctaves.length > 0 && (
                  <div className="control-section">
                    <label className="control-label">{t('sandbox.position')}</label>
                    <select
                      value={selectedScaleOctave}
                      onChange={(e) => setSelectedScaleOctave(parseInt(e.target.value))}
                      className={`control-select ${!isScaleMode ? 'chord-mode' : ''}`}
                    >
                      {availableOctaves.map((octave) => (
                        <option key={octave} value={octave}>
                          {t('sandbox.octaveNumber', { num: octave })}
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
                    {t('sandbox.applyScale')}
                  </button>
                </div>

                {/* Applied Scales List */}
                <div className="control-section">
                  <label className="control-label">{t('sandbox.appliedScales')}</label>
                  <div className="applied-scales-list">
                    {appliedScales.length > 0 ? (
                      appliedScales.map((appliedScale) => (
                        <div key={appliedScale.id} className={`applied-scale-item instrument-${instrument}`}>
                          <div className="applied-item-info">
                            <span className="scale-name">{appliedScale.displayName}</span>
                            <button
                              onClick={() => onScaleDelete?.(appliedScale.id)}
                              className="delete-scale-button"
                              title={t('common.delete')}
                            >
                              <PiTrashFill size={16} />
                            </button>
                          </div>
                          <div className="applied-item-preview">
                            <div
                              onClick={() => setLearnDiagramData({
                                type: 'scale',
                                displayName: appliedScale.displayName,
                                root: appliedScale.root,
                                item: appliedScale
                              })}
                            >
                              {instrument === 'keyboard' ? (
                                <MiniKeyboard
                                  notes={appliedScale.notes || []}
                                  root={appliedScale.root}
                                  mode="scale"
                                />
                              ) : (
                                <MiniFretboard
                                  noteKeys={appliedScale.noteKeys || []}
                                  instrument={instrument as 'guitar' | 'bass'}
                                  root={appliedScale.root}
                                />
                              )}
                            </div>
                            <button
                              onClick={() => setLearnDiagramData({
                                type: 'scale',
                                displayName: appliedScale.displayName,
                                root: appliedScale.root,
                                item: appliedScale
                              })}
                              className="learn-scale-button"
                              title={t('sandbox.learnScale')}
                            >
                              <PiEyeFill size={16} />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="empty-list-message">{t('sandbox.empty')}</div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="control-section">
                  <label className="control-label">{t('sandbox.chord')}</label>
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

                {instrument === 'guitar' && availableChordBoxes.length > 0 && (
                  <div className="control-section">
                    <label className="control-label">{t('sandbox.position')}</label>
                    <select
                      value={selectedChordBoxIndex}
                      onChange={(e) => handleChordBoxChange(parseInt(e.target.value))}
                      className={`control-select ${!isScaleMode ? 'chord-mode' : ''}`}
                    >
                      {availableChordBoxes.map((box, index) => (
                        <option key={index} value={index}>
                          {t('sandbox.fretsRange', { start: box.minFret, end: box.maxFret })}
                        </option>
                      ))}
                      <option key="entire" value={availableChordBoxes.length}>
                        {t('sandbox.entireFretboard')}
                      </option>
                    </select>
                  </div>
                )}

                {instrument === 'bass' && availableBassChordBoxes.length > 0 && (
                  <div className="control-section">
                    <label className="control-label">{t('sandbox.position')}</label>
                    <select
                      value={selectedChordBoxIndex}
                      onChange={(e) => handleChordBoxChange(parseInt(e.target.value))}
                      className={`control-select ${!isScaleMode ? 'chord-mode' : ''}`}
                    >
                      {availableBassChordBoxes.map((box, index) => (
                        <option key={index} value={index}>
                          {t('sandbox.fretsRange', { start: box.minFret, end: box.maxFret })}
                        </option>
                      ))}
                      <option key="entire" value={availableBassChordBoxes.length}>
                        {t('sandbox.entireFretboard')}
                      </option>
                    </select>
                  </div>
                )}

                {instrument === 'keyboard' && availableOctaves.length > 0 && (
                  <div className="control-section">
                    <label className="control-label">{t('sandbox.position')}</label>
                    <select
                      value={selectedChordOctave}
                      onChange={(e) => setSelectedChordOctave(parseInt(e.target.value))}
                      className={`control-select ${!isScaleMode ? 'chord-mode' : ''}`}
                    >
                      {availableOctaves.map((octave) => (
                        <option key={octave} value={octave}>
                          {t('sandbox.octaveNumber', { num: octave })}
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
                    {t('sandbox.applyChord')}
                  </button>
                </div>

                {/* Applied Chords List */}
                <div className="control-section">
                  <label className="control-label">{t('sandbox.appliedChords')}</label>
                  <div className="applied-chords-list">
                    {appliedChords.length > 0 ? (
                      appliedChords.map((appliedChord) => (
                        <div key={appliedChord.id} className={`applied-chord-item instrument-${instrument}`}>
                          <div className="applied-item-info">
                            <span className="chord-name">{appliedChord.displayName}</span>
                            <button
                              onClick={() => onChordDelete?.(appliedChord.id)}
                              className="delete-chord-button"
                              title={t('common.delete')}
                            >
                              <PiTrashFill size={16} />
                            </button>
                          </div>
                          <div className="applied-item-preview">
                            <div
                              onClick={() => setLearnDiagramData({
                                type: 'chord',
                                displayName: appliedChord.displayName,
                                root: appliedChord.root,
                                item: appliedChord
                              })}
                            >
                              {instrument === 'keyboard' ? (
                                <MiniKeyboard
                                  notes={appliedChord.notes || []}
                                  root={appliedChord.root}
                                  mode="chord"
                                />
                              ) : (
                                <MiniFretboard
                                  noteKeys={appliedChord.noteKeys || []}
                                  instrument={instrument as 'guitar' | 'bass'}
                                  root={appliedChord.root}
                                  mode="chord"
                                />
                              )}
                            </div>
                            <button
                              onClick={() => setLearnDiagramData({
                                type: 'chord',
                                displayName: appliedChord.displayName,
                                root: appliedChord.root,
                                item: appliedChord
                              })}
                              className="learn-chord-button"
                              title={t('sandbox.learnChord')}
                            >
                              <PiEyeFill size={16} />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="empty-list-message">{t('sandbox.empty')}</div>
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

      {/* Learn Diagram Modal */}
      {learnDiagramData && createPortal(
        <div className="learn-diagram-overlay" onClick={() => setLearnDiagramData(null)}>
          <div className="learn-diagram-modal" onClick={(e) => e.stopPropagation()}>
            <div className="learn-diagram-header">
              <h3>{learnDiagramData.displayName}</h3>
              <div className="learn-diagram-actions">
                <button
                  className={`learn-diagram-play ${isDiagramPlaying ? 'playing' : ''}`}
                  onClick={isDiagramPlaying ? stopDiagramSound : playDiagramSound}
                  title={isDiagramPlaying ? t('common.stop') : t('sandbox.playSound')}
                >
                  {isDiagramPlaying ? <PiStopFill size={16} /> : <PiSpeakerHighFill size={16} />}
                </button>
                <button
                  className="learn-diagram-close"
                  onClick={() => setLearnDiagramData(null)}
                >
                  ×
                </button>
              </div>
            </div>
            <div className="learn-diagram-content">
              {learnDiagramData.type === 'scale' ? (
                <div className="scale-diagram">
                  {instrument !== 'keyboard' && (
                    <div className="diagram-info">
                      {(learnDiagramData.item as AppliedScale).scale.intervals && (
                        <p>{(learnDiagramData.item as AppliedScale).scale.intervals.join(' - ')}</p>
                      )}
                    </div>
                  )}
                  {instrument === 'keyboard' ? (
                    <MiniKeyboard
                      notes={(learnDiagramData.item as AppliedScale).notes || []}
                      root={learnDiagramData.root}
                      mode="scale"
                      playingNotes={playingNotes}
                    />
                  ) : (
                    <MiniFretboard
                      noteKeys={(learnDiagramData.item as AppliedScale).noteKeys || []}
                      instrument={instrument as 'guitar' | 'bass'}
                      root={learnDiagramData.root}
                      playingNotes={playingNotes}
                    />
                  )}
                </div>
              ) : (
                <div className="chord-diagram">
                  {instrument !== 'keyboard' && (
                    <div className="diagram-info">
                      {(learnDiagramData.item as AppliedChord).chord.intervals && (
                        <p>{(learnDiagramData.item as AppliedChord).chord.intervals.join(' - ')}</p>
                      )}
                    </div>
                  )}
                  {instrument === 'keyboard' ? (
                    <MiniKeyboard
                      notes={(learnDiagramData.item as AppliedChord).notes || []}
                      root={learnDiagramData.root}
                      mode="chord"
                      playingNotes={playingNotes}
                    />
                  ) : (
                    <MiniFretboard
                      noteKeys={(learnDiagramData.item as AppliedChord).noteKeys || []}
                      instrument={instrument as 'guitar' | 'bass'}
                      root={learnDiagramData.root}
                      mode="chord"
                      playingNotes={playingNotes}
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

export default ScaleChordOptions
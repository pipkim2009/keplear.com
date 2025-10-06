import { createContext, useContext, ReactNode } from 'react'
import { useAudio } from '../hooks/useAudio'
import { useMelodyGenerator } from '../hooks/useMelodyGenerator'
import { useUIState } from '../hooks/useUIState'
import { useInstrumentConfig } from '../hooks/useInstrumentConfig'
import { useMelodyPlayer } from '../hooks/useMelodyPlayer'
import { useCallback, useState, useEffect } from 'react'
import { notes, generateNotesWithSeparateOctaves } from '../utils/notes'
import type { Note } from '../utils/notes'
import { useMelodyChanges } from '../hooks/useMelodyChanges'
import type { InstrumentType } from '../types/instrument'
import type { ChordMode } from '../reducers/uiReducer'

interface InstrumentContextType {
  // Audio functions
  playNote: (note: string) => Promise<void>
  playGuitarNote: (note: string) => Promise<void>
  playBassNote: (note: string) => Promise<void>
  playMelody: (melody: readonly Note[], bpm: number) => Promise<void>
  playGuitarMelody: (melody: readonly Note[], bpm: number) => Promise<void>
  playBassMelody: (melody: readonly Note[], bpm: number) => Promise<void>
  stopMelody: () => void
  recordMelody: (notes: readonly Note[], bpm: number, instrument: InstrumentType) => Promise<Blob | null>
  isPlaying: boolean
  isRecording: boolean

  // UI State
  currentPage: string
  bpm: number
  numberOfNotes: number
  chordMode: ChordMode
  flashingInputs: { bpm: boolean; notes: boolean; mode: boolean }
  activeInputs: { bpm: boolean; notes: boolean; mode: boolean }
  navigateToHome: () => void
  navigateToSandbox: () => void
  navigateToPractice: () => void
  setBpm: (bpm: number) => void
  setNumberOfNotes: (notes: number) => void
  setChordMode: (mode: ChordMode) => void
  triggerInputFlash: (input: 'bpm' | 'notes' | 'mode') => void
  setInputActive: (input: 'bpm' | 'notes' | 'mode', active: boolean) => void
  setCurrentPage: (page: string) => void

  // Instrument Config
  instrument: InstrumentType
  keyboardOctaves: { lower: number; higher: number }
  keyboardSelectionMode: 'range' | 'multi'
  clearChordsAndScalesTrigger: number
  setInstrument: (instrument: InstrumentType) => void
  setKeyboardSelectionMode: (mode: 'range' | 'multi') => void
  triggerClearChordsAndScales: () => void

  // Melody Generation
  selectedNotes: Note[]
  generatedMelody: Note[]
  selectNote: (note: Note, mode?: 'range' | 'multi') => void
  generateMelody: (notes: Note[], count: number, instrument: InstrumentType, mode: 'range' | 'multi', notesToUse?: readonly Note[]) => void
  setGuitarNotes: (notes: Note[]) => void
  isSelected: (note: Note) => boolean
  isInMelody: (note: Note, showNotes: boolean) => boolean
  clearSelection: () => void
  clearTrigger: number

  // Melody Player
  playbackProgress: number
  melodyDuration: number
  recordedAudioBlob: Blob | null
  showNotes: boolean
  setPlaybackProgress: (progress: number) => void
  setMelodyDuration: (duration: number) => void
  toggleShowNotes: () => void
  handleRecordMelody: () => Promise<Blob | null>
  handleClearRecordedAudio: () => void
  calculateMelodyDuration: (notes: number, bpm: number) => number

  // Melody Changes Tracking
  hasChanges: boolean
  clearChanges: () => void

  // Melody Generation Status
  isGeneratingMelody: boolean
  isAutoRecording: boolean

  // Handlers
  handleNoteClick: (note: Note) => Promise<void>
  handleGenerateMelody: () => void
  handlePlayMelody: () => void
  handleInstrumentChange: (newInstrument: InstrumentType) => void
  handleOctaveRangeChange: (lowerOctaves: number, higherOctaves: number) => void
  handleKeyboardSelectionModeChange: (mode: 'range' | 'multi', clearSelections?: boolean) => void
}

const InstrumentContext = createContext<InstrumentContextType | undefined>(undefined)

export const useInstrument = () => {
  const context = useContext(InstrumentContext)
  if (context === undefined) {
    throw new Error('useInstrument must be used within an InstrumentProvider')
  }
  return context
}

interface InstrumentProviderProps {
  children: ReactNode
}

export const InstrumentProvider: React.FC<InstrumentProviderProps> = ({ children }) => {
  // State for melody generation
  const [isGeneratingMelody, setIsGeneratingMelody] = useState(false)

  // All the existing hooks from App.tsx
  const { playNote, playGuitarNote, playBassNote, playMelody, playGuitarMelody, playBassMelody, stopMelody, recordMelody, isPlaying, isRecording } = useAudio()

  const {
    currentPage,
    bpm,
    numberOfNotes,
    chordMode,
    flashingInputs,
    activeInputs,
    navigateToHome,
    navigateToSandbox,
    navigateToPractice,
    setBpm,
    setNumberOfNotes,
    setChordMode,
    triggerInputFlash,
    setInputActive,
    setCurrentPage
  } = useUIState()

  const {
    instrument,
    keyboardOctaves,
    keyboardSelectionMode,
    clearChordsAndScalesTrigger,
    setInstrument,
    setKeyboardSelectionMode,
    triggerClearChordsAndScales
  } = useInstrumentConfig()

  const {
    selectedNotes,
    generatedMelody,
    selectNote,
    generateMelody,
    setGuitarNotes,
    isSelected,
    isInMelody,
    clearSelection,
    clearTrigger
  } = useMelodyGenerator()

  const {
    playbackProgress,
    melodyDuration,
    recordedAudioBlob,
    showNotes,
    isAutoRecording,
    setPlaybackProgress,
    setMelodyDuration,
    toggleShowNotes,
    handleRecordMelody,
    handleClearRecordedAudio,
    calculateMelodyDuration
  } = useMelodyPlayer({
    generatedMelody,
    bpm,
    isPlaying,
    isRecording,
    recordMelody,
    stopMelody,
    instrument
  })

  const { hasChanges, clearChanges } = useMelodyChanges({
    selectedNotes,
    bpm,
    numberOfNotes,
    generatedMelody,
    instrument,
    keyboardSelectionMode
  })

  // Turn off generating indicator only when we have recorded audio ready
  useEffect(() => {
    if (recordedAudioBlob && isGeneratingMelody) {
      setIsGeneratingMelody(false)
    }
  }, [recordedAudioBlob, isGeneratingMelody])

  // Handlers from App.tsx
  const handleNoteClick = useCallback(async (note: Note): Promise<void> => {
    try {
      // Don't play sounds during melody generation to prevent interference with recording
      if (!isGeneratingMelody && !isAutoRecording) {
        if (instrument === 'guitar') {
          await playGuitarNote(note.name)
        } else if (instrument === 'bass') {
          await playBassNote(note.name)
        } else {
          await playNote(note.name)
        }
      }
      selectNote(note, keyboardSelectionMode as 'range' | 'multi')
    } catch (error) {
    }
  }, [instrument, playGuitarNote, playBassNote, playNote, selectNote, keyboardSelectionMode, isGeneratingMelody, isAutoRecording])

  const handleGenerateMelody = useCallback((): void => {
    setIsGeneratingMelody(true)

    // Generate melody immediately with current values
    const melodyNotes = instrument === 'keyboard' && (keyboardOctaves.lower !== 0 || keyboardOctaves.higher !== 0)
      ? generateNotesWithSeparateOctaves(keyboardOctaves.lower, keyboardOctaves.higher)
      : notes

    // Take a snapshot of currently selected notes to prevent interference from note clicks during generation
    const selectedNotesSnapshot = [...selectedNotes]

    generateMelody(melodyNotes, numberOfNotes, instrument, keyboardSelectionMode, selectedNotesSnapshot)

    const duration = calculateMelodyDuration(numberOfNotes, bpm, instrument)
    setMelodyDuration(duration)
    setPlaybackProgress(0)
    handleClearRecordedAudio()
    clearChanges()

    // isGeneratingMelody will stay true until recorded audio is ready
  }, [generateMelody, numberOfNotes, instrument, keyboardOctaves, keyboardSelectionMode, selectedNotes, calculateMelodyDuration, bpm, setMelodyDuration, setPlaybackProgress, handleClearRecordedAudio, clearChanges])

  const handlePlayMelody = useCallback((): void => {
    if (isPlaying) {
      stopMelody()
      setPlaybackProgress(0)
    } else {
      if (generatedMelody.length === 0) {
        console.warn('No melody to play. Generate a melody first.')
        return
      }

      setPlaybackProgress(0)

      if (instrument === 'guitar') {
        playGuitarMelody([...generatedMelody], bpm)
      } else if (instrument === 'bass') {
        playBassMelody([...generatedMelody], bpm)
      } else {
        playMelody([...generatedMelody], bpm)
      }
    }
  }, [isPlaying, stopMelody, generatedMelody, instrument, playGuitarMelody, playBassMelody, playMelody, bpm, setPlaybackProgress])

  const handleInstrumentChange = useCallback((newInstrument: InstrumentType): void => {
    setInstrument(newInstrument)
    clearSelection()
    handleClearRecordedAudio()
    triggerClearChordsAndScales()
  }, [setInstrument, clearSelection, handleClearRecordedAudio, triggerClearChordsAndScales])

  const handleOctaveRangeChange = useCallback((lowerOctaves: number, higherOctaves: number): void => {
    // Handled by useInstrumentConfig hook internally
  }, [])

  const handleKeyboardSelectionModeChange = useCallback((mode: 'range' | 'multi', clearSelections: boolean = true): void => {
    setKeyboardSelectionMode(mode as any)
    if (clearSelections) {
      clearSelection()
    }
    triggerInputFlash('mode')
  }, [setKeyboardSelectionMode, clearSelection, triggerInputFlash])

  const value: InstrumentContextType = {
    // Audio functions
    playNote,
    playGuitarNote,
    playBassNote,
    playMelody,
    playGuitarMelody,
    playBassMelody,
    stopMelody,
    recordMelody,
    isPlaying,
    isRecording,

    // UI State
    currentPage,
    bpm,
    numberOfNotes,
    chordMode,
    flashingInputs,
    activeInputs,
    navigateToHome,
    navigateToSandbox,
    navigateToPractice,
    setBpm,
    setNumberOfNotes,
    setChordMode,
    triggerInputFlash,
    setInputActive,
    setCurrentPage,

    // Instrument Config
    instrument,
    keyboardOctaves,
    keyboardSelectionMode,
    clearChordsAndScalesTrigger,
    setInstrument,
    setKeyboardSelectionMode,
    triggerClearChordsAndScales,

    // Melody Generation
    selectedNotes,
    generatedMelody,
    selectNote,
    generateMelody,
    setGuitarNotes,
    isSelected,
    isInMelody,
    clearSelection,
    clearTrigger,

    // Melody Player
    playbackProgress,
    melodyDuration,
    recordedAudioBlob,
    showNotes,
    setPlaybackProgress,
    setMelodyDuration,
    toggleShowNotes,
    handleRecordMelody,
    handleClearRecordedAudio,
    calculateMelodyDuration,

    // Melody Changes Tracking
    hasChanges,
    clearChanges,

    // Melody Generation Status
    isGeneratingMelody,
    isAutoRecording,

    // Handlers
    handleNoteClick,
    handleGenerateMelody,
    handlePlayMelody,
    handleInstrumentChange,
    handleOctaveRangeChange,
    handleKeyboardSelectionModeChange
  }

  return (
    <InstrumentContext.Provider value={value}>
      {children}
    </InstrumentContext.Provider>
  )
}
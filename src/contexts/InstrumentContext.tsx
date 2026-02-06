import { createContext, useContext, ReactNode } from 'react'
import { useAudio } from '../hooks/useAudio'
import { useMelodyGenerator } from '../hooks/useMelodyGenerator'
import { useUIState } from '../hooks/useUIState'
import { useInstrumentConfig } from '../hooks/useInstrumentConfig'
import { useMelodyPlayer } from '../hooks/useMelodyPlayer'
import { useCallback, useState, useEffect, useRef } from 'react'
import { notes, generateNotesWithSeparateOctaves } from '../utils/notes'
import type { Note } from '../utils/notes'
import { useMelodyChanges } from '../hooks/useMelodyChanges'
import type { InstrumentType } from '../types/instrument'
import type { ChordMode } from '../reducers/uiReducer'
import { useScaleChordManagement } from '../hooks/useScaleChordManagement'
import type { AppliedChord, AppliedScale } from '../components/common/ScaleChordOptions'

interface InstrumentContextType {
  // Audio functions
  playNote: (note: string) => Promise<void>
  playGuitarNote: (note: string) => Promise<void>
  playBassNote: (note: string) => Promise<void>
  playMelody: (melody: readonly Note[], bpm: number) => Promise<void>
  playGuitarMelody: (melody: readonly Note[], bpm: number) => Promise<void>
  playBassMelody: (melody: readonly Note[], bpm: number) => Promise<void>
  stopMelody: () => void
  recordMelody: (
    notes: readonly Note[],
    bpm: number,
    instrument: InstrumentType
  ) => Promise<Blob | null>
  isPlaying: boolean
  isRecording: boolean

  // UI State
  currentPage: string
  bpm: number
  numberOfBeats: number
  chordMode: ChordMode
  flashingInputs: { bpm: boolean; beats: boolean; mode: boolean }
  activeInputs: { bpm: boolean; beats: boolean; mode: boolean }
  navigateToHome: () => void
  navigateToSandbox: () => void
  navigateToSongs: () => void
  navigateToClassroom: () => void
  navigateToProfile: (userId?: string) => void
  navigateToDashboard: () => void
  profileUserId: string | null
  setBpm: (bpm: number) => void
  setNumberOfBeats: (beats: number) => void
  setChordMode: (mode: ChordMode) => void
  triggerInputFlash: (input: 'bpm' | 'beats' | 'mode') => void
  setInputActive: (input: 'bpm' | 'beats' | 'mode', active: boolean) => void
  setCurrentPage: (page: string) => void

  // Instrument Config
  instrument: InstrumentType
  keyboardOctaves: { lower: number; higher: number }
  clearChordsAndScalesTrigger: number
  setInstrument: (instrument: InstrumentType) => void
  triggerClearChordsAndScales: () => void

  // Melody Generation
  selectedNotes: Note[]
  generatedMelody: Note[]
  selectNote: (note: Note, mode?: 'range' | 'multi') => void
  generateMelody: (
    notes: Note[],
    count: number,
    instrument: InstrumentType,
    mode: 'range' | 'multi',
    notesToUse?: readonly Note[],
    chordMode?: 'arpeggiator' | 'progression',
    appliedChords?: AppliedChord[],
    appliedScales?: AppliedScale[],
    inclusiveMode?: boolean
  ) => void
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
  currentlyPlayingNoteIndex: number | null
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
  /** BPM that was used when generating the current melody */
  melodyBpm: number

  // Handlers
  handleNoteClick: (note: Note) => Promise<void>
  handleGenerateMelody: (inclusiveMode?: boolean) => void
  handlePlayMelody: () => void
  handleInstrumentChange: (newInstrument: InstrumentType) => void
  handleOctaveRangeChange: (lowerOctaves: number, higherOctaves: number) => void
  handleCurrentlyPlayingNoteChange: (index: number | null) => void

  // Scale/Chord Management
  appliedChords: AppliedChord[]
  appliedScales: AppliedScale[]
  scaleChordManagement: ReturnType<typeof useScaleChordManagement>

  // Octave Range
  lowerOctaves: number
  higherOctaves: number
}

const InstrumentContext = createContext<InstrumentContextType | undefined>(undefined)

// eslint-disable-next-line react-refresh/only-export-components
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
  const [melodyBpm, setMelodyBpm] = useState(80) // BPM used when melody was generated

  // State for octave ranges (needed for scale/chord management)
  const [lowerOctaves, setLowerOctaves] = useState<number>(0)
  const [higherOctaves, setHigherOctaves] = useState<number>(0)

  // Track previous selection state to detect changes
  const prevSelectionRef = useRef<{
    noteCount: number
    chordCount: number
    scaleCount: number
  }>({
    noteCount: 0,
    chordCount: 0,
    scaleCount: 0,
  })

  // All the existing hooks from App.tsx
  const {
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
  } = useAudio()

  const {
    currentPage,
    bpm,
    numberOfBeats,
    chordMode,
    flashingInputs,
    activeInputs,
    navigateToHome,
    navigateToSandbox: navigateToSandboxOriginal,
    navigateToSongs,
    navigateToClassroom,
    navigateToProfile,
    navigateToDashboard,
    profileUserId,
    setBpm,
    setNumberOfBeats,
    setChordMode,
    triggerInputFlash,
    setInputActive,
    setCurrentPage,
    resetSettings,
  } = useUIState()

  const {
    instrument,
    keyboardOctaves,
    clearChordsAndScalesTrigger,
    setInstrument,
    triggerClearChordsAndScales,
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
    clearMelody,
    clearTrigger,
  } = useMelodyGenerator()

  const {
    playbackProgress,
    melodyDuration,
    recordedAudioBlob,
    showNotes,
    isAutoRecording,
    currentlyPlayingNoteIndex,
    setPlaybackProgress,
    setMelodyDuration,
    toggleShowNotes,
    setShowNotes,
    handleRecordMelody,
    handleClearRecordedAudio,
    calculateMelodyDuration,
    setCurrentlyPlayingNoteIndex,
  } = useMelodyPlayer({
    generatedMelody,
    bpm,
    isPlaying,
    isRecording,
    recordMelody,
    stopMelody,
    instrument,
    chordMode,
  })

  // Scale and chord management (must come before useMelodyChanges)
  const scaleChordManagement = useScaleChordManagement({
    instrument,
    selectedNotes,
    setGuitarNotes,
    selectNote,
    clearSelection,
    clearChordsAndScales: clearChordsAndScalesTrigger,
    lowerOctaves,
    higherOctaves,
  })

  const { appliedChords, appliedScales } = scaleChordManagement

  const { hasChanges, clearChanges } = useMelodyChanges({
    selectedNotes,
    bpm,
    numberOfBeats,
    generatedMelody,
    instrument,
    appliedChords,
  })

  // Turn off generating indicator only when we have recorded audio ready
  useEffect(() => {
    if (recordedAudioBlob && isGeneratingMelody) {
      setIsGeneratingMelody(false)
    }
  }, [recordedAudioBlob, isGeneratingMelody])

  // Hide notes when selection changes (notes, chords, or scales)
  useEffect(() => {
    const currentNoteCount = selectedNotes.length
    const currentChordCount = appliedChords.length
    const currentScaleCount = appliedScales.length

    const prev = prevSelectionRef.current

    // Check if selection has changed
    const selectionChanged =
      currentNoteCount !== prev.noteCount ||
      currentChordCount !== prev.chordCount ||
      currentScaleCount !== prev.scaleCount

    // Hide melody if it's visible and selection changed
    if (showNotes && selectionChanged && generatedMelody.length > 0) {
      setShowNotes(false)
    }

    // Update previous values
    prevSelectionRef.current = {
      noteCount: currentNoteCount,
      chordCount: currentChordCount,
      scaleCount: currentScaleCount,
    }
  }, [
    selectedNotes.length,
    appliedChords.length,
    appliedScales.length,
    showNotes,
    generatedMelody.length,
    setShowNotes,
  ])

  // Handlers from App.tsx
  const handleNoteClick = useCallback(
    async (note: Note): Promise<void> => {
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
        // Always use multi-select mode
        selectNote(note, 'multi')
      } catch (error) {
        console.error('handleNoteClick error:', error)
      }
    },
    [
      instrument,
      playGuitarNote,
      playBassNote,
      playNote,
      selectNote,
      isGeneratingMelody,
      isAutoRecording,
    ]
  )

  const handleGenerateMelody = useCallback(
    (inclusiveMode?: boolean): void => {
      setIsGeneratingMelody(true)

      // Store the BPM used for this melody
      setMelodyBpm(bpm)

      // Generate melody immediately with current values
      // Use local lowerOctaves/higherOctaves state which is updated by the octave buttons
      const melodyNotes =
        instrument === 'keyboard' && (lowerOctaves !== 0 || higherOctaves !== 0)
          ? generateNotesWithSeparateOctaves(lowerOctaves, higherOctaves)
          : notes

      // Take a snapshot of currently selected notes to prevent interference from note clicks during generation
      const selectedNotesSnapshot = [...selectedNotes]

      // Pass chordMode, appliedChords, appliedScales, and inclusiveMode to generateMelody (always use 'multi' mode)
      generateMelody(
        melodyNotes,
        numberOfBeats,
        instrument,
        'multi',
        selectedNotesSnapshot,
        chordMode,
        appliedChords,
        appliedScales,
        inclusiveMode
      )

      const duration = calculateMelodyDuration(numberOfBeats, bpm, instrument)
      setMelodyDuration(duration)
      setPlaybackProgress(0)
      handleClearRecordedAudio()
      clearChanges()

      // isGeneratingMelody will stay true until recorded audio is ready
    },
    [
      generateMelody,
      numberOfBeats,
      instrument,
      lowerOctaves,
      higherOctaves,
      selectedNotes,
      calculateMelodyDuration,
      bpm,
      setMelodyDuration,
      setPlaybackProgress,
      handleClearRecordedAudio,
      clearChanges,
      chordMode,
      appliedChords,
      appliedScales,
    ]
  )

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
        playGuitarMelody([...generatedMelody], bpm, chordMode)
      } else if (instrument === 'bass') {
        playBassMelody([...generatedMelody], bpm, chordMode)
      } else {
        playMelody([...generatedMelody], bpm, chordMode)
      }
    }
  }, [
    isPlaying,
    stopMelody,
    generatedMelody,
    instrument,
    playGuitarMelody,
    playBassMelody,
    playMelody,
    bpm,
    chordMode,
    setPlaybackProgress,
  ])

  const handleInstrumentChange = useCallback(
    (newInstrument: InstrumentType): void => {
      // FIRST: Abort any ongoing recording before anything else
      handleClearRecordedAudio()

      // Stop any ongoing melody playback or recording
      if (isPlaying || isRecording) {
        stopMelody()
      }

      // Cancel melody generation if in progress
      setIsGeneratingMelody(false)

      // Clear all melody-related state
      setInstrument(newInstrument)
      clearSelection()
      clearMelody()
      triggerClearChordsAndScales()
    },
    [
      setInstrument,
      clearSelection,
      clearMelody,
      handleClearRecordedAudio,
      triggerClearChordsAndScales,
      isPlaying,
      isRecording,
      stopMelody,
    ]
  )

  const handleOctaveRangeChange = useCallback(
    (newLowerOctaves: number, newHigherOctaves: number): void => {
      setLowerOctaves(newLowerOctaves)
      setHigherOctaves(newHigherOctaves)
    },
    []
  )

  const handleCurrentlyPlayingNoteChange = useCallback(
    (index: number | null): void => {
      setCurrentlyPlayingNoteIndex(index)
    },
    [setCurrentlyPlayingNoteIndex]
  )

  // Custom navigateToSandbox that resets all state for a fresh sandbox environment
  const navigateToSandbox = useCallback((): void => {
    // Stop any playing melody
    if (isPlaying) {
      stopMelody()
    }

    // Clear all melody-related state
    clearSelection()
    clearMelody()
    handleClearRecordedAudio()
    clearChanges()
    triggerClearChordsAndScales()
    setShowNotes(false)
    setPlaybackProgress(0)
    setMelodyDuration(0)

    // Reset settings to defaults (BPM, beats, etc.)
    resetSettings()

    // Reset instrument to default (keyboard)
    setInstrument('keyboard')

    // Reset octave ranges to default (0, 0)
    setLowerOctaves(0)
    setHigherOctaves(0)

    // Finally navigate to sandbox
    navigateToSandboxOriginal()
  }, [
    isPlaying,
    stopMelody,
    clearSelection,
    clearMelody,
    handleClearRecordedAudio,
    clearChanges,
    triggerClearChordsAndScales,
    setShowNotes,
    setPlaybackProgress,
    setMelodyDuration,
    resetSettings,
    setInstrument,
    navigateToSandboxOriginal,
  ])

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
    numberOfBeats,
    chordMode,
    flashingInputs,
    activeInputs,
    navigateToHome,
    navigateToSandbox,
    navigateToSongs,
    navigateToClassroom,
    navigateToProfile,
    navigateToDashboard,
    profileUserId,
    setBpm,
    setNumberOfBeats,
    setChordMode,
    triggerInputFlash,
    setInputActive,
    setCurrentPage,

    // Instrument Config
    instrument,
    keyboardOctaves,
    clearChordsAndScalesTrigger,
    setInstrument,
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
    currentlyPlayingNoteIndex,
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
    melodyBpm,

    // Handlers
    handleNoteClick,
    handleGenerateMelody,
    handlePlayMelody,
    handleInstrumentChange,
    handleOctaveRangeChange,
    handleCurrentlyPlayingNoteChange,

    // Scale/Chord Management
    appliedChords,
    appliedScales,
    scaleChordManagement,

    // Octave Range
    lowerOctaves,
    higherOctaves,
  }

  return <InstrumentContext.Provider value={value}>{children}</InstrumentContext.Provider>
}

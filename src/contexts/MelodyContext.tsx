import { createContext, useContext, ReactNode, useCallback, useState, useEffect } from 'react'
import { useMelodyGenerator } from '../hooks/useMelodyGenerator'
import { useMelodyPlayer } from '../hooks/useMelodyPlayer'
import { useMelodyChanges } from '../hooks/useMelodyChanges'
import { useAudioContext } from './AudioContext'
import { useUI } from './UIContext'
import { useInstrumentConfigContext } from './InstrumentConfigContext'
import { notes, generateNotesWithSeparateOctaves, type Note } from '../utils/notes'
import type { InstrumentType } from '../types/instrument'

interface MelodyContextType {
  // Note Selection
  selectedNotes: Note[]
  selectNote: (note: Note, mode?: 'range' | 'multi') => void
  isSelected: (note: Note) => boolean
  clearSelection: () => void
  clearTrigger: number
  setGuitarNotes: (notes: Note[]) => void

  // Melody Generation
  generatedMelody: Note[]
  generateMelody: (notes: Note[], count: number, instrument: InstrumentType, mode: 'range' | 'multi', notesToUse?: readonly Note[]) => void
  isInMelody: (note: Note, showNotes: boolean) => boolean
  isGeneratingMelody: boolean

  // Melody Playback
  showNotes: boolean
  toggleShowNotes: () => void
  playbackProgress: number
  melodyDuration: number
  setPlaybackProgress: (progress: number) => void
  setMelodyDuration: (duration: number) => void
  calculateMelodyDuration: (notes: number, bpm: number) => number

  // Recording
  recordedAudioBlob: Blob | null
  isAutoRecording: boolean
  handleRecordMelody: () => Promise<Blob | null>
  handleClearRecordedAudio: () => void

  // Changes Tracking
  hasChanges: boolean
  clearChanges: () => void

  // High-level Actions
  handleNoteClick: (note: Note) => Promise<void>
  handleGenerateMelody: () => void
  handlePlayMelody: () => void
}

const MelodyContext = createContext<MelodyContextType | undefined>(undefined)

export const useMelody = () => {
  const context = useContext(MelodyContext)
  if (context === undefined) {
    throw new Error('useMelody must be used within a MelodyProvider')
  }
  return context
}

interface MelodyProviderProps {
  children: ReactNode
}

export const MelodyProvider: React.FC<MelodyProviderProps> = ({ children }) => {
  const [isGeneratingMelody, setIsGeneratingMelody] = useState(false)

  // Get dependencies from other contexts
  const audio = useAudioContext()
  const ui = useUI()
  const config = useInstrumentConfigContext()

  // Melody generation and selection
  const melodyGen = useMelodyGenerator()

  // Melody player
  const melodyPlayer = useMelodyPlayer({
    generatedMelody: melodyGen.generatedMelody,
    bpm: ui.bpm,
    isPlaying: audio.isPlaying,
    isRecording: audio.isRecording,
    recordMelody: audio.recordMelody,
    stopMelody: audio.stopMelody,
    instrument: config.instrument
  })

  // Changes tracking
  const changes = useMelodyChanges({
    selectedNotes: melodyGen.selectedNotes,
    bpm: ui.bpm,
    numberOfNotes: ui.numberOfNotes,
    generatedMelody: melodyGen.generatedMelody,
    instrument: config.instrument,
    keyboardSelectionMode: config.keyboardSelectionMode
  })

  // Turn off generating indicator when recorded audio is ready
  useEffect(() => {
    if (melodyPlayer.recordedAudioBlob && isGeneratingMelody) {
      setIsGeneratingMelody(false)
    }
  }, [melodyPlayer.recordedAudioBlob, isGeneratingMelody])

  // Handle note click
  const handleNoteClick = useCallback(async (note: Note): Promise<void> => {
    try {
      // Don't play sounds during melody generation
      if (!isGeneratingMelody && !melodyPlayer.isAutoRecording) {
        if (config.instrument === 'guitar') {
          await audio.playGuitarNote(note.name)
        } else if (config.instrument === 'bass') {
          await audio.playBassNote(note.name)
        } else {
          await audio.playNote(note.name)
        }
      }
      melodyGen.selectNote(note, config.keyboardSelectionMode)
    } catch (error) {
      // Error handling done in audio layer
    }
  }, [config.instrument, audio, melodyGen, config.keyboardSelectionMode, isGeneratingMelody, melodyPlayer.isAutoRecording])

  // Handle melody generation
  const handleGenerateMelody = useCallback((): void => {
    setIsGeneratingMelody(true)

    // Hide notes before generating new melody
    melodyPlayer.setShowNotes(false)

    const melodyNotes = config.instrument === 'keyboard' && (config.keyboardOctaves.lower !== 0 || config.keyboardOctaves.higher !== 0)
      ? generateNotesWithSeparateOctaves(config.keyboardOctaves.lower, config.keyboardOctaves.higher)
      : notes

    const selectedNotesSnapshot = [...melodyGen.selectedNotes]

    melodyGen.generateMelody(melodyNotes, ui.numberOfNotes, config.instrument, config.keyboardSelectionMode, selectedNotesSnapshot)

    const duration = melodyPlayer.calculateMelodyDuration(ui.numberOfNotes, ui.bpm, config.instrument)
    melodyPlayer.setMelodyDuration(duration)
    melodyPlayer.setPlaybackProgress(0)
    melodyPlayer.handleClearRecordedAudio()
    changes.clearChanges()
  }, [melodyGen, ui, config, melodyPlayer, changes])

  // Handle melody playback
  const handlePlayMelody = useCallback((): void => {
    if (audio.isPlaying) {
      audio.stopMelody()
      melodyPlayer.setPlaybackProgress(0)
    } else {
      if (melodyGen.generatedMelody.length === 0) {
        console.warn('No melody to play. Generate a melody first.')
        return
      }

      melodyPlayer.setPlaybackProgress(0)

      if (config.instrument === 'guitar') {
        audio.playGuitarMelody([...melodyGen.generatedMelody], ui.bpm)
      } else if (config.instrument === 'bass') {
        audio.playBassMelody([...melodyGen.generatedMelody], ui.bpm)
      } else {
        audio.playMelody([...melodyGen.generatedMelody], ui.bpm)
      }
    }
  }, [audio, melodyGen.generatedMelody, config.instrument, ui.bpm, melodyPlayer])

  const value: MelodyContextType = {
    // Note Selection
    selectedNotes: melodyGen.selectedNotes,
    selectNote: melodyGen.selectNote,
    isSelected: melodyGen.isSelected,
    clearSelection: melodyGen.clearSelection,
    clearTrigger: melodyGen.clearTrigger,
    setGuitarNotes: melodyGen.setGuitarNotes,

    // Melody Generation
    generatedMelody: melodyGen.generatedMelody,
    generateMelody: melodyGen.generateMelody,
    isInMelody: melodyGen.isInMelody,
    isGeneratingMelody,

    // Melody Playback
    showNotes: melodyPlayer.showNotes,
    toggleShowNotes: melodyPlayer.toggleShowNotes,
    playbackProgress: melodyPlayer.playbackProgress,
    melodyDuration: melodyPlayer.melodyDuration,
    setPlaybackProgress: melodyPlayer.setPlaybackProgress,
    setMelodyDuration: melodyPlayer.setMelodyDuration,
    calculateMelodyDuration: melodyPlayer.calculateMelodyDuration,

    // Recording
    recordedAudioBlob: melodyPlayer.recordedAudioBlob,
    isAutoRecording: melodyPlayer.isAutoRecording,
    handleRecordMelody: melodyPlayer.handleRecordMelody,
    handleClearRecordedAudio: melodyPlayer.handleClearRecordedAudio,

    // Changes Tracking
    hasChanges: changes.hasChanges,
    clearChanges: changes.clearChanges,

    // High-level Actions
    handleNoteClick,
    handleGenerateMelody,
    handlePlayMelody
  }

  return <MelodyContext.Provider value={value}>{children}</MelodyContext.Provider>
}
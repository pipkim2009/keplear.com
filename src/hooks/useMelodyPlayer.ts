import { useReducer, useCallback, useEffect, useRef } from 'react'
import {
  melodyReducer,
  initialMelodyState,
  type MelodyState,
  type MelodyAction
} from '../reducers/melodyReducer'
import type { Note } from '../utils/notes'
import type { InstrumentType } from '../reducers/instrumentReducer'

interface UseMelodyPlayerProps {
  generatedMelody: readonly Note[]
  bpm: number
  isPlaying: boolean
  isRecording: boolean
  recordMelody: (notes: readonly Note[], bpm: number, instrument: InstrumentType, chordMode?: 'arpeggiator' | 'progression') => Promise<Blob | null>
  stopMelody: () => void
  instrument: InstrumentType
  chordMode?: 'arpeggiator' | 'progression'
}

interface UseMelodyPlayerReturn {
  // State
  readonly playbackProgress: number
  readonly melodyDuration: number
  readonly hasRecordedAudio: boolean
  readonly recordedAudioBlob: Blob | null
  readonly isAutoRecording: boolean
  readonly showNotes: boolean
  readonly currentlyPlayingNoteIndex: number | null

  // Actions
  setPlaybackProgress: (progress: number) => void
  setMelodyDuration: (duration: number) => void
  toggleShowNotes: () => void
  setShowNotes: (show: boolean) => void
  handleRecordMelody: () => Promise<Blob | null>
  handleClearRecordedAudio: () => void
  resetPlayback: () => void
  resetRecording: () => void
  clearAllAudio: () => void
  setCurrentlyPlayingNoteIndex: (index: number | null) => void

  // Computed values
  calculateMelodyDuration: (melodyLength: number, bpm: number, instrument: InstrumentType) => number
}

/**
 * Custom hook for managing melody playback and recording state
 * Handles progress tracking, auto-recording, and audio state management
 */
export const useMelodyPlayer = ({
  generatedMelody,
  bpm,
  isPlaying,
  isRecording,
  recordMelody,
  stopMelody,
  instrument,
  chordMode = 'arpeggiator'
}: UseMelodyPlayerProps): UseMelodyPlayerReturn => {
  const [state, dispatch] = useReducer(melodyReducer, initialMelodyState)

  // Ref to track if recording should be aborted (e.g., during instrument change)
  const abortRecordingRef = useRef(false)

  // Calculate melody duration in milliseconds
  const calculateMelodyDuration = useCallback((melodyLength: number, bpm: number, instrument: InstrumentType) => {
    if (melodyLength === 0) return 0
    // Match the exact timing from useAudio.ts:
    // - Each note has a delay of (60 / bpm) * 1000 milliseconds between notes
    // - Final delay: instrument-specific release time
    const noteDuration = (60 / bpm) * 1000
    const instrumentDelays = {
      keyboard: 1500, // 1.5 seconds
      guitar: 1000,   // 1.0 seconds
      bass: 1500      // 1.5 seconds
    }
    const finalDelay = instrumentDelays[instrument]
    return (melodyLength - 1) * noteDuration + finalDelay
  }, [])

  // Action creators
  const setPlaybackProgress = useCallback((progress: number) => {
    dispatch({ type: 'SET_PLAYBACK_PROGRESS', payload: progress })
  }, [])

  const setMelodyDuration = useCallback((duration: number) => {
    dispatch({ type: 'SET_MELODY_DURATION', payload: duration })
  }, [])

  const toggleShowNotes = useCallback(() => {
    dispatch({ type: 'TOGGLE_SHOW_NOTES' })
  }, [])

  const setShowNotes = useCallback((show: boolean) => {
    dispatch({ type: 'SET_SHOW_NOTES', payload: show })
  }, [])

  const handleRecordMelody = useCallback(async (): Promise<Blob | null> => {
    if (generatedMelody.length === 0) {
      console.warn('No melody to record. Generate a melody first.')
      return null
    }

    const result = await recordMelody([...generatedMelody], bpm, instrument, chordMode)

    // Only dispatch if recording wasn't aborted (e.g., during instrument change)
    if (result && !abortRecordingRef.current) {
      dispatch({ type: 'SET_RECORDED_AUDIO_BLOB', payload: result })
    }
    return result
  }, [recordMelody, generatedMelody, bpm, instrument, chordMode])

  const handleClearRecordedAudio = useCallback(() => {
    // Abort any ongoing recording
    abortRecordingRef.current = true
    dispatch({ type: 'RESET_RECORDING' })
  }, [])

  const resetPlayback = useCallback(() => {
    dispatch({ type: 'RESET_PLAYBACK' })
  }, [])

  const resetRecording = useCallback(() => {
    dispatch({ type: 'RESET_RECORDING' })
  }, [])

  const clearAllAudio = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL_AUDIO' })
  }, [])

  const setCurrentlyPlayingNoteIndex = useCallback((index: number | null) => {
    dispatch({ type: 'SET_CURRENTLY_PLAYING_NOTE', payload: index })
  }, [])

  // Progress tracking effect - only for ToneJS playback
  useEffect(() => {
    let progressInterval: NodeJS.Timeout | null = null

    if (isPlaying && state.melodyDuration > 0) {
      const startTime = Date.now()
      const noteDuration = (60 / bpm) * 1000 // Time between notes in milliseconds

      progressInterval = setInterval(() => {
        const elapsed = Date.now() - startTime
        if (elapsed >= state.melodyDuration) {
          dispatch({ type: 'SET_PLAYBACK_PROGRESS', payload: state.melodyDuration })
          dispatch({ type: 'SET_CURRENTLY_PLAYING_NOTE', payload: null })
          clearInterval(progressInterval!)
        } else {
          dispatch({ type: 'SET_PLAYBACK_PROGRESS', payload: elapsed })

          // Calculate which note is currently playing based on elapsed time
          const currentNoteIndex = Math.floor(elapsed / noteDuration)
          if (currentNoteIndex < generatedMelody.length) {
            dispatch({ type: 'SET_CURRENTLY_PLAYING_NOTE', payload: currentNoteIndex })
          } else {
            dispatch({ type: 'SET_CURRENTLY_PLAYING_NOTE', payload: null })
          }
        }
      }, 50) // Update every 50ms for smooth progress
    } else if (!isPlaying && !state.hasRecordedAudio) {
      // Only reset progress if we don't have recorded audio loaded
      dispatch({ type: 'RESET_PLAYBACK' })
    }

    return () => {
      if (progressInterval) {
        clearInterval(progressInterval)
      }
    }
  }, [isPlaying, state.hasRecordedAudio, state.melodyDuration, bpm, generatedMelody.length])

  // Auto-record melody when it changes
  useEffect(() => {
    if (generatedMelody.length > 0 && !isPlaying && !isRecording && !state.isAutoRecording && !state.hasRecordedAudio) {
      // Reset abort flag for new recording
      abortRecordingRef.current = false

      const autoRecord = async () => {
        try {
          dispatch({ type: 'SET_IS_AUTO_RECORDING', payload: true })

          // Ensure any previous playback is stopped
          stopMelody()

          const result = await handleRecordMelody()

          // Only set the recorded audio if recording wasn't aborted
          if (result && !abortRecordingRef.current) {
            dispatch({ type: 'SET_HAS_RECORDED_AUDIO', payload: true })
            dispatch({ type: 'SET_RECORDED_AUDIO_BLOB', payload: result })
          }
        } catch (error) {
          console.warn('Auto-recording failed:', error)
        } finally {
          // Only reset auto-recording flag if not aborted
          if (!abortRecordingRef.current) {
            dispatch({ type: 'SET_IS_AUTO_RECORDING', payload: false })
          } else {
            // If aborted, ensure everything is reset
            dispatch({ type: 'SET_IS_AUTO_RECORDING', payload: false })
            dispatch({ type: 'RESET_RECORDING' })
          }
        }
      }

      autoRecord()
    }
  }, [generatedMelody.length, isPlaying, isRecording, state.isAutoRecording, state.hasRecordedAudio, stopMelody, handleRecordMelody])

  return {
    // State
    playbackProgress: state.playbackProgress,
    melodyDuration: state.melodyDuration,
    hasRecordedAudio: state.hasRecordedAudio,
    recordedAudioBlob: state.recordedAudioBlob,
    isAutoRecording: state.isAutoRecording,
    showNotes: state.showNotes,
    currentlyPlayingNoteIndex: state.currentlyPlayingNoteIndex,

    // Actions
    setPlaybackProgress,
    setMelodyDuration,
    toggleShowNotes,
    setShowNotes,
    handleRecordMelody,
    handleClearRecordedAudio,
    resetPlayback,
    resetRecording,
    clearAllAudio,
    setCurrentlyPlayingNoteIndex,

    // Computed values
    calculateMelodyDuration
  }
}
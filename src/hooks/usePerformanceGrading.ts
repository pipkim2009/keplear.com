/**
 * Performance grading hook
 *
 * GUIDED MODE: BPM-synced note detection
 * - 4-beat count-in with metronome clicks
 * - Each note gets one beat to play
 * - Listening window synced to BPM
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import type { Note } from '../utils/notes'
import type { PitchDetectionResult } from './usePitchDetection'
import { advancedNoteMatch, type NoteMatchResult } from '../utils/pitchUtils'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Result for a single note in the performance
 */
export interface NoteResult {
  /** Index in the melody */
  noteIndex: number
  /** Expected note name */
  expectedNote: string
  /** What the user actually played */
  playedNote: string | null
  /** Whether the pitch was correct */
  isCorrect: boolean
  /** Match confidence (0-1) */
  matchConfidence?: number
  /** How many cents off from perfect */
  centsOff?: number
  /** Type of match (exact, pitch-class, octave-error, etc.) */
  matchType?: NoteMatchResult['matchType']
  /** Whether this was a timeout (no note played) */
  isTimeout?: boolean
}

/**
 * Overall performance result
 */
export interface PerformanceResult {
  noteResults: NoteResult[]
  /** Number of correct notes */
  correctCount: number
  /** Number of wrong notes */
  missCount: number
  /** Accuracy percentage */
  accuracy: number
  /** Whether passed (>60%) */
  passed: boolean
}

/**
 * Current state during performance
 */
export interface PerformanceState {
  /** Whether performance is active */
  isActive: boolean
  /** Current expected note (next to play) */
  currentExpectedNote: Note | null
  /** Current note index */
  currentNoteIndex: number
  /** Results so far */
  noteResults: NoteResult[]
  /** Guided mode state */
  guided: {
    /** Whether in count-in phase */
    isCountingIn: boolean
    /** Current beat in count-in (1, 2, 3, 4) */
    countInBeat: number
    /** Whether listening window is open */
    isListening: boolean
    /** Current beat number (1-based) */
    currentBeat: number
    /** BPM being used */
    bpm: number
    /** Milliseconds per beat */
    beatDuration: number
  }
}

interface UsePerformanceGradingReturn {
  /** Start a performance session */
  startPerformance: (melody: Note[], bpm?: number) => void
  /** Stop the performance */
  stopPerformance: () => void
  /** Process a pitch detection (called on each detection) */
  processPitch: (pitch: PitchDetectionResult) => void
  /** Current state */
  state: PerformanceState
  /** Final result (when complete) */
  result: PerformanceResult | null
  /** Last note result for immediate feedback */
  lastNoteResult: NoteResult | null
  /** Skip current note (mark as timeout) */
  skipNote: () => void
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const PASS_THRESHOLD = 60 // 60% to pass
const COUNT_IN_BEATS = 4 // 4 beat count-in
const DEFAULT_BPM = 80 // Default tempo

// ============================================================================
// AUDIO UTILS
// ============================================================================

let audioContext: AudioContext | null = null

const getAudioContext = (): AudioContext => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
  }
  return audioContext
}

/**
 * Play a metronome click sound
 */
const playClick = (isAccent: boolean = false) => {
  try {
    const ctx = getAudioContext()
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    // Higher pitch for accent (beat 1), lower for others
    oscillator.frequency.value = isAccent ? 1000 : 800
    oscillator.type = 'sine'

    // Short click envelope
    const now = ctx.currentTime
    gainNode.gain.setValueAtTime(0, now)
    gainNode.gain.linearRampToValueAtTime(isAccent ? 0.5 : 0.3, now + 0.01)
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1)

    oscillator.start(now)
    oscillator.stop(now + 0.1)
  } catch (e) {
    console.warn('Could not play click:', e)
  }
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export const usePerformanceGrading = (): UsePerformanceGradingReturn => {
  // State
  const [state, setState] = useState<PerformanceState>({
    isActive: false,
    currentExpectedNote: null,
    currentNoteIndex: 0,
    noteResults: [],
    guided: {
      isCountingIn: false,
      countInBeat: 0,
      isListening: false,
      currentBeat: 0,
      bpm: DEFAULT_BPM,
      beatDuration: 60000 / DEFAULT_BPM
    }
  })
  const [result, setResult] = useState<PerformanceResult | null>(null)
  const [lastNoteResult, setLastNoteResult] = useState<NoteResult | null>(null)

  // Refs to avoid stale closure issues
  const melodyRef = useRef<Note[]>([])
  const isActiveRef = useRef(false)
  const currentNoteIndexRef = useRef(0)
  const isListeningRef = useRef(false)
  const hasDetectedNoteRef = useRef(false)
  const bpmRef = useRef(DEFAULT_BPM)

  // Timer refs
  const beatTimerRef = useRef<number | null>(null)

  /**
   * Clear all timers
   */
  const clearAllTimers = useCallback(() => {
    if (beatTimerRef.current) {
      clearTimeout(beatTimerRef.current)
      beatTimerRef.current = null
    }
  }, [])

  /**
   * Calculate final result
   */
  const calculateResult = useCallback((noteResults: NoteResult[]): PerformanceResult => {
    const totalNotes = noteResults.length
    const correctCount = noteResults.filter(r => r.isCorrect).length
    const missCount = totalNotes - correctCount
    const accuracy = totalNotes > 0 ? Math.round((correctCount / totalNotes) * 100) : 0

    return {
      noteResults,
      correctCount,
      missCount,
      accuracy,
      passed: accuracy >= PASS_THRESHOLD
    }
  }, [])

  /**
   * Handle note result and move to next note
   */
  const handleNoteResult = useCallback((noteResult: NoteResult, noteResults: NoteResult[]) => {
    const melody = melodyRef.current
    const nextIndex = noteResult.noteIndex + 1
    currentNoteIndexRef.current = nextIndex
    isListeningRef.current = false
    hasDetectedNoteRef.current = false

    const newResults = [...noteResults, noteResult]
    setLastNoteResult(noteResult)

    // Check if performance is complete
    const isComplete = nextIndex >= melody.length
    if (isComplete) {
      isActiveRef.current = false
      clearAllTimers()
      const finalResult = calculateResult(newResults)
      setResult(finalResult)

      setState(prev => ({
        ...prev,
        noteResults: newResults,
        currentNoteIndex: nextIndex,
        currentExpectedNote: null,
        isActive: false,
        guided: {
          ...prev.guided,
          isCountingIn: false,
          isListening: false
        }
      }))
      return
    }

    // Update state for next note
    setState(prev => ({
      ...prev,
      noteResults: newResults,
      currentNoteIndex: nextIndex,
      currentExpectedNote: melody[nextIndex],
      guided: {
        ...prev.guided,
        isListening: false,
        currentBeat: prev.guided.currentBeat + 1
      }
    }))

    // Schedule next beat (next note's listening window)
    const beatDuration = 60000 / bpmRef.current
    beatTimerRef.current = window.setTimeout(() => {
      startListeningForNote(nextIndex)
    }, beatDuration)
  }, [calculateResult, clearAllTimers])

  /**
   * Start listening for a specific note
   */
  const startListeningForNote = useCallback((noteIndex: number) => {
    if (!isActiveRef.current) return

    const melody = melodyRef.current
    if (noteIndex >= melody.length) return

    isListeningRef.current = true
    hasDetectedNoteRef.current = false

    // Play click on the beat
    playClick(false)

    setState(prev => ({
      ...prev,
      currentExpectedNote: melody[noteIndex],
      currentNoteIndex: noteIndex,
      guided: {
        ...prev.guided,
        isCountingIn: false,
        isListening: true,
        currentBeat: prev.guided.currentBeat + 1
      }
    }))

    // Set timeout for this beat - if no note detected, mark as timeout
    const beatDuration = 60000 / bpmRef.current
    beatTimerRef.current = window.setTimeout(() => {
      if (isListeningRef.current && !hasDetectedNoteRef.current && isActiveRef.current) {
        const expectedNote = melody[noteIndex]
        const timeoutResult: NoteResult = {
          noteIndex,
          expectedNote: expectedNote.name,
          playedNote: null,
          isCorrect: false,
          isTimeout: true
        }

        setState(prev => {
          handleNoteResult(timeoutResult, prev.noteResults)
          return prev
        })
      }
    }, beatDuration)
  }, [handleNoteResult])

  /**
   * Run count-in beats
   */
  const startCountIn = useCallback(() => {
    if (!isActiveRef.current) return

    const beatDuration = 60000 / bpmRef.current
    let beat = 0

    const countInTick = () => {
      if (!isActiveRef.current) return

      beat++

      // Play click (accent on beat 1)
      playClick(beat === 1)

      setState(prev => ({
        ...prev,
        guided: {
          ...prev.guided,
          isCountingIn: true,
          countInBeat: beat
        }
      }))

      if (beat < COUNT_IN_BEATS) {
        // Schedule next count-in beat
        beatTimerRef.current = window.setTimeout(countInTick, beatDuration)
      } else {
        // Count-in done, start first note on next beat
        beatTimerRef.current = window.setTimeout(() => {
          startListeningForNote(0)
        }, beatDuration)
      }
    }

    // Start first beat immediately
    countInTick()
  }, [startListeningForNote])

  /**
   * Start a new performance
   */
  const startPerformance = useCallback((melody: Note[], bpm: number = DEFAULT_BPM) => {
    if (melody.length === 0) return

    clearAllTimers()

    melodyRef.current = melody
    isActiveRef.current = true
    currentNoteIndexRef.current = 0
    isListeningRef.current = false
    hasDetectedNoteRef.current = false
    bpmRef.current = bpm

    const beatDuration = 60000 / bpm

    setResult(null)
    setLastNoteResult(null)
    setState({
      isActive: true,
      currentExpectedNote: melody[0],
      currentNoteIndex: 0,
      noteResults: [],
      guided: {
        isCountingIn: false,
        countInBeat: 0,
        isListening: false,
        currentBeat: 0,
        bpm,
        beatDuration
      }
    })

    // Resume audio context if suspended
    const ctx = getAudioContext()
    if (ctx.state === 'suspended') {
      ctx.resume().then(() => {
        startCountIn()
      })
    } else {
      // Small delay before starting count-in
      setTimeout(() => {
        if (isActiveRef.current) {
          startCountIn()
        }
      }, 300)
    }
  }, [clearAllTimers, startCountIn])

  /**
   * Stop performance manually
   */
  const stopPerformance = useCallback(() => {
    clearAllTimers()
    isActiveRef.current = false
    isListeningRef.current = false

    setState(prev => {
      if (!prev.isActive) return prev

      const finalResult = calculateResult(prev.noteResults)
      setResult(finalResult)

      return {
        ...prev,
        isActive: false,
        guided: {
          ...prev.guided,
          isCountingIn: false,
          isListening: false
        }
      }
    })
  }, [clearAllTimers, calculateResult])

  /**
   * Skip current note (mark as timeout)
   */
  const skipNote = useCallback(() => {
    if (!isActiveRef.current || !isListeningRef.current) return

    clearAllTimers()

    const noteIndex = currentNoteIndexRef.current
    const melody = melodyRef.current
    if (noteIndex >= melody.length) return

    const expectedNote = melody[noteIndex]
    const skipResult: NoteResult = {
      noteIndex,
      expectedNote: expectedNote.name,
      playedNote: null,
      isCorrect: false,
      isTimeout: true
    }

    setState(prev => {
      handleNoteResult(skipResult, prev.noteResults)
      return prev
    })
  }, [clearAllTimers, handleNoteResult])

  /**
   * Process a pitch detection result
   */
  const processPitch = useCallback((pitch: PitchDetectionResult) => {
    // Only process if we're in a listening window
    if (!isActiveRef.current || !isListeningRef.current || !pitch.note) return

    // Already detected a note for this beat
    if (hasDetectedNoteRef.current) return

    const melody = melodyRef.current
    const currentIndex = currentNoteIndexRef.current

    if (currentIndex >= melody.length) return

    const expectedNote = melody[currentIndex]

    // Use advanced note matching
    const matchResult = advancedNoteMatch(pitch.note, pitch.frequency, expectedNote.name, {
      toleranceCents: 50,
      allowOctaveErrors: true,
      strictOctave: false
    })

    // Mark that we've detected a note
    hasDetectedNoteRef.current = true

    // Clear the timeout since we got a note
    if (beatTimerRef.current) {
      clearTimeout(beatTimerRef.current)
      beatTimerRef.current = null
    }

    const noteResult: NoteResult = {
      noteIndex: currentIndex,
      expectedNote: expectedNote.name,
      playedNote: pitch.note,
      isCorrect: matchResult.isCorrect,
      matchConfidence: matchResult.confidence,
      centsOff: matchResult.centsOff,
      matchType: matchResult.matchType
    }

    setState(prev => {
      handleNoteResult(noteResult, prev.noteResults)
      return prev
    })
  }, [handleNoteResult])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAllTimers()
    }
  }, [clearAllTimers])

  return {
    startPerformance,
    stopPerformance,
    processPitch,
    state,
    result,
    lastNoteResult,
    skipNote
  }
}

/**
 * Performance grading hook
 *
 * GUIDED MODE: BPM-synced note detection
 * - 4-beat count-in with metronome clicks
 * - Each note gets one beat to play
 * - Single interval-based beat loop for consistent timing
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
  const noteResultsRef = useRef<NoteResult[]>([])
  const isActiveRef = useRef(false)
  const currentNoteIndexRef = useRef(0)
  const isListeningRef = useRef(false)
  const hasDetectedNoteRef = useRef(false)
  const bpmRef = useRef(DEFAULT_BPM)
  const beatCountRef = useRef(0) // Total beats since start (count-in + notes)

  // Single interval ref for the beat loop
  const beatIntervalRef = useRef<number | null>(null)

  /**
   * Clear the beat interval
   */
  const clearBeatInterval = useCallback(() => {
    if (beatIntervalRef.current) {
      clearInterval(beatIntervalRef.current)
      beatIntervalRef.current = null
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
   * End the performance
   */
  const endPerformance = useCallback(() => {
    clearBeatInterval()
    isActiveRef.current = false
    isListeningRef.current = false

    const finalResult = calculateResult(noteResultsRef.current)
    setResult(finalResult)

    setState(prev => ({
      ...prev,
      isActive: false,
      currentExpectedNote: null,
      guided: {
        ...prev.guided,
        isCountingIn: false,
        isListening: false
      }
    }))
  }, [clearBeatInterval, calculateResult])

  /**
   * Record a note result
   */
  const recordNoteResult = useCallback((noteResult: NoteResult) => {
    noteResultsRef.current = [...noteResultsRef.current, noteResult]
    setLastNoteResult(noteResult)

    setState(prev => ({
      ...prev,
      noteResults: noteResultsRef.current
    }))
  }, [])

  /**
   * Handle a beat tick - this is called once per beat
   */
  const onBeatTick = useCallback(() => {
    if (!isActiveRef.current) return

    const melody = melodyRef.current
    // Add 1 extra beat after last note to show its result before ending
    const totalBeats = COUNT_IN_BEATS + melody.length + 1

    beatCountRef.current++
    const currentBeat = beatCountRef.current

    // Are we in count-in phase?
    if (currentBeat <= COUNT_IN_BEATS) {
      // Count-in beat
      playClick(currentBeat === 1) // Accent on first beat

      setState(prev => ({
        ...prev,
        guided: {
          ...prev.guided,
          isCountingIn: true,
          countInBeat: currentBeat,
          isListening: false,
          currentBeat
        }
      }))
      return
    }

    // We're in the note-playing phase
    const noteIndex = currentBeat - COUNT_IN_BEATS - 1 // 0-indexed note

    // First, check if the PREVIOUS note timed out (no detection)
    if (noteIndex > 0 && !hasDetectedNoteRef.current && isListeningRef.current) {
      // Previous note wasn't played - record timeout
      const prevNoteIndex = noteIndex - 1
      const prevNote = melody[prevNoteIndex]
      const timeoutResult: NoteResult = {
        noteIndex: prevNoteIndex,
        expectedNote: prevNote.name,
        playedNote: null,
        isCorrect: false,
        isTimeout: true
      }
      recordNoteResult(timeoutResult)
    }

    // Check if we've completed all notes (this is the "result display" beat after last note)
    if (noteIndex >= melody.length) {
      // Check if last note timed out
      if (!hasDetectedNoteRef.current && isListeningRef.current) {
        const lastNoteIndex = melody.length - 1
        const lastNote = melody[lastNoteIndex]
        const timeoutResult: NoteResult = {
          noteIndex: lastNoteIndex,
          expectedNote: lastNote.name,
          playedNote: null,
          isCorrect: false,
          isTimeout: true
        }
        recordNoteResult(timeoutResult)
      }

      // Update state to show we're done listening but still displaying result
      isListeningRef.current = false
      setState(prev => ({
        ...prev,
        guided: {
          ...prev.guided,
          isListening: false,
          currentBeat
        }
      }))

      // Check if this is the final beat (one beat after last note's result was shown)
      if (currentBeat > totalBeats) {
        endPerformance()
      }
      return
    }

    // Start listening for this note
    playClick(false)

    currentNoteIndexRef.current = noteIndex
    isListeningRef.current = true
    hasDetectedNoteRef.current = false

    setState(prev => ({
      ...prev,
      currentExpectedNote: melody[noteIndex],
      currentNoteIndex: noteIndex,
      guided: {
        ...prev.guided,
        isCountingIn: false,
        isListening: true,
        currentBeat
      }
    }))
  }, [endPerformance, recordNoteResult])

  /**
   * Start a new performance
   */
  const startPerformance = useCallback((melody: Note[], bpm: number = DEFAULT_BPM) => {
    if (melody.length === 0) return

    clearBeatInterval()

    // Reset all refs
    melodyRef.current = melody
    noteResultsRef.current = []
    isActiveRef.current = true
    currentNoteIndexRef.current = 0
    isListeningRef.current = false
    hasDetectedNoteRef.current = false
    bpmRef.current = bpm
    beatCountRef.current = 0

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
    const startBeatLoop = () => {
      if (!isActiveRef.current) return

      // Start the beat loop - first beat fires immediately, then every beatDuration
      onBeatTick() // First beat immediately
      beatIntervalRef.current = window.setInterval(onBeatTick, beatDuration)
    }

    if (ctx.state === 'suspended') {
      ctx.resume().then(() => {
        setTimeout(startBeatLoop, 300)
      })
    } else {
      setTimeout(startBeatLoop, 300)
    }
  }, [clearBeatInterval, onBeatTick])

  /**
   * Stop performance manually
   */
  const stopPerformance = useCallback(() => {
    clearBeatInterval()
    isActiveRef.current = false
    isListeningRef.current = false

    setState(prev => {
      if (!prev.isActive) return prev

      const finalResult = calculateResult(noteResultsRef.current)
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
  }, [clearBeatInterval, calculateResult])

  /**
   * Skip current note (mark as timeout)
   */
  const skipNote = useCallback(() => {
    if (!isActiveRef.current || !isListeningRef.current) return

    const noteIndex = currentNoteIndexRef.current
    const melody = melodyRef.current
    if (noteIndex >= melody.length) return

    // Mark as detected so the beat tick doesn't also record a timeout
    hasDetectedNoteRef.current = true
    isListeningRef.current = false

    const expectedNote = melody[noteIndex]
    const skipResult: NoteResult = {
      noteIndex,
      expectedNote: expectedNote.name,
      playedNote: null,
      isCorrect: false,
      isTimeout: true
    }

    recordNoteResult(skipResult)
  }, [recordNoteResult])

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

    // Use advanced note matching - strict octave, no octave errors allowed
    const matchResult = advancedNoteMatch(pitch.note, pitch.frequency, expectedNote.name, {
      toleranceCents: 50,
      allowOctaveErrors: false,
      strictOctave: true
    })

    // Mark that we've detected a note
    hasDetectedNoteRef.current = true
    isListeningRef.current = false

    const noteResult: NoteResult = {
      noteIndex: currentIndex,
      expectedNote: expectedNote.name,
      playedNote: pitch.note,
      isCorrect: matchResult.isCorrect,
      matchConfidence: matchResult.confidence,
      centsOff: matchResult.centsOff,
      matchType: matchResult.matchType
    }

    recordNoteResult(noteResult)

    // Update state to show we're no longer listening
    setState(prev => ({
      ...prev,
      guided: {
        ...prev.guided,
        isListening: false
      }
    }))
  }, [recordNoteResult])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearBeatInterval()
    }
  }, [clearBeatInterval])

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

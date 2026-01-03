/**
 * Performance grading hook
 *
 * Enhanced pitch-based note detection:
 * - Play notes in order
 * - Each note is graded with advanced frequency-based matching
 * - Handles octave errors gracefully
 * - No timing requirements - play at your own pace
 */

import { useState, useCallback, useRef } from 'react'
import type { Note } from '../utils/notes'
import type { PitchDetectionResult } from './usePitchDetection'
import { advancedNoteMatch, isNoteCorrectWithBias, type NoteMatchResult } from '../utils/pitchUtils'

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
}

interface UsePerformanceGradingReturn {
  /** Start a performance session */
  startPerformance: (melody: Note[]) => void
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
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const PASS_THRESHOLD = 60 // 60% to pass

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export const usePerformanceGrading = (): UsePerformanceGradingReturn => {
  // State
  const [state, setState] = useState<PerformanceState>({
    isActive: false,
    currentExpectedNote: null,
    currentNoteIndex: 0,
    noteResults: []
  })
  const [result, setResult] = useState<PerformanceResult | null>(null)
  const [lastNoteResult, setLastNoteResult] = useState<NoteResult | null>(null)

  // Refs to avoid stale closure issues
  const melodyRef = useRef<Note[]>([])
  const lastProcessedOnsetRef = useRef<number>(0)
  const isActiveRef = useRef(false)
  const currentNoteIndexRef = useRef(0)

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
   * Start a new performance
   */
  const startPerformance = useCallback((melody: Note[]) => {
    if (melody.length === 0) return

    melodyRef.current = melody
    lastProcessedOnsetRef.current = 0
    isActiveRef.current = true
    currentNoteIndexRef.current = 0

    setResult(null)
    setLastNoteResult(null)
    setState({
      isActive: true,
      currentExpectedNote: melody[0],
      currentNoteIndex: 0,
      noteResults: []
    })
  }, [])

  /**
   * Stop performance manually
   */
  const stopPerformance = useCallback(() => {
    isActiveRef.current = false

    setState(prev => {
      if (!prev.isActive) return prev

      // Calculate result with current progress
      const finalResult = calculateResult(prev.noteResults)
      setResult(finalResult)

      return { ...prev, isActive: false }
    })
  }, [calculateResult])

  /**
   * Process a pitch detection result
   */
  const processPitch = useCallback((pitch: PitchDetectionResult) => {
    // Use refs to avoid stale closure issues
    if (!isActiveRef.current || !pitch.note) return

    // Only process on note onsets (new notes)
    if (!pitch.isOnset) return

    // Debounce rapid onsets (150ms minimum between notes)
    if (pitch.timestamp - lastProcessedOnsetRef.current < 150) return
    lastProcessedOnsetRef.current = pitch.timestamp

    const melody = melodyRef.current
    const currentIndex = currentNoteIndexRef.current

    // Check if we've finished
    if (currentIndex >= melody.length) return

    const expectedNote = melody[currentIndex]

    // Use advanced note matching with detailed feedback
    // This provides: correct/wrong, confidence, cents off, and match type
    const matchResult = advancedNoteMatch(pitch.note, pitch.frequency, expectedNote.name, {
      toleranceCents: 45, // Slightly tighter than default for better accuracy
      allowOctaveErrors: true, // Accept octave transpositions as correct
      strictOctave: false
    })

    const noteResult: NoteResult = {
      noteIndex: currentIndex,
      expectedNote: expectedNote.name,
      playedNote: pitch.note,
      isCorrect: matchResult.isCorrect,
      matchConfidence: matchResult.confidence,
      centsOff: matchResult.centsOff,
      matchType: matchResult.matchType
    }

    // Update ref immediately for next call
    const nextIndex = currentIndex + 1
    currentNoteIndexRef.current = nextIndex

    // Check if performance is complete
    const isComplete = nextIndex >= melody.length
    if (isComplete) {
      isActiveRef.current = false
    }

    setLastNoteResult(noteResult)

    setState(prev => {
      const newResults = [...prev.noteResults, noteResult]

      if (isComplete) {
        const finalResult = calculateResult(newResults)
        setResult(finalResult)

        return {
          ...prev,
          noteResults: newResults,
          currentNoteIndex: nextIndex,
          currentExpectedNote: null,
          isActive: false
        }
      }

      return {
        ...prev,
        noteResults: newResults,
        currentNoteIndex: nextIndex,
        currentExpectedNote: melody[nextIndex]
      }
    })
  }, [calculateResult])

  return {
    startPerformance,
    stopPerformance,
    processPitch,
    state,
    result,
    lastNoteResult
  }
}

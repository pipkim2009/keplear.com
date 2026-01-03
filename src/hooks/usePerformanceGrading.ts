/**
 * Performance grading hook
 *
 * Simple pitch-based note detection:
 * - Play notes in order
 * - Each note is graded as correct or wrong based on pitch
 * - No timing requirements - play at your own pace
 */

import { useState, useCallback, useRef } from 'react'
import type { Note } from '../utils/notes'
import type { PitchDetectionResult } from './usePitchDetection'
import { isNoteCorrect } from '../utils/pitchUtils'

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

  // Refs
  const melodyRef = useRef<Note[]>([])
  const lastProcessedOnsetRef = useRef<number>(0)

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
    if (!state.isActive || !pitch.note) return

    // Only process on note onsets (new notes)
    if (!pitch.isOnset) return

    // Debounce rapid onsets (150ms minimum between notes)
    if (pitch.timestamp - lastProcessedOnsetRef.current < 150) return
    lastProcessedOnsetRef.current = pitch.timestamp

    const melody = melodyRef.current
    const currentIndex = state.currentNoteIndex

    // Check if we've finished
    if (currentIndex >= melody.length) return

    const expectedNote = melody[currentIndex]

    // Check if pitch matches (comparing pitch class only - octave ignored)
    const isCorrect = isNoteCorrect(pitch.note, expectedNote.name)

    const noteResult: NoteResult = {
      noteIndex: currentIndex,
      expectedNote: expectedNote.name,
      playedNote: pitch.note,
      isCorrect
    }

    setLastNoteResult(noteResult)

    setState(prev => {
      const newResults = [...prev.noteResults, noteResult]
      const nextIndex = currentIndex + 1

      // Check if performance is complete
      if (nextIndex >= melody.length) {
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
  }, [state.isActive, state.currentNoteIndex, calculateResult])

  return {
    startPerformance,
    stopPerformance,
    processPitch,
    state,
    result,
    lastNoteResult
  }
}

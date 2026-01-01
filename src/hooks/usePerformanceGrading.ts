/**
 * Performance grading hook (Yousician-style)
 * Simple: play the right notes in order, no timing requirements
 */

import { useState, useCallback, useRef } from 'react'
import type { Note } from '../utils/notes'
import type { PitchDetectionResult } from './usePitchDetection'
import { isNoteCorrect } from '../utils/pitchUtils'

const MIN_SCORE_TO_PASS = 60

/**
 * Result for a single note in the performance
 */
export interface NoteResult {
  /** Expected note name (e.g., "C4") */
  expectedNote: string
  /** Index in the melody */
  noteIndex: number
  /** What the user actually played, null if missed */
  playedNote: string | null
  /** Whether the note was correct */
  isCorrect: boolean
}

/**
 * Overall performance result
 */
export interface PerformanceResult {
  /** Results for each note */
  noteResults: NoteResult[]
  /** Total score (percentage of correct notes) */
  totalScore: number
  /** Stars earned (1-3) */
  stars: 1 | 2 | 3
  /** Number of correct notes */
  correctCount: number
  /** Number of missed/wrong notes */
  missCount: number
  /** Whether the performance passed */
  passed: boolean
}

/**
 * Current state during an active performance
 */
export interface PerformanceState {
  /** Current note index being evaluated */
  currentNoteIndex: number
  /** Notes results so far */
  noteResults: NoteResult[]
  /** Whether performance is active */
  isActive: boolean
  /** Current expected note */
  currentExpectedNote: Note | null
}

/**
 * Return type for usePerformanceGrading hook
 */
interface UsePerformanceGradingReturn {
  /** Start a new performance session */
  startPerformance: (melody: Note[]) => void
  /** Stop the current performance */
  stopPerformance: () => void
  /** Process a pitch detection result */
  processPitch: (pitch: PitchDetectionResult) => void
  /** Current performance state */
  state: PerformanceState
  /** Final result (after performance ends) */
  result: PerformanceResult | null
  /** Last note result for immediate feedback */
  lastNoteResult: NoteResult | null
}

/**
 * Calculate stars from score percentage
 */
const calculateStars = (score: number): 1 | 2 | 3 => {
  if (score >= 90) return 3
  if (score >= 70) return 2
  return 1
}

/**
 * Hook for grading user performance on a melody
 * No timing - just checks if you play the right notes in order
 */
export const usePerformanceGrading = (): UsePerformanceGradingReturn => {
  const [state, setState] = useState<PerformanceState>({
    currentNoteIndex: 0,
    noteResults: [],
    isActive: false,
    currentExpectedNote: null
  })
  const [result, setResult] = useState<PerformanceResult | null>(null)
  const [lastNoteResult, setLastNoteResult] = useState<NoteResult | null>(null)

  // Refs for data that shouldn't trigger re-renders
  const melodyRef = useRef<Note[]>([])
  const lastProcessedNoteRef = useRef<string | null>(null)

  /**
   * Start a new performance
   */
  const startPerformance = useCallback((melody: Note[]) => {
    if (melody.length === 0) return

    melodyRef.current = melody
    lastProcessedNoteRef.current = null

    setResult(null)
    setLastNoteResult(null)
    setState({
      currentNoteIndex: 0,
      noteResults: [],
      isActive: true,
      currentExpectedNote: melody[0]
    })
  }, [])

  /**
   * End the performance and calculate final result
   */
  const endPerformance = useCallback((noteResults: NoteResult[]) => {
    const correctCount = noteResults.filter(r => r.isCorrect).length
    const missCount = noteResults.length - correctCount
    const totalScore = noteResults.length > 0
      ? Math.round((correctCount / noteResults.length) * 100)
      : 0

    const performanceResult: PerformanceResult = {
      noteResults,
      totalScore,
      stars: calculateStars(totalScore),
      correctCount,
      missCount,
      passed: totalScore >= MIN_SCORE_TO_PASS
    }

    setResult(performanceResult)
    setState(prev => ({
      ...prev,
      isActive: false,
      noteResults
    }))
  }, [])

  /**
   * Stop performance manually
   */
  const stopPerformance = useCallback(() => {
    if (state.isActive) {
      endPerformance(state.noteResults)
    }
  }, [state.isActive, state.noteResults, endPerformance])

  /**
   * Process a pitch detection result
   */
  const processPitch = useCallback((pitch: PitchDetectionResult) => {
    if (!state.isActive || !pitch.note) return

    const melody = melodyRef.current
    const noteIndex = state.currentNoteIndex

    // Ignore if we already processed this exact note (debounce)
    if (pitch.note === lastProcessedNoteRef.current) return
    lastProcessedNoteRef.current = pitch.note

    // Check if performance is complete
    if (noteIndex >= melody.length) {
      endPerformance(state.noteResults)
      return
    }

    const expectedNote = melody[noteIndex]
    const isCorrect = isNoteCorrect(pitch.note, expectedNote.name)

    const noteResult: NoteResult = {
      expectedNote: expectedNote.name,
      noteIndex,
      playedNote: pitch.note,
      isCorrect
    }

    setLastNoteResult(noteResult)

    setState(prev => {
      const newResults = [...prev.noteResults, noteResult]
      const nextIndex = noteIndex + 1

      // Check if performance is complete
      if (nextIndex >= melody.length) {
        setTimeout(() => endPerformance(newResults), 0)
      }

      return {
        ...prev,
        currentNoteIndex: nextIndex,
        noteResults: newResults,
        currentExpectedNote: melody[nextIndex] || null
      }
    })
  }, [state.isActive, state.currentNoteIndex, state.noteResults, endPerformance])

  return {
    startPerformance,
    stopPerformance,
    processPitch,
    state,
    result,
    lastNoteResult
  }
}

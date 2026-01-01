/**
 * LiveFeedback Component
 * Real-time visual feedback during performance (Yousician-style)
 */

import { Mic, MicOff } from 'lucide-react'
import type { PitchDetectionResult } from '../../hooks/usePitchDetection'
import type { NoteResult, PerformanceState } from '../../hooks/usePerformanceGrading'
import styles from '../../styles/PitchFeedback.module.css'

interface LiveFeedbackProps {
  /** Whether the microphone is currently listening */
  isListening: boolean
  /** Start listening to microphone */
  onStartListening: () => void
  /** Stop listening */
  onStopListening: () => void
  /** Current pitch detection result */
  currentPitch: PitchDetectionResult | null
  /** Current volume level (0-1) */
  volumeLevel: number
  /** Current performance state */
  performanceState: PerformanceState
  /** Last note result for immediate feedback */
  lastNoteResult: NoteResult | null
  /** Any error message */
  error: string | null
  /** Microphone permission state */
  permission: 'prompt' | 'granted' | 'denied' | 'error'
}

export const LiveFeedback: React.FC<LiveFeedbackProps> = ({
  isListening,
  onStartListening,
  onStopListening,
  currentPitch,
  volumeLevel,
  performanceState,
  lastNoteResult,
  error,
  permission
}) => {
  // Determine note display state - compare pitch class only (ignore octave)
  const getNoteDisplayClass = (): string => {
    if (!currentPitch?.note || !performanceState.currentExpectedNote) {
      return ''
    }

    // Extract just the note name without octave
    const detectedMatch = currentPitch.note.match(/^([A-G]#?)/)
    const expectedMatch = performanceState.currentExpectedNote.name.match(/^([A-G]#?)/)

    if (!detectedMatch || !expectedMatch) return ''

    const detected = detectedMatch[1]
    const expected = expectedMatch[1]

    if (detected === expected) {
      return styles.correct
    }

    return styles.wrong
  }

  return (
    <div className={styles.liveFeedbackContainer}>
      {/* Error Message */}
      {error && (
        <div className={styles.errorMessage}>
          {error}
        </div>
      )}

      {/* Permission Prompt */}
      {permission === 'denied' && (
        <div className={styles.permissionPrompt}>
          <MicOff className={styles.permissionIcon} size={48} />
          <p className={styles.permissionText}>
            Microphone access is required for real-time feedback.
            Please allow microphone access in your browser settings and refresh the page.
          </p>
        </div>
      )}

      {/* Microphone Button */}
      {permission !== 'denied' && (
        <button
          className={`${styles.microphoneButton} ${isListening ? styles.listening : ''}`}
          onClick={isListening ? onStopListening : onStartListening}
        >
          {isListening ? (
            <>
              <MicOff size={20} />
              Stop Listening
            </>
          ) : (
            <>
              <Mic size={20} />
              Start Listening
            </>
          )}
        </button>
      )}

      {/* Volume Meter */}
      {isListening && (
        <div className={styles.volumeMeterContainer}>
          <span className={styles.volumeMeterLabel}>Input Level</span>
          <div className={styles.volumeMeter}>
            <div
              className={styles.volumeMeterFill}
              style={{ width: `${volumeLevel * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Pitch Display */}
      {isListening && (
        <div className={styles.pitchDisplay}>
          <span className={`${styles.currentNote} ${getNoteDisplayClass()}`}>
            {currentPitch?.note || '--'}
          </span>
          {performanceState.currentExpectedNote && (
            <span className={styles.expectedNote}>
              Expected: {performanceState.currentExpectedNote.name}
            </span>
          )}
        </div>
      )}

      {/* Last Note Result Feedback */}
      {lastNoteResult && performanceState.isActive && (
        <div className={`${styles.noteResultFeedback} ${lastNoteResult.isCorrect ? styles.correct : styles.miss}`}>
          {lastNoteResult.isCorrect ? 'Correct!' : 'Miss'}
          {lastNoteResult.playedNote && (
            <span> ({lastNoteResult.playedNote})</span>
          )}
        </div>
      )}
    </div>
  )
}

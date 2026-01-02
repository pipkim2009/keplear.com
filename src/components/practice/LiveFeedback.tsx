/**
 * LiveFeedback Component
 * Real-time visual feedback during performance
 *
 * Features:
 * - Volume indicator with segmented bars
 * - Notes history showing correct/wrong
 * - Current note indicator
 * - Pitch detection display
 */

import { Mic, MicOff, Check, X } from 'lucide-react'
import type { PitchDetectionResult } from '../../hooks/usePitchDetection'
import type { NoteResult, PerformanceState } from '../../hooks/usePerformanceGrading'
import type { Note } from '../../utils/notes'
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
  /** Total notes in the melody */
  totalNotes: number
  /** The melody being practiced */
  melody: Note[]
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
  permission,
  totalNotes,
  melody
}) => {
  // Determine note display state
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

  // Calculate stats from results
  const correctCount = performanceState.noteResults.filter(r => r.isCorrect).length
  const missCount = performanceState.noteResults.filter(r => !r.isCorrect).length

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

      {/* Volume Indicator */}
      {isListening && (
        <div className={styles.volumeIndicatorContainer}>
          <div className={styles.volumeIndicatorHeader}>
            <span className={styles.volumeIndicatorLabel}>Input Level</span>
            <span className={styles.volumeIndicatorValue}>{Math.round(volumeLevel * 100)}%</span>
          </div>
          <div className={styles.volumeIndicatorTrack}>
            <div className={styles.volumeIndicatorSegments}>
              {Array.from({ length: 20 }).map((_, i) => {
                const segmentThreshold = (i + 1) / 20
                const isActive = volumeLevel >= segmentThreshold
                const segmentClass = i < 12 ? styles.segmentGreen : i < 16 ? styles.segmentYellow : styles.segmentRed
                return (
                  <div
                    key={i}
                    className={`${styles.volumeSegment} ${isActive ? `${styles.active} ${segmentClass}` : ''}`}
                  />
                )
              })}
            </div>
            <div className={styles.volumeIndicatorGlow} style={{ width: `${volumeLevel * 100}%` }} />
          </div>
          {volumeLevel < 0.1 && (
            <span className={styles.volumeWarning}>Speak louder or move closer to mic</span>
          )}
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
          {currentPitch && (
            <span className={styles.pitchConfidence}>
              Confidence: {Math.round((currentPitch.confidence || 0) * 100)}%
            </span>
          )}
        </div>
      )}

      {/* Last Note Result Feedback */}
      {lastNoteResult && performanceState.isActive && (
        <div className={`${styles.noteResultFeedback} ${lastNoteResult.isCorrect ? styles.correct : styles.miss}`}>
          {lastNoteResult.isCorrect ? 'Correct!' : 'Wrong'}
          {lastNoteResult.playedNote && !lastNoteResult.isCorrect && (
            <span className={styles.wrongPitchNote}>
              (played {lastNoteResult.playedNote})
            </span>
          )}
        </div>
      )}

      {/* Stats Row */}
      {performanceState.isActive && performanceState.noteResults.length > 0 && (
        <div className={styles.statsRow}>
          <div className={`${styles.statBadge} ${styles.correct}`}>
            <span className={styles.statCount}>{correctCount}</span>
            <span className={styles.statLabel}>Correct</span>
          </div>
          <div className={`${styles.statBadge} ${styles.miss}`}>
            <span className={styles.statCount}>{missCount}</span>
            <span className={styles.statLabel}>Wrong</span>
          </div>
        </div>
      )}

      {/* Notes History - two rows: intended notes on top, received notes below */}
      {(performanceState.isActive || performanceState.noteResults.length > 0) && (
        <div className={styles.notesHistoryContainer}>
          <div className={styles.notesHistoryHeader}>
            <span className={styles.notesHistoryLabel}>Notes</span>
            <span className={styles.notesHistoryProgress}>
              {performanceState.noteResults.length} / {totalNotes}
            </span>
          </div>

          {/* Two-row notes display */}
          <div className={styles.notesComparisonContainer}>
            {/* Top row - Intended/Expected notes */}
            <div className={styles.notesRow}>
              <span className={styles.rowLabel}>Expected</span>
              <div className={styles.notesRowGrid}>
                {melody.map((note, index) => {
                  const result = performanceState.noteResults.find(r => r.noteIndex === index)
                  const isCurrent = index === performanceState.currentNoteIndex && performanceState.isActive

                  return (
                    <div
                      key={index}
                      className={`${styles.noteCell} ${styles.expectedCell} ${
                        result?.isCorrect ? styles.correct :
                        result && !result.isCorrect ? styles.missed :
                        isCurrent ? styles.current :
                        styles.pending
                      }`}
                    >
                      <span className={styles.noteCellName}>{note.name}</span>
                      {isCurrent && !result && (
                        <span className={styles.noteHistoryCurrentIndicator} />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Bottom row - Received/Played notes */}
            <div className={styles.notesRow}>
              <span className={styles.rowLabel}>Played</span>
              <div className={styles.notesRowGrid}>
                {melody.map((_, index) => {
                  const result = performanceState.noteResults.find(r => r.noteIndex === index)

                  return (
                    <div
                      key={index}
                      className={`${styles.noteCell} ${styles.receivedCell} ${
                        result?.isCorrect ? styles.correct :
                        result && !result.isCorrect ? styles.missed :
                        styles.empty
                      }`}
                    >
                      {result ? (
                        <>
                          <span className={styles.noteCellName}>
                            {result.playedNote || '--'}
                          </span>
                          <span className={styles.noteCellIcon}>
                            {result.isCorrect ? <Check size={12} /> : <X size={12} />}
                          </span>
                        </>
                      ) : (
                        <span className={styles.noteCellName}>--</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

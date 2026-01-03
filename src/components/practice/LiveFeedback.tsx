/**
 * LiveFeedback Component
 * Real-time visual feedback during performance
 *
 * BPM-SYNCED GUIDED MODE:
 * - 4-beat count-in with visual beat indicators
 * - Current note displayed prominently
 * - Beat-synced progress
 */

import { Mic, MicOff, Check, X, SkipForward } from 'lucide-react'
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
  /** Model loading status */
  modelStatus?: 'unloaded' | 'loading' | 'ready' | 'error'
  /** Skip current note callback */
  onSkipNote?: () => void
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
  melody,
  modelStatus = 'ready',
  onSkipNote
}) => {
  const { guided } = performanceState

  // Calculate stats from results
  const correctCount = performanceState.noteResults.filter(r => r.isCorrect).length
  const missCount = performanceState.noteResults.filter(r => !r.isCorrect).length

  // Get feedback class for last result
  const getLastResultClass = () => {
    if (!lastNoteResult) return ''
    if (lastNoteResult.isTimeout) return styles.timeout
    return lastNoteResult.isCorrect ? styles.correct : styles.wrong
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
              Stop Practice
            </>
          ) : (
            <>
              <Mic size={20} />
              Start Practice
            </>
          )}
        </button>
      )}

      {/* Model Loading State */}
      {isListening && modelStatus === 'loading' && (
        <div className={styles.modelLoading}>
          Loading AI model...
        </div>
      )}

      {/* BPM Display */}
      {isListening && performanceState.isActive && (
        <div className={styles.bpmDisplay}>
          {guided.bpm} BPM
        </div>
      )}

      {/* COUNT-IN DISPLAY */}
      {isListening && performanceState.isActive && guided.isCountingIn && (
        <div className={styles.countInContainer}>
          <div className={styles.countInBeats}>
            {[1, 2, 3, 4].map(beat => (
              <div
                key={beat}
                className={`${styles.countInBeat} ${guided.countInBeat >= beat ? styles.active : ''} ${guided.countInBeat === beat ? styles.current : ''}`}
              >
                {beat}
              </div>
            ))}
          </div>
          <span className={styles.countInLabel}>Count in...</span>
        </div>
      )}

      {/* PLAYING MODE UI */}
      {isListening && performanceState.isActive && !guided.isCountingIn && (
        <div className={styles.guidedContainer}>
          {/* Current Note Display - Large and prominent */}
          <div className={styles.guidedNoteSection}>
            <span className={styles.guidedLabel}>Play:</span>
            <div className={`${styles.guidedCurrentNote} ${guided.isListening ? styles.listening : ''} ${getLastResultClass()}`}>
              {performanceState.currentExpectedNote?.name || '--'}
            </div>

            {/* Beat indicator */}
            {guided.isListening && (
              <div className={styles.beatIndicator}>
                <div className={styles.beatPulse} style={{ animationDuration: `${guided.beatDuration}ms` }} />
              </div>
            )}

            {/* Detected Note Display */}
            {guided.isListening && currentPitch?.note && (
              <div className={styles.detectedNote}>
                Heard: <span className={styles.detectedNoteName}>{currentPitch.note}</span>
              </div>
            )}
          </div>

          {/* Skip Button */}
          {guided.isListening && onSkipNote && (
            <button
              className={styles.skipButton}
              onClick={onSkipNote}
              title="Skip this note"
            >
              <SkipForward size={16} />
              Skip
            </button>
          )}

          {/* Last Result Feedback - shows between notes */}
          {lastNoteResult && !guided.isListening && (
            <div className={`${styles.lastResultFeedback} ${getLastResultClass()}`}>
              {lastNoteResult.isTimeout ? (
                <span>Missed!</span>
              ) : lastNoteResult.isCorrect ? (
                <span><Check size={20} /> Correct!</span>
              ) : (
                <span><X size={20} /> {lastNoteResult.playedNote}</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Volume Indicator */}
      {isListening && (
        <div className={styles.volumeIndicatorContainer} style={{ marginTop: '1rem' }}>
          <div className={styles.volumeIndicatorHeader}>
            <span className={styles.volumeIndicatorLabel}>Mic Level</span>
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
          </div>
        </div>
      )}

      {/* Stats Row */}
      {performanceState.isActive && (
        <div className={styles.statsRow}>
          <div className={styles.progressValue}>
            {performanceState.noteResults.length} / {totalNotes}
          </div>
          <div className={`${styles.statBadge} ${styles.correct}`}>
            <Check size={14} />
            <span>{correctCount}</span>
          </div>
          <div className={`${styles.statBadge} ${styles.miss}`}>
            <X size={14} />
            <span>{missCount}</span>
          </div>
        </div>
      )}

      {/* Notes History - Compact grid */}
      {(performanceState.isActive || performanceState.noteResults.length > 0) && (
        <div className={styles.notesHistoryContainer}>
          <div className={styles.notesHistoryHeader}>
            <span className={styles.notesHistoryLabel}>Notes</span>
          </div>

          <div className={styles.notesGridCompact}>
            {melody.map((note, index) => {
              const result = performanceState.noteResults.find(r => r.noteIndex === index)
              const isCurrent = index === performanceState.currentNoteIndex && performanceState.isActive

              return (
                <div
                  key={index}
                  className={`${styles.noteGridItem} ${
                    result?.isCorrect ? styles.correct :
                    result && !result.isCorrect ? styles.missed :
                    isCurrent ? styles.current :
                    styles.pending
                  }`}
                  title={result ? `${result.expectedNote} → ${result.playedNote || 'missed'}` : note.name}
                >
                  <span className={styles.noteGridName}>{note.name}</span>
                  {result && (
                    <span className={styles.noteGridIcon}>
                      {result.isCorrect ? <Check size={10} /> : <X size={10} />}
                    </span>
                  )}
                  {isCurrent && !result && (
                    <span className={styles.noteGridCurrent} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

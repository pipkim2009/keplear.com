/**
 * LiveFeedback Component
 * Real-time visual feedback during note playback
 *
 * Features:
 * - 4-beat count-in with visual beat indicators
 * - Note timeline with ball indicator
 * - Beat-synced pitch detection
 */

import { useEffect } from 'react'
import { Mic, MicOff, Check, X } from 'lucide-react'
import type { PitchDetectionResult } from '../../hooks/usePitchDetection'
import type { PerformanceState } from '../../hooks/usePerformanceGrading'
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
  /** Any error message */
  error: string | null
  /** Microphone permission state */
  permission: 'prompt' | 'granted' | 'denied' | 'error'
  /** The melody being practiced */
  melody: Note[]
  /** Model loading status */
  modelStatus?: 'unloaded' | 'loading' | 'ready' | 'error'
}

export const LiveFeedback: React.FC<LiveFeedbackProps> = ({
  isListening,
  onStartListening,
  onStopListening,
  currentPitch,
  volumeLevel,
  performanceState,
  error,
  permission,
  melody,
  modelStatus = 'ready'
}) => {
  const { guided } = performanceState

  // Check if all notes have been graded
  const isComplete = melody.length > 0 && performanceState.noteResults.length === melody.length

  // Auto-stop listening when all notes are graded
  useEffect(() => {
    if (isComplete && isListening) {
      onStopListening()
    }
  }, [isComplete, isListening, onStopListening])

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

      {/* Microphone Button - hide when showing results */}
      {permission !== 'denied' && !isComplete && (
        <button
          className={`${styles.microphoneButton} ${isListening ? styles.listening : ''}`}
          onClick={isListening ? onStopListening : onStartListening}
        >
          {isListening ? (
            <>
              <MicOff size={20} />
              Stop Feedback
            </>
          ) : (
            <>
              <Mic size={20} />
              Start Feedback
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

      {/* PLAYING MODE UI - Note Timeline */}
      {/* Show after count-in during active performance OR when we have any results */}
      {((isListening && performanceState.isActive && !guided.isCountingIn && guided.currentBeat > 4) || performanceState.noteResults.length > 0) && (
        <div className={styles.guidedContainer}>
          {/* Note Timeline - All notes in a row with ball indicator */}
          <div className={styles.noteTimeline}>
            <div className={styles.noteTimelineTrack}>
              {/* Traveling ball indicator - only show if there are ungraded notes remaining */}
              {!isComplete && performanceState.isActive && performanceState.noteResults.length < melody.length && (
                <div
                  className={styles.ballIndicator}
                  style={{
                    '--note-index': performanceState.currentNoteIndex,
                    '--total-notes': melody.length,
                    '--beat-duration': `${guided.beatDuration}ms`
                  } as React.CSSProperties}
                />
              )}
              {melody.map((note, index) => {
                const result = performanceState.noteResults.find(r => r.noteIndex === index)
                const isCurrent = index === performanceState.currentNoteIndex && !isComplete
                const isPast = index < performanceState.currentNoteIndex

                return (
                  <div
                    key={index}
                    className={`${styles.timelineNote} ${
                      result?.isCorrect ? styles.correct :
                      result && !result.isCorrect ? styles.missed :
                      isCurrent ? styles.current :
                      isPast ? styles.past :
                      styles.pending
                    }`}
                  >
                    <span className={styles.timelineNoteName}>{note.name}</span>
                    {result && (
                      <span className={styles.timelineNoteIcon}>
                        {result.isCorrect ? <Check size={12} /> : <X size={12} />}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Detected Note Display - only during active play */}
          {guided.isListening && currentPitch?.note && !isComplete && (
            <div className={styles.detectedNote}>
              Heard: <span className={styles.detectedNoteName}>{currentPitch.note}</span>
            </div>
          )}
        </div>
      )}

      {/* Volume Indicator - hide when complete */}
      {isListening && !isComplete && (
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

    </div>
  )
}

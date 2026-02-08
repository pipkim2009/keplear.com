/**
 * MelodyFeedback Component
 *
 * Live instrument melody feedback UI that displays:
 * - Current melody progress (which notes have been played)
 * - Remaining notes to play
 * - Real-time detected note display
 * - Volume level indicator
 * - Completion status
 *
 * Features per specification:
 * - Rhythm is ignored - play at any speed
 * - Extra notes don't penalize
 * - Near-instant feedback (≤500ms latency)
 * - UI refresh every 75-125ms
 */

import { useEffect, useCallback, useMemo } from 'react'
import { Mic, MicOff, Check, RotateCcw, Music, Volume2 } from 'lucide-react'
import { useMelodyFeedback, type FeedbackNote } from '../../hooks/useMelodyFeedback'
import type { Note } from '../../utils/notes'
import { getNoteSymbol } from '../../utils/noteEmojis'
import styles from '../../styles/MelodyFeedback.module.css'

// ============================================================================
// TYPES
// ============================================================================

interface MelodyFeedbackProps {
  /** The melody to practice */
  melody: Note[]
  /** Instrument type for optimized detection */
  instrument?: 'keyboard' | 'guitar' | 'bass'
  /** Whether to require exact octave match */
  strictOctave?: boolean
  /** Callback when melody is completed */
  onComplete?: (playedCount: number, totalNotes: number) => void
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface NoteChipProps {
  note: FeedbackNote
  showAnimation?: boolean
}

function NoteChip({ note, showAnimation = false }: NoteChipProps) {
  const classes = [
    styles.noteChip,
    note.isPlayed && styles.played,
    note.isCurrent && !note.isPlayed && styles.current,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={classes}>
      <span className={styles.noteChipSymbol}>{getNoteSymbol(note.isChord)}</span>
      {note.isPlayed && (
        <span className={styles.noteChipCheck}>
          <Check size={12} />
        </span>
      )}
      {note.isCurrent && !note.isPlayed && showAnimation && (
        <span className={styles.noteChipPulse} />
      )}
    </div>
  )
}

interface VolumeIndicatorProps {
  level: number
}

function VolumeIndicator({ level }: VolumeIndicatorProps) {
  const segments = 16
  const activeSegments = Math.round(level * segments)

  return (
    <div className={styles.volumeIndicator}>
      <Volume2 size={16} className={styles.volumeIcon} />
      <div className={styles.volumeBar}>
        {Array.from({ length: segments }).map((_, i) => (
          <div
            key={i}
            className={`${styles.volumeSegment} ${i < activeSegments ? styles.active : ''} ${
              i < 10 ? styles.green : i < 13 ? styles.yellow : styles.red
            }`}
          />
        ))}
      </div>
    </div>
  )
}

interface ProgressDisplayProps {
  playedCount: number
  totalNotes: number
  progress: number
}

function ProgressDisplay({ playedCount, totalNotes, progress }: ProgressDisplayProps) {
  return (
    <div className={styles.progressDisplay}>
      <div className={styles.progressText}>
        <span className={styles.progressCount}>{playedCount}</span>
        <span className={styles.progressSeparator}>/</span>
        <span className={styles.progressTotal}>{totalNotes}</span>
        <span className={styles.progressLabel}>notes</span>
      </div>
      <div className={styles.progressBar}>
        <div className={styles.progressFill} style={{ width: `${progress}%` }} />
      </div>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function MelodyFeedback({
  melody,
  instrument = 'keyboard',
  strictOctave = false,
  onComplete,
}: MelodyFeedbackProps) {
  const { start, stop, reset, setMelody, state, modelStatus, permission, error, updateConfig } =
    useMelodyFeedback({
      instrument,
      strictOctave,
    })

  // Update melody when it changes
  useEffect(() => {
    setMelody(melody)
  }, [melody, setMelody])

  // Update config when instrument/strictOctave changes
  useEffect(() => {
    updateConfig({ instrument, strictOctave })
  }, [instrument, strictOctave, updateConfig])

  // Handle completion
  useEffect(() => {
    if (state.isComplete && onComplete) {
      onComplete(state.playedCount, state.totalNotes)
    }
  }, [state.isComplete, state.playedCount, state.totalNotes, onComplete])

  // Auto-stop on completion
  useEffect(() => {
    if (state.isComplete && state.isActive) {
      // Give a moment for the final note to display
      const timeout = setTimeout(() => {
        stop()
      }, 1000)
      return () => clearTimeout(timeout)
    }
  }, [state.isComplete, state.isActive, stop])

  // Toggle listening
  const handleToggle = useCallback(() => {
    if (state.isActive) {
      stop()
    } else {
      start()
    }
  }, [state.isActive, start, stop])

  // Handle reset
  const handleReset = useCallback(() => {
    reset()
  }, [reset])

  // Get display notes (current + upcoming)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const displayNotes = useMemo(() => {
    return state.notes
  }, [state.notes])

  // Played notes (for showing completed section)
  const playedNotes = useMemo(() => {
    return state.notes.filter(n => n.isPlayed)
  }, [state.notes])

  // Remaining notes (including current)
  const remainingNotes = useMemo(() => {
    return state.notes.filter(n => !n.isPlayed)
  }, [state.notes])

  // Render permission denied state
  if (permission === 'denied') {
    return (
      <div className={styles.container}>
        <div className={styles.permissionDenied}>
          <MicOff size={48} className={styles.permissionIcon} />
          <p className={styles.permissionText}>
            Microphone access is required for live feedback. Please allow microphone access in your
            browser settings.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {/* Error Display */}
      {error && <div className={styles.error}>{error}</div>}

      {/* Controls */}
      <div className={styles.controls}>
        <button
          className={`${styles.mainButton} ${state.isActive ? styles.active : ''}`}
          onClick={handleToggle}
          disabled={modelStatus === 'loading'}
        >
          {state.isActive ? (
            <>
              <MicOff size={20} />
              <span>Stop</span>
            </>
          ) : modelStatus === 'loading' ? (
            <>
              <Music size={20} />
              <span>Loading...</span>
            </>
          ) : (
            <>
              <Mic size={20} />
              <span>Start Practice</span>
            </>
          )}
        </button>

        {(state.playedCount > 0 || state.isComplete) && !state.isActive && (
          <button className={styles.resetButton} onClick={handleReset}>
            <RotateCcw size={18} />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Progress */}
      {state.totalNotes > 0 && (
        <ProgressDisplay
          playedCount={state.playedCount}
          totalNotes={state.totalNotes}
          progress={state.progress}
        />
      )}

      {/* Completion Message */}
      {state.isComplete && (
        <div className={styles.completeMessage}>
          <Check size={24} />
          <span>Melody Complete!</span>
        </div>
      )}

      {/* Active Feedback UI */}
      {state.isActive && !state.isComplete && (
        <>
          {/* Currently Detected Note */}
          {state.lastDetectedNote && (
            <div className={styles.detectedNote}>
              <span className={styles.detectedLabel}>Detected:</span>
              <span className={styles.detectedNoteName}>{state.lastDetectedNote}</span>
            </div>
          )}

          {/* Volume Indicator */}
          <VolumeIndicator level={state.volumeLevel} />
        </>
      )}

      {/* Melody Notes Display */}
      {state.totalNotes > 0 && (
        <div className={styles.melodyDisplay}>
          {/* Completed Notes */}
          {playedNotes.length > 0 && (
            <div className={styles.noteSection}>
              <div className={styles.sectionLabel}>Played</div>
              <div className={styles.noteGrid}>
                {playedNotes.map(note => (
                  <NoteChip key={note.index} note={note} />
                ))}
              </div>
            </div>
          )}

          {/* Remaining Notes */}
          {remainingNotes.length > 0 && (
            <div className={styles.noteSection}>
              <div className={styles.sectionLabel}>
                {playedNotes.length > 0 ? 'Remaining' : 'Play These Notes'}
              </div>
              <div className={styles.noteGrid}>
                {remainingNotes.map(note => (
                  <NoteChip key={note.index} note={note} showAnimation={state.isActive} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      {!state.isActive && state.playedCount === 0 && state.totalNotes > 0 && (
        <div className={styles.instructions}>
          <p>
            Press <strong>Start Practice</strong> and play the notes above on your instrument.
          </p>
          <p className={styles.instructionNote}>
            Play at your own pace - timing doesn&apos;t matter!
          </p>
        </div>
      )}
    </div>
  )
}

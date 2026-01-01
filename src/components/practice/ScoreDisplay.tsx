/**
 * ScoreDisplay Component
 * Shows progress, stars, and final results (Yousician-style)
 */

import type { PerformanceState, PerformanceResult } from '../../hooks/usePerformanceGrading'
import styles from '../../styles/PitchFeedback.module.css'

interface ScoreDisplayProps {
  /** Current performance state */
  state: PerformanceState
  /** Final performance result (when complete) */
  result: PerformanceResult | null
  /** Total notes in the melody */
  totalNotes: number
}

export const ScoreDisplay: React.FC<ScoreDisplayProps> = ({
  state,
  result,
  totalNotes
}) => {
  const { noteResults, isActive } = state

  // Calculate current progress
  const progressPercent = totalNotes > 0
    ? (noteResults.length / totalNotes) * 100
    : 0

  // Calculate correct count so far
  const correctCount = noteResults.filter(r => r.isCorrect).length

  // Render stars
  const renderStars = (earnedStars: 1 | 2 | 3) => {
    const stars = []
    for (let i = 0; i < 3; i++) {
      const isEarned = i < earnedStars
      stars.push(
        <span
          key={i}
          className={`${styles.star} ${isEarned ? styles.earned : styles.unearned}`}
          style={{ animationDelay: isEarned ? `${i * 0.2}s` : '0s' }}
        >
          {isEarned ? '\u2B50' : '\u2606'}
        </span>
      )
    }
    return stars
  }

  // During performance
  if (isActive || (!result && noteResults.length > 0)) {
    return (
      <div className={styles.scoreDisplayContainer}>
        {/* Header: Correct Count */}
        <div className={styles.headerRow}>
          <div className={styles.runningScore}>
            <span className={styles.scoreValue}>{correctCount}</span>
            <span className={styles.scoreLabel}>/ {totalNotes} correct</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className={styles.progressContainer}>
          <div className={styles.progressLabel}>
            <span>Progress</span>
            <span>{noteResults.length} / {totalNotes}</span>
          </div>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>
    )
  }

  // Show result if performance is complete
  if (result) {
    return (
      <div className={styles.scoreDisplayContainer}>
        {/* Stars */}
        <div className={styles.starsContainer}>
          {renderStars(result.stars)}
        </div>

        {/* Result Message */}
        <div className={`${styles.resultMessage} ${result.passed ? styles.passed : styles.failed}`}>
          <h3 className={styles.resultTitle}>
            {result.passed ? 'Great Job!' : 'Keep Practicing!'}
          </h3>
          <p className={styles.resultSubtitle}>
            {result.passed
              ? `You got ${result.correctCount} out of ${result.correctCount + result.missCount} correct!`
              : `You got ${result.correctCount} out of ${result.correctCount + result.missCount}. Need 60% to pass.`
            }
          </p>
        </div>

        {/* Stats */}
        <div className={styles.resultStats}>
          <div className={styles.statItem}>
            <span className={`${styles.statValue} ${styles.perfect}`}>
              {result.correctCount}
            </span>
            <span className={styles.statLabel}>Correct</span>
          </div>
          <div className={styles.statItem}>
            <span className={`${styles.statValue} ${styles.miss}`}>
              {result.missCount}
            </span>
            <span className={styles.statLabel}>Missed</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statValue}>
              {result.totalScore}%
            </span>
            <span className={styles.statLabel}>Score</span>
          </div>
        </div>
      </div>
    )
  }

  // Default: not started yet
  return null
}

import { PiPlayFill, PiSparkle, PiRocketLaunch } from 'react-icons/pi'
import styles from '../Onboarding.module.css'

interface TutorialStepProps {
  onComplete: () => void
  onSkip: () => void
  onBack: () => void
  onStartTutorial: () => void
  isLoading?: boolean
}

/**
 * Third onboarding step - offers interactive tutorial
 * User can start the interactive tutorial or skip to Generator
 */
const TutorialStep = ({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onComplete,
  onSkip,
  onBack,
  onStartTutorial,
  isLoading = false,
}: TutorialStepProps) => {
  return (
    <div className={styles.stepContent}>
      <div className={styles.stepHeader}>
        <span className={styles.stepIcon}>
          <PiSparkle />
        </span>
        <h2 className={styles.stepTitle}>You're All Set!</h2>
        <p className={styles.stepDescription}>Would you like a quick tour of the Generator?</p>
      </div>

      <div className={styles.tutorialContent}>
        <div className={styles.buttonGroup}>
          <button
            className={styles.secondaryButton}
            onClick={onBack}
            type="button"
            disabled={isLoading}
          >
            Back
          </button>
          <button
            className={styles.primaryButton}
            onClick={onStartTutorial}
            type="button"
            disabled={isLoading}
          >
            {isLoading && <span className={styles.loadingSpinner} />}
            <PiPlayFill style={{ verticalAlign: 'middle', marginRight: 4 }} />
            Start Tutorial
          </button>
        </div>

        <button className={styles.skipButton} onClick={onSkip} type="button" disabled={isLoading}>
          <PiRocketLaunch style={{ verticalAlign: 'middle', marginRight: 4 }} />
          Skip - I'll explore on my own
        </button>
      </div>
    </div>
  )
}

export default TutorialStep

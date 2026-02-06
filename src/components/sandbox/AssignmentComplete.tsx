import { useState, useEffect } from 'react'
import { useTranslation } from '../../contexts/TranslationContext'
import styles from '../../styles/Practice.module.css'

interface AssignmentCompleteProps {
  onComplete?: () => void
}

const AssignmentComplete: React.FC<AssignmentCompleteProps> = ({ onComplete }) => {
  const { t } = useTranslation()
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
      if (onComplete) {
        onComplete()
      }
    }, 3000)

    return () => clearTimeout(timer)
  }, [onComplete])

  if (!isVisible) return null

  return (
    <div className={styles.assignmentCompleteOverlay}>
      <div className={styles.assignmentCompleteContent}>
        <div className={styles.assignmentCompleteIcon}>✓</div>
        <h2 className={styles.assignmentCompleteTitle}>
          {t('classroom.assignment.assignmentComplete')}
        </h2>
      </div>
    </div>
  )
}

export default AssignmentComplete

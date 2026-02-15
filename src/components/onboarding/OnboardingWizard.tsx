import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useFocusTrap, useBodyScrollLock } from '../../hooks/useFocusTrap'
import { useOnboarding } from '../../hooks/useOnboarding'
import { useJoinClassroom } from '../../hooks/useClassrooms'
import { useInstrument } from '../../contexts/InstrumentContext'
import InstrumentStep from './steps/InstrumentStep'
import JoinClassStep from './steps/JoinClassStep'
import TutorialStep from './steps/TutorialStep'
import type { InstrumentType } from '../../types/instrument'
import styles from './Onboarding.module.css'

interface OnboardingWizardProps {
  isOpen: boolean
  userId: string
  onComplete: () => void
}

type Step = 'instruments' | 'join-class' | 'tutorial'

const STEPS: Step[] = ['instruments', 'join-class', 'tutorial']

/**
 * Onboarding wizard modal that appears for new users
 * Guides them through instrument selection, class joining, and a tutorial
 */
const OnboardingWizard = ({ isOpen, userId, onComplete }: OnboardingWizardProps) => {
  const [currentStep, setCurrentStep] = useState<Step>('instruments')
  const [selectedInstruments, setSelectedInstruments] = useState<InstrumentType[]>(['keyboard'])
  const [joinCode, setJoinCode] = useState('')
  const [selectedClassroomIds, setSelectedClassroomIds] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)

  const { completeOnboarding } = useOnboarding(userId)
  const { mutate: joinClassroom } = useJoinClassroom()
  const { setInstrument, navigateToDashboard } = useInstrument()

  // Focus trap for accessibility
  const { containerRef } = useFocusTrap<HTMLDivElement>({
    isActive: isOpen,
    restoreFocus: true,
    initialFocus: 'first',
  })

  // Lock body scroll when modal is open
  useBodyScrollLock(isOpen)

  // Check for dark mode from document.body
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.body.classList.contains('dark'))
    }

    checkDarkMode()

    const observer = new MutationObserver(checkDarkMode)
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class'],
    })

    return () => observer.disconnect()
  }, [])

  /**
   * Toggle instrument selection
   */
  const handleToggleInstrument = useCallback((instrument: InstrumentType) => {
    setSelectedInstruments(prev => {
      if (prev.includes(instrument)) {
        // Don't allow deselecting if it's the last one
        if (prev.length === 1) return prev
        return prev.filter(i => i !== instrument)
      }
      return [...prev, instrument]
    })
  }, [])

  /**
   * Complete the onboarding process
   */
  const handleComplete = useCallback(async () => {
    setIsSubmitting(true)

    try {
      // Try to save onboarding data (may fail if columns don't exist yet)
      const result = await completeOnboarding(selectedInstruments)

      if (!result.success) {
        // Log but continue - the columns might not exist in DB yet
        console.warn('Could not save onboarding preferences:', result.error)
      }

      // Join classrooms - both from code and recommended selections
      const classroomsToJoin: string[] = [...selectedClassroomIds]
      if (joinCode.length >= 20 && !classroomsToJoin.includes(joinCode)) {
        classroomsToJoin.push(joinCode)
      }

      for (const classroomId of classroomsToJoin) {
        try {
          await joinClassroom({ userId, classroomId })
        } catch (err) {
          // Non-fatal - continue with onboarding completion
          console.warn('Failed to join classroom:', classroomId, err)
        }
      }

      // Set the first selected instrument as active
      if (selectedInstruments.length > 0) {
        setInstrument(selectedInstruments[0])
      }

      // Navigate to dashboard
      navigateToDashboard()

      // Notify parent that onboarding is complete
      onComplete()
    } catch (err) {
      console.error('Onboarding error:', err)
      // Still complete onboarding on error - don't trap user in wizard
      navigateToDashboard()
      onComplete()
    } finally {
      setIsSubmitting(false)
    }
  }, [
    completeOnboarding,
    selectedInstruments,
    joinCode,
    selectedClassroomIds,
    joinClassroom,
    userId,
    setInstrument,
    navigateToDashboard,
    onComplete,
  ])

  /**
   * Start the interactive tutorial
   * Saves onboarding, sets tutorial flag, and navigates to Generator
   */
  const handleStartTutorial = useCallback(async () => {
    setIsSubmitting(true)

    try {
      // Save onboarding data
      const result = await completeOnboarding(selectedInstruments)

      if (!result.success) {
        console.warn('Could not save onboarding preferences:', result.error)
      }

      // Join classrooms - both from code and recommended selections
      const classroomsToJoin: string[] = [...selectedClassroomIds]
      if (joinCode.length >= 20 && !classroomsToJoin.includes(joinCode)) {
        classroomsToJoin.push(joinCode)
      }

      for (const classroomId of classroomsToJoin) {
        try {
          await joinClassroom({ userId, classroomId })
        } catch (err) {
          console.warn('Failed to join classroom:', classroomId, err)
        }
      }

      // Set the first selected instrument as active
      if (selectedInstruments.length > 0) {
        setInstrument(selectedInstruments[0])
      }

      // Close wizard and navigate to Generator with tutorial param
      onComplete()
      window.location.href = '/generator?tutorial=start'
    } catch (err) {
      console.error('Onboarding error:', err)
      // Still navigate on error
      onComplete()
      window.location.href = '/generator?tutorial=start'
    } finally {
      setIsSubmitting(false)
    }
  }, [
    completeOnboarding,
    selectedInstruments,
    joinCode,
    selectedClassroomIds,
    joinClassroom,
    userId,
    setInstrument,
    onComplete,
  ])

  /**
   * Navigate to the next step
   */
  const handleNextStep = useCallback(() => {
    const currentIndex = STEPS.indexOf(currentStep)
    if (currentIndex < STEPS.length - 1) {
      setCurrentStep(STEPS[currentIndex + 1])
    }
  }, [currentStep])

  /**
   * Navigate to the previous step
   */
  const handlePreviousStep = useCallback(() => {
    const currentIndex = STEPS.indexOf(currentStep)
    if (currentIndex > 0) {
      setCurrentStep(STEPS[currentIndex - 1])
    }
  }, [currentStep])

  /**
   * Skip to the tutorial step
   */
  const handleSkipToTutorial = useCallback(() => {
    setJoinCode('') // Clear join code when skipping
    setSelectedClassroomIds([]) // Clear selected classrooms when skipping
    setCurrentStep('tutorial')
  }, [])

  if (!isOpen) return null

  const currentStepIndex = STEPS.indexOf(currentStep)

  const renderStep = () => {
    switch (currentStep) {
      case 'instruments':
        return (
          <InstrumentStep
            selectedInstruments={selectedInstruments}
            onToggleInstrument={handleToggleInstrument}
            onNext={handleNextStep}
          />
        )
      case 'join-class':
        return (
          <JoinClassStep
            joinCode={joinCode}
            onJoinCodeChange={setJoinCode}
            selectedClassroomIds={selectedClassroomIds}
            onToggleClassroom={id => {
              setSelectedClassroomIds(prev =>
                prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
              )
            }}
            selectedInstruments={selectedInstruments}
            onNext={handleNextStep}
            onSkip={handleSkipToTutorial}
            onBack={handlePreviousStep}
          />
        )
      case 'tutorial':
        return (
          <TutorialStep
            onComplete={handleComplete}
            onSkip={handleComplete}
            onBack={handlePreviousStep}
            onStartTutorial={handleStartTutorial}
            isLoading={isSubmitting}
          />
        )
      default:
        return null
    }
  }

  const modalContent = (
    <div
      className={`${styles.onboardingOverlay} ${isDarkMode ? 'dark' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div ref={containerRef} className={`${styles.onboardingModal} ${isDarkMode ? 'dark' : ''}`}>
        {/* Progress indicator */}
        <div className={styles.progressIndicator} style={{ padding: '20px 20px 0' }}>
          {STEPS.map((step, index) => (
            <div
              key={step}
              className={`${styles.progressDot} ${
                index === currentStepIndex ? styles.active : ''
              } ${index < currentStepIndex ? styles.completed : ''}`}
              aria-label={`Step ${index + 1} of ${STEPS.length}${
                index === currentStepIndex ? ' (current)' : ''
              }`}
            />
          ))}
        </div>

        {renderStep()}
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}

export default OnboardingWizard

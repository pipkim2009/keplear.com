/**
 * Tutorial Hook
 * Manages interactive tutorial state for the Sandbox page
 */

import { useState, useCallback, useEffect } from 'react'

export interface TutorialStep {
  id: string
  target: string  // CSS selector
  title: string
  description: string
  position: 'top' | 'bottom' | 'left' | 'right'
}

export interface TutorialState {
  isActive: boolean
  currentStep: number
  steps: TutorialStep[]
}

export interface UseTutorialResult {
  /** Whether the tutorial is currently active */
  isActive: boolean
  /** Current step index */
  currentStep: number
  /** All tutorial steps */
  steps: TutorialStep[]
  /** Current step data */
  currentStepData: TutorialStep | null
  /** Start the tutorial */
  startTutorial: () => void
  /** Advance to the next step */
  nextStep: () => void
  /** Go back to the previous step */
  prevStep: () => void
  /** Go to a specific step */
  goToStep: (step: number) => void
  /** Skip/end the tutorial */
  skipTutorial: () => void
  /** Complete the tutorial */
  completeTutorial: () => void
  /** Check if tutorial should show */
  shouldShowTutorial: boolean
}

const TUTORIAL_STORAGE_KEY = 'keplear_tutorial_completed'

/**
 * Tutorial steps configuration
 */
export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'instrument',
    target: '.instrument-selector-group',
    title: 'Select Notes',
    description: 'Click on keys or frets to choose notes for your melody',
    position: 'bottom'
  },
  {
    id: 'bpm',
    target: '.bpm-input',
    title: 'Set Tempo',
    description: 'Adjust the BPM (beats per minute) for your melody',
    position: 'top'
  },
  {
    id: 'beats',
    target: '.beats-input',
    title: 'Choose Beats',
    description: 'Set how many beats your melody will have',
    position: 'top'
  },
  {
    id: 'generate',
    target: '.modern-generate-button',
    title: 'Generate',
    description: 'Click to create a unique melody from your selected notes',
    position: 'top'
  },
  {
    id: 'play',
    target: '.play-pause-btn',
    title: 'Play & Practice',
    description: 'Listen to your melody and practice along!',
    position: 'top'
  }
]

/**
 * Hook to manage tutorial state
 */
export function useTutorial(): UseTutorialResult {
  const [isActive, setIsActive] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [shouldShowTutorial, setShouldShowTutorial] = useState(false)

  // Check URL params for tutorial trigger
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const startTutorial = params.get('tutorial')
    const completed = localStorage.getItem(TUTORIAL_STORAGE_KEY)

    if (startTutorial === 'start' && completed !== 'true') {
      setShouldShowTutorial(true)
      // Remove the param from URL without refresh
      const newUrl = window.location.pathname
      window.history.replaceState({}, '', newUrl)
    }
  }, [])

  // Start the tutorial
  const startTutorial = useCallback(() => {
    setIsActive(true)
    setCurrentStep(0)
    setShouldShowTutorial(false)
  }, [])

  // Advance to next step
  const nextStep = useCallback(() => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      // Tutorial complete
      setIsActive(false)
      localStorage.setItem(TUTORIAL_STORAGE_KEY, 'true')
    }
  }, [currentStep])

  // Go back to previous step
  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }, [currentStep])

  // Go to specific step
  const goToStep = useCallback((step: number) => {
    if (step >= 0 && step < TUTORIAL_STEPS.length) {
      setCurrentStep(step)
    }
  }, [])

  // Skip tutorial
  const skipTutorial = useCallback(() => {
    setIsActive(false)
    setShouldShowTutorial(false)
    localStorage.setItem(TUTORIAL_STORAGE_KEY, 'true')
  }, [])

  // Complete tutorial
  const completeTutorial = useCallback(() => {
    setIsActive(false)
    localStorage.setItem(TUTORIAL_STORAGE_KEY, 'true')
  }, [])

  // Get current step data
  const currentStepData = isActive ? TUTORIAL_STEPS[currentStep] : null

  return {
    isActive,
    currentStep,
    steps: TUTORIAL_STEPS,
    currentStepData,
    startTutorial,
    nextStep,
    prevStep,
    goToStep,
    skipTutorial,
    completeTutorial,
    shouldShowTutorial
  }
}

/**
 * Clear tutorial completion (for testing)
 */
export function resetTutorial() {
  localStorage.removeItem(TUTORIAL_STORAGE_KEY)
}

export default useTutorial

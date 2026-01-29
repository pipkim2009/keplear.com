/**
 * Tutorial Hook
 * Manages interactive tutorial state for the Sandbox page
 */

import { useState, useCallback, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export interface TutorialStep {
  id: string
  target: string  // CSS selector
  title: string
  description: string
  position: 'top' | 'bottom' | 'left' | 'right'
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

/**
 * Tutorial steps configuration
 */
export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'instrument',
    target: '.keyboard-container, .guitar-container, .bass-container',
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

const TUTORIAL_IN_PROGRESS_KEY = 'keplear_tutorial_in_progress'

/**
 * Hook to manage tutorial state
 */
export function useTutorial(): UseTutorialResult {
  const [isActive, setIsActive] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [shouldShowTutorial, setShouldShowTutorial] = useState(false)
  const [tutorialCompleted, setTutorialCompleted] = useState<boolean | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  // Get current user and check tutorial completion status
  useEffect(() => {
    const checkTutorialStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setTutorialCompleted(null)
        setUserId(null)
        return
      }

      setUserId(user.id)

      // Fetch tutorial_completed from profiles
      const { data, error } = await supabase
        .from('profiles')
        .select('tutorial_completed')
        .eq('id', user.id)
        .single()

      if (error) {
        console.warn('Could not fetch tutorial status:', error)
        setTutorialCompleted(false)
      } else {
        setTutorialCompleted(data?.tutorial_completed ?? false)
      }
    }

    checkTutorialStatus()
  }, [])

  // Check URL params or session storage for tutorial trigger
  useEffect(() => {
    if (tutorialCompleted === null) return // Still loading

    const params = new URLSearchParams(window.location.search)
    const startTutorial = params.get('tutorial')
    const inProgress = sessionStorage.getItem(TUTORIAL_IN_PROGRESS_KEY)

    // Start directly from URL param (skip welcome modal)
    if (startTutorial === 'start' && !tutorialCompleted) {
      setIsActive(true)
      setCurrentStep(0)
      sessionStorage.setItem(TUTORIAL_IN_PROGRESS_KEY, 'true')
      const newUrl = window.location.pathname
      window.history.replaceState({}, '', newUrl)
    }
    // Resume if was in progress (page refresh)
    else if (inProgress === 'true' && !tutorialCompleted) {
      setIsActive(true)
      setCurrentStep(0)
    }
  }, [tutorialCompleted])

  // Mark tutorial as completed in Supabase
  const markTutorialComplete = useCallback(async () => {
    sessionStorage.removeItem(TUTORIAL_IN_PROGRESS_KEY)

    if (!userId) return

    const { error } = await supabase
      .from('profiles')
      .update({ tutorial_completed: true })
      .eq('id', userId)

    if (error) {
      console.warn('Could not save tutorial completion:', error)
    }

    setTutorialCompleted(true)
  }, [userId])

  // Start the tutorial
  const startTutorial = useCallback(() => {
    setIsActive(true)
    setCurrentStep(0)
    setShouldShowTutorial(false)
    sessionStorage.setItem(TUTORIAL_IN_PROGRESS_KEY, 'true')
  }, [])

  // Advance to next step
  const nextStep = useCallback(() => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      // Tutorial complete
      setIsActive(false)
      markTutorialComplete()
    }
  }, [currentStep, markTutorialComplete])

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
    markTutorialComplete()
  }, [markTutorialComplete])

  // Complete tutorial
  const completeTutorial = useCallback(() => {
    setIsActive(false)
    markTutorialComplete()
  }, [markTutorialComplete])

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
export async function resetTutorial() {
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    await supabase
      .from('profiles')
      .update({ tutorial_completed: false })
      .eq('id', user.id)
  }
}

export default useTutorial

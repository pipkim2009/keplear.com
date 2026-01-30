/**
 * Tutorial Hook
 * Manages interactive tutorial state across Dashboard, Sandbox, and Classroom pages
 */

import { useState, useCallback, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export type TutorialPage = 'dashboard' | 'sandbox' | 'classroom'

export interface TutorialStep {
  id: string
  page: TutorialPage
  target: string  // CSS selector
  title: string
  description: string
  position: 'top' | 'bottom' | 'left' | 'right'
  /** If true, user must interact with the element to proceed */
  requiresInteraction?: boolean
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
  /** Current page the tutorial expects */
  currentTutorialPage: TutorialPage | null
}

/**
 * Tutorial steps configuration - covers all 3 pages
 */
export const TUTORIAL_STEPS: TutorialStep[] = [
  // Dashboard Steps
  {
    id: 'dashboard-welcome',
    page: 'dashboard',
    target: '[class*="mainContent"]',
    title: 'Welcome',
    description: 'This is your dashboard - here you can track your progress and preview your classroom data.',
    position: 'bottom'
  },

  // Sandbox Steps
  {
    id: 'sandbox-welcome',
    page: 'sandbox',
    target: '[class*="instrumentContainer"], [class*="mainContent"]',
    title: 'Welcome',
    description: 'Welcome to sandbox mode - here you can freely create melodies to practice your note recognition abilities.',
    position: 'bottom'
  },
  {
    id: 'sandbox-select-instrument',
    page: 'sandbox',
    target: '[class*="instrumentSelector"], [class*="instrumentTabs"]',
    title: 'Select Instrument',
    description: 'Let\'s setup a melody! Begin by selecting an instrument.',
    position: 'bottom'
  },
  {
    id: 'sandbox-instrument',
    page: 'sandbox',
    target: '.keyboard-container, .guitar-container, .bass-container',
    title: 'Select Notes',
    description: 'Great, now select some notes, scales or chords you want your melody to include.',
    position: 'bottom',
    requiresInteraction: true
  },
  {
    id: 'sandbox-tempo-beats',
    page: 'sandbox',
    target: '.modern-controls-row',
    title: 'Generation Options',
    description: 'Here are your generation options. You can adjust BPM for speed, Beats for note count, and Chord Mode for how chords are played.',
    position: 'top'
  },
  {
    id: 'sandbox-generate',
    page: 'sandbox',
    target: '.modern-generate-button',
    title: 'Generate',
    description: 'Click the generate button to create your melody.',
    position: 'top',
    requiresInteraction: true
  },
  {
    id: 'sandbox-play',
    page: 'sandbox',
    target: '.custom-audio-player',
    title: 'Play & Practice',
    description: 'Now you can listen to your melody and play it back for live feedback.',
    position: 'top',
    requiresInteraction: true
  },

  // Classroom Steps
  {
    id: 'classroom-welcome',
    page: 'classroom',
    target: '[class*="mainContent"]',
    title: 'Classrooms',
    description: 'This is your classrooms page - here you can join, create and explore classes you\'re interested in.',
    position: 'bottom'
  },

  // Conclusion Step
  {
    id: 'tour-complete',
    page: 'dashboard',
    target: '[class*="mainContent"]',
    title: 'Complete',
    description: 'Your tour is complete! Welcome to Keplear.',
    position: 'bottom'
  }
]

const TUTORIAL_IN_PROGRESS_KEY = 'keplear_tutorial_in_progress'
const TUTORIAL_STEP_KEY = 'keplear_tutorial_step'

/**
 * Get current page from URL
 */
function getCurrentPage(): TutorialPage | null {
  if (typeof window === 'undefined') return null
  const path = window.location.pathname
  if (path === '/dashboard' || path.startsWith('/dashboard')) return 'dashboard'
  if (path === '/sandbox' || path.startsWith('/sandbox')) return 'sandbox'
  if (path === '/classroom' || path.startsWith('/classroom')) return 'classroom'
  return null
}

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
    const savedStep = sessionStorage.getItem(TUTORIAL_STEP_KEY)

    // Start directly from URL param (skip welcome modal)
    if (startTutorial === 'start' && !tutorialCompleted) {
      const currentPage = getCurrentPage()
      // Find the first step for the current page
      const pageStepIndex = TUTORIAL_STEPS.findIndex(s => s.page === currentPage)
      const stepToStart = pageStepIndex >= 0 ? pageStepIndex : 0

      setIsActive(true)
      setCurrentStep(stepToStart)
      sessionStorage.setItem(TUTORIAL_IN_PROGRESS_KEY, 'true')
      sessionStorage.setItem(TUTORIAL_STEP_KEY, String(stepToStart))
      const newUrl = window.location.pathname
      window.history.replaceState({}, '', newUrl)
    }
    // Resume if was in progress (page navigation or refresh)
    else if (inProgress === 'true' && !tutorialCompleted) {
      const currentPage = getCurrentPage()
      let stepToResume = savedStep ? parseInt(savedStep, 10) : 0

      // If we're on a different page than the saved step, find the right step
      if (currentPage && TUTORIAL_STEPS[stepToResume]?.page !== currentPage) {
        const pageStepIndex = TUTORIAL_STEPS.findIndex(s => s.page === currentPage)
        if (pageStepIndex >= 0) {
          stepToResume = pageStepIndex
        }
      }

      setIsActive(true)
      setCurrentStep(stepToResume)
    }
  }, [tutorialCompleted])

  // Mark tutorial as completed in Supabase
  const markTutorialComplete = useCallback(async () => {
    sessionStorage.removeItem(TUTORIAL_IN_PROGRESS_KEY)
    sessionStorage.removeItem(TUTORIAL_STEP_KEY)

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

  // Navigate to a page
  const navigateToPage = useCallback((page: TutorialPage) => {
    const currentPage = getCurrentPage()
    if (currentPage !== page) {
      window.location.href = `/${page}`
    }
  }, [])

  // Start the tutorial
  const startTutorial = useCallback(() => {
    setIsActive(true)
    setCurrentStep(0)
    setShouldShowTutorial(false)
    sessionStorage.setItem(TUTORIAL_IN_PROGRESS_KEY, 'true')
    sessionStorage.setItem(TUTORIAL_STEP_KEY, '0')

    // Navigate to dashboard if not already there
    const currentPage = getCurrentPage()
    if (currentPage !== 'dashboard') {
      navigateToPage('dashboard')
    }
  }, [navigateToPage])

  // Advance to next step
  const nextStep = useCallback(() => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      const nextStepIndex = currentStep + 1
      const nextStepData = TUTORIAL_STEPS[nextStepIndex]
      const currentPage = getCurrentPage()

      // Check if we need to navigate to a different page
      if (nextStepData.page !== currentPage) {
        sessionStorage.setItem(TUTORIAL_STEP_KEY, String(nextStepIndex))
        navigateToPage(nextStepData.page)
      } else {
        setCurrentStep(nextStepIndex)
        sessionStorage.setItem(TUTORIAL_STEP_KEY, String(nextStepIndex))
      }
    } else {
      // Tutorial complete
      setIsActive(false)
      markTutorialComplete()
    }
  }, [currentStep, markTutorialComplete, navigateToPage])

  // Go back to previous step
  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      const prevStepIndex = currentStep - 1
      const prevStepData = TUTORIAL_STEPS[prevStepIndex]
      const currentPage = getCurrentPage()

      // Check if we need to navigate to a different page
      if (prevStepData.page !== currentPage) {
        sessionStorage.setItem(TUTORIAL_STEP_KEY, String(prevStepIndex))
        navigateToPage(prevStepData.page)
      } else {
        setCurrentStep(prevStepIndex)
        sessionStorage.setItem(TUTORIAL_STEP_KEY, String(prevStepIndex))
      }
    }
  }, [currentStep, navigateToPage])

  // Go to specific step
  const goToStep = useCallback((step: number) => {
    if (step >= 0 && step < TUTORIAL_STEPS.length) {
      const stepData = TUTORIAL_STEPS[step]
      const currentPage = getCurrentPage()

      if (stepData.page !== currentPage) {
        sessionStorage.setItem(TUTORIAL_STEP_KEY, String(step))
        navigateToPage(stepData.page)
      } else {
        setCurrentStep(step)
        sessionStorage.setItem(TUTORIAL_STEP_KEY, String(step))
      }
    }
  }, [navigateToPage])

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
  const currentTutorialPage = currentStepData?.page ?? null

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
    shouldShowTutorial,
    currentTutorialPage
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
  sessionStorage.removeItem(TUTORIAL_IN_PROGRESS_KEY)
  sessionStorage.removeItem(TUTORIAL_STEP_KEY)
}

export default useTutorial

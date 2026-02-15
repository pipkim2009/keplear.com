/**
 * Tutorial Overlay Component
 * Interactive spotlight overlay that guides users through the Generator UI
 */

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { PiSparkle, PiPlayFill } from 'react-icons/pi'
import { TUTORIAL_STEPS } from '../../hooks/useTutorial'
import styles from './TutorialOverlay.module.css'

interface TutorialOverlayProps {
  isActive: boolean
  currentStep: number
  onNext: () => void
  onPrev: () => void
  onSkip: () => void
  onComplete: () => void
  shouldShowWelcome: boolean
  onStartTutorial: () => void
  /** Whether user has completed the required interaction for current step */
  interactionComplete?: boolean
}

interface SpotlightPosition {
  top: number
  left: number
  width: number
  height: number
}

/**
 * Calculate spotlight position from target element
 */
function getSpotlightPosition(target: string): SpotlightPosition | null {
  // Try different selectors for the current step
  let element = document.querySelector(target)

  // Fallback selectors for different steps
  if (!element) {
    const fallbackSelectors: Record<string, string[]> = {
      // Dashboard fallbacks
      '[class*="mainContent"]': [
        '[class*="dashboardContainer"] > [class*="mainContent"]',
        '[class*="dashboard"]',
      ],
      '[class*="statsSection"]': ['[class*="stats"]', '[class*="activity"]'],
      '[class*="classesSection"]': ['[class*="classes"]', '[class*="classrooms"]'],
      // Generator fallbacks
      '.keyboard-container, .guitar-container, .bass-container': [
        '.keyboard-container',
        '.guitar-container',
        '.bass-container',
        '.keyboard',
        '.guitar-fretboard',
        '.bass-fretboard',
      ],
      '.controls-container': ['.modern-controls-row', '.bpm-input', '[class*="controls"]'],
      '.modern-generate-button': ['[class*="generate"]', 'button[class*="Generate"]'],
      '.custom-audio-player': ['[class*="audio-player"]', '[class*="audioPlayer"]'],
      // Classroom fallbacks
      '[class*="classesSection"]:first-of-type': [
        '[class*="classesSection"]',
        '[class*="myClasses"]',
      ],
      '[class*="sectionButtons"]': ['[class*="joinClass"]', '[class*="createButton"]'],
      '[class*="classesSection"]:last-of-type': [
        '[class*="availableClasses"]',
        '[class*="classesGrid"]',
      ],
    }

    const fallbacks = fallbackSelectors[target] || []
    for (const selector of fallbacks) {
      element = document.querySelector(selector)
      if (element) break
    }
  }

  if (!element) return null

  const rect = element.getBoundingClientRect()
  const padding = 8 // Padding around the element

  // Use viewport-relative coords since overlay is position:fixed
  return {
    top: rect.top - padding,
    left: rect.left - padding,
    width: rect.width + padding * 2,
    height: rect.height + padding * 2,
  }
}

/**
 * Welcome modal shown before starting the tutorial
 */
function WelcomeModal({ onStart, onSkip }: { onStart: () => void; onSkip: () => void }) {
  return (
    <div className={styles.welcomeModal}>
      <div className={styles.welcomeCard}>
        <div className={styles.welcomeIcon}>
          <PiSparkle />
        </div>
        <h2 className={styles.welcomeTitle}>Quick Tour</h2>
        <p className={styles.welcomeDescription}>
          Let us show you around! We'll walk you through creating your first melody in just a few
          steps.
        </p>
        <div className={styles.welcomeActions}>
          <button className={styles.startButton} onClick={onStart}>
            <PiPlayFill style={{ marginRight: 8, verticalAlign: 'middle' }} />
            Start Tour
          </button>
          <button className={styles.skipWelcomeButton} onClick={onSkip}>
            Skip - I'll explore on my own
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Main tutorial overlay component
 */
const TutorialOverlay = ({
  isActive,
  currentStep,
  onNext,
  onPrev,
  onSkip,
  onComplete,
  shouldShowWelcome,
  onStartTutorial,
  interactionComplete = false,
}: TutorialOverlayProps) => {
  const [spotlight, setSpotlight] = useState<SpotlightPosition | null>(null)
  const currentStepData = isActive ? TUTORIAL_STEPS[currentStep] : null

  // Update spotlight position when step changes or on scroll/resize
  const updatePositions = useCallback(() => {
    if (!isActive || !currentStepData) {
      setSpotlight(null)
      return
    }

    const spotlightPos = getSpotlightPosition(currentStepData.target)
    if (spotlightPos) {
      setSpotlight(spotlightPos)
    }
  }, [isActive, currentStepData])

  // Update positions on mount, step change, scroll, and resize
  useEffect(() => {
    updatePositions()

    // Initial delay for elements to render
    const timeoutId = setTimeout(updatePositions, 100)

    window.addEventListener('scroll', updatePositions, true)
    window.addEventListener('resize', updatePositions)

    // For dynamic elements like audio player, poll for size changes
    let lastHeight = 0
    let lastWidth = 0
    const intervalId = setInterval(() => {
      if (currentStepData) {
        const target = document.querySelector(currentStepData.target)
        if (target) {
          const rect = target.getBoundingClientRect()
          if (rect.height !== lastHeight || rect.width !== lastWidth) {
            lastHeight = rect.height
            lastWidth = rect.width
            updatePositions()
          }
        }
      }
    }, 200)

    return () => {
      clearTimeout(timeoutId)
      clearInterval(intervalId)
      window.removeEventListener('scroll', updatePositions, true)
      window.removeEventListener('resize', updatePositions)
    }
  }, [updatePositions, currentStep, currentStepData])

  // Keyboard navigation
  useEffect(() => {
    if (!isActive) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onSkip()
      } else if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') {
        e.preventDefault()
        if (currentStep < TUTORIAL_STEPS.length - 1) {
          onNext()
        } else {
          onComplete()
        }
      } else if (e.key === 'ArrowLeft' && currentStep > 0) {
        e.preventDefault()
        onPrev()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isActive, currentStep, onNext, onPrev, onSkip, onComplete])

  // Text-to-speech for tutorial steps
  useEffect(() => {
    if (!isActive || !currentStepData) return

    // Cancel any ongoing speech
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()

      const text = currentStepData.description
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 0.9
      utterance.pitch = 1
      utterance.volume = 1

      window.speechSynthesis.speak(utterance)
    }

    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
    }
  }, [isActive, currentStep, currentStepData])

  // Block clicks outside spotlight (but allow scrolling)
  useEffect(() => {
    if (!isActive || !spotlight) return

    const blockEvent = (e: MouseEvent) => {
      const x = e.clientX
      const y = e.clientY

      // Check if click is inside spotlight area
      const inSpotlight =
        x >= spotlight.left &&
        x <= spotlight.left + spotlight.width &&
        y >= spotlight.top &&
        y <= spotlight.top + spotlight.height

      // Check if click is inside subtitle container (allow button clicks)
      const subtitleEl = document.querySelector('[class*="subtitleContainer"]')
      if (subtitleEl) {
        const subtitleRect = subtitleEl.getBoundingClientRect()
        const inSubtitle =
          x >= subtitleRect.left &&
          x <= subtitleRect.right &&
          y >= subtitleRect.top &&
          y <= subtitleRect.bottom
        if (inSubtitle) return // Allow subtitle/button clicks
      }

      // Block clicks outside spotlight
      if (!inSpotlight) {
        e.preventDefault()
        e.stopPropagation()
        e.stopImmediatePropagation()
      }
    }

    // Block all mouse events outside spotlight
    document.addEventListener('click', blockEvent, true)
    document.addEventListener('mousedown', blockEvent, true)
    document.addEventListener('mouseup', blockEvent, true)
    document.addEventListener('pointerdown', blockEvent, true)
    document.addEventListener('pointerup', blockEvent, true)

    return () => {
      document.removeEventListener('click', blockEvent, true)
      document.removeEventListener('mousedown', blockEvent, true)
      document.removeEventListener('mouseup', blockEvent, true)
      document.removeEventListener('pointerdown', blockEvent, true)
      document.removeEventListener('pointerup', blockEvent, true)
    }
  }, [isActive, spotlight])

  // Show welcome modal if shouldShowWelcome
  if (shouldShowWelcome && !isActive) {
    return createPortal(<WelcomeModal onStart={onStartTutorial} onSkip={onSkip} />, document.body)
  }

  // Don't render if not active
  if (!isActive || !currentStepData) return null

  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1

  const overlayContent = (
    <div className={styles.tutorialOverlay}>
      {/* Dark overlay with cutout - 4 rectangles around spotlight */}
      {spotlight && (
        <>
          {/* Top overlay */}
          <div
            className={styles.overlayRect}
            style={{
              top: 0,
              left: 0,
              right: 0,
              height: spotlight.top,
            }}
          />
          {/* Bottom overlay */}
          <div
            className={styles.overlayRect}
            style={{
              top: spotlight.top + spotlight.height,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          />
          {/* Left overlay */}
          <div
            className={styles.overlayRect}
            style={{
              top: spotlight.top,
              left: 0,
              width: spotlight.left,
              height: spotlight.height,
            }}
          />
          {/* Right overlay */}
          <div
            className={styles.overlayRect}
            style={{
              top: spotlight.top,
              left: spotlight.left + spotlight.width,
              right: 0,
              height: spotlight.height,
            }}
          />
          {/* Spotlight border ring */}
          <div
            className={styles.spotlightRing}
            style={{
              top: spotlight.top - 4,
              left: spotlight.left - 4,
              width: spotlight.width + 8,
              height: spotlight.height + 8,
            }}
          />
        </>
      )}

      {/* Tutorial Subtitle Bar */}
      <div className={styles.subtitleContainer}>
        <div className={styles.subtitleButtons}>
          <button className={styles.skipButton} onClick={onSkip}>
            Skip
          </button>
          {currentStep > 0 && (
            <button className={styles.backButton} onClick={onPrev}>
              Back
            </button>
          )}
          {/* Show Next only if step doesn't require interaction OR interaction is complete */}
          {(!currentStepData?.requiresInteraction || interactionComplete) && (
            <button className={styles.nextButton} onClick={isLastStep ? onComplete : onNext}>
              {isLastStep ? 'Finish' : 'Next'}
            </button>
          )}
        </div>
        <div className={styles.subtitle}>{currentStepData.description}</div>
      </div>
    </div>
  )

  return createPortal(overlayContent, document.body)
}

export default TutorialOverlay

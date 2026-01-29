/**
 * Tutorial Overlay Component
 * Interactive spotlight overlay that guides users through the Sandbox UI
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { PiSparkle, PiPlayFill } from 'react-icons/pi'
import { TUTORIAL_STEPS, type TutorialStep } from '../../hooks/useTutorial'
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
}

interface SpotlightPosition {
  top: number
  left: number
  width: number
  height: number
}

interface TooltipPosition {
  top: number
  left: number
  position: 'top' | 'bottom' | 'left' | 'right'
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
      '.instrument-selector-group': [
        '.instrument-controls',
        '.instrument-selector',
        '[class*="instrument"]'
      ],
      '.bpm-input': [
        '[class*="bpm"]',
        '.control-input:first-of-type'
      ],
      '.beats-input': [
        '[class*="beats"]',
        '.control-input:nth-of-type(2)'
      ],
      '.modern-generate-button': [
        '[class*="generate"]',
        'button[class*="Generate"]'
      ],
      '.play-pause-btn': [
        '.custom-audio-player button:first-child',
        '[class*="play"]'
      ]
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

  return {
    top: rect.top - padding + window.scrollY,
    left: rect.left - padding + window.scrollX,
    width: rect.width + padding * 2,
    height: rect.height + padding * 2
  }
}

/**
 * Calculate tooltip position relative to spotlight
 */
function getTooltipPosition(
  spotlight: SpotlightPosition,
  preferredPosition: 'top' | 'bottom' | 'left' | 'right',
  tooltipWidth: number = 280,
  tooltipHeight: number = 200
): TooltipPosition {
  const viewportHeight = window.innerHeight
  const viewportWidth = window.innerWidth
  const gap = 16 // Gap between spotlight and tooltip

  let position = preferredPosition
  let top = 0
  let left = 0

  // Calculate positions for each direction
  const positions = {
    top: {
      top: spotlight.top - tooltipHeight - gap,
      left: spotlight.left + spotlight.width / 2 - tooltipWidth / 2
    },
    bottom: {
      top: spotlight.top + spotlight.height + gap,
      left: spotlight.left + spotlight.width / 2 - tooltipWidth / 2
    },
    left: {
      top: spotlight.top + spotlight.height / 2 - tooltipHeight / 2,
      left: spotlight.left - tooltipWidth - gap
    },
    right: {
      top: spotlight.top + spotlight.height / 2 - tooltipHeight / 2,
      left: spotlight.left + spotlight.width + gap
    }
  }

  // Check if preferred position fits
  const preferred = positions[preferredPosition]
  const fitsTop = preferred.top > 20
  const fitsBottom = preferred.top + tooltipHeight < viewportHeight - 20
  const fitsLeft = preferred.left > 20
  const fitsRight = preferred.left + tooltipWidth < viewportWidth - 20

  // Determine best position
  if (preferredPosition === 'top' && fitsTop && fitsLeft && fitsRight) {
    position = 'top'
  } else if (preferredPosition === 'bottom' && fitsBottom && fitsLeft && fitsRight) {
    position = 'bottom'
  } else if (preferredPosition === 'left' && fitsLeft && fitsTop && fitsBottom) {
    position = 'left'
  } else if (preferredPosition === 'right' && fitsRight && fitsTop && fitsBottom) {
    position = 'right'
  } else {
    // Find first fitting position
    if (positions.bottom.top + tooltipHeight < viewportHeight - 20) {
      position = 'bottom'
    } else if (positions.top.top > 20) {
      position = 'top'
    } else if (positions.right.left + tooltipWidth < viewportWidth - 20) {
      position = 'right'
    } else {
      position = 'left'
    }
  }

  top = positions[position].top
  left = positions[position].left

  // Clamp to viewport bounds
  left = Math.max(20, Math.min(left, viewportWidth - tooltipWidth - 20))
  top = Math.max(20, Math.min(top, viewportHeight - tooltipHeight - 20))

  return { top, left, position }
}

/**
 * Welcome modal shown before starting the tutorial
 */
function WelcomeModal({
  onStart,
  onSkip
}: {
  onStart: () => void
  onSkip: () => void
}) {
  return (
    <div className={styles.welcomeModal}>
      <div className={styles.welcomeCard}>
        <div className={styles.welcomeIcon}>
          <PiSparkle />
        </div>
        <h2 className={styles.welcomeTitle}>Quick Tour</h2>
        <p className={styles.welcomeDescription}>
          Let us show you around! We'll walk you through creating your first melody in just a few steps.
        </p>
        <div className={styles.welcomeActions}>
          <button
            className={styles.startButton}
            onClick={onStart}
          >
            <PiPlayFill style={{ marginRight: 8, verticalAlign: 'middle' }} />
            Start Tour
          </button>
          <button
            className={styles.skipWelcomeButton}
            onClick={onSkip}
          >
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
  onStartTutorial
}: TutorialOverlayProps) => {
  const [spotlight, setSpotlight] = useState<SpotlightPosition | null>(null)
  const [tooltipPos, setTooltipPos] = useState<TooltipPosition | null>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const currentStepData = isActive ? TUTORIAL_STEPS[currentStep] : null

  // Update spotlight position when step changes or on scroll/resize
  const updatePositions = useCallback(() => {
    if (!isActive || !currentStepData) {
      setSpotlight(null)
      setTooltipPos(null)
      return
    }

    const spotlightPos = getSpotlightPosition(currentStepData.target)
    if (spotlightPos) {
      setSpotlight(spotlightPos)

      // Get tooltip dimensions
      const tooltipWidth = tooltipRef.current?.offsetWidth || 280
      const tooltipHeight = tooltipRef.current?.offsetHeight || 200

      const tooltip = getTooltipPosition(
        spotlightPos,
        currentStepData.position,
        tooltipWidth,
        tooltipHeight
      )
      setTooltipPos(tooltip)
    }
  }, [isActive, currentStepData])

  // Update positions on mount, step change, scroll, and resize
  useEffect(() => {
    updatePositions()

    // Delay to allow elements to render
    const timeoutId = setTimeout(updatePositions, 100)

    window.addEventListener('scroll', updatePositions, true)
    window.addEventListener('resize', updatePositions)

    return () => {
      clearTimeout(timeoutId)
      window.removeEventListener('scroll', updatePositions, true)
      window.removeEventListener('resize', updatePositions)
    }
  }, [updatePositions, currentStep])

  // Listen for clicks on target element to auto-advance
  useEffect(() => {
    if (!isActive || !currentStepData) return

    const handleTargetClick = (e: MouseEvent) => {
      const target = document.querySelector(currentStepData.target)
      if (target && (target === e.target || target.contains(e.target as Node))) {
        // User clicked the target element - advance to next step
        if (currentStep < TUTORIAL_STEPS.length - 1) {
          onNext()
        } else {
          onComplete()
        }
      }
    }

    // Add listener with a small delay to avoid immediate triggering
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleTargetClick, true)
    }, 300)

    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('click', handleTargetClick, true)
    }
  }, [isActive, currentStepData, currentStep, onNext, onComplete])

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

  // Show welcome modal if shouldShowWelcome
  if (shouldShowWelcome && !isActive) {
    console.log('[TutorialOverlay] Showing welcome modal')
    return createPortal(
      <WelcomeModal onStart={onStartTutorial} onSkip={onSkip} />,
      document.body
    )
  }

  // Don't render if not active
  if (!isActive || !currentStepData) return null

  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1

  const overlayContent = (
    <div className={styles.tutorialOverlay}>
      {/* Spotlight with cutout effect */}
      {spotlight && (
        <div
          className={styles.spotlight}
          style={{
            top: spotlight.top,
            left: spotlight.left,
            width: spotlight.width,
            height: spotlight.height
          }}
        >
          <div className={styles.spotlightRing} />
        </div>
      )}

      {/* Tooltip */}
      {tooltipPos && (
        <div
          ref={tooltipRef}
          className={`${styles.tooltip} ${styles[`position${tooltipPos.position.charAt(0).toUpperCase() + tooltipPos.position.slice(1)}`]}`}
          style={{
            top: tooltipPos.top,
            left: tooltipPos.left
          }}
        >
          <div className={styles.tooltipArrow} />
          <div className={styles.tooltipCard}>
            <div className={styles.tooltipHeader}>
              <div className={styles.tooltipStepLabel}>
                Step {currentStep + 1} of {TUTORIAL_STEPS.length}
              </div>
              <h3 className={styles.tooltipTitle}>{currentStepData.title}</h3>
            </div>

            <p className={styles.tooltipDescription}>
              {currentStepData.description}
            </p>

            {/* Step indicator dots */}
            <div className={styles.stepIndicator}>
              {TUTORIAL_STEPS.map((_, index) => (
                <div
                  key={index}
                  className={`${styles.stepDot} ${
                    index === currentStep ? styles.active : ''
                  } ${index < currentStep ? styles.completed : ''}`}
                />
              ))}
            </div>

            <div className={styles.tooltipActions}>
              <button
                className={styles.skipButton}
                onClick={onSkip}
              >
                Skip
              </button>
              {currentStep > 0 && (
                <button
                  className={styles.backButton}
                  onClick={onPrev}
                >
                  Back
                </button>
              )}
              <button
                className={styles.nextButton}
                onClick={isLastStep ? onComplete : onNext}
              >
                {isLastStep ? 'Finish' : 'Next'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  return createPortal(overlayContent, document.body)
}

export default TutorialOverlay

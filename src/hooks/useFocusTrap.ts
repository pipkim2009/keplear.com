import { useEffect, useRef, useCallback } from 'react'

/**
 * Selectors for focusable elements within a container
 */
const FOCUSABLE_SELECTORS = [
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'a[href]',
  '[tabindex]:not([tabindex="-1"])',
  'details',
  'summary'
].join(', ')

interface UseFocusTrapOptions {
  /** Whether the focus trap is active */
  isActive: boolean
  /** Callback when escape key is pressed */
  onEscape?: () => void
  /** Whether to restore focus to the previously focused element on deactivation */
  restoreFocus?: boolean
  /** Initial element to focus (selector or 'first' | 'last') */
  initialFocus?: string | 'first' | 'last'
}

/**
 * Hook that traps focus within a container element
 * Implements accessible modal behavior per WAI-ARIA guidelines
 */
export function useFocusTrap<T extends HTMLElement = HTMLDivElement>({
  isActive,
  onEscape,
  restoreFocus = true,
  initialFocus = 'first'
}: UseFocusTrapOptions) {
  const containerRef = useRef<T>(null)
  const previousActiveElement = useRef<HTMLElement | null>(null)

  /**
   * Gets all focusable elements within the container
   */
  const getFocusableElements = useCallback((): HTMLElement[] => {
    if (!containerRef.current) return []
    const elements = containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)
    return Array.from(elements).filter(el => {
      // Filter out elements that are not visible
      const style = window.getComputedStyle(el)
      return style.display !== 'none' && style.visibility !== 'hidden'
    })
  }, [])

  /**
   * Focuses the initial element based on configuration
   */
  const focusInitialElement = useCallback(() => {
    const focusableElements = getFocusableElements()
    if (focusableElements.length === 0) return

    let elementToFocus: HTMLElement | null = null

    if (initialFocus === 'first') {
      elementToFocus = focusableElements[0]
    } else if (initialFocus === 'last') {
      elementToFocus = focusableElements[focusableElements.length - 1]
    } else if (typeof initialFocus === 'string') {
      elementToFocus = containerRef.current?.querySelector(initialFocus) ?? focusableElements[0]
    }

    elementToFocus?.focus()
  }, [getFocusableElements, initialFocus])

  /**
   * Handles tab key navigation within the trap
   */
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!containerRef.current) return

    // Handle Escape key
    if (event.key === 'Escape' && onEscape) {
      event.preventDefault()
      event.stopPropagation()
      onEscape()
      return
    }

    // Handle Tab key for focus trapping
    if (event.key === 'Tab') {
      const focusableElements = getFocusableElements()
      if (focusableElements.length === 0) return

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      // Shift + Tab on first element -> go to last
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
      }
      // Tab on last element -> go to first
      else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }
  }, [getFocusableElements, onEscape])

  // Set up focus trap when active
  useEffect(() => {
    if (!isActive) return

    // Store currently focused element to restore later
    previousActiveElement.current = document.activeElement as HTMLElement

    // Focus initial element after a brief delay to ensure DOM is ready
    const timeoutId = setTimeout(focusInitialElement, 10)

    // Add keyboard event listener
    document.addEventListener('keydown', handleKeyDown, true)

    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('keydown', handleKeyDown, true)

      // Restore focus to previously active element
      if (restoreFocus && previousActiveElement.current) {
        previousActiveElement.current.focus()
      }
    }
  }, [isActive, focusInitialElement, handleKeyDown, restoreFocus])

  return { containerRef }
}

/**
 * Hook to lock body scroll when a modal is open
 */
export function useBodyScrollLock(isLocked: boolean): void {
  useEffect(() => {
    if (!isLocked) return

    const originalStyle = window.getComputedStyle(document.body).overflow
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth

    // Prevent content shift by adding padding equal to scrollbar width
    document.body.style.overflow = 'hidden'
    document.body.style.paddingRight = `${scrollbarWidth}px`

    return () => {
      document.body.style.overflow = originalStyle
      document.body.style.paddingRight = ''
    }
  }, [isLocked])
}

export default useFocusTrap

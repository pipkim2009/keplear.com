import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import styles from './AriaLive.module.css'

type AriaLivePoliteness = 'polite' | 'assertive'

interface AriaLiveContextType {
  announce: (message: string, politeness?: AriaLivePoliteness) => void
}

const AriaLiveContext = createContext<AriaLiveContextType | null>(null)

/**
 * Hook to access the aria-live announcement function
 * Use this to announce dynamic content changes to screen readers
 */
export function useAriaLive(): AriaLiveContextType {
  const context = useContext(AriaLiveContext)
  if (!context) {
    // Return a no-op if used outside provider
    return { announce: () => {} }
  }
  return context
}

interface AriaLiveProviderProps {
  children: React.ReactNode
}

/**
 * Provider component for aria-live announcements
 * Renders invisible regions that screen readers monitor for changes
 */
export const AriaLiveProvider: React.FC<AriaLiveProviderProps> = ({ children }) => {
  const [politeMessage, setPoliteMessage] = useState('')
  const [assertiveMessage, setAssertiveMessage] = useState('')
  const clearTimeoutRef = useRef<ReturnType<typeof setTimeout>>()

  const announce = useCallback((message: string, politeness: AriaLivePoliteness = 'polite') => {
    // Clear any pending timeout
    if (clearTimeoutRef.current) {
      clearTimeout(clearTimeoutRef.current)
    }

    // Set the message based on politeness level
    if (politeness === 'assertive') {
      setAssertiveMessage(message)
    } else {
      setPoliteMessage(message)
    }

    // Clear the message after a delay to allow for repeated announcements
    clearTimeoutRef.current = setTimeout(() => {
      setPoliteMessage('')
      setAssertiveMessage('')
    }, 1000)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (clearTimeoutRef.current) {
        clearTimeout(clearTimeoutRef.current)
      }
    }
  }, [])

  return (
    <AriaLiveContext.Provider value={{ announce }}>
      {children}
      {/* Screen reader only live regions */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className={styles.srOnly}
      >
        {politeMessage}
      </div>
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className={styles.srOnly}
      >
        {assertiveMessage}
      </div>
    </AriaLiveContext.Provider>
  )
}

export default AriaLiveProvider

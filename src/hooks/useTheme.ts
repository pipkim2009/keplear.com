import { useState, useEffect, useCallback } from 'react'

const THEME_STORAGE_KEY = 'keplear-theme'

export const useTheme = () => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    // Check localStorage first
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    if (stored !== null) {
      return stored === 'dark'
    }
    // Fall back to system preference
    if (window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    // Default to dark mode
    return true
  })

  // Sync with system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (e: MediaQueryListEvent) => {
      // Only auto-switch if user hasn't set a preference
      if (localStorage.getItem(THEME_STORAGE_KEY) === null) {
        setIsDarkMode(e.matches)
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  const toggleTheme = useCallback(() => {
    setIsDarkMode(prev => {
      const newValue = !prev
      localStorage.setItem(THEME_STORAGE_KEY, newValue ? 'dark' : 'light')
      return newValue
    })
  }, [])

  return {
    isDarkMode,
    toggleTheme
  }
}

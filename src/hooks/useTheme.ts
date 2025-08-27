import { useState } from 'react'

export const useTheme = () => {
  const [isDarkMode, setIsDarkMode] = useState(false)

  const toggleTheme = () => {
    setIsDarkMode(prev => !prev)
  }

  return {
    isDarkMode,
    toggleTheme
  }
}
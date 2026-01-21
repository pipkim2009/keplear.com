import { memo } from 'react'

interface ThemeToggleProps {
  readonly isDarkMode?: boolean
  readonly onToggle?: () => void
}

// Theme toggle disabled - dark mode only
const ThemeToggle = memo(function ThemeToggle(_props: ThemeToggleProps) {
  return null
})

export default ThemeToggle

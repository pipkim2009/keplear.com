import { memo } from 'react'
import { PiSunFill, PiMoonFill } from 'react-icons/pi'
import '../../styles/ThemeToggle.css'

interface ThemeToggleProps {
  readonly isDarkMode?: boolean
  readonly onToggle?: () => void
}

const ThemeToggle = memo(function ThemeToggle({ isDarkMode = true, onToggle }: ThemeToggleProps) {
  return (
    <button
      className="theme-toggle-simple"
      onClick={onToggle}
      aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDarkMode ? <PiMoonFill size={18} /> : <PiSunFill size={18} />}
      <span className="theme-toggle-label">{isDarkMode ? 'Dark' : 'Light'}</span>
    </button>
  )
})

export default ThemeToggle

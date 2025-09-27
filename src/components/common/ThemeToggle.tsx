import { Sun, Moon } from 'lucide-react'
import { memo, useMemo } from 'react'
import '../../styles/ThemeToggle.css'

interface ThemeToggleProps {
  readonly isDarkMode: boolean
  readonly onToggle: () => void
}

const ThemeToggle = memo(function ThemeToggle({ isDarkMode, onToggle }: ThemeToggleProps) {
  const ariaLabel = useMemo(() =>
    isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode',
    [isDarkMode]
  )

  const icon = useMemo(() =>
    isDarkMode ? <Moon size={20} /> : <Sun size={20} />,
    [isDarkMode]
  )

  const label = useMemo(() =>
    isDarkMode ? 'Dark' : 'Light',
    [isDarkMode]
  )
  return (
    <button
      className="theme-toggle-simple"
      onClick={onToggle}
      title={ariaLabel}
      aria-label={ariaLabel}
    >
      {icon}
      <span className="toggle-label">
        {label}
      </span>
    </button>
  )
})

export default ThemeToggle
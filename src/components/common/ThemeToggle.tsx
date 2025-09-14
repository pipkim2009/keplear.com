import { Sun, Moon } from 'lucide-react'
import '../../styles/ThemeToggle.css'

interface ThemeToggleProps {
  isDarkMode: boolean
  onToggle: () => void
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ isDarkMode, onToggle }) => {
  return (
    <button
      className="theme-toggle-simple"
      onClick={onToggle}
      title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-label={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      {isDarkMode ? <Moon size={20} /> : <Sun size={20} />}
      <span className="toggle-label">
        {isDarkMode ? 'Dark' : 'Light'}
      </span>
    </button>
  )
}

export default ThemeToggle
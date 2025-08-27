import React from 'react'
import { Sun, Moon } from 'lucide-react'
import '../../styles/ThemeToggle.css'

interface ThemeToggleProps {
  isDarkMode: boolean
  onToggle: () => void
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ isDarkMode, onToggle }) => {
  return (
    <button 
      className="theme-toggle"
      onClick={onToggle}
      title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  )
}

export default ThemeToggle
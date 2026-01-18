import { Sun, Moon } from 'lucide-react'
import { memo } from 'react'
import { useTranslation } from '../../contexts/TranslationContext'
import '../../styles/ThemeToggle.css'

interface ThemeToggleProps {
  readonly isDarkMode: boolean
  readonly onToggle: () => void
}

const ThemeToggle = memo(function ThemeToggle({ isDarkMode, onToggle }: ThemeToggleProps) {
  const { t } = useTranslation()

  const ariaLabel = isDarkMode ? t('theme.switchToLight') : t('theme.switchToDark')
  const icon = isDarkMode ? <Moon size={20} /> : <Sun size={20} />
  const label = isDarkMode ? t('theme.dark') : t('theme.light')
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
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import LoginForm from './LoginForm'
import SignupForm from './SignupForm'
import styles from './AuthForms.module.css'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  initialForm?: 'login' | 'signup'
}

const AuthModal = ({ isOpen, onClose, initialForm = 'login' }: AuthModalProps) => {
  const [currentForm, setCurrentForm] = useState<'login' | 'signup'>(initialForm)
  const [isDarkMode, setIsDarkMode] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setCurrentForm(initialForm)
    }
  }, [isOpen, initialForm])

  // Check for dark mode from document.body
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.body.classList.contains('dark'))
    }

    // Check initially
    checkDarkMode()

    // Set up observer to watch for theme changes
    const observer = new MutationObserver(checkDarkMode)
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class']
    })

    return () => observer.disconnect()
  }, [])

  if (!isOpen) return null

  const handleToggleForm = (formType: 'login' | 'signup') => {
    setCurrentForm(formType)
  }

  const handleClose = () => {
    setCurrentForm('login')
    onClose()
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose()
    }
  }

  const renderCurrentForm = () => {
    switch (currentForm) {
      case 'signup':
        return <SignupForm onToggleForm={handleToggleForm} onClose={handleClose} />
      default:
        return <LoginForm onToggleForm={handleToggleForm} onClose={handleClose} />
    }
  }

  const modalContent = (
    <div className={`${styles.authModalOverlay} ${isDarkMode ? 'dark' : ''}`} onClick={handleBackdropClick}>
      <div className={`${styles.authModal} ${isDarkMode ? 'dark' : ''}`}>
        <button
          className={styles.closeButton}
          onClick={handleClose}
          aria-label="Close"
        >
          ×
        </button>
        <div className={isDarkMode ? 'dark' : ''}>
          {renderCurrentForm()}
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}

export default AuthModal
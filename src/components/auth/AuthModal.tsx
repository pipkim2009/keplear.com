import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import LoginForm from './LoginForm'
import SignupForm from './SignupForm'
import { useFocusTrap, useBodyScrollLock } from '../../hooks/useFocusTrap'
import { useTranslation } from '../../contexts/TranslationContext'
import styles from './AuthForms.module.css'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  initialForm?: 'login' | 'signup'
  disableSignup?: boolean
  onAuthSuccess?: () => void
}

/**
 * Modal component for authentication (login/signup)
 * Implements accessible modal behavior with focus trap and keyboard navigation
 */
const AuthModal = ({
  isOpen,
  onClose,
  initialForm = 'login',
  disableSignup = false,
  onAuthSuccess
}: AuthModalProps) => {
  const { t } = useTranslation()
  const [currentForm, setCurrentForm] = useState<'login' | 'signup'>(initialForm)
  const [isDarkMode, setIsDarkMode] = useState(false)

  // Handle close - only if not forced login
  const handleClose = useCallback(() => {
    if (disableSignup) return // Can't close if forced login
    setCurrentForm('login')
    onClose()
  }, [disableSignup, onClose])

  // Focus trap with escape key handling
  const { containerRef } = useFocusTrap<HTMLDivElement>({
    isActive: isOpen,
    onEscape: disableSignup ? undefined : handleClose,
    restoreFocus: true,
    initialFocus: 'input' // Focus first input field
  })

  // Lock body scroll when modal is open
  useBodyScrollLock(isOpen)

  // Reset form when modal opens
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

    checkDarkMode()

    const observer = new MutationObserver(checkDarkMode)
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class']
    })

    return () => observer.disconnect()
  }, [])

  if (!isOpen) return null

  const handleToggleForm = (formType: 'login' | 'signup') => {
    if (disableSignup && formType === 'signup') {
      return
    }
    setCurrentForm(formType)
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !disableSignup) {
      handleClose()
    }
  }

  const renderCurrentForm = () => {
    switch (currentForm) {
      case 'signup':
        return <SignupForm onToggleForm={handleToggleForm} onClose={handleClose} />
      default:
        return (
          <LoginForm
            onToggleForm={handleToggleForm}
            onClose={handleClose}
            disableSignup={disableSignup}
            onAuthSuccess={onAuthSuccess}
          />
        )
    }
  }

  const modalContent = (
    <div
      className={`${styles.authModalOverlay} ${isDarkMode ? 'dark' : ''}`}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div
        ref={containerRef}
        className={`${styles.authModal} ${isDarkMode ? 'dark' : ''}`}
      >
        {!disableSignup && (
          <button
            className={styles.closeButton}
            onClick={handleClose}
            aria-label={t('auth.closeModal')}
            type="button"
          >
            ×
          </button>
        )}
        <div className={isDarkMode ? 'dark' : ''}>
          {renderCurrentForm()}
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}

export default AuthModal

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import LoginForm from './LoginForm'
import SignupForm from './SignupForm'
import ForgotPasswordForm from './ForgotPasswordForm'
import './AuthForms.css'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  initialForm?: 'login' | 'signup' | 'forgot'
}

const AuthModal = ({ isOpen, onClose, initialForm = 'login' }: AuthModalProps) => {
  const [currentForm, setCurrentForm] = useState<'login' | 'signup' | 'forgot'>(initialForm)

  useEffect(() => {
    if (isOpen) {
      setCurrentForm(initialForm)
    }
  }, [isOpen, initialForm])

  if (!isOpen) return null

  const handleToggleForm = (formType: 'login' | 'signup' | 'forgot') => {
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
      case 'forgot':
        return <ForgotPasswordForm onToggleForm={handleToggleForm} onClose={handleClose} />
      default:
        return <LoginForm onToggleForm={handleToggleForm} onClose={handleClose} />
    }
  }

  const modalContent = (
    <div className="auth-modal-overlay" onClick={handleBackdropClick}>
      <div className="auth-modal">
        <button 
          className="close-button" 
          onClick={handleClose}
          aria-label="Close"
        >
          ×
        </button>
        {renderCurrentForm()}
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}

export default AuthModal
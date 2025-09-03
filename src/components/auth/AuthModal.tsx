import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import LoginForm from './LoginForm'
import SignupForm from './SignupForm'
import './AuthForms.css'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  initialForm?: 'login' | 'signup'
}

const AuthModal = ({ isOpen, onClose, initialForm = 'login' }: AuthModalProps) => {
  const [currentForm, setCurrentForm] = useState<'login' | 'signup'>(initialForm)

  useEffect(() => {
    if (isOpen) {
      setCurrentForm(initialForm)
    }
  }, [isOpen, initialForm])

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
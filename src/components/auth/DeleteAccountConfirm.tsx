import { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import './AuthForms.css'

interface DeleteAccountConfirmProps {
  token: string | null
  onClose: () => void
}

const DeleteAccountConfirm = ({ token, onClose }: DeleteAccountConfirmProps) => {
  const { confirmDeleteAccount } = useAuth()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (token) {
      handleConfirmDeletion()
    }
  }, [token])

  const handleConfirmDeletion = async () => {
    if (!token) {
      setError('No confirmation token provided')
      return
    }

    setLoading(true)
    setError('')
    setMessage('')

    try {
      const { error } = await confirmDeleteAccount(token)
      if (error) {
        setError(typeof error === 'string' ? error : 'Failed to delete account')
      } else {
        setMessage('Your account has been successfully deleted.')
      }
    } catch {
      setError('An unexpected error occurred')
    }

    setLoading(false)
  }

  if (!token) {
    return (
      <div className="auth-form">
        <h2>Account Deletion</h2>
        <div className="error-message">
          No valid confirmation token found. Please check your email for the correct link.
        </div>
        <button 
          className="auth-button primary"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    )
  }

  return (
    <div className="auth-form">
      <h2>Confirm Account Deletion</h2>
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {message && (
        <div className="success-message">
          {message}
        </div>
      )}

      {loading && (
        <div className="loading-message">
          Deleting your account...
        </div>
      )}

      {!loading && !message && (
        <div style={{ marginBottom: '20px', textAlign: 'center' }}>
          <p>Confirming your account deletion request...</p>
        </div>
      )}

      <button 
        className="auth-button primary"
        onClick={onClose}
        disabled={loading}
      >
        {message ? 'Continue' : 'Cancel'}
      </button>
    </div>
  )
}

export default DeleteAccountConfirm
import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import './AuthForms.css'

interface ForgotPasswordFormProps {
  onToggleForm: (formType: 'login' | 'signup' | 'forgot') => void
  onClose: () => void
}

const ForgotPasswordForm = ({ onToggleForm }: ForgotPasswordFormProps) => {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const { resetPassword } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    if (!email) {
      setError('Please enter your email address')
      setLoading(false)
      return
    }

    try {
      const { error } = await resetPassword(email)
      if (error) {
        setError(typeof error === 'object' && error && 'message' in error ? String((error as { message: string }).message) : 'An error occurred')
      } else {
        setMessage('Check your email for a password reset link!')
      }
    } catch {
      setError('An unexpected error occurred')
    }

    setLoading(false)
  }

  return (
    <div className="auth-form">
      <h2>Reset Password</h2>
      <p className="form-description">
        Enter your email address and we'll send you a link to reset your password.
      </p>
      
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

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            disabled={loading}
            required
          />
        </div>

        <button 
          type="submit" 
          className="auth-button primary create-account"
          disabled={loading}
        >
          {loading ? 'Sending...' : 'Send Reset Link'}
        </button>
      </form>

      <div className="auth-footer">
        <p>
          Remember your password?{' '}
          <button 
            type="button"
            className="link-button"
            onClick={() => onToggleForm('login')}
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  )
}

export default ForgotPasswordForm
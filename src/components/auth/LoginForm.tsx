import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import './AuthForms.css'

interface LoginFormProps {
  onToggleForm: (formType: 'login' | 'signup' | 'forgot') => void
  onClose: () => void
}

const LoginForm = ({ onToggleForm, onClose }: LoginFormProps) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { signIn } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!email || !password) {
      setError('Please fill in all fields')
      setLoading(false)
      return
    }

    try {
      const { error } = await signIn(email, password)
      if (error) {
        setError(typeof error === 'object' && error && 'message' in error ? String((error as { message: string }).message) : 'An error occurred')
      } else {
        onClose()
      }
    } catch {
      setError('An unexpected error occurred')
    }

    setLoading(false)
  }

  return (
    <div className="auth-form">
      <h2>Sign In</h2>
      
      {error && (
        <div className="error-message">
          {error}
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

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            disabled={loading}
            required
          />
        </div>

        <button 
          type="submit" 
          className="auth-button primary create-account"
          disabled={loading}
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <div className="auth-footer">
        <p>
          Don't have an account?{' '}
          <button 
            type="button"
            className="link-button"
            onClick={() => onToggleForm('signup')}
          >
            Sign up
          </button>
        </p>
        
        <button 
          type="button"
          className="link-button"
          onClick={() => onToggleForm('forgot')}
        >
          Forgot your password?
        </button>
      </div>
    </div>
  )
}

export default LoginForm
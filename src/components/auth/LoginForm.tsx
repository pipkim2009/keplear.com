import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import './AuthForms.css'

interface LoginFormProps {
  onToggleForm: (formType: 'login' | 'signup') => void
  onClose: () => void
}

const LoginForm = ({ onToggleForm, onClose }: LoginFormProps) => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { signIn } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!username || !password) {
      setError('Please fill in all fields')
      setLoading(false)
      return
    }

    try {
      const { error } = await signIn(username, password)
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

      <form onSubmit={handleSubmit} autoComplete="on">
        <div className="form-group">
          <label htmlFor="username">Username</label>
          <input
            id="username"
            name="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your username"
            disabled={loading}
            autoComplete="username"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="current-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            disabled={loading}
            autoComplete="current-password"
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
      </div>
    </div>
  )
}

export default LoginForm
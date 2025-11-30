import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import logo from '/Keplear-logo.png'
import styles from './AuthForms.module.css'

interface LoginFormProps {
  onToggleForm: (formType: 'login' | 'signup') => void
  onClose: () => void
  disableSignup?: boolean
  onAuthSuccess?: () => void
}

const LoginForm = ({ onToggleForm, onClose, disableSignup = false, onAuthSuccess }: LoginFormProps) => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { signIn, signOut } = useAuth()

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
        // If this is a gate login (onAuthSuccess provided), sign out and grant site access
        if (onAuthSuccess) {
          await signOut()
          onAuthSuccess()
        } else {
          onClose()
        }
      }
    } catch {
      setError('An unexpected error occurred')
    }

    setLoading(false)
  }

  return (
    <div className={styles.authForm}>
      <div className={styles.authBrand}>
        <img src={logo} alt="Keplear" className={styles.authLogo} />
      </div>
      <p className={styles.formDescription}>Sign in to your account</p>

      {error && (
        <div className={styles.errorMessage}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} autoComplete="on">
        <div className={styles.formGroup}>
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

        <div className={styles.formGroup}>
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
          className={`${styles.authButton} ${styles.primary} ${styles.createAccount}`}
          disabled={loading}
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      {!disableSignup && (
        <div className={styles.authFooter}>
          <p>
            Don't have an account?{' '}
            <button
              type="button"
              className={styles.linkButton}
              onClick={() => onToggleForm('signup')}
            >
              Sign up
            </button>
          </p>
        </div>
      )}
    </div>
  )
}

export default LoginForm
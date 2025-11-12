import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import styles from './AuthForms.module.css'

interface SignupFormProps {
  onToggleForm: (formType: 'login' | 'signup') => void
  onClose: () => void
}

interface FormData {
  username: string
  password: string
  confirmPassword: string
}

const SignupForm = ({ onToggleForm }: SignupFormProps) => {
  const [formData, setFormData] = useState<FormData>({
    username: '',
    password: '',
    confirmPassword: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const { signUp } = useAuth()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const validateForm = (): string | null => {
    if (!formData.username.trim()) {
      return 'Username is required'
    }
    if (formData.username.length < 3) {
      return 'Username must be at least 3 characters'
    }
    if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      return 'Username can only contain letters, numbers, and underscores'
    }
    if (formData.password !== formData.confirmPassword) {
      return 'Passwords do not match'
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      setLoading(false)
      return
    }

    try {
      const { error } = await signUp(
        formData.username, 
        formData.password,
        { full_name: formData.username }
      )
      
      if (error) {
        setError(typeof error === 'object' && error && 'message' in error ? String((error as { message: string }).message) : 'An error occurred')
      } else {
        setMessage('Account created successfully! You can now sign in.')
      }
    } catch {
      setError('An unexpected error occurred')
    }

    setLoading(false)
  }

  return (
    <div className={styles.authForm}>
      <div className={styles.authBrand}>
        <img src="/Keplear-logo.png" alt="Keplear" className={styles.authLogo} />
        <p className={styles.authSlogan}>Learn music like the greats</p>
      </div>
      <p className={styles.formDescription}>Create your account</p>

      {error && (
        <div className={styles.errorMessage}>
          {error}
        </div>
      )}

      {message && (
        <div className={styles.successMessage}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} autoComplete="on">
        <div className={styles.formGroup}>
          <label htmlFor="username">Username</label>
          <input
            id="username"
            name="username"
            type="text"
            value={formData.username}
            onChange={handleChange}
            placeholder="Username (a-z, 0-9, _ only)"
            disabled={loading}
            autoComplete="username"
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Create a password"
            disabled={loading}
            autoComplete="new-password"
            minLength={8}
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="confirmPassword">Confirm Password</label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="Confirm your password"
            disabled={loading}
            autoComplete="new-password"
            minLength={8}
            required
          />
        </div>

        <button
          type="submit"
          className={`${styles.authButton} ${styles.primary} ${styles.createAccount}`}
          disabled={loading}
        >
          {loading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>

      <div className={styles.authFooter}>
        <p>
          Already have an account?{' '}
          <button
            type="button"
            className={styles.linkButton}
            onClick={() => onToggleForm('login')}
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  )
}

export default SignupForm
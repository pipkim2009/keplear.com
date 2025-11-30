import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import logo from '/Keplear-logo.png'
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

const SignupForm = ({ onToggleForm, onClose }: SignupFormProps) => {
  const [formData, setFormData] = useState<FormData>({
    username: '',
    password: '',
    confirmPassword: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const { signUp, signIn } = useAuth()

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
      const { error: signUpError } = await signUp(
        formData.username,
        formData.password,
        { full_name: formData.username }
      )

      if (signUpError) {
        setError(typeof signUpError === 'object' && signUpError && 'message' in signUpError ? String((signUpError as { message: string }).message) : 'An error occurred')
        setLoading(false)
        return
      }

      // Auto-login after successful signup
      setMessage('Account created successfully! Logging you in...')
      const { error: signInError } = await signIn(formData.username, formData.password)

      if (signInError) {
        setError('Account created but login failed. Please sign in manually.')
        setLoading(false)
        return
      }

      // Close the modal on successful auto-login
      onClose()
    } catch {
      setError('An unexpected error occurred')
      setLoading(false)
    }
  }

  return (
    <div className={styles.authForm}>
      <div className={styles.authBrand}>
        <img src={logo} alt="Keplear" className={styles.authLogo} />
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
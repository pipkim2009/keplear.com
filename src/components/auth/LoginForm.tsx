import { useState, useMemo, useCallback } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { containsScriptInjection } from '../../utils/security'
import logo from '/Keplear-logo.png'
import styles from './AuthForms.module.css'

interface LoginFormProps {
  onToggleForm: (formType: 'login' | 'signup') => void
  onClose: () => void
  disableSignup?: boolean
  onAuthSuccess?: () => void
}

interface FormData {
  username: string
  password: string
}

interface FieldErrors {
  username?: string
  password?: string
}

interface TouchedFields {
  username: boolean
  password: boolean
}

const LoginForm = ({ onToggleForm, onClose, disableSignup = false, onAuthSuccess }: LoginFormProps) => {
  const [formData, setFormData] = useState<FormData>({
    username: '',
    password: ''
  })
  const [touched, setTouched] = useState<TouchedFields>({
    username: false,
    password: false
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { signIn, signOut } = useAuth()

  // Real-time field validation with security checks
  const fieldErrors = useMemo<FieldErrors>(() => {
    const errors: FieldErrors = {}

    // Username validation with injection check
    if (formData.username) {
      if (containsScriptInjection(formData.username)) {
        errors.username = 'Invalid characters detected'
      } else if (formData.username.length < 3) {
        errors.username = 'Username must be at least 3 characters'
      }
    }

    // Password validation (basic check for login - user may have old password)
    if (formData.password && formData.password.length < 6) {
      errors.password = 'Password too short'
    }

    return errors
  }, [formData])

  // Check if field is valid
  const isFieldValid = useCallback((field: keyof FormData): boolean => {
    if (!formData[field]) return false
    if (fieldErrors[field]) return false

    if (field === 'username') return formData.username.length >= 3 && !containsScriptInjection(formData.username)
    if (field === 'password') return formData.password.length >= 6

    return true
  }, [formData, fieldErrors])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Clear global error when user starts typing
    if (error) setError('')
  }

  const handleBlur = (field: keyof TouchedFields) => {
    setTouched(prev => ({
      ...prev,
      [field]: true
    }))
  }

  const getInputClassName = (field: keyof FormData): string => {
    if (!touched[field]) return ''
    if (fieldErrors[field]) return styles.inputError
    if (isFieldValid(field)) return styles.inputValid
    return ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Mark all fields as touched
    setTouched({
      username: true,
      password: true
    })

    // Check for validation errors
    if (Object.keys(fieldErrors).length > 0) {
      setError('Please fix the errors above')
      return
    }

    // Check required fields
    if (!formData.username || !formData.password) {
      setError('Please fill in all fields')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { error: signInError } = await signIn(formData.username, formData.password)
      if (signInError) {
        setError(
          typeof signInError === 'object' && signInError && 'message' in signInError
            ? String((signInError as { message: string }).message)
            : 'Invalid username or password'
        )
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
        <div className={styles.errorMessage} role="alert" aria-live="polite">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} autoComplete="on" noValidate>
        <div className={styles.formGroup}>
          <label htmlFor="login-username">Username</label>
          <input
            id="login-username"
            name="username"
            type="text"
            value={formData.username}
            onChange={handleChange}
            onBlur={() => handleBlur('username')}
            placeholder="Enter your username"
            disabled={loading}
            autoComplete="username"
            className={getInputClassName('username')}
            aria-invalid={touched.username && !!fieldErrors.username}
            aria-describedby={fieldErrors.username ? 'login-username-error' : undefined}
          />
          {touched.username && fieldErrors.username && (
            <div id="login-username-error" className={styles.fieldError} role="alert">
              {fieldErrors.username}
            </div>
          )}
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            onBlur={() => handleBlur('password')}
            placeholder="Enter your password"
            disabled={loading}
            autoComplete="current-password"
            className={getInputClassName('password')}
            aria-invalid={touched.password && !!fieldErrors.password}
            aria-describedby={fieldErrors.password ? 'login-password-error' : undefined}
          />
          {touched.password && fieldErrors.password && (
            <div id="login-password-error" className={styles.fieldError} role="alert">
              {fieldErrors.password}
            </div>
          )}
        </div>

        <button
          type="submit"
          className={`${styles.authButton} ${styles.primary}`}
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

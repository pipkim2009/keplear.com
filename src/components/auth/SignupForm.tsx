import { useState, useMemo, useCallback } from 'react'
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

interface FieldErrors {
  username?: string
  password?: string
  confirmPassword?: string
}

interface TouchedFields {
  username: boolean
  password: boolean
  confirmPassword: boolean
}

type PasswordStrength = 'weak' | 'medium' | 'strong'

/**
 * Calculates password strength based on various criteria
 */
function calculatePasswordStrength(password: string): PasswordStrength {
  if (password.length < 8) return 'weak'

  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[^a-zA-Z0-9]/.test(password)) score++

  if (score <= 2) return 'weak'
  if (score <= 3) return 'medium'
  return 'strong'
}

const SignupForm = ({ onToggleForm, onClose }: SignupFormProps) => {
  const [formData, setFormData] = useState<FormData>({
    username: '',
    password: '',
    confirmPassword: ''
  })
  const [touched, setTouched] = useState<TouchedFields>({
    username: false,
    password: false,
    confirmPassword: false
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const { signUp, signIn } = useAuth()

  // Real-time field validation
  const fieldErrors = useMemo<FieldErrors>(() => {
    const errors: FieldErrors = {}

    // Username validation
    if (formData.username) {
      if (formData.username.length < 3) {
        errors.username = 'Username must be at least 3 characters'
      } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
        errors.username = 'Only letters, numbers, and underscores allowed'
      } else if (formData.username.length > 20) {
        errors.username = 'Username must be 20 characters or less'
      }
    }

    // Password validation
    if (formData.password && formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters'
    }

    // Confirm password validation
    if (formData.confirmPassword && formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match'
    }

    return errors
  }, [formData])

  // Password strength
  const passwordStrength = useMemo<PasswordStrength>(() => {
    return calculatePasswordStrength(formData.password)
  }, [formData.password])

  // Check if field is valid (has value, no errors)
  const isFieldValid = useCallback((field: keyof FormData): boolean => {
    if (!formData[field]) return false
    if (fieldErrors[field]) return false

    // Additional checks per field
    if (field === 'username') return formData.username.length >= 3
    if (field === 'password') return formData.password.length >= 8
    if (field === 'confirmPassword') return formData.password === formData.confirmPassword && formData.confirmPassword.length > 0

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
      password: true,
      confirmPassword: true
    })

    // Check for validation errors
    if (Object.keys(fieldErrors).length > 0) {
      setError('Please fix the errors above')
      return
    }

    // Check required fields
    if (!formData.username || !formData.password || !formData.confirmPassword) {
      setError('Please fill in all fields')
      return
    }

    setLoading(true)
    setError('')
    setMessage('')

    try {
      const { error: signUpError } = await signUp(
        formData.username,
        formData.password,
        { full_name: formData.username }
      )

      if (signUpError) {
        setError(
          typeof signUpError === 'object' && signUpError && 'message' in signUpError
            ? String((signUpError as { message: string }).message)
            : 'An error occurred'
        )
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

      onClose()
    } catch {
      setError('An unexpected error occurred')
      setLoading(false)
    }
  }

  const getStrengthLabel = (strength: PasswordStrength): string => {
    switch (strength) {
      case 'weak': return 'Weak - add more characters or variety'
      case 'medium': return 'Medium - consider adding special characters'
      case 'strong': return 'Strong password'
    }
  }

  return (
    <div className={styles.authForm}>
      <div className={styles.authBrand}>
        <img src={logo} alt="Keplear" className={styles.authLogo} />
      </div>
      <p className={styles.formDescription}>Create your account</p>

      {error && (
        <div className={styles.errorMessage} role="alert">
          {error}
        </div>
      )}

      {message && (
        <div className={styles.successMessage} role="status">
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} autoComplete="on" noValidate>
        <div className={styles.formGroup}>
          <label htmlFor="signup-username">Username</label>
          <input
            id="signup-username"
            name="username"
            type="text"
            value={formData.username}
            onChange={handleChange}
            onBlur={() => handleBlur('username')}
            placeholder="Username (3-20 characters)"
            disabled={loading}
            autoComplete="username"
            className={getInputClassName('username')}
            aria-invalid={touched.username && !!fieldErrors.username}
            aria-describedby={fieldErrors.username ? 'username-error' : undefined}
          />
          {touched.username && fieldErrors.username && (
            <div id="username-error" className={styles.fieldError} role="alert">
              {fieldErrors.username}
            </div>
          )}
          {touched.username && isFieldValid('username') && (
            <div className={styles.fieldSuccess}>
              ✓ Username available
            </div>
          )}
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="signup-password">Password</label>
          <input
            id="signup-password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            onBlur={() => handleBlur('password')}
            placeholder="Create a password (8+ characters)"
            disabled={loading}
            autoComplete="new-password"
            className={getInputClassName('password')}
            aria-invalid={touched.password && !!fieldErrors.password}
            aria-describedby="password-strength"
          />
          {formData.password && (
            <div className={styles.passwordStrength} id="password-strength">
              <div className={styles.strengthBar}>
                <div className={`${styles.strengthFill} ${styles[passwordStrength]}`} />
              </div>
              <span className={`${styles.strengthText} ${styles[passwordStrength]}`}>
                {getStrengthLabel(passwordStrength)}
              </span>
            </div>
          )}
          {touched.password && fieldErrors.password && (
            <div className={styles.fieldError} role="alert">
              {fieldErrors.password}
            </div>
          )}
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="signup-confirmPassword">Confirm Password</label>
          <input
            id="signup-confirmPassword"
            name="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={handleChange}
            onBlur={() => handleBlur('confirmPassword')}
            placeholder="Confirm your password"
            disabled={loading}
            autoComplete="new-password"
            className={getInputClassName('confirmPassword')}
            aria-invalid={touched.confirmPassword && !!fieldErrors.confirmPassword}
            aria-describedby={fieldErrors.confirmPassword ? 'confirm-error' : undefined}
          />
          {touched.confirmPassword && fieldErrors.confirmPassword && (
            <div id="confirm-error" className={styles.fieldError} role="alert">
              {fieldErrors.confirmPassword}
            </div>
          )}
          {touched.confirmPassword && isFieldValid('confirmPassword') && (
            <div className={styles.fieldSuccess}>
              ✓ Passwords match
            </div>
          )}
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

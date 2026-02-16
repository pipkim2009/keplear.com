import { useState, useMemo, useCallback } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../../hooks/useAuth'
import { useTranslation } from '../../contexts/TranslationContext'
import { validatePassword, containsScriptInjection } from '../../utils/security'
import logo from '/Keplear-logo.webp'
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
 * Calculates password strength using security utility
 */
function calculatePasswordStrength(password: string): PasswordStrength {
  return validatePassword(password).strength
}

const SignupForm = ({ onToggleForm, onClose }: SignupFormProps) => {
  const { t } = useTranslation()
  const [formData, setFormData] = useState<FormData>({
    username: '',
    password: '',
    confirmPassword: '',
  })
  const [touched, setTouched] = useState<TouchedFields>({
    username: false,
    password: false,
    confirmPassword: false,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [errorKey, setErrorKey] = useState('')
  const [message, setMessage] = useState('')
  const [messageKey, setMessageKey] = useState('')
  const [agreeToTerms, setAgreeToTerms] = useState(false)
  const [confirmAge, setConfirmAge] = useState(false)
  const { signUp, signIn } = useAuth()

  // Real-time field validation with security checks
  const fieldErrors = useMemo<FieldErrors>(() => {
    const errors: FieldErrors = {}

    // Username validation with injection check
    if (formData.username) {
      if (containsScriptInjection(formData.username)) {
        errors.username = t('errors.invalidCharacters')
      } else if (formData.username.length < 3) {
        errors.username = t('errors.usernameTooShort')
      } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
        errors.username = t('errors.usernameInvalidChars')
      } else if (formData.username.length > 20) {
        errors.username = t('errors.usernameTooLong')
      }
    }

    // Password validation using security utility
    if (formData.password) {
      const validation = validatePassword(formData.password)
      if (!validation.isValid) {
        errors.password = validation.message
      }
    }

    // Confirm password validation
    if (formData.confirmPassword && formData.password !== formData.confirmPassword) {
      errors.confirmPassword = t('errors.passwordsNoMatch')
    }

    return errors
  }, [formData, t])

  // Password strength
  const passwordStrength = useMemo<PasswordStrength>(() => {
    return calculatePasswordStrength(formData.password)
  }, [formData.password])

  // Check if field is valid (has value, no errors)
  const isFieldValid = useCallback(
    (field: keyof FormData): boolean => {
      if (!formData[field]) return false
      if (fieldErrors[field]) return false

      // Additional checks per field
      if (field === 'username') return formData.username.length >= 3
      if (field === 'password') return validatePassword(formData.password).isValid
      if (field === 'confirmPassword')
        return formData.password === formData.confirmPassword && formData.confirmPassword.length > 0

      return true
    },
    [formData, fieldErrors]
  )

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }))
    // Clear global error when user starts typing
    if (error) setError('')
  }

  const handleBlur = (field: keyof TouchedFields) => {
    setTouched(prev => ({
      ...prev,
      [field]: true,
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
      confirmPassword: true,
    })

    // Check for validation errors
    if (Object.keys(fieldErrors).length > 0) {
      setErrorKey('errors.fixErrorsAbove')
      return
    }

    // Check required fields
    if (!formData.username || !formData.password || !formData.confirmPassword) {
      setErrorKey('errors.fillAllFields')
      return
    }

    // Check consent
    if (!agreeToTerms) {
      setError('You must agree to the Privacy Policy and Terms of Service')
      return
    }
    if (!confirmAge) {
      setError('You must confirm you are 13 years of age or older')
      return
    }

    setLoading(true)
    setError('')
    setErrorKey('')
    setMessage('')
    setMessageKey('')

    try {
      const { error: signUpError } = await signUp(formData.username, formData.password, {
        full_name: formData.username,
      })

      if (signUpError) {
        if (typeof signUpError === 'object' && signUpError && 'message' in signUpError) {
          setError(String((signUpError as { message: string }).message))
        } else {
          setErrorKey('errors.unexpectedError')
        }
        setLoading(false)
        return
      }

      // Auto-login after successful signup
      setMessageKey('errors.accountCreatedSuccess')
      const { error: signInError } = await signIn(formData.username, formData.password)

      if (signInError) {
        setErrorKey('errors.accountCreatedLoginFailed')
        setLoading(false)
        return
      }

      onClose()
    } catch {
      setErrorKey('errors.unexpectedError')
      setLoading(false)
    }
  }

  const getStrengthLabel = (strength: PasswordStrength): string => {
    const validation = validatePassword(formData.password)
    if (!validation.isValid) {
      return validation.message
    }
    switch (strength) {
      case 'weak':
        return t('passwordStrength.weak')
      case 'medium':
        return t('passwordStrength.medium')
      case 'strong':
        return t('passwordStrength.strong')
    }
  }

  return (
    <div className={styles.authForm}>
      <div className={styles.authBrand}>
        <img src={logo} alt="Keplear" className={styles.authLogo} />
      </div>
      <p className={styles.formDescription}>{t('auth.createYourAccount')}</p>

      {(error || errorKey) && (
        <div className={styles.errorMessage} role="alert">
          {error || t(errorKey)}
        </div>
      )}

      {(message || messageKey) && (
        <div className={styles.successMessage} role="status">
          {message || t(messageKey)}
        </div>
      )}

      <form onSubmit={handleSubmit} autoComplete="on" noValidate>
        <div className={styles.formGroup}>
          <label htmlFor="signup-username">{t('auth.username')}</label>
          <input
            id="signup-username"
            name="username"
            type="text"
            value={formData.username}
            onChange={handleChange}
            onBlur={() => handleBlur('username')}
            placeholder={t('auth.usernamePlaceholder')}
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
            <div className={styles.fieldSuccess}>✓ {t('auth.usernameAvailable')}</div>
          )}
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="signup-password">{t('auth.password')}</label>
          <input
            id="signup-password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            onBlur={() => handleBlur('password')}
            placeholder={t('auth.passwordPlaceholder')}
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
          <label htmlFor="signup-confirmPassword">{t('auth.confirmPassword')}</label>
          <input
            id="signup-confirmPassword"
            name="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={handleChange}
            onBlur={() => handleBlur('confirmPassword')}
            placeholder={t('auth.confirmPasswordPlaceholder')}
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
            <div className={styles.fieldSuccess}>✓ {t('auth.passwordsMatch')}</div>
          )}
        </div>

        <div
          className={styles.formGroup}
          style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}
        >
          <label
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              fontSize: '0.8rem',
              color: '#aaa',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={confirmAge}
              onChange={e => setConfirmAge(e.target.checked)}
              style={{ marginTop: '2px', accentColor: '#7c3aed' }}
            />
            <span>I confirm I am 13 years of age or older</span>
          </label>
          <label
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              fontSize: '0.8rem',
              color: '#aaa',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={agreeToTerms}
              onChange={e => setAgreeToTerms(e.target.checked)}
              style={{ marginTop: '2px', accentColor: '#7c3aed' }}
            />
            <span>
              I agree to the{' '}
              <Link to="/privacy" style={{ color: '#a78bfa' }} target="_blank">
                Privacy Policy
              </Link>{' '}
              and{' '}
              <Link to="/cookies" style={{ color: '#a78bfa' }} target="_blank">
                Cookie Policy
              </Link>
            </span>
          </label>
        </div>

        <button
          type="submit"
          className={`${styles.authButton} ${styles.primary} ${styles.createAccount}`}
          disabled={loading || !agreeToTerms || !confirmAge}
        >
          {loading ? t('auth.creatingAccount') : t('auth.createAccount')}
        </button>
      </form>

      <div className={styles.authFooter}>
        <p>
          {t('auth.alreadyHaveAccount')}{' '}
          <button type="button" className={styles.linkButton} onClick={() => onToggleForm('login')}>
            {t('auth.signIn')}
          </button>
        </p>
      </div>
    </div>
  )
}

export default SignupForm

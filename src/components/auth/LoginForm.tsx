import { useState, useMemo, useCallback } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useTranslation } from '../../contexts/TranslationContext'
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
  const { t } = useTranslation()
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
  const [errorKey, setErrorKey] = useState('')
  const { signIn, signOut } = useAuth()

  // Real-time field validation with security checks
  const fieldErrors = useMemo<FieldErrors>(() => {
    const errors: FieldErrors = {}

    // Username validation with injection check
    if (formData.username) {
      if (containsScriptInjection(formData.username)) {
        errors.username = t('errors.invalidCharacters')
      } else if (formData.username.length < 3) {
        errors.username = t('errors.usernameTooShort')
      }
    }

    // Password validation (basic check for login - user may have old password)
    if (formData.password && formData.password.length < 6) {
      errors.password = t('errors.passwordTooShort')
    }

    return errors
  }, [formData, t])

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
      setErrorKey('errors.fixErrorsAbove')
      return
    }

    // Check required fields
    if (!formData.username || !formData.password) {
      setErrorKey('errors.fillAllFields')
      return
    }

    setLoading(true)
    setError('')
    setErrorKey('')

    try {
      const { error: signInError } = await signIn(formData.username, formData.password)
      if (signInError) {
        if (typeof signInError === 'object' && signInError && 'message' in signInError) {
          setError(String((signInError as { message: string }).message))
        } else {
          setErrorKey('errors.invalidCredentials')
        }
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
      setErrorKey('errors.unexpectedError')
    }

    setLoading(false)
  }

  return (
    <div className={styles.authForm}>
      <div className={styles.authBrand}>
        <img src={logo} alt="Keplear" className={styles.authLogo} />
      </div>
      <p className={styles.formDescription}>{t('auth.signInToAccount')}</p>

      {(error || errorKey) && (
        <div className={styles.errorMessage} role="alert" aria-live="polite">
          {error || t(errorKey)}
        </div>
      )}

      <form onSubmit={handleSubmit} autoComplete="on" noValidate>
        <div className={styles.formGroup}>
          <label htmlFor="login-username">{t('auth.username')}</label>
          <input
            id="login-username"
            name="username"
            type="text"
            value={formData.username}
            onChange={handleChange}
            onBlur={() => handleBlur('username')}
            placeholder={t('auth.enterUsername')}
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
          <label htmlFor="login-password">{t('auth.password')}</label>
          <input
            id="login-password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            onBlur={() => handleBlur('password')}
            placeholder={t('auth.enterPassword')}
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
          {loading ? t('auth.signingIn') : t('auth.signIn')}
        </button>
      </form>

      {!disableSignup && (
        <div className={styles.authFooter}>
          <p>
            {t('auth.dontHaveAccount')}{' '}
            <button
              type="button"
              className={styles.linkButton}
              onClick={() => onToggleForm('signup')}
            >
              {t('auth.signUp')}
            </button>
          </p>
        </div>
      )}
    </div>
  )
}

export default LoginForm

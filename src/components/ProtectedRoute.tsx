import { ReactNode, useState, useEffect } from 'react'
import AuthModal from './auth/AuthModal'
import { useTranslation } from '../contexts/TranslationContext'

const SITE_ACCESS_KEY = 'keplear_site_access'

interface ProtectedRouteProps {
  children: ReactNode
}

/**
 * ProtectedRoute component that requires site access gate
 * Shows a login modal as a gate - but only grants site access, not actual login
 * After passing the gate, user can browse the site in logged-out state
 * and test the real login/signup flow
 */
function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { t } = useTranslation()
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)
  const [showGateModal, setShowGateModal] = useState(false)

  useEffect(() => {
    // Check if user has already passed the gate
    const accessGranted = localStorage.getItem(SITE_ACCESS_KEY)
    if (accessGranted === 'true') {
      setHasAccess(true)
    } else {
      setHasAccess(false)
      setShowGateModal(true)
    }
  }, [])

  // Grant site access (called when user "logs in" at the gate)
  const grantAccess = () => {
    localStorage.setItem(SITE_ACCESS_KEY, 'true')
    setHasAccess(true)
    setShowGateModal(false)
  }

  // Show loading state while checking access
  if (hasAccess === null) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '50vh',
        fontSize: '1.2rem',
        color: 'var(--text-primary)'
      }}>
        {t('common.loading')}
      </div>
    )
  }

  // If user has site access, render the content
  if (hasAccess) {
    return <>{children}</>
  }

  // If no access, show gate modal
  return (
    <>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '50vh',
        padding: '40px 20px',
        textAlign: 'center'
      }}>
        <h2 style={{
          fontSize: '2rem',
          marginBottom: '1rem',
          color: 'var(--text-primary)'
        }}>
          {t('protectedRoute.accessRequired')}
        </h2>
        <p style={{
          fontSize: '1.1rem',
          marginBottom: '2rem',
          color: 'var(--text-secondary)',
          maxWidth: '500px'
        }}>
          {t('protectedRoute.signInToAccess')}
        </p>
      </div>

      <AuthModal
        isOpen={showGateModal}
        onClose={() => {
          // Don't allow closing the modal - user must pass the gate
        }}
        initialForm="login"
        disableSignup={true}
        onAuthSuccess={grantAccess}
      />
    </>
  )
}

export default ProtectedRoute

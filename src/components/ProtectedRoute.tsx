import { ReactNode, useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import AuthModal from './auth/AuthModal'

interface ProtectedRouteProps {
  children: ReactNode
}

/**
 * ProtectedRoute component that requires authentication
 * Shows a login-only modal if user is not authenticated
 * Does not offer signup - users must sign up from the home page
 */
function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const [showLoginModal, setShowLoginModal] = useState(false)

  useEffect(() => {
    // If not loading and no user, show login modal
    if (!loading && !user) {
      setShowLoginModal(true)
    } else if (user) {
      setShowLoginModal(false)
    }
  }, [user, loading])

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '50vh',
        fontSize: '1.2rem',
        color: 'var(--text-primary)'
      }}>
        Loading...
      </div>
    )
  }

  // If user is authenticated, render the protected content
  if (user) {
    return <>{children}</>
  }

  // If not authenticated, show login modal and a message
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
          Authentication Required
        </h2>
        <p style={{
          fontSize: '1.1rem',
          marginBottom: '2rem',
          color: 'var(--text-secondary)',
          maxWidth: '500px'
        }}>
          Please sign in to access this page. This content is restricted to authenticated users only.
        </p>
      </div>

      <AuthModal
        isOpen={showLoginModal}
        onClose={() => {
          // Don't allow closing the modal - user must login or go back to home
          // Optionally, you could navigate them back to home here
        }}
        initialForm="login"
        disableSignup={true}
      />
    </>
  )
}

export default ProtectedRoute

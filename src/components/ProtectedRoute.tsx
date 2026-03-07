import { ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '../hooks/useAuth'
import AuthModal from './auth/AuthModal'
import PageLoader from './common/PageLoader'

interface ProtectedRouteProps {
  children: ReactNode
}

/**
 * ProtectedRoute component that requires authentication.
 * If not signed in, shows the auth modal (login/signup).
 * Closing the modal navigates back to the home page.
 */
function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  if (loading) {
    return <PageLoader />
  }

  if (user) {
    return <>{children}</>
  }

  return <AuthModal isOpen={true} onClose={() => navigate('/')} initialForm="login" />
}

export default ProtectedRoute

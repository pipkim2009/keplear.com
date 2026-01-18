import { useState, useCallback, memo } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useNavigation } from '../../hooks'
import { useTranslation } from '../../contexts/TranslationContext'
import ThemeToggle from '../common/ThemeToggle'
import AuthModal from '../auth/AuthModal'
import UserMenu from '../auth/UserMenu'
import logo from '/Keplear-logo.png'
import '../../styles/Header.css'

interface HeaderProps {
  readonly isDarkMode: boolean
  readonly onToggleTheme: () => void
}

const Header = memo(function Header({
  isDarkMode,
  onToggleTheme
}: HeaderProps) {
  // Use focused navigation hook instead of full context
  const {
    currentPage,
    navigateToHome,
    navigateToSandbox,
    navigateToClassroom
  } = useNavigation()
  const { user, loading } = useAuth()
  const { t } = useTranslation()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authForm, setAuthForm] = useState<'login' | 'signup'>('login')

  const handleShowLogin = useCallback(() => {
    setAuthForm('login')
    setShowAuthModal(true)
  }, [])

  const handleShowSignup = useCallback(() => {
    setAuthForm('signup')
    setShowAuthModal(true)
  }, [])

  const handleCloseModal = useCallback(() => {
    setShowAuthModal(false)
  }, [])

  return (
    <header className="header">
      <div className="header-content">
        <div className="header-left">
          <div className="header-brand">
            <img src={logo} alt="Keplear" className="header-logo" />
          </div>
        </div>

        <nav className="header-nav">
          <button
            className={`nav-link ${currentPage === 'home' ? 'nav-link-active' : ''}`}
            onClick={navigateToHome}
          >
            {t('nav.home')}
          </button>
          <button
            className={`nav-link ${currentPage === 'sandbox' ? 'nav-link-active' : ''}`}
            onClick={navigateToSandbox}
          >
            {t('nav.sandbox')}
          </button>
          <button
            className={`nav-link ${currentPage === 'classroom' ? 'nav-link-active' : ''}`}
            onClick={navigateToClassroom}
          >
            {t('nav.classroom')}
          </button>
        </nav>

        <div className="header-right">
          <ThemeToggle isDarkMode={isDarkMode} onToggle={onToggleTheme} />

          {!loading && (
            <div className="auth-section">
              {user ? (
                <UserMenu />
              ) : (
                <div className="auth-buttons">
                  <button
                    className="auth-btn login-btn"
                    onClick={handleShowLogin}
                  >
                    {t('auth.signIn')}
                  </button>
                  <button
                    className="auth-btn signup-btn"
                    onClick={handleShowSignup}
                  >
                    {t('auth.signUp')}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={handleCloseModal}
        initialForm={authForm}
      />
    </header>
  )
})

export default Header

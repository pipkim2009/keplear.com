import { useState, useCallback, memo } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useNavigation } from '../../hooks'
import { useTranslation } from '../../contexts/TranslationContext'
import ThemeToggle from '../common/ThemeToggle'
import AuthModal from '../auth/AuthModal'
import UserMenu from '../auth/UserMenu'
import logo from '/Keplear-logo.png'
import '../../styles/Header.css'
import 'flag-icons/css/flag-icons.min.css'

const LANGUAGES = [
  { code: 'en', name: 'English', country: 'gb' },
  { code: 'cy', name: 'Cymraeg', country: 'gb-wls' },
  { code: 'es', name: 'Español', country: 'es' },
  { code: 'fr', name: 'Français', country: 'fr' },
  { code: 'de', name: 'Deutsch', country: 'de' },
  { code: 'it', name: 'Italiano', country: 'it' },
  { code: 'pt', name: 'Português', country: 'pt' },
  { code: 'zh', name: '中文', country: 'cn' },
  { code: 'ja', name: '日本語', country: 'jp' },
  { code: 'ko', name: '한국어', country: 'kr' },
]

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
  const { language, setLanguage, t } = useTranslation()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authForm, setAuthForm] = useState<'login' | 'signup'>('login')
  const [showLanguageMenu, setShowLanguageMenu] = useState(false)

  const handleLanguageSelect = useCallback((code: string) => {
    setLanguage(code)
    setShowLanguageMenu(false)
  }, [setLanguage])

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
          <div className="language-selector">
            <button
              className="language-button"
              onClick={() => setShowLanguageMenu(!showLanguageMenu)}
              aria-label="Select language"
            >
              <span className={`fi fi-${LANGUAGES.find(l => l.code === language)?.country || 'gb'} language-flag`}></span>
            </button>
            {showLanguageMenu && (
              <div className="language-menu">
                {LANGUAGES.map(lang => (
                  <button
                    key={lang.code}
                    className={`language-option ${language === lang.code ? 'language-option-active' : ''}`}
                    onClick={() => handleLanguageSelect(lang.code)}
                  >
                    <span className={`fi fi-${lang.country} language-option-flag`}></span>
                    <span className="language-name">{lang.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

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
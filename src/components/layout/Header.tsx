import { useState, useCallback, useEffect, memo } from 'react'
import { Link, useLocation } from 'react-router'
import { PiMagnifyingGlass } from 'react-icons/pi'
import { HiOutlineMenu } from 'react-icons/hi'
import { IoClose } from 'react-icons/io5'
import { useAuth } from '../../hooks/useAuth'
import { useInstrument } from '../../contexts/InstrumentContext'
import { useTranslation } from '../../contexts/TranslationContext'
import ThemeToggle from '../common/ThemeToggle'
import SearchOverlay from '../common/SearchOverlay'
import AuthModal from '../auth/AuthModal'
import UserMenu from '../auth/UserMenu'
import logo from '/Keplear-logo.webp'
import '../../styles/Header.css'

interface HeaderProps {
  readonly isDarkMode: boolean
  readonly onToggleTheme: () => void
}

const Header = memo(function Header({ isDarkMode, onToggleTheme }: HeaderProps) {
  const location = useLocation()
  const { navigateToGenerator } = useInstrument()
  const { user, loading } = useAuth()
  const { t } = useTranslation()
  const [showSearch, setShowSearch] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authForm, setAuthForm] = useState<'login' | 'signup'>('login')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const currentPath = location.pathname

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [currentPath])

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

  // Generator link resets instrument state before navigating
  const handleGeneratorClick = useCallback(() => {
    navigateToGenerator()
  }, [navigateToGenerator])

  return (
    <header className="header">
      <div className="header-content">
        <div className="header-left">
          <Link to={user ? '/dashboard' : '/'} className="header-brand">
            <img src={logo} alt="Keplear" className="header-logo" />
          </Link>
        </div>

        <button
          className="mobile-menu-btn"
          onClick={() => setMobileMenuOpen(prev => !prev)}
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <IoClose size={32} /> : <HiOutlineMenu size={32} />}
        </button>

        <nav className={`header-nav ${mobileMenuOpen ? 'header-nav-open' : ''}`}>
          {user ? (
            <Link
              to="/dashboard"
              className={`nav-link ${currentPath === '/dashboard' ? 'nav-link-active' : ''}`}
            >
              {t('nav.dashboard')}
            </Link>
          ) : (
            <Link to="/" className={`nav-link ${currentPath === '/' ? 'nav-link-active' : ''}`}>
              {t('nav.home')}
            </Link>
          )}
          <Link
            to="/generator"
            className={`nav-link ${currentPath === '/generator' ? 'nav-link-active' : ''}`}
            onClick={handleGeneratorClick}
          >
            {t('nav.generator')}
          </Link>
          <Link
            to="/classroom"
            className={`nav-link ${currentPath === '/classroom' ? 'nav-link-active' : ''}`}
          >
            {t('nav.classroom')}
          </Link>
          <Link
            to="/sandbox"
            className={`nav-link ${currentPath === '/sandbox' ? 'nav-link-active' : ''}`}
          >
            {t('nav.sandbox')}
          </Link>
          <Link
            to="/songs"
            className={`nav-link ${currentPath === '/songs' ? 'nav-link-active' : ''}`}
          >
            {t('nav.songs')}
          </Link>
          <Link
            to="/instruments"
            className={`nav-link ${currentPath === '/instruments' ? 'nav-link-active' : ''}`}
          >
            {t('nav.instrument')}
          </Link>
          <Link
            to="/isolater"
            className={`nav-link ${currentPath === '/isolater' ? 'nav-link-active' : ''}`}
          >
            {t('nav.stems')}
          </Link>
          <Link
            to="/metronome"
            className={`nav-link ${currentPath === '/metronome' ? 'nav-link-active' : ''}`}
          >
            {t('nav.metronome')}
          </Link>
          <Link
            to="/tuner"
            className={`nav-link ${currentPath === '/tuner' ? 'nav-link-active' : ''}`}
          >
            {t('nav.tuner')}
          </Link>
        </nav>

        <div className="header-right">
          {showSearch ? (
            <SearchOverlay isOpen={showSearch} onClose={() => setShowSearch(false)} />
          ) : (
            <button
              className="search-btn"
              onClick={() => setShowSearch(true)}
              aria-label={t('common.search')}
            >
              <PiMagnifyingGlass size={18} />
            </button>
          )}
          <ThemeToggle isDarkMode={isDarkMode} onToggle={onToggleTheme} />

          {!loading && (
            <div className="auth-section">
              {user ? (
                <UserMenu />
              ) : (
                <div className="auth-buttons">
                  <button className="auth-btn login-btn" onClick={handleShowLogin}>
                    {t('auth.signIn')}
                  </button>
                  <button className="auth-btn signup-btn" onClick={handleShowSignup}>
                    {t('auth.signUp')}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <AuthModal isOpen={showAuthModal} onClose={handleCloseModal} initialForm={authForm} />
    </header>
  )
})

export default Header

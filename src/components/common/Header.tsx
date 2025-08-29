import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import ThemeToggle from './ThemeToggle'
import AuthModal from '../auth/AuthModal'
import UserMenu from '../auth/UserMenu'
import '../../styles/Header.css'

interface HeaderProps {
  isDarkMode: boolean
  onToggleTheme: () => void
}

function Header({ isDarkMode, onToggleTheme }: HeaderProps) {
  const { user, loading } = useAuth()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authForm, setAuthForm] = useState<'login' | 'signup'>('login')

  const handleShowLogin = () => {
    setAuthForm('login')
    setShowAuthModal(true)
  }

  const handleShowSignup = () => {
    setAuthForm('signup')
    setShowAuthModal(true)
  }

  return (
    <header className="header">
      <div className="header-content">
        <div className="header-left">
          <div className="header-brand">
            <h1 className="header-title">Keplear</h1>
            <p className="header-slogan">Interactive tools for musical ear training</p>
          </div>
        </div>
        
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
                    Sign In
                  </button>
                  <button 
                    className="auth-btn signup-btn"
                    onClick={handleShowSignup}
                  >
                    Sign Up
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialForm={authForm}
      />
    </header>
  )
}

export default Header
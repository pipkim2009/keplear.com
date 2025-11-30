import { useEffect, useCallback, memo } from 'react'
import { AuthProvider } from './contexts/AuthContext'
import { InstrumentProvider } from './contexts/InstrumentContext'
import Header from './components/common/Header'
import Footer from './components/common/Footer'
import Router from './components/Router'
import ProtectedRoute from './components/ProtectedRoute'
import ErrorBoundary from './components/ErrorBoundary'
import { useTheme } from './hooks/useTheme'
import styles from './styles/App.module.css'
import { IoMusicalNotes } from 'react-icons/io5'
import { MdRefresh } from 'react-icons/md'

/**
 * Main application component
 * Now simplified with context-based state management
 * Optimized with React.memo and useCallback for performance
 */
const App = memo(function App() {
  // Only theme management remains at app level
  const { isDarkMode, toggleTheme } = useTheme()

  // Apply theme class to document body for portaled modals and global styles
  useEffect(() => {
    document.body.className = isDarkMode ? 'dark' : 'light'
  }, [isDarkMode])

  // Memoize the toggle function to prevent unnecessary re-renders
  const memoizedToggleTheme = useCallback(() => {
    toggleTheme()
  }, [toggleTheme])

  return (
    <ErrorBoundary>
      <AuthProvider>
        <InstrumentProvider>
          <div className={`${styles.appContainer} ${isDarkMode ? styles.dark : styles.light}`}>
            <Header
              isDarkMode={isDarkMode}
              onToggleTheme={memoizedToggleTheme}
            />

            <ErrorBoundary fallback={
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '50vh',
                padding: '40px 20px',
                textAlign: 'center'
              }}>
                <div style={{
                  background: `linear-gradient(145deg, ${document.body.classList.contains('dark') ? '#2d3748, #1a202c' : '#f7fafc, #edf2f7'})`,
                  border: `2px solid ${document.body.classList.contains('dark') ? '#9333ea' : '#c084fc'}`,
                  borderRadius: '20px',
                  padding: '40px 30px',
                  maxWidth: '500px',
                  width: '100%',
                  boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
                  color: document.body.classList.contains('dark') ? '#e2e8f0' : '#2d3748'
                }}>
                  <div style={{
                    fontSize: '3rem',
                    marginBottom: '1rem'
                  }}>
                    <IoMusicalNotes />
                  </div>
                  <h3 style={{
                    fontSize: '1.8rem',
                    fontWeight: 'bold',
                    marginBottom: '1rem',
                    background: 'linear-gradient(145deg, #9333ea, #c084fc)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}>
                    Unable to load instrument interface
                  </h3>
                  <p style={{
                    fontSize: '1.1rem',
                    marginBottom: '2rem',
                    color: document.body.classList.contains('dark') ? '#a0aec0' : '#718096'
                  }}>
                    Something went wrong while loading the music interface. Please refresh the page to try again.
                  </p>
                  <button
                    onClick={() => window.location.reload()}
                    style={{
                      padding: '12px 24px',
                      background: 'linear-gradient(145deg, #9333ea, #c084fc)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '14px',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 4px 12px rgba(107, 70, 193, 0.3)'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.transform = 'translateY(-1px)'
                      e.currentTarget.style.boxShadow = '0 6px 16px rgba(107, 70, 193, 0.4)'
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(107, 70, 193, 0.3)'
                    }}
                  >
                    <MdRefresh /> Refresh Page
                  </button>
                </div>
              </div>
            }>
              <ProtectedRoute>
                <Router />
              </ProtectedRoute>
            </ErrorBoundary>

            <Footer />
          </div>
        </InstrumentProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
})

export default App
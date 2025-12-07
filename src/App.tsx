import { useEffect, useCallback, memo } from 'react'
import { AuthProvider } from './contexts/AuthContext'
import { InstrumentProvider } from './contexts/InstrumentContext'
import Header from './components/layout/Header'
import Footer from './components/layout/Footer'
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
              <div className={styles.errorFallback}>
                <div className={styles.errorCard}>
                  <div className={styles.errorIcon}>
                    <IoMusicalNotes />
                  </div>
                  <h3 className={styles.errorTitle}>
                    Unable to load instrument interface
                  </h3>
                  <p className={styles.errorMessage}>
                    Something went wrong while loading the music interface. Please refresh the page to try again.
                  </p>
                  <button
                    onClick={() => window.location.reload()}
                    className={styles.errorButton}
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
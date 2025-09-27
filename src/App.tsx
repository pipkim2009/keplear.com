import { useEffect } from 'react'
import { AuthProvider } from './contexts/AuthContext'
import { InstrumentProvider } from './contexts/InstrumentContext'
import Header from './components/common/Header'
import Footer from './components/common/Footer'
import Router from './components/Router'
import ErrorBoundary from './components/ErrorBoundary'
import { useTheme } from './hooks/useTheme'
import styles from './styles/App.module.css'

/**
 * Main application component
 * Now simplified with context-based state management
 */
function App() {
  // Only theme management remains at app level
  const { isDarkMode, toggleTheme } = useTheme()

  // Apply theme class to document body for portaled modals and global styles
  useEffect(() => {
    document.body.className = isDarkMode ? 'dark' : 'light'
  }, [isDarkMode])

  return (
    <ErrorBoundary>
      <AuthProvider>
        <InstrumentProvider>
          <div className={`${styles.appContainer} ${isDarkMode ? styles.dark : styles.light}`}>
            <Header
              isDarkMode={isDarkMode}
              onToggleTheme={toggleTheme}
            />

            <ErrorBoundary fallback={
              <div style={{ padding: '20px', textAlign: 'center' }}>
                <h3>Unable to load instrument interface</h3>
                <p>Please refresh the page to try again.</p>
              </div>
            }>
              <Router />
            </ErrorBoundary>

            <Footer />
          </div>
        </InstrumentProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
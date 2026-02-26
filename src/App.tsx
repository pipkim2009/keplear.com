import { useEffect, useCallback, memo, useState } from 'react'
import { BrowserRouter } from 'react-router'
import { HelmetProvider } from 'react-helmet-async'
import { AuthProvider } from './contexts/AuthContext'
import { InstrumentProvider } from './contexts/InstrumentContext'
import { TranslationProvider } from './contexts/TranslationContext'
import Header from './components/layout/Header'
import Footer from './components/layout/Footer'
import Router from './components/Router'
import ErrorBoundary from './components/ErrorBoundary'
import SkipLink from './components/common/SkipLink'
import ChatPanel from './components/common/ChatPanel'
import CookieConsent from './components/common/CookieConsent'
import SectionErrorBoundary from './components/common/SectionErrorBoundary'
import { AriaLiveProvider } from './components/common/AriaLive'
import { useTheme } from './hooks/useTheme'
import { useAuth } from './hooks/useAuth'
import { useOnboarding } from './hooks/useOnboarding'
import OnboardingWizard from './components/onboarding/OnboardingWizard'
import styles from './styles/App.module.css'
import { IoMusicalNotes } from 'react-icons/io5'
import { MdRefresh } from 'react-icons/md'

/**
 * Onboarding controller component
 * Shows the onboarding wizard for new users who haven't completed onboarding
 */
const OnboardingController = memo(function OnboardingController() {
  const { user, isNewUser, clearNewUserFlag, loading: authLoading } = useAuth()
  const { onboardingCompleted, isLoading: onboardingLoading } = useOnboarding(user?.id ?? null)
  const [completedThisSession, setCompletedThisSession] = useState(false)

  // Show onboarding if:
  // 1. User is logged in
  // 2. Auth is not loading
  // 3. User is new (show immediately) OR onboarding is not completed (after fetch)
  // 4. Not already completed this session
  const shouldShowOnboarding =
    user &&
    !authLoading &&
    !completedThisSession &&
    (isNewUser || (!onboardingLoading && onboardingCompleted === false))

  const handleOnboardingComplete = useCallback(() => {
    setCompletedThisSession(true)
    clearNewUserFlag()
  }, [clearNewUserFlag])

  if (!shouldShowOnboarding || !user) return null

  return <OnboardingWizard isOpen={true} userId={user.id} onComplete={handleOnboardingComplete} />
})

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
      <HelmetProvider>
        <BrowserRouter>
          <TranslationProvider>
            <AuthProvider>
              <AriaLiveProvider>
                <InstrumentProvider>
                  <SkipLink targetId="main-content" />
                  <div
                    className={`${styles.appContainer} ${isDarkMode ? styles.dark : styles.light}`}
                  >
                    <SectionErrorBoundary section="Header" silent>
                      <Header isDarkMode={isDarkMode} onToggleTheme={memoizedToggleTheme} />
                    </SectionErrorBoundary>

                    <main id="main-content" tabIndex={-1} className={styles.mainContent}>
                      <ErrorBoundary
                        fallback={
                          <div className={styles.errorFallback}>
                            <div className={styles.errorCard}>
                              <div className={styles.errorIcon}>
                                <IoMusicalNotes />
                              </div>
                              <h3 className={styles.errorTitle}>
                                Unable to load instrument interface
                              </h3>
                              <p className={styles.errorMessage}>
                                Something went wrong while loading the music interface. Please
                                refresh the page to try again.
                              </p>
                              <button
                                onClick={() => window.location.reload()}
                                className={styles.errorButton}
                              >
                                <MdRefresh /> Refresh Page
                              </button>
                            </div>
                          </div>
                        }
                      >
                        <Router />
                      </ErrorBoundary>
                    </main>

                    <Footer />
                    <SectionErrorBoundary section="Chat" silent>
                      <ChatPanel />
                    </SectionErrorBoundary>
                    <OnboardingController />
                    <CookieConsent />
                  </div>
                </InstrumentProvider>
              </AriaLiveProvider>
            </AuthProvider>
          </TranslationProvider>
        </BrowserRouter>
      </HelmetProvider>
    </ErrorBoundary>
  )
})

export default App

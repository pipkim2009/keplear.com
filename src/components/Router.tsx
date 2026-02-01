import { lazy, Suspense } from 'react'
import { useInstrument } from '../contexts/InstrumentContext'
import PageLoader from './common/PageLoader'

/**
 * Lazy-loaded page components for code splitting
 * Each page is loaded on-demand, reducing initial bundle size
 */
const Home = lazy(() => import('./pages/Home'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Sandbox = lazy(() => import('./pages/Sandbox'))
const Songs = lazy(() => import('./pages/Songs'))
const Classroom = lazy(() => import('./pages/Classroom'))
const Profile = lazy(() => import('./pages/Profile'))
const NotFound = lazy(() => import('./pages/NotFound'))

/**
 * Router component that handles page navigation and renders appropriate content
 * Uses React.lazy for route-based code splitting to optimize initial load time
 */
function Router() {
  const {
    currentPage,
    navigateToHome,
    navigateToSandbox,
    navigateToDashboard
  } = useInstrument()

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return (
          <Home
            onNavigateToSandbox={navigateToSandbox}
            onNavigateToDashboard={navigateToDashboard}
          />
        )

      case 'dashboard':
        return <Dashboard />

      case 'sandbox':
        return <Sandbox />

      case 'songs':
        return <Songs />

      case 'classroom':
        return <Classroom />

      case 'profile':
        return <Profile />

      case '404':
        return (
          <NotFound
            onNavigateToHome={navigateToHome}
          />
        )

      default:
        return (
          <Home
            onNavigateToSandbox={navigateToSandbox}
          />
        )
    }
  }

  return (
    <Suspense fallback={<PageLoader />}>
      {renderPage()}
    </Suspense>
  )
}

export default Router

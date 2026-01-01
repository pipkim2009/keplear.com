import Home from './pages/Home'
import Practice from './pages/Practice'
import Skills from './pages/Skills'
import NotFound from './pages/NotFound'
import Sandbox from './pages/Sandbox'
import { useInstrument } from '../contexts/InstrumentContext'

/**
 * Router component that handles page navigation and renders appropriate content
 */
function Router() {
  const {
    currentPage,
    navigateToHome,
    navigateToSandbox,
    navigateToPractice
  } = useInstrument()

  switch (currentPage) {
    case 'home':
      return (
        <Home
          onNavigateToSandbox={navigateToSandbox}
          onNavigateToPractice={navigateToPractice}
        />
      )

    case 'sandbox':
      return <Sandbox />

    case 'practice':
      return (
        <Practice
          onNavigateToSandbox={navigateToSandbox}
        />
      )

    case 'skills':
      return (
        <Skills
          onNavigateToHome={navigateToHome}
        />
      )

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
          onNavigateToPractice={navigateToPractice}
        />
      )
  }
}

export default Router

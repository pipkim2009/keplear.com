import Home from './pages/Home'
import NotFound from './pages/NotFound'
import Sandbox from './pages/Sandbox'
import Classroom from './pages/Classroom'
import { useInstrument } from '../contexts/InstrumentContext'

/**
 * Router component that handles page navigation and renders appropriate content
 */
function Router() {
  const {
    currentPage,
    navigateToHome,
    navigateToSandbox
  } = useInstrument()

  switch (currentPage) {
    case 'home':
      return (
        <Home
          onNavigateToSandbox={navigateToSandbox}
        />
      )

    case 'sandbox':
      return <Sandbox />

    case 'classroom':
      return <Classroom />

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

export default Router

import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router'
import PageLoader from './common/PageLoader'
import SectionErrorBoundary from './common/SectionErrorBoundary'
import ProtectedRoute from './ProtectedRoute'

/**
 * Lazy-loaded page components for code splitting
 */
const Home = lazy(() => import('./pages/Home'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Generator = lazy(() => import('./pages/Sandbox'))
const Songs = lazy(() => import('./pages/Songs'))
const Instruments = lazy(() => import('./pages/Instruments'))
const Stems = lazy(() => import('./pages/Stems'))
const Classroom = lazy(() => import('./pages/Classroom'))
const Profile = lazy(() => import('./pages/Profile'))
const Metronome = lazy(() => import('./pages/Metronome'))
const Tuner = lazy(() => import('./pages/Tuner'))
const SandboxPage = lazy(() => import('./pages/SandboxPage'))
const NotFound = lazy(() => import('./pages/NotFound'))
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'))
const TermsOfService = lazy(() => import('./pages/TermsOfService'))
const CookiePolicy = lazy(() => import('./pages/CookiePolicy'))

/**
 * Router component using React Router for URL-based navigation
 * Each route is wrapped in a SectionErrorBoundary for graceful degradation
 */
function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route
          path="/"
          element={
            <SectionErrorBoundary section="Home">
              <Home />
            </SectionErrorBoundary>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <SectionErrorBoundary section="Dashboard">
                <Dashboard />
              </SectionErrorBoundary>
            </ProtectedRoute>
          }
        />
        <Route
          path="/generator"
          element={
            <ProtectedRoute>
              <SectionErrorBoundary section="generator">
                <Generator />
              </SectionErrorBoundary>
            </ProtectedRoute>
          }
        />
        <Route
          path="/songs"
          element={
            <ProtectedRoute>
              <SectionErrorBoundary section="Songs">
                <Songs />
              </SectionErrorBoundary>
            </ProtectedRoute>
          }
        />
        <Route
          path="/instruments"
          element={
            <ProtectedRoute>
              <SectionErrorBoundary section="Instruments">
                <Instruments />
              </SectionErrorBoundary>
            </ProtectedRoute>
          }
        />
        <Route
          path="/isolater"
          element={
            <ProtectedRoute>
              <SectionErrorBoundary section="Stems">
                <Stems />
              </SectionErrorBoundary>
            </ProtectedRoute>
          }
        />
        <Route
          path="/classroom"
          element={
            <ProtectedRoute>
              <SectionErrorBoundary section="Classroom">
                <Classroom />
              </SectionErrorBoundary>
            </ProtectedRoute>
          }
        />
        <Route
          path="/classroom/:id"
          element={
            <ProtectedRoute>
              <SectionErrorBoundary section="Classroom">
                <Classroom />
              </SectionErrorBoundary>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <SectionErrorBoundary section="Profile">
                <Profile />
              </SectionErrorBoundary>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile/:userId"
          element={
            <ProtectedRoute>
              <SectionErrorBoundary section="Profile">
                <Profile />
              </SectionErrorBoundary>
            </ProtectedRoute>
          }
        />
        <Route
          path="/metronome"
          element={
            <ProtectedRoute>
              <SectionErrorBoundary section="Metronome">
                <Metronome />
              </SectionErrorBoundary>
            </ProtectedRoute>
          }
        />
        <Route
          path="/tuner"
          element={
            <ProtectedRoute>
              <SectionErrorBoundary section="Tuner">
                <Tuner />
              </SectionErrorBoundary>
            </ProtectedRoute>
          }
        />
        <Route
          path="/sandbox"
          element={
            <ProtectedRoute>
              <SectionErrorBoundary section="Sandbox">
                <SandboxPage />
              </SectionErrorBoundary>
            </ProtectedRoute>
          }
        />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/cookies" element={<CookiePolicy />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  )
}

export default Router

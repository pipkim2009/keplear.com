import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router'
import PageLoader from './common/PageLoader'
import SectionErrorBoundary from './common/SectionErrorBoundary'

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
            <SectionErrorBoundary section="Dashboard">
              <Dashboard />
            </SectionErrorBoundary>
          }
        />
        <Route
          path="/generator"
          element={
            <SectionErrorBoundary section="generator">
              <Generator />
            </SectionErrorBoundary>
          }
        />
        <Route
          path="/songs"
          element={
            <SectionErrorBoundary section="Songs">
              <Songs />
            </SectionErrorBoundary>
          }
        />
        <Route
          path="/instruments"
          element={
            <SectionErrorBoundary section="Instruments">
              <Instruments />
            </SectionErrorBoundary>
          }
        />
        <Route
          path="/isolater"
          element={
            <SectionErrorBoundary section="Stems">
              <Stems />
            </SectionErrorBoundary>
          }
        />
        <Route
          path="/classroom"
          element={
            <SectionErrorBoundary section="Classroom">
              <Classroom />
            </SectionErrorBoundary>
          }
        />
        <Route
          path="/classroom/:id"
          element={
            <SectionErrorBoundary section="Classroom">
              <Classroom />
            </SectionErrorBoundary>
          }
        />
        <Route
          path="/profile"
          element={
            <SectionErrorBoundary section="Profile">
              <Profile />
            </SectionErrorBoundary>
          }
        />
        <Route
          path="/profile/:userId"
          element={
            <SectionErrorBoundary section="Profile">
              <Profile />
            </SectionErrorBoundary>
          }
        />
        <Route
          path="/metronome"
          element={
            <SectionErrorBoundary section="Metronome">
              <Metronome />
            </SectionErrorBoundary>
          }
        />
        <Route
          path="/tuner"
          element={
            <SectionErrorBoundary section="Tuner">
              <Tuner />
            </SectionErrorBoundary>
          }
        />
        <Route
          path="/sandbox"
          element={
            <SectionErrorBoundary section="Sandbox">
              <SandboxPage />
            </SectionErrorBoundary>
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

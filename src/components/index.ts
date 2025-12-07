/**
 * Barrel exports for components
 * Organized by feature/domain for clean imports
 */

// Layout components
export { default as Header } from './layout/Header'
export { default as Footer } from './layout/Footer'

// Common/shared components
export { default as ThemeToggle } from './common/ThemeToggle'
export { default as NotesToggle } from './common/NotesToggle'
export { default as CustomAudioPlayer } from './common/CustomAudioPlayer'
export { default as Tooltip } from './common/Tooltip'
export { default as ScaleChordOptions } from './common/ScaleChordOptions'

// Instrument components
export { default as Keyboard } from './instruments/keyboard/Keyboard'
export { default as KeyboardKey } from './instruments/keyboard/KeyboardKey'
export { default as Guitar } from './instruments/guitar/Guitar'
export { default as Bass } from './instruments/bass/Bass'

// Instrument shared components
export { default as InstrumentDisplay } from './instruments/shared/InstrumentDisplay'
export { default as InstrumentRenderer } from './instruments/shared/InstrumentRenderer'
export { default as InstrumentSelector } from './instruments/shared/InstrumentSelector'
export { default as InstrumentControls } from './instruments/shared/InstrumentControls'
export { default as InstrumentHeader } from './instruments/shared/InstrumentHeader'

// Melody components
export { default as MelodyDisplay } from './melody/MelodyDisplay'
export { default as MelodyControls } from './melody/MelodyControls'
export { default as ParameterControls } from './melody/ParameterControls'

// Auth components
export { default as AuthModal } from './auth/AuthModal'
export { default as LoginForm } from './auth/LoginForm'
export { default as SignupForm } from './auth/SignupForm'
export { default as UserMenu } from './auth/UserMenu'

// Pages
export { default as Home } from './pages/Home'
export { default as Practice } from './pages/Practice'
export { default as NotFound } from './pages/NotFound'

// Core components
export { default as Router } from './Router'
export { default as ErrorBoundary } from './ErrorBoundary'
export { default as ProtectedRoute } from './ProtectedRoute'

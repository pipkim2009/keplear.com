/**
 * Barrel export for commonly used components
 */

// Common components
export { default as Header } from './common/Header'
export { default as Footer } from './common/Footer'
export { default as ThemeToggle } from './common/ThemeToggle'
export { default as NotesToggle } from './common/NotesToggle'
export { default as CustomAudioPlayer } from './common/CustomAudioPlayer'
export { default as ScaleOptions } from './common/ScaleOptions'
export { default as ChordOptions } from './common/ChordOptions'

// Keyboard components
export { default as Keyboard } from './keyboard/Keyboard'
export { default as KeyboardKey } from './keyboard/KeyboardKey'
export { default as InstrumentSelector } from './keyboard/InstrumentSelector'
export { default as InstrumentControls } from './keyboard/InstrumentControls'
export { default as InstrumentDisplay } from './keyboard/InstrumentDisplay'
export { default as MelodyControls } from './keyboard/MelodyControls'
export { default as ParameterControls } from './keyboard/ParameterControls'

// Instrument components
export { default as Guitar } from './guitar/Guitar'
export { default as Bass } from './bass/Bass'

// Auth components
export { default as AuthModal } from './auth/AuthModal'
export { default as LoginForm } from './auth/LoginForm'
export { default as SignupForm } from './auth/SignupForm'
export { default as UserMenu } from './auth/UserMenu'

// Pages
export { default as Home } from './pages/Home'
export { default as NotFound } from './pages/NotFound'

// Core components
export { default as Router } from './Router'
export { default as ErrorBoundary } from './ErrorBoundary'
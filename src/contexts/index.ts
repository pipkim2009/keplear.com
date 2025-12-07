/**
 * Barrel export for all context providers and hooks
 * Simplifies imports across the application
 */

// Main provider wrapper
export { AppProviders } from './AppProviders'

// Individual context providers
export { AudioProvider, useAudioContext } from './AudioContext'
export { UIProvider, useUI } from './UIContext'
export { InstrumentConfigProvider, useInstrumentConfigContext } from './InstrumentConfigContext'
export { MelodyProvider, useMelody } from './MelodyContext'

// Legacy context (backward compatibility)
export { InstrumentProvider, useInstrument } from './InstrumentContext'

// Auth context
export { AuthProvider } from './AuthContext'
export { useAuth } from '../hooks/useAuth'

// Type exports
export type { InstrumentType } from '../types/instrument'
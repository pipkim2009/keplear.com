/**
 * Barrel export for utility functions
 */

// Audio utilities
export * from './notes'

// Instrument utilities
export * from './instruments/guitar/guitarNotes'
export * from './instruments/guitar/guitarScales'
export * from './instruments/guitar/guitarChords'
export * from './instruments/bass/bassNotes'
export * from './instruments/bass/bassScales'
export * from './instruments/bass/bassChords'
export * from './instruments/keyboard/keyboardScales'
export * from './instruments/keyboard/keyboardChords'

// Core utilities
export { CircuitBreaker } from './errorHandler'
export * from './inputValidation'

// Security utilities
export {
  validatePassword,
  sanitizeInput,
  sanitizeUrlInput,
  sanitizeUsername,
  isValidUsername,
  isValidEmail,
  containsScriptInjection,
  safeJsonParse,
  generateSecureToken,
  hashString,
  RateLimiter,
  authRateLimiter,
  apiRateLimiter,
  SECURITY_CONFIG
} from './security'
export type { PasswordRequirements, PasswordValidationResult } from './security'

// Performance utilities
export {
  measurePerformance,
  debounce,
  throttle,
  memoizeWithCache,
  shallowEqual,
  deepEqual,
  batchUpdates,
  RenderMonitor
} from './performance'

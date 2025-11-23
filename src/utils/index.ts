/**
 * Barrel export for utility functions
 */

// Audio utilities
export * from './audioExport'
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
// export * from './instrumentHelpers' // TODO: Create this file

// Core utilities
export { CircuitBreaker } from './errorHandler'
// export { errorHandler } from './errorHandler' // Not exported
// export { logger } from './logger' // TODO: Create this file
// export { performanceMonitor } from './performance' // TODO: Create this file
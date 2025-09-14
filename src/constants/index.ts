/**
 * Application-wide constants and configuration
 */

/**
 * Default application settings
 */
export const DEFAULT_SETTINGS = {
  bpm: 120,
  numberOfNotes: 5,
  instrument: 'keyboard'
} as const

/**
 * Audio configuration constants
 */
export const AUDIO_CONFIG = {
  /** Minimum BPM allowed */
  minBpm: 60,
  /** Maximum BPM allowed */
  maxBpm: 200,
  /** Minimum number of notes in melody */
  minMelodyLength: 1,
  /** Maximum number of notes in melody */
  maxMelodyLength: 16,
  /** Default note duration for keyboard */
  keyboardDuration: '0.3',
  /** Default note duration for guitar */
  guitarDuration: '0.5',
  /** Default note duration for bass */
  bassDuration: '0.7'
} as const

/**
 * User authentication constants
 */
export const AUTH_CONFIG = {
  /** Minimum username length */
  minUsernameLength: 3,
  /** Maximum username length */
  maxUsernameLength: 20,
  /** Minimum password length */
  minPasswordLength: 6,
  /** Maximum password length */
  maxPasswordLength: 128,
  /** Username validation regex */
  usernamePattern: /^[a-zA-Z0-9_]+$/
} as const

/**
 * UI layout constants
 */
export const LAYOUT_CONFIG = {
  /** Keyboard white key width in pixels */
  whiteKeyWidth: 62, // 60px + 2px margin
  /** Keyboard black key width in pixels */
  blackKeyWidth: 36,
  /** Header height in pixels */
  headerHeight: 80,
  /** Footer height in pixels */
  footerHeight: 60
} as const

/**
 * External service URLs
 */
export const SERVICE_URLS = {
  /** Salamander Grand Piano samples base URL */
  keyboardSamples: 'https://tonejs.github.io/audio/salamander/',
  /** Acoustic guitar samples base URL */
  guitarSamples: 'https://nbrosowsky.github.io/tonejs-instruments/samples/guitar-acoustic/',
  /** Bass samples base URL (using lower octave piano samples) */
  bassSamples: 'https://tonejs.github.io/audio/salamander/'
} as const

/**
 * Musical constants
 */
export const MUSIC_CONFIG = {
  /** Base frequency for C4 in Hz */
  c4Frequency: 261.63,
  /** Number of semitones in an octave */
  semitonesPerOctave: 12,
  /** Chromatic note names */
  chromaticNotes: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const,
  /** Keyboard range */
  keyboardRange: {
    startOctave: 4,
    endOctave: 5
  }
} as const

/**
 * Application routes/pages
 */
export const ROUTES = {
  home: 'home',
  sandbox: 'sandbox',
  practice: 'practice'
} as const

/**
 * Supported instrument types
 */
export const INSTRUMENTS = {
  keyboard: 'keyboard',
  guitar: 'guitar',
  bass: 'bass'
} as const

/**
 * Theme configuration
 */
export const THEME_CONFIG = {
  /** CSS custom property names for theme variables */
  cssVariables: {
    primaryPurple: '--primary-purple',
    textPrimary: '--text-primary',
    bgPrimary: '--bg-primary'
  },
  /** Animation durations in ms */
  transitions: {
    fast: 150,
    normal: 300,
    slow: 500
  }
} as const

/**
 * Performance optimization constants
 */
export const PERFORMANCE_CONFIG = {
  /** Debounce delay for rapid user interactions */
  debounceDelay: 300,
  /** Throttle delay for scroll/resize events */
  throttleDelay: 100,
  /** Maximum number of melody history items to keep */
  maxMelodyHistory: 50
} as const

/**
 * Error messages
 */
export const ERROR_MESSAGES = {
  auth: {
    invalidUsername: 'Username must be 3-20 characters and contain only letters, numbers, and underscores',
    invalidPassword: 'Password must be 6-128 characters long',
    signUpFailed: 'Failed to create account. Please try again.',
    signInFailed: 'Invalid username or password',
    updatePasswordFailed: 'Failed to update password',
    deleteAccountFailed: 'Failed to delete account'
  },
  audio: {
    initializationFailed: 'Failed to initialize audio system',
    playbackFailed: 'Failed to play audio',
    contextBlocked: 'Audio blocked - user interaction required'
  },
  melody: {
    noNotesSelected: 'Please select notes before generating a melody',
    invalidNoteCount: 'Number of notes must be between 1 and 16',
    generationFailed: 'Failed to generate melody'
  }
} as const

/**
 * Success messages
 */
export const SUCCESS_MESSAGES = {
  auth: {
    signUpSuccess: 'Account created successfully!',
    signInSuccess: 'Welcome back!',
    passwordUpdated: 'Password updated successfully',
    accountDeleted: 'Account deleted successfully'
  },
  melody: {
    generated: 'Melody generated successfully!',
    saved: 'Melody saved to your collection'
  }
} as const

/**
 * Type definitions for constants
 */
export type InstrumentType = keyof typeof INSTRUMENTS
export type RouteType = keyof typeof ROUTES
export type ChromaticNote = typeof MUSIC_CONFIG.chromaticNotes[number]
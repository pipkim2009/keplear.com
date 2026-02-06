/**
 * Core type definitions for instruments
 */

/**
 * Available instrument types
 */
export type InstrumentType = 'keyboard' | 'guitar' | 'bass'

/**
 * Instrument type constants for avoiding magic strings
 */
export const INSTRUMENT_TYPES = {
  KEYBOARD: 'keyboard' as const,
  GUITAR: 'guitar' as const,
  BASS: 'bass' as const,
} as const

/**
 * Array of all instrument types for iteration
 */
export const ALL_INSTRUMENTS: readonly InstrumentType[] = ['keyboard', 'guitar', 'bass'] as const

/**
 * Chord playback modes
 */
export type ChordMode = 'arpeggiator' | 'progression'

/**
 * Chord mode constants
 */
export const CHORD_MODES = {
  ARPEGGIATOR: 'arpeggiator' as const,
  PROGRESSION: 'progression' as const,
} as const

export interface InstrumentConfig {
  type: InstrumentType
  octaveRange?: {
    lower: number
    higher: number
  }
  selectionMode?: 'range' | 'multi'
}

/**
 * Tone.js Sampler interface
 * Provides type safety for Tone.js audio operations
 */
export interface ToneSampler {
  triggerAttackRelease: (
    note: string | string[],
    duration: string | number,
    time?: number,
    velocity?: number
  ) => void
  triggerAttack: (note: string | string[], time?: number, velocity?: number) => void
  triggerRelease: (note: string | string[], time?: number) => void
  disconnect: () => void
  connect: (destination: unknown) => ToneSampler
  toDestination: () => ToneSampler
  dispose: () => void
  volume: {
    value: number
  }
}

/**
 * Audio recording options
 */
export interface RecordMelodyOptions {
  notes: readonly { name: string; position: number }[]
  bpm: number
  instrument: InstrumentType
}

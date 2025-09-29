/**
 * Core type definitions for instruments
 */

export type InstrumentType = 'keyboard' | 'guitar' | 'bass'

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
  triggerAttack: (
    note: string | string[],
    time?: number,
    velocity?: number
  ) => void
  triggerRelease: (note: string | string[], time?: number) => void
  disconnect: () => void
  connect: (destination: any) => ToneSampler
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
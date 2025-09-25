import type { Note } from './notes'

/**
 * Creates a unique note key for instrument selection tracking
 */
export const createNoteKey = (stringOrPosition: number, fretOrNote?: number | 'open'): string => {
  if (fretOrNote === undefined) {
    return `${stringOrPosition}`
  }
  return fretOrNote === 'open' ? `${stringOrPosition}-open` : `${stringOrPosition}-${fretOrNote}`
}

/**
 * Creates a negative note key for exclusion tracking
 */
export const createNegativeKey = (key: string): string => `-${key}`

/**
 * Checks if a key is a negative selection
 */
export const isNegativeKey = (key: string): boolean => key.startsWith('-')

/**
 * Gets the base key from a potentially negative key
 */
export const getBaseKey = (key: string): string => {
  return isNegativeKey(key) ? key.substring(1) : key
}

/**
 * Determines the CSS class for a note based on its state
 */
export const getNoteStateClass = (
  isInChord: boolean,
  isChordRoot: boolean,
  isInScale: boolean,
  isScaleRoot: boolean
): string => {
  const isChordRootNote = isChordRoot && isInChord
  const isScaleRootNote = isScaleRoot && isInScale

  if (isChordRootNote && isScaleRootNote) return 'chord-root-scale-root'
  if (isChordRootNote && isInScale) return 'chord-root-scale-note'
  if (isInChord && isScaleRootNote) return 'chord-note-scale-root'
  if (isChordRootNote) return 'chord-root-note'
  if (isScaleRootNote) return 'scale-root-note'
  if (isInChord && isInScale) return 'chord-scale-note'
  if (isInChord) return 'chord-note'
  if (isInScale) return 'scale-note'
  return ''
}

/**
 * Creates a Note object from instrument-specific data
 */
export const createNoteObject = (
  name: string,
  frequency: number,
  position: number
): Note => ({
  name,
  frequency,
  isBlack: name.includes('#'),
  position
})

/**
 * Batch update helper for Set operations
 */
export const batchUpdateSet = <T>(
  set: Set<T>,
  itemsToAdd: T[] = [],
  itemsToRemove: T[] = []
): Set<T> => {
  const newSet = new Set(set)
  itemsToAdd.forEach(item => newSet.add(item))
  itemsToRemove.forEach(item => newSet.delete(item))
  return newSet
}

/**
 * Helper to check if a note name is the same (ignoring octave)
 */
export const isSameNote = (note1: string, note2: string): boolean => {
  const stripOctave = (note: string) => note.replace(/\d+$/, '')
  return stripOctave(note1) === stripOctave(note2)
}

/**
 * Debounce helper for performance optimization
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout | null = null

  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId)
    timeoutId = setTimeout(() => {
      func(...args)
    }, delay)
  }
}

/**
 * Constants for common instrument configurations
 */
export const INSTRUMENT_CONSTANTS = {
  GUITAR: {
    STRING_COUNT: 6,
    FRET_COUNT: 24,
    STRING_MAPPING: [1, 2, 3, 4, 5, 6] as const
  },
  BASS: {
    STRING_COUNT: 4,
    FRET_COUNT: 24,
    STRING_MAPPING: [1, 2, 3, 4] as const
  }
} as const

export type InstrumentType = keyof typeof INSTRUMENT_CONSTANTS
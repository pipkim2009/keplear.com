/**
 * Practice Mode Note Utilities
 * Uses unique IDs for reliable note placement and scene management
 */

import type { Note } from '../notes'
import type { GuitarNote } from '../instruments/guitar/guitarNotes'
import type { BassNote } from '../instruments/bass/bassNotes'
import { guitarNotes } from '../instruments/guitar/guitarNotes'
import { bassNotes } from '../instruments/bass/bassNotes'
import { generateNotesWithSeparateOctaves } from '../notes'

// Type for any instrument note with ID
export type InstrumentNote = Note | GuitarNote | BassNote

// Scene definition for practice mode
export interface PracticeScene {
  id: string
  name: string
  instrument: 'keyboard' | 'guitar' | 'bass'
  noteIds: string[]
  bpm?: number
  beats?: number
}

/**
 * Get a guitar note by its ID
 */
export const getGuitarNoteById = (id: string): GuitarNote | undefined => {
  return guitarNotes.find(note => note.id === id)
}

/**
 * Get a bass note by its ID
 */
export const getBassNoteById = (id: string): BassNote | undefined => {
  return bassNotes.find(note => note.id === id)
}

/**
 * Get a keyboard note by its ID
 */
export const getKeyboardNoteById = (id: string, lowerOctaves: number = 3, higherOctaves: number = 3): Note | undefined => {
  const allNotes = generateNotesWithSeparateOctaves(lowerOctaves, higherOctaves)
  return allNotes.find(note => note.id === id)
}

/**
 * Get multiple guitar notes by their IDs
 */
export const getGuitarNotesByIds = (ids: string[]): GuitarNote[] => {
  return ids
    .map(id => getGuitarNoteById(id))
    .filter((note): note is GuitarNote => note !== undefined)
}

/**
 * Get multiple bass notes by their IDs
 */
export const getBassNotesByIds = (ids: string[]): BassNote[] => {
  return ids
    .map(id => getBassNoteById(id))
    .filter((note): note is BassNote => note !== undefined)
}

/**
 * Get multiple keyboard notes by their IDs
 */
export const getKeyboardNotesByIds = (ids: string[], lowerOctaves: number = 3, higherOctaves: number = 3): Note[] => {
  return ids
    .map(id => getKeyboardNoteById(id, lowerOctaves, higherOctaves))
    .filter((note): note is Note => note !== undefined)
}

/**
 * Get random guitar notes from a specific string
 */
export const getRandomGuitarNotesOnString = (stringNum: number, count: number): GuitarNote[] => {
  const notesOnString = guitarNotes.filter(note => note.string === stringNum)
  const shuffled = [...notesOnString].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

/**
 * Get random bass notes from a specific string
 */
export const getRandomBassNotesOnString = (stringNum: number, count: number): BassNote[] => {
  const notesOnString = bassNotes.filter(note => note.string === stringNum)
  const shuffled = [...notesOnString].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

/**
 * Get random keyboard notes from a specific octave
 */
export const getRandomKeyboardNotesInOctave = (octave: number, count: number, lowerOctaves: number = 3, higherOctaves: number = 3): Note[] => {
  const allNotes = generateNotesWithSeparateOctaves(lowerOctaves, higherOctaves)
  const notesInOctave = allNotes.filter(note => {
    const noteOctave = note.name.match(/\d+$/)?.[0]
    return noteOctave === octave.toString()
  })
  const shuffled = [...notesInOctave].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

/**
 * Extended Note type that includes fretted instrument position info
 */
export interface FrettedNote extends Note {
  string?: number
  fret?: number
}

/**
 * Convert guitar/bass notes to the common Note format (for melody generation)
 * Preserves string/fret info for accurate position highlighting
 */
export const convertToNoteFormat = (notes: (GuitarNote | BassNote)[]): FrettedNote[] => {
  return notes.map(note => ({
    id: note.id,
    name: note.name,
    frequency: note.frequency,
    isBlack: note.name.includes('#'),
    position: note.position,
    string: note.string,
    fret: note.fret
  }))
}

/**
 * Create a practice scene from note IDs
 */
export const createPracticeScene = (
  id: string,
  name: string,
  instrument: 'keyboard' | 'guitar' | 'bass',
  noteIds: string[],
  options?: { bpm?: number; beats?: number }
): PracticeScene => {
  return {
    id,
    name,
    instrument,
    noteIds,
    bpm: options?.bpm,
    beats: options?.beats
  }
}

/**
 * Load notes from a practice scene
 */
export const loadSceneNotes = (scene: PracticeScene): InstrumentNote[] => {
  switch (scene.instrument) {
    case 'guitar':
      return getGuitarNotesByIds(scene.noteIds)
    case 'bass':
      return getBassNotesByIds(scene.noteIds)
    case 'keyboard':
      return getKeyboardNotesByIds(scene.noteIds)
    default:
      return []
  }
}

/**
 * Get note IDs from guitar positions (string + fret)
 */
export const getGuitarNoteIds = (positions: { string: number; fret: number }[]): string[] => {
  return positions.map(pos => `g-s${pos.string}-f${pos.fret}`)
}

/**
 * Get note IDs from bass positions (string + fret)
 */
export const getBassNoteIds = (positions: { string: number; fret: number }[]): string[] => {
  return positions.map(pos => `b-s${pos.string}-f${pos.fret}`)
}

/**
 * Get note IDs from keyboard note names
 */
export const getKeyboardNoteIds = (noteNames: string[]): string[] => {
  return noteNames.map(name => `k-${name}`)
}

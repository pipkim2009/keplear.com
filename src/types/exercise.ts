/**
 * Shared exercise type definitions
 * Extracted from Classroom.tsx for reuse across components and hooks
 */

import type { InstrumentType } from './instrument'

/** Serialized scale data stored in JSON */
export interface SerializedScaleData {
  root: string
  scaleName: string
  octave?: number
  displayName?: string
}

/** Serialized chord data stored in JSON */
export interface SerializedChordData {
  root: string
  chordName: string
  octave?: number
  fretZone?: number
  displayName?: string
}

/** Song assignment data (stored in selection_data or exercise.songData) */
export interface SongAssignmentData {
  videoId: string
  videoTitle: string
  markerA: number | null
  markerB: number | null
  playbackRate: number
}

/** A single exercise within an assignment */
export interface ExerciseData {
  id: string
  name: string
  transcript: string
  bpm: number
  beats: number
  chordMode: 'single' | 'progression'
  lowerOctaves: number
  higherOctaves: number
  selectedNoteIds: string[]
  appliedScales: Array<{
    root: string
    scaleName: string
    octave?: number
    displayName: string
  }>
  appliedChords: Array<{
    root: string
    chordName: string
    octave?: number
    fretZone?: number
    displayName: string
  }>
  type?: 'generator' | 'song'
  songData?: SongAssignmentData
}

/** Serialized exercise data from JSON (all fields optional for parsing) */
export interface SerializedExerciseData {
  id?: string
  name?: string
  transcript?: string
  bpm?: number
  beats?: number
  chordMode?: 'single' | 'progression'
  lowerOctaves?: number
  higherOctaves?: number
  selectedNoteIds?: string[]
  appliedScales?: SerializedScaleData[]
  appliedChords?: SerializedChordData[]
  type?: 'generator' | 'song'
  songData?: SongAssignmentData
}

/** Exercise category for presets and display */
export type ExerciseCategory = 'warmup' | 'practice' | 'song' | 'chord-progression'

/** A saved lesson template */
export interface LessonTemplate {
  id: string
  name: string
  instrument: InstrumentType
  category: string
  exercises: ExerciseData[]
  isSystem: boolean
  createdAt?: string
}

/** Create a default empty exercise */
export function createEmptyExercise(index: number, defaults?: Partial<ExerciseData>): ExerciseData {
  return {
    id: `exercise-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: `Exercise ${index + 1}`,
    transcript: '',
    bpm: 120,
    beats: 5,
    chordMode: 'single',
    lowerOctaves: 0,
    higherOctaves: 0,
    selectedNoteIds: [],
    appliedScales: [],
    appliedChords: [],
    ...defaults,
  }
}

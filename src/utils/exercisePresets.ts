/**
 * Exercise Presets - Factory functions for creating blank exercises by type
 */

import type { ExerciseData, ExerciseCategory, SongAssignmentData } from '../types/exercise'
import type { InstrumentType } from '../types/instrument'

/** Generate a unique exercise ID */
function genId(): string {
  return `exercise-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

/** Create a blank warmup exercise */
export function createWarmupExercise(
  _instrument: InstrumentType,
  _rootNote: string = 'C', // eslint-disable-line @typescript-eslint/no-unused-vars
  index: number = 0
): ExerciseData {
  return {
    id: genId(),
    name: `Exercise ${index + 1}`,
    transcript: '',
    bpm: 80,
    beats: 4,
    chordMode: 'single',
    lowerOctaves: 0,
    higherOctaves: 0,
    selectedNoteIds: [],
    appliedScales: [],
    appliedChords: [],
    type: 'generator',
  }
}

/** Create a blank practice exercise */
export function createPracticeExercise(
  _instrument: InstrumentType,
  _rootNote: string = 'C', // eslint-disable-line @typescript-eslint/no-unused-vars
  _scaleName: string = 'Major', // eslint-disable-line @typescript-eslint/no-unused-vars
  index: number = 1
): ExerciseData {
  return {
    id: genId(),
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
    type: 'generator',
  }
}

/** Create a blank song exercise */
export function createSongExercise(songData?: SongAssignmentData, index: number = 0): ExerciseData {
  return {
    id: genId(),
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
    type: 'song',
    songData: songData || undefined,
  }
}

/** Create a default 3-exercise lesson: Warmup -> Practice -> Song */
export function createDefaultLesson(
  instrument: InstrumentType,
  rootNote: string = 'C'
): ExerciseData[] {
  return [
    createWarmupExercise(instrument, rootNote, 0),
    createPracticeExercise(instrument, rootNote, 'Major', 1),
    createSongExercise(undefined, 2),
  ]
}

/** Get a label and icon hint for an exercise category */
export function getExerciseCategoryInfo(exercise: ExerciseData): {
  category: ExerciseCategory
  label: string
} {
  if (exercise.type === 'song') {
    return { category: 'song', label: 'Song' }
  }
  if (exercise.appliedChords.length > 0 && exercise.appliedScales.length === 0) {
    return { category: 'chord-progression', label: 'Chords' }
  }
  if (exercise.bpm <= 85) {
    return { category: 'warmup', label: 'Warmup' }
  }
  return { category: 'practice', label: 'Practice' }
}

/** Quick-add preset definitions */
export interface QuickAddPreset {
  key: string
  label: string
  category: ExerciseCategory
  create: (instrument: InstrumentType, rootNote: string, index: number) => ExerciseData
}

export const QUICK_ADD_PRESETS: QuickAddPreset[] = [
  {
    key: 'warmup',
    label: 'Warmup',
    category: 'warmup',
    create: (instrument, root, index) => createWarmupExercise(instrument, root, index),
  },
  {
    key: 'practice',
    label: 'Practice',
    category: 'practice',
    create: (instrument, root, index) => createPracticeExercise(instrument, root, 'Major', index),
  },
  {
    key: 'song',
    label: 'Song',
    category: 'song',
    create: (_instrument, _root, index) => createSongExercise(undefined, index),
  },
]

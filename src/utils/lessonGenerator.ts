/**
 * Lesson Generator - Rule-based lesson generation from music theory
 * No external API needed — pure rule-based music theory logic
 */

import type { ExerciseData } from '../types/exercise'
import type { InstrumentType } from '../types/instrument'
import {
  DIFFICULTY_BPM,
  DIFFICULTY_BEATS,
  getChordsForScale,
  getRelatedScale,
  type DifficultyLevel,
} from './musicTheory'

export interface LessonGeneratorParams {
  root: string
  scale: string
  instrument: InstrumentType
  difficulty: DifficultyLevel
  exerciseCount?: number // 3-7, defaults to auto based on difficulty
}

/** Generate a unique exercise ID */
function genId(): string {
  return `exercise-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

/** Get keyboard octave for exercise if instrument is keyboard */
function getOctave(instrument: InstrumentType): number | undefined {
  return instrument === 'keyboard' ? 4 : undefined
}

/** Build a display name for a scale */
function scaleDisplayName(root: string, scaleName: string, instrument: InstrumentType): string {
  const octave = getOctave(instrument)
  return octave ? `${root} ${scaleName} (Octave ${octave})` : `${root} ${scaleName}`
}

/** Build a display name for a chord */
function chordDisplayName(root: string, chordName: string, instrument: InstrumentType): string {
  const octave = getOctave(instrument)
  return octave ? `${root} ${chordName} (Octave ${octave})` : `${root} ${chordName}`
}

/**
 * Generate a full lesson from parameters
 * Produces a progression: slow warmup → scale practice → related scale → chord progression → song placeholder
 */
export function generateLesson(params: LessonGeneratorParams): ExerciseData[] {
  const { root, scale, instrument, difficulty } = params
  const bpmRange = DIFFICULTY_BPM[difficulty]
  const beatsRange = DIFFICULTY_BEATS[difficulty]
  const octave = getOctave(instrument)

  // Determine exercise count: auto based on difficulty, or user override
  const count =
    params.exerciseCount ?? (difficulty === 'beginner' ? 3 : difficulty === 'intermediate' ? 4 : 5)
  const exercises: ExerciseData[] = []
  let idx = 0

  // 1. Warmup — slow BPM, main scale
  exercises.push({
    id: genId(),
    name: `Exercise ${idx + 1}`,
    transcript: `Warm up with ${root} ${scale}. Play slowly, focus on clean technique.`,
    bpm: bpmRange.warmup,
    beats: beatsRange.warmup,
    chordMode: 'single',
    lowerOctaves: 0,
    higherOctaves: 0,
    selectedNoteIds: [],
    appliedScales: [
      {
        root,
        scaleName: scale,
        octave,
        displayName: scaleDisplayName(root, scale, instrument),
      },
    ],
    appliedChords: [],
    type: 'generator',
  })
  idx++

  // 2. Scale practice — medium BPM, main scale
  if (idx < count - 1) {
    // Reserve last slot for song
    exercises.push({
      id: genId(),
      name: `Exercise ${idx + 1}`,
      transcript: `Practice ${root} ${scale} at a steady tempo. Try ascending and descending patterns.`,
      bpm: bpmRange.practice,
      beats: beatsRange.practice,
      chordMode: 'single',
      lowerOctaves: 0,
      higherOctaves: 0,
      selectedNoteIds: [],
      appliedScales: [
        {
          root,
          scaleName: scale,
          octave,
          displayName: scaleDisplayName(root, scale, instrument),
        },
      ],
      appliedChords: [],
      type: 'generator',
    })
    idx++
  }

  // 3. Related scale — explore variety
  if (idx < count - 1) {
    const relatedScale = getRelatedScale(scale)
    exercises.push({
      id: genId(),
      name: `Exercise ${idx + 1}`,
      transcript: `Explore ${root} ${relatedScale}. Notice how it relates to ${scale}.`,
      bpm: bpmRange.practice,
      beats: beatsRange.practice,
      chordMode: 'single',
      lowerOctaves: 0,
      higherOctaves: 0,
      selectedNoteIds: [],
      appliedScales: [
        {
          root,
          scaleName: relatedScale,
          octave,
          displayName: scaleDisplayName(root, relatedScale, instrument),
        },
      ],
      appliedChords: [],
      type: 'generator',
    })
    idx++
  }

  // 4. Chord progression — use chords that pair with the scale
  if (idx < count - 1) {
    const chords = getChordsForScale(scale)
    const selectedChords = chords.slice(0, Math.min(3, chords.length))
    exercises.push({
      id: genId(),
      name: `Exercise ${idx + 1}`,
      transcript: `Chord progression: ${selectedChords.map(c => `${root} ${c}`).join(' → ')}. Practice smooth transitions.`,
      bpm: Math.round((bpmRange.warmup + bpmRange.practice) / 2),
      beats: beatsRange.practice,
      chordMode: 'progression',
      lowerOctaves: 0,
      higherOctaves: 0,
      selectedNoteIds: [],
      appliedScales: [],
      appliedChords: selectedChords.map(chordName => ({
        root,
        chordName,
        octave,
        fretZone: 0,
        displayName: chordDisplayName(root, chordName, instrument),
      })),
      type: 'generator',
    })
    idx++
  }

  // 5. Song placeholder — always last
  exercises.push({
    id: genId(),
    name: `Exercise ${idx + 1}`,
    transcript: `Apply what you learned to a song! Search for a song in ${root} ${scale}.`,
    bpm: bpmRange.practice,
    beats: beatsRange.practice,
    chordMode: 'single',
    lowerOctaves: 0,
    higherOctaves: 0,
    selectedNoteIds: [],
    appliedScales: [],
    appliedChords: [],
    type: 'song',
  })

  return exercises
}

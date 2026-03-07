/**
 * Daily Challenge Generator
 * Generates a deterministic daily practice challenge using a seeded PRNG.
 * The challenge changes each day but is the same for all users on the same day.
 */

import type { ExerciseData } from '../types/exercise'
import type { InstrumentType } from '../types/instrument'
import { generateNotesWithSeparateOctaves } from './notes'
import { applyScaleToKeyboard } from './instruments/keyboard/keyboardScales'
import {
  GUITAR_SCALES,
  type GuitarScale,
  getScalePositions,
} from './instruments/guitar/guitarScales'
import { guitarNotes } from './instruments/guitar/guitarNotes'
import { BASS_SCALES, getBassScalePositions } from './instruments/bass/bassScales'
import { bassNotes } from './instruments/bass/bassNotes'

// --- Seeded PRNG (mulberry32) ---

function mulberry32(seed: number): () => number {
  let s = seed | 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function seededShuffle<T>(arr: T[], rand: () => number): T[] {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

// --- Constants ---

const ROOT_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

const DAILY_SCALES: GuitarScale[] = [
  { name: 'Major', intervals: [0, 2, 4, 5, 7, 9, 11], description: '' },
  { name: 'Minor', intervals: [0, 2, 3, 5, 7, 8, 10], description: '' },
  { name: 'Pentatonic Major', intervals: [0, 2, 4, 7, 9], description: '' },
  { name: 'Pentatonic Minor', intervals: [0, 3, 5, 7, 10], description: '' },
  { name: 'Blues Scale', intervals: [0, 3, 5, 6, 7, 10], description: '' },
  { name: 'Dorian', intervals: [0, 2, 3, 5, 7, 9, 10], description: '' },
]

// --- Helpers (adapted from aiLessonGenerator.ts) ---

const CHROMATIC_ORDER = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

function keyboardNoteToPitch(noteId: string): number {
  const match = noteId.match(/^k-([A-G]#?)(\d+)$/)
  if (!match) return 0
  const [, noteName, octaveStr] = match
  const octave = parseInt(octaveStr, 10)
  const semitone = CHROMATIC_ORDER.indexOf(noteName)
  if (semitone === -1) return 0
  return octave * 12 + semitone
}

function sortNoteIdsByPitch(noteIds: string[], instrument: InstrumentType): string[] {
  const sorted = [...noteIds]
  if (instrument === 'keyboard') {
    sorted.sort((a, b) => keyboardNoteToPitch(a) - keyboardNoteToPitch(b))
  } else if (instrument === 'guitar') {
    sorted.sort((a, b) => {
      const matchA = a.match(/^g-s(\d+)-f(\d+)$/)
      const matchB = b.match(/^g-s(\d+)-f(\d+)$/)
      const posA = matchA ? parseInt(matchA[1]) * 25 + parseInt(matchA[2]) : 0
      const posB = matchB ? parseInt(matchB[1]) * 25 + parseInt(matchB[2]) : 0
      return posA - posB
    })
  } else if (instrument === 'bass') {
    sorted.sort((a, b) => {
      const matchA = a.match(/^b-s(\d+)-f(\d+)$/)
      const matchB = b.match(/^b-s(\d+)-f(\d+)$/)
      const posA = matchA ? parseInt(matchA[1]) * 25 + parseInt(matchA[2]) : 0
      const posB = matchB ? parseInt(matchB[1]) * 25 + parseInt(matchB[2]) : 0
      return posA - posB
    })
  }
  return sorted
}

function pickEvenlySpaced(sortedIds: string[], count: number): string[] {
  if (count >= sortedIds.length) return [...sortedIds]
  if (count <= 0) return []
  if (count === 1) return [sortedIds[Math.floor(sortedIds.length / 2)]]

  const result: string[] = []
  for (let i = 0; i < count; i++) {
    const index = Math.round((i * (sortedIds.length - 1)) / (count - 1))
    const id = sortedIds[index]
    if (!result.includes(id)) {
      result.push(id)
    }
  }
  return result
}

// --- Note generation per instrument ---

function getKeyboardNoteIds(rootNote: string, scale: GuitarScale): string[] {
  const allNotes = generateNotesWithSeparateOctaves(0, 0)
  const scaleNotes = applyScaleToKeyboard(rootNote, scale, allNotes)
  return scaleNotes.map(n => n.id)
}

function getGuitarNoteIds(rootNote: string, scale: GuitarScale): string[] {
  const scaleObj = GUITAR_SCALES.find(s => s.name === scale.name) || scale
  const positions = getScalePositions(rootNote, scaleObj, guitarNotes)
  return positions
    .filter(pos => pos.fret >= 0 && pos.fret <= 12)
    .map(pos => `g-s${pos.string}-f${pos.fret}`)
}

function getBassNoteIds(rootNote: string, scale: GuitarScale): string[] {
  const scaleObj = BASS_SCALES.find(s => s.name === scale.name)
  if (!scaleObj) return []
  const positions = getBassScalePositions(rootNote, scaleObj, bassNotes)
  return positions
    .filter(pos => pos.fret >= 0 && pos.fret <= 12)
    .map(pos => `b-s${pos.string}-f${pos.fret}`)
}

// --- Core generator ---

export interface DailyChallengeData {
  exercises: ExerciseData[]
  title: string
  description: string
  dateString: string
  rootNote: string
  scaleName: string
}

function getDateString(date?: Date): string {
  const d = date || new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}${month}${day}`
}

function isWeekday(date?: Date): boolean {
  const d = date || new Date()
  const day = d.getDay()
  return day >= 1 && day <= 5
}

export function generateDailyChallenge(
  instrument: InstrumentType,
  dateString?: string
): DailyChallengeData {
  const date = dateString
    ? new Date(
        parseInt(dateString.slice(0, 4)),
        parseInt(dateString.slice(4, 6)) - 1,
        parseInt(dateString.slice(6, 8))
      )
    : new Date()
  const ds = dateString || getDateString(date)
  const seed = parseInt(ds, 10)
  const rand = mulberry32(seed)

  // Pick root note and scale deterministically
  const rootIndex = Math.floor(rand() * ROOT_NOTES.length)
  const scaleIndex = Math.floor(rand() * DAILY_SCALES.length)
  const rootNote = ROOT_NOTES[rootIndex]
  const scale = DAILY_SCALES[scaleIndex]

  // Get note IDs for the chosen instrument
  let allNoteIds: string[]
  switch (instrument) {
    case 'keyboard':
      allNoteIds = getKeyboardNoteIds(rootNote, scale)
      break
    case 'guitar':
      allNoteIds = getGuitarNoteIds(rootNote, scale)
      break
    case 'bass':
      allNoteIds = getBassNoteIds(rootNote, scale)
      break
    default:
      allNoteIds = getKeyboardNoteIds(rootNote, scale)
  }

  // Sort and shuffle for variety
  const sorted = sortNoteIdsByPitch(allNoteIds, instrument)
  const shuffled = seededShuffle(sorted, rand)
  const totalNotes = sorted.length

  // Build exercises
  const exercises: ExerciseData[] = []
  const scaleDisplay = `${rootNote} ${scale.name}`
  const weekday = isWeekday(date)

  // Exercise 1: Warmup (no scale applied, ~35% of notes)
  const warmupCount = Math.max(3, Math.round(totalNotes * 0.35))
  const warmupNotes = pickEvenlySpaced(sorted, warmupCount)
  exercises.push({
    id: `daily-${ds}-0`,
    name: 'Warmup',
    transcript: `Warm up with some notes from ${scaleDisplay}. Take it slow.`,
    bpm: 75,
    beats: Math.max(3, warmupNotes.length),
    chordMode: 'single',
    lowerOctaves: 0,
    higherOctaves: 0,
    selectedNoteIds: warmupNotes,
    appliedScales: [],
    appliedChords: [],
  })

  // Exercise 2: Practice 1 (~65% of notes, scale applied)
  const practice1Count = Math.max(4, Math.round(totalNotes * 0.65))
  const practice1Notes = pickEvenlySpaced(shuffled, practice1Count)
  const practice1Sorted = sortNoteIdsByPitch(practice1Notes, instrument)
  exercises.push({
    id: `daily-${ds}-1`,
    name: 'Practice',
    transcript: `Practice the ${scaleDisplay} scale at a moderate tempo.`,
    bpm: 100,
    beats: Math.max(5, practice1Sorted.length),
    chordMode: 'single',
    lowerOctaves: 0,
    higherOctaves: 0,
    selectedNoteIds: practice1Sorted,
    appliedScales: [
      {
        root: rootNote,
        scaleName: scale.name,
        displayName: scaleDisplay,
      },
    ],
    appliedChords: [],
  })

  // Exercise 3: Practice 2 (weekdays only, all notes, scale applied)
  if (weekday) {
    exercises.push({
      id: `daily-${ds}-2`,
      name: 'Challenge',
      transcript: `Full ${scaleDisplay} challenge. All notes, faster tempo!`,
      bpm: 120,
      beats: Math.max(6, sorted.length),
      chordMode: 'single',
      lowerOctaves: 0,
      higherOctaves: 0,
      selectedNoteIds: [...sorted],
      appliedScales: [
        {
          root: rootNote,
          scaleName: scale.name,
          displayName: scaleDisplay,
        },
      ],
      appliedChords: [],
    })
  }

  return {
    exercises,
    title: 'Daily Challenge',
    description: scaleDisplay,
    dateString: ds,
    rootNote,
    scaleName: scale.name,
  }
}

// --- localStorage helpers ---

const STORAGE_KEY = 'dailyChallengeCompleted'

export function isDailyChallengeCompleted(dateString?: string): boolean {
  const ds = dateString || getDateString()
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return false
    const dates: string[] = JSON.parse(stored)
    return dates.includes(ds)
  } catch {
    return false
  }
}

export function markDailyChallengeCompleted(dateString?: string): void {
  const ds = dateString || getDateString()
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    const dates: string[] = stored ? JSON.parse(stored) : []
    if (!dates.includes(ds)) {
      dates.push(ds)
      // Keep only last 30 days to avoid unbounded growth
      if (dates.length > 30) {
        dates.splice(0, dates.length - 30)
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dates))
    }
  } catch {
    // Ignore localStorage errors
  }
}

export function getTodayDateString(): string {
  return getDateString()
}

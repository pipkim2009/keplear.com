/**
 * AI Lesson Generator
 * Takes a song + selected notes and produces a progressive lesson:
 * warmup → practice exercises → song
 */

import type { ExerciseData, SongAssignmentData } from '../types/exercise'
import type { InstrumentType } from '../types/instrument'
import { getGuitarNoteById } from './practice/practiceNotes'
import { getBassNoteById } from './practice/practiceNotes'

// Chromatic note order for keyboard sorting
const CHROMATIC_ORDER = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

function genId(): string {
  return `exercise-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

/** Parse a keyboard note ID like "k-C4" or "k-C#4" into a chromatic position */
function keyboardNoteToPitch(noteId: string): number {
  // Format: k-{NoteName}{Octave} e.g. k-C4, k-C#4, k-Db4
  const match = noteId.match(/^k-([A-G]#?)(\d+)$/)
  if (!match) return 0
  const [, noteName, octaveStr] = match
  const octave = parseInt(octaveStr, 10)
  const semitone = CHROMATIC_ORDER.indexOf(noteName)
  if (semitone === -1) return 0
  return octave * 12 + semitone
}

/** Sort note IDs by pitch for musically meaningful subsets */
function sortNoteIdsByPitch(noteIds: string[], instrument: InstrumentType): string[] {
  const sorted = [...noteIds]

  if (instrument === 'keyboard') {
    sorted.sort((a, b) => keyboardNoteToPitch(a) - keyboardNoteToPitch(b))
  } else if (instrument === 'guitar') {
    sorted.sort((a, b) => {
      const noteA = getGuitarNoteById(a)
      const noteB = getGuitarNoteById(b)
      return (noteA?.position ?? 0) - (noteB?.position ?? 0)
    })
  } else if (instrument === 'bass') {
    sorted.sort((a, b) => {
      const noteA = getBassNoteById(a)
      const noteB = getBassNoteById(b)
      return (noteA?.position ?? 0) - (noteB?.position ?? 0)
    })
  }

  return sorted
}

/** Pick evenly-spaced indices from a sorted array */
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

/** Pick new notes from remaining (not yet in currentNotes) to reach targetTotal,
 *  using evenly-spaced selection from the remainder. Returns combined set. */
function pickNewNotesFromRemaining(
  sorted: string[],
  currentNotes: string[],
  targetTotal: number
): string[] {
  if (targetTotal <= currentNotes.length) return [...currentNotes]
  const remaining = sorted.filter(id => !currentNotes.includes(id))
  const needed = targetTotal - currentNotes.length
  const newPicks = pickEvenlySpaced(remaining, needed)
  return [...currentNotes, ...newPicks]
}

interface PracticeConfig {
  bpm: number
  beats: number
  fraction: number
  transcript: string
}

/** Get practice exercise configs based on practice count */
function getPracticeConfigs(practiceCount: number): PracticeConfig[] {
  if (practiceCount === 1) {
    return [
      {
        bpm: 100,
        beats: 5,
        fraction: 1.0,
        transcript: 'Practice all the notes before playing the song.',
      },
    ]
  }
  if (practiceCount === 2) {
    return [
      {
        bpm: 90,
        beats: 4,
        fraction: 0.65,
        transcript: 'Practice the song notes at a comfortable tempo.',
      },
      {
        bpm: 110,
        beats: 6,
        fraction: 1.0,
        transcript: 'Play all the notes at a faster tempo to build confidence.',
      },
    ]
  }
  if (practiceCount === 3) {
    return [
      {
        bpm: 90,
        beats: 4,
        fraction: 0.6,
        transcript: 'Start with more of the notes at a slow tempo.',
      },
      { bpm: 100, beats: 5, fraction: 0.8, transcript: 'Add more notes and pick up the pace.' },
      {
        bpm: 120,
        beats: 7,
        fraction: 1.0,
        transcript: "Full speed with all the notes. You're ready for the song!",
      },
    ]
  }
  // practiceCount === 4
  return [
    {
      bpm: 90,
      beats: 4,
      fraction: 0.55,
      transcript: 'Start with a group of notes at a slow tempo.',
    },
    {
      bpm: 100,
      beats: 5,
      fraction: 0.7,
      transcript: 'Add more notes and increase the speed a little.',
    },
    {
      bpm: 110,
      beats: 6,
      fraction: 0.85,
      transcript: 'Almost all the notes now. Keep building speed.',
    },
    {
      bpm: 120,
      beats: 7,
      fraction: 1.0,
      transcript: 'Full speed with every note. Get ready to play the song!',
    },
  ]
}

export interface GenerateAILessonParams {
  selectedNoteIds: string[]
  appliedScales: ExerciseData['appliedScales']
  appliedChords: ExerciseData['appliedChords']
  instrument: InstrumentType
  songVideoId: string
  songTitle: string
  songMarkerA: number | null
  songMarkerB: number | null
  songPlaybackRate: number
}

/** Ensure beats is at least the total number of items (notes + scales + chords) */
function ensureBeats(
  beats: number,
  noteCount: number,
  scaleCount: number,
  chordCount: number
): number {
  const totalItems = noteCount + scaleCount + chordCount
  return Math.max(beats, totalItems)
}

/** Generate a progressive AI lesson from song + selected notes */
export function generateAILesson(params: GenerateAILessonParams): ExerciseData[] {
  const {
    selectedNoteIds,
    appliedScales,
    appliedChords,
    instrument,
    songVideoId,
    songTitle,
    songMarkerA,
    songMarkerB,
    songPlaybackRate,
  } = params

  const totalNotes = selectedNoteIds.length
  const hasScalesOrChords = appliedScales.length > 0 || appliedChords.length > 0
  const hasContent = totalNotes > 0 || hasScalesOrChords

  // Sort notes by pitch
  const sorted = totalNotes > 0 ? sortNoteIdsByPitch(selectedNoteIds, instrument) : []

  const exercises: ExerciseData[] = []
  let exerciseNumber = 1

  // --- Warmup (always included) ---
  const warmupNotes =
    totalNotes > 0
      ? pickEvenlySpaced(sorted, Math.min(4, Math.max(2, Math.round(totalNotes * 0.35))))
      : []
  // Warmup gets no scales/chords — just core notes
  const warmupBeats = ensureBeats(3, warmupNotes.length, 0, 0)

  exercises.push({
    id: genId(),
    name: `Exercise ${exerciseNumber}`,
    transcript: hasContent
      ? 'Warm up your fingers with these core notes at a slow tempo.'
      : 'Warm up your fingers at a slow tempo before playing the song.',
    bpm: 75,
    beats: warmupBeats,
    chordMode: 'single',
    lowerOctaves: 0,
    higherOctaves: 0,
    selectedNoteIds: warmupNotes,
    appliedScales: [],
    appliedChords: [],
  })
  exerciseNumber++

  // --- Practice exercises (always at least 1) ---
  if (hasContent) {
    // Scale practice count by total items — avoid redundant exercises for small sets
    let practiceCount: number
    const totalItems = totalNotes + appliedScales.length + appliedChords.length
    if (totalItems <= 5) {
      practiceCount = 1
    } else if (totalItems <= 9) {
      practiceCount = 2
    } else if (totalItems <= 14) {
      practiceCount = 3
    } else {
      practiceCount = 4
    }

    const practiceConfigs = getPracticeConfigs(practiceCount)
    let currentNotes = [...warmupNotes]
    for (let i = 0; i < practiceConfigs.length; i++) {
      const config = practiceConfigs[i]
      const isLast = i === practiceConfigs.length - 1

      // Notes: cumulative build-up
      if (totalNotes > 0) {
        const noteCount = Math.max(2, Math.round(totalNotes * config.fraction))
        currentNotes = pickNewNotesFromRemaining(sorted, currentNotes, noteCount)
      }

      // Scales/chords: introduce in later exercises, all by final practice
      let exerciseScales: ExerciseData['appliedScales'] = []
      let exerciseChords: ExerciseData['appliedChords'] = []
      if (hasScalesOrChords) {
        const scaleCount = appliedScales.length
        const chordCount = appliedChords.length
        // First practice: no scales/chords (just notes)
        // Middle practices: partial scales/chords
        // Last practice: all scales/chords
        if (isLast) {
          exerciseScales = [...appliedScales]
          exerciseChords = [...appliedChords]
        } else if (i > 0) {
          const scaleFraction = Math.max(1, Math.round(scaleCount * config.fraction))
          const chordFraction = Math.max(1, Math.round(chordCount * config.fraction))
          exerciseScales = appliedScales.slice(0, scaleFraction)
          exerciseChords = appliedChords.slice(0, chordFraction)
        }
      }

      const exerciseBeats = ensureBeats(
        config.beats,
        currentNotes.length,
        exerciseScales.length,
        exerciseChords.length
      )

      exercises.push({
        id: genId(),
        name: `Exercise ${exerciseNumber}`,
        transcript: config.transcript,
        bpm: config.bpm,
        beats: exerciseBeats,
        chordMode: exerciseChords.length > 1 ? 'progression' : 'single',
        lowerOctaves: 0,
        higherOctaves: 0,
        selectedNoteIds: [...currentNotes],
        appliedScales: exerciseScales,
        appliedChords: exerciseChords,
      })
      exerciseNumber++
    }
  } else {
    // No notes/scales/chords selected — still include one practice exercise
    exercises.push({
      id: genId(),
      name: `Exercise ${exerciseNumber}`,
      transcript: 'Practice at a moderate tempo before playing the song.',
      bpm: 100,
      beats: 4,
      chordMode: 'single',
      lowerOctaves: 0,
      higherOctaves: 0,
      selectedNoteIds: [],
      appliedScales: [],
      appliedChords: [],
    })
    exerciseNumber++
  }

  // --- Song exercise ---
  const songData: SongAssignmentData = {
    videoId: songVideoId,
    videoTitle: songTitle,
    markerA: songMarkerA,
    markerB: songMarkerB,
    playbackRate: songPlaybackRate,
  }

  exercises.push({
    id: genId(),
    name: `Exercise ${exerciseNumber}`,
    transcript: `Play along with "${songTitle}". Use the notes you've been practicing!`,
    bpm: 120,
    beats: 5,
    chordMode: 'single',
    lowerOctaves: 0,
    higherOctaves: 0,
    selectedNoteIds: [],
    appliedScales: [],
    appliedChords: [],
    type: 'song',
    songData,
  })

  return exercises
}

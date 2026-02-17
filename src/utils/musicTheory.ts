/**
 * Music Theory Utilities
 * Encodes musical relationships for rule-based lesson generation
 */

export const ROOT_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

/** Which chords pair well with which scales */
export const SCALE_CHORD_MAP: Record<string, string[]> = {
  Major: ['Major', 'Minor', 'Dominant 7th', 'Major 7th'],
  Minor: ['Minor', 'Minor 7th', 'Diminished', 'Major'],
  Dorian: ['Minor 7th', 'Minor', 'Dominant 7th'],
  Phrygian: ['Minor', 'Minor 7th', 'Sus2'],
  Lydian: ['Major 7th', 'Major', 'Add9'],
  Mixolydian: ['Dominant 7th', 'Major', 'Sus4'],
  Locrian: ['Diminished', 'Minor 7th'],
  'Pentatonic Major': ['Major', 'Dominant 7th', 'Sus2'],
  'Pentatonic Minor': ['Minor', 'Minor 7th', 'Dominant 7th'],
  'Harmonic Minor': ['Minor', 'Diminished', 'Augmented', 'Minor 7th'],
  'Blues Scale': ['Dominant 7th', 'Minor 7th', 'Minor'],
}

/** Related scales for exercise variety */
export const RELATED_SCALES: Record<string, string[]> = {
  Major: ['Pentatonic Major', 'Mixolydian', 'Lydian'],
  Minor: ['Pentatonic Minor', 'Dorian', 'Harmonic Minor'],
  Dorian: ['Minor', 'Pentatonic Minor', 'Mixolydian'],
  Phrygian: ['Minor', 'Harmonic Minor', 'Locrian'],
  Lydian: ['Major', 'Pentatonic Major'],
  Mixolydian: ['Major', 'Pentatonic Major', 'Blues Scale'],
  'Pentatonic Major': ['Major', 'Mixolydian'],
  'Pentatonic Minor': ['Minor', 'Blues Scale', 'Dorian'],
  'Harmonic Minor': ['Minor', 'Phrygian'],
  'Blues Scale': ['Pentatonic Minor', 'Dorian', 'Mixolydian'],
}

/** BPM ranges per difficulty level */
export const DIFFICULTY_BPM: Record<
  string,
  { warmup: number; practice: number; advanced: number }
> = {
  beginner: { warmup: 60, practice: 80, advanced: 95 },
  intermediate: { warmup: 80, practice: 100, advanced: 120 },
  advanced: { warmup: 100, practice: 120, advanced: 140 },
}

/** Difficulty levels */
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced'

/** Beats per exercise based on difficulty */
export const DIFFICULTY_BEATS: Record<DifficultyLevel, { warmup: number; practice: number }> = {
  beginner: { warmup: 4, practice: 4 },
  intermediate: { warmup: 4, practice: 5 },
  advanced: { warmup: 5, practice: 6 },
}

/** Parsed lesson topic */
export interface ParsedLessonTopic {
  root: string
  scale: string
  instrument: string | null
  difficulty: DifficultyLevel
}

/** Parse a free-text lesson topic into structured data */
export function parseLessonTopic(text: string): ParsedLessonTopic {
  const normalized = text.trim().toLowerCase()

  // Try to extract root note
  let root = 'C'
  for (const note of ROOT_NOTES) {
    if (
      normalized.includes(note.toLowerCase() + ' ') ||
      normalized.startsWith(note.toLowerCase())
    ) {
      root = note
      break
    }
  }

  // Try to extract scale
  const scaleNames = [
    'blues scale',
    'pentatonic minor',
    'pentatonic major',
    'harmonic minor',
    'major',
    'minor',
    'dorian',
    'phrygian',
    'lydian',
    'mixolydian',
    'locrian',
  ]
  let scale = 'Major'
  for (const s of scaleNames) {
    if (normalized.includes(s)) {
      // Capitalize first letter of each word
      scale = s.replace(/\b\w/g, c => c.toUpperCase())
      break
    }
  }

  // Try to extract instrument
  let instrument: string | null = null
  if (normalized.includes('guitar')) instrument = 'guitar'
  else if (normalized.includes('keyboard') || normalized.includes('piano')) instrument = 'keyboard'
  else if (normalized.includes('bass')) instrument = 'bass'

  // Try to extract difficulty
  let difficulty: DifficultyLevel = 'intermediate'
  if (normalized.includes('beginner') || normalized.includes('easy')) difficulty = 'beginner'
  else if (normalized.includes('advanced') || normalized.includes('hard')) difficulty = 'advanced'

  return { root, scale, instrument, difficulty }
}

/** Get companion chords for a given scale */
export function getChordsForScale(scaleName: string): string[] {
  return SCALE_CHORD_MAP[scaleName] || ['Major', 'Minor']
}

/** Get a related scale for variety */
export function getRelatedScale(scaleName: string): string {
  const related = RELATED_SCALES[scaleName]
  if (!related || related.length === 0) return scaleName
  return related[0]
}

import type { BassNote } from './bassNotes'

export type BassChord = {
  name: string
  intervals: number[] // Semitone intervals from root note
  description: string
}

export type BassChordPosition = {
  string: number // 1-4 for bass
  fret: number   // 0-24
  note: string   // Note name
  isRoot: boolean // Is this the root note of the chord
}

export type BassChordFingering = {
  name: string // Shape name like "Root Position", "Power Chord", etc.
  frets: (number | 'x')[] // Fret numbers for each string (4 strings, low E to G), 'x' means don't play
  baseFret: number // Base fret for higher positions
  difficulty: 'Easy' | 'Medium' | 'Hard'
  description?: string
}

export type BassChordShape = {
  name: string // Shape name like "Root Position", "First Inversion", etc.
  minFret: number // Starting fret position
  maxFret: number // Ending fret position
  positions: BassChordPosition[] // All notes in this chord shape
  difficulty: 'Easy' | 'Medium' | 'Hard' // Difficulty level
}

export type BassChordBox = {
  name: string // Position 1, Position 2, etc.
  minFret: number // Starting fret position
  maxFret: number // Ending fret position
  positions: BassChordPosition[] // All chord notes in this position
}

// Common bass chords with their interval patterns
export const BASS_CHORDS: BassChord[] = [
  {
    name: 'Major',
    intervals: [0, 4, 7],
    description: 'Happy, bright sound - foundation of Western music'
  },
  {
    name: 'Minor',
    intervals: [0, 3, 7],
    description: 'Sad, melancholic sound'
  },
  {
    name: 'Dominant 7th',
    intervals: [0, 4, 7, 10],
    description: 'Bluesy, wants to resolve - great for blues and jazz'
  },
  {
    name: 'Major 7th',
    intervals: [0, 4, 7, 11],
    description: 'Dreamy, sophisticated jazz sound'
  },
  {
    name: 'Minor 7th',
    intervals: [0, 3, 7, 10],
    description: 'Smooth, jazzy minor sound'
  },
  {
    name: 'Diminished',
    intervals: [0, 3, 6],
    description: 'Tense, unstable sound - often used as passing chord'
  },
  {
    name: 'Augmented',
    intervals: [0, 4, 8],
    description: 'Dreamy, mysterious sound'
  },
  {
    name: 'Sus2',
    intervals: [0, 2, 7],
    description: 'Open, unresolved sound without the 3rd'
  },
  {
    name: 'Sus4',
    intervals: [0, 5, 7],
    description: 'Suspended sound that wants to resolve'
  },
  {
    name: 'Add9',
    intervals: [0, 4, 7, 14],
    description: 'Major chord with added color tone'
  },
  {
    name: 'Major 9th',
    intervals: [0, 4, 7, 11, 14],
    description: 'Rich, complex major sound'
  },
  {
    name: 'Minor 9th',
    intervals: [0, 3, 7, 10, 14],
    description: 'Rich, complex minor sound'
  }
]

// Root notes available for bass chords
export const BASS_CHORD_ROOT_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

// Predefined bass chord fingerings for common chords
// Format: [G, D, A, E] - fret numbers or 'x' for muted (high to low)
export const BASS_CHORD_FINGERINGS: { [key: string]: { [chordType: string]: BassChordFingering[] } } = {
  'C': {
    'Major': [
      { name: 'Open C', frets: [0, 2, 3, 'x'], baseFret: 0, difficulty: 'Easy', description: 'Open C major' },
      { name: 'Barre 3rd', frets: [5, 5, 3, 'x'], baseFret: 3, difficulty: 'Medium', description: 'C major barre chord 3rd fret' },
      { name: 'Barre 8th', frets: [9, 10, 10, 8], baseFret: 8, difficulty: 'Hard', description: 'C major barre chord 8th fret' }
    ],
    'Minor': [
      { name: 'Open Cm', frets: [0, 1, 3, 'x'], baseFret: 0, difficulty: 'Easy', description: 'Open C minor' },
      { name: 'Barre 3rd', frets: [4, 5, 3, 'x'], baseFret: 3, difficulty: 'Medium', description: 'C minor barre chord 3rd fret' },
      { name: 'Barre 8th', frets: [8, 8, 10, 8], baseFret: 8, difficulty: 'Hard', description: 'C minor barre chord 8th fret' }
    ],
    'Dominant 7th': [
      { name: 'Open C7', frets: [3, 2, 3, 'x'], baseFret: 0, difficulty: 'Medium', description: 'Open C7 chord' },
      { name: 'Barre 3rd', frets: [5, 3, 5, 3], baseFret: 3, difficulty: 'Medium', description: 'C7 barre chord 3rd fret' },
      { name: 'Barre 8th', frets: [10, 8, 10, 8], baseFret: 8, difficulty: 'Hard', description: 'C7 barre chord 8th fret' }
    ],
    'Major 7th': [
      { name: 'Open Cmaj7', frets: [0, 2, 3, 'x'], baseFret: 0, difficulty: 'Easy', description: 'Open C major 7th chord' },
      { name: 'Barre 3rd', frets: ['x', 4, 5, 3], baseFret: 3, difficulty: 'Hard', description: 'Cmaj7 barre chord 3rd fret' },
      { name: 'Barre 8th', frets: ['x', 9, 10, 8], baseFret: 8, difficulty: 'Hard', description: 'Cmaj7 barre chord 8th fret' }
    ],
    'Minor 7th': [
      { name: 'Partial Cm7', frets: [3, 1, 3, 'x'], baseFret: 0, difficulty: 'Medium', description: 'C minor 7th partial chord' },
      { name: 'Barre 3rd', frets: [5, 3, 5, 3], baseFret: 3, difficulty: 'Medium', description: 'Cm7 barre chord 3rd fret' },
      { name: 'Barre 8th', frets: [10, 8, 10, 8], baseFret: 8, difficulty: 'Hard', description: 'Cm7 barre chord 8th fret' }
    ],
    'Sus2': [
      { name: 'Open Csus2', frets: [0, 0, 3, 'x'], baseFret: 0, difficulty: 'Easy', description: 'Open C sus2 chord' },
      { name: 'Barre 3rd', frets: [5, 5, 3, 'x'], baseFret: 3, difficulty: 'Medium', description: 'Csus2 barre chord 3rd fret' },
      { name: 'Barre 8th', frets: ['x', 10, 10, 8], baseFret: 8, difficulty: 'Hard', description: 'Csus2 barre chord 8th fret' }
    ],
    'Sus4': [
      { name: 'Open Csus4', frets: [0, 3, 3, 'x'], baseFret: 0, difficulty: 'Medium', description: 'Open C sus4 chord' },
      { name: 'Barre 3rd', frets: [6, 6, 3, 'x'], baseFret: 3, difficulty: 'Hard', description: 'Csus4 barre chord 3rd fret' },
      { name: 'Barre 8th', frets: ['x', 11, 11, 8], baseFret: 8, difficulty: 'Hard', description: 'Csus4 barre chord 8th fret' }
    ],
    'Diminished': [
      { name: 'Cdim (compact)', frets: [2, 4, 3, 'x'], baseFret: 0, difficulty: 'Medium', description: 'C diminished compact shape' },
      { name: 'Barre 3rd', frets: [4, 2, 4, 3], baseFret: 3, difficulty: 'Hard', description: 'Cdim barre shape 3rd fret' },
      { name: 'Barre 8th', frets: [9, 7, 9, 8], baseFret: 8, difficulty: 'Hard', description: 'Cdim barre shape 8th fret' }
    ],
    'Augmented': [
      { name: 'Caug', frets: [1, 2, 3, 'x'], baseFret: 0, difficulty: 'Hard', description: 'C augmented chord' },
      { name: 'Barre 3rd', frets: ['x', 5, 6, 3], baseFret: 3, difficulty: 'Hard', description: 'Caug barre shape 3rd fret' },
      { name: 'Barre 8th', frets: ['x', 10, 11, 8], baseFret: 8, difficulty: 'Hard', description: 'Caug barre shape 8th fret' }
    ],
    'Add9': [
      { name: 'Open Cadd9', frets: [0, 2, 3, 'x'], baseFret: 0, difficulty: 'Medium', description: 'Open C add9 chord' },
      { name: 'Partial Cadd9', frets: [2, 2, 3, 'x'], baseFret: 0, difficulty: 'Medium', description: 'C add9 partial chord' },
      { name: 'Barre 8th Cadd9', frets: [12, 10, 10, 8], baseFret: 8, difficulty: 'Hard', description: 'Cadd9 barre chord 8th fret' }
    ],
    'Major 9th': [
      { name: 'Cmaj9 (compact)', frets: [4, 2, 3, 'x'], baseFret: 0, difficulty: 'Hard', description: 'C major 9th compact shape' },
      { name: 'Barre Cmaj9', frets: [12, 9, 10, 8], baseFret: 8, difficulty: 'Hard', description: 'Cmaj9 barre chord' }
    ],
    'Minor 9th': [
      { name: 'Cm9', frets: [3, 1, 3, 'x'], baseFret: 0, difficulty: 'Hard', description: 'C minor 9th chord' },
      { name: 'Barre Cm9', frets: [10, 8, 10, 8], baseFret: 8, difficulty: 'Hard', description: 'Cm9 barre chord' }
    ]
  },
  'D': {
    'Major': [
      { name: 'Open D', frets: [2, 0, 'x', 'x'], baseFret: 0, difficulty: 'Easy', description: 'Basic open D chord' },
      { name: 'Barre 5th', frets: [6, 7, 7, 5], baseFret: 5, difficulty: 'Medium', description: 'D major barre chord 5th fret' },
      { name: 'Barre 10th', frets: [11, 12, 12, 10], baseFret: 10, difficulty: 'Hard', description: 'D major barre chord 10th fret' }
    ],
    'Minor': [
      { name: 'Open Dm', frets: [1, 0, 'x', 'x'], baseFret: 0, difficulty: 'Easy', description: 'Basic open D minor' },
      { name: 'Barre 5th', frets: [5, 6, 7, 5], baseFret: 5, difficulty: 'Medium', description: 'D minor barre chord 5th fret' },
      { name: 'Barre 10th', frets: [10, 10, 12, 10], baseFret: 10, difficulty: 'Hard', description: 'D minor barre chord 10th fret' }
    ],
    'Dominant 7th': [
      { name: 'Open D7', frets: [2, 0, 'x', 'x'], baseFret: 0, difficulty: 'Easy', description: 'Open D7 chord' },
      { name: 'Barre 5th', frets: [7, 5, 7, 5], baseFret: 5, difficulty: 'Medium', description: 'D7 barre chord 5th fret' },
      { name: 'Barre 10th', frets: [12, 10, 12, 10], baseFret: 10, difficulty: 'Hard', description: 'D7 barre chord 10th fret' }
    ],
    'Major 7th': [
      { name: 'Open Dmaj7', frets: [2, 0, 'x', 'x'], baseFret: 0, difficulty: 'Easy', description: 'Open D major 7th chord' },
      { name: 'Barre 5th', frets: ['x', 6, 7, 5], baseFret: 5, difficulty: 'Hard', description: 'Dmaj7 barre chord 5th fret' },
      { name: 'Barre 10th', frets: ['x', 11, 12, 10], baseFret: 10, difficulty: 'Hard', description: 'Dmaj7 barre chord 10th fret' }
    ],
    'Minor 7th': [
      { name: 'Open Dm7', frets: [1, 0, 'x', 'x'], baseFret: 0, difficulty: 'Easy', description: 'Open D minor 7th chord' },
      { name: 'Barre 5th', frets: [7, 5, 7, 5], baseFret: 5, difficulty: 'Medium', description: 'Dm7 barre chord 5th fret' },
      { name: 'Barre 10th', frets: [12, 10, 12, 10], baseFret: 10, difficulty: 'Hard', description: 'Dm7 barre chord 10th fret' }
    ],
    'Sus2': [
      { name: 'Open Dsus2', frets: [2, 0, 'x', 'x'], baseFret: 0, difficulty: 'Easy', description: 'Open D sus2 chord' },
      { name: 'Barre 5th', frets: ['x', 7, 7, 5], baseFret: 5, difficulty: 'Medium', description: 'Dsus2 barre chord 5th fret' },
      { name: 'Barre 10th', frets: ['x', 12, 12, 10], baseFret: 10, difficulty: 'Hard', description: 'Dsus2 barre chord 10th fret' }
    ],
    'Sus4': [
      { name: 'Open Dsus4', frets: [3, 0, 'x', 'x'], baseFret: 0, difficulty: 'Easy', description: 'Open D sus4 chord' },
      { name: 'Barre 5th', frets: ['x', 8, 7, 5], baseFret: 5, difficulty: 'Medium', description: 'Dsus4 barre chord 5th fret' },
      { name: 'Barre 10th', frets: ['x', 13, 12, 10], baseFret: 10, difficulty: 'Hard', description: 'Dsus4 barre chord 10th fret' }
    ],
    'Diminished': [
      { name: 'Ddim', frets: [1, 0, 'x', 'x'], baseFret: 0, difficulty: 'Medium', description: 'D diminished chord' },
      { name: 'Barre 5th', frets: [6, 4, 6, 5], baseFret: 5, difficulty: 'Hard', description: 'Ddim barre shape 5th fret' },
      { name: 'Barre 10th', frets: [11, 9, 11, 10], baseFret: 10, difficulty: 'Hard', description: 'Ddim barre shape 10th fret' }
    ],
    'Add9': [
      { name: 'Barre 5th', frets: [9, 7, 7, 5], baseFret: 5, difficulty: 'Hard', description: 'Dadd9 barre chord 5th fret' },
      { name: 'Barre 10th', frets: [14, 12, 12, 10], baseFret: 10, difficulty: 'Hard', description: 'Dadd9 barre chord 10th fret' }
    ]
  },
  'E': {
    'Major': [
      { name: 'Open E', frets: [1, 2, 2, 0], baseFret: 0, difficulty: 'Easy', description: 'Basic open E chord' },
      { name: 'Barre 7th', frets: [8, 9, 9, 7], baseFret: 7, difficulty: 'Medium', description: 'E major barre chord 7th fret' },
      { name: 'Barre 12th', frets: [13, 14, 14, 12], baseFret: 12, difficulty: 'Hard', description: 'E major barre chord 12th fret' }
    ],
    'Minor': [
      { name: 'Open Em', frets: [0, 0, 2, 0], baseFret: 0, difficulty: 'Easy', description: 'Basic open E minor' },
      { name: 'Barre 7th', frets: [7, 7, 9, 7], baseFret: 7, difficulty: 'Medium', description: 'E minor barre chord 7th fret' },
      { name: 'Barre 12th', frets: [12, 12, 14, 12], baseFret: 12, difficulty: 'Hard', description: 'E minor barre chord 12th fret' }
    ],
    'Dominant 7th': [
      { name: 'Open E7', frets: [1, 0, 2, 0], baseFret: 0, difficulty: 'Easy', description: 'Open E7 chord' },
      { name: 'Barre 7th', frets: [9, 7, 9, 7], baseFret: 7, difficulty: 'Medium', description: 'E7 barre chord 7th fret' },
      { name: 'Barre 12th', frets: [14, 12, 14, 12], baseFret: 12, difficulty: 'Hard', description: 'E7 barre chord 12th fret' }
    ],
    'Major 7th': [
      { name: 'Open Emaj7', frets: [1, 1, 2, 0], baseFret: 0, difficulty: 'Medium', description: 'Open E major 7th chord' },
      { name: 'Barre 7th', frets: ['x', 8, 9, 7], baseFret: 7, difficulty: 'Hard', description: 'Emaj7 barre chord 7th fret' },
      { name: 'Barre 12th', frets: ['x', 13, 14, 12], baseFret: 12, difficulty: 'Hard', description: 'Emaj7 barre chord 12th fret' }
    ],
    'Minor 7th': [
      { name: 'Open Em7', frets: [0, 0, 2, 0], baseFret: 0, difficulty: 'Easy', description: 'Open E minor 7th chord' },
      { name: 'Barre 7th', frets: [7, 7, 9, 7], baseFret: 7, difficulty: 'Medium', description: 'Em7 barre chord 7th fret' },
      { name: 'Barre 12th', frets: [12, 12, 14, 12], baseFret: 12, difficulty: 'Hard', description: 'Em7 barre chord 12th fret' }
    ]
  },
  'F': {
    'Major': [
      { name: 'Barre 1st', frets: [2, 3, 3, 1], baseFret: 1, difficulty: 'Medium', description: 'F major barre chord 1st fret' },
      { name: 'Barre 8th', frets: [9, 10, 10, 8], baseFret: 8, difficulty: 'Medium', description: 'F major barre chord 8th fret' },
      { name: 'Barre 13th', frets: [14, 15, 15, 13], baseFret: 13, difficulty: 'Hard', description: 'F major barre chord 13th fret' }
    ],
    'Minor': [
      { name: 'Barre 1st', frets: [1, 1, 3, 1], baseFret: 1, difficulty: 'Medium', description: 'F minor barre chord 1st fret' },
      { name: 'Barre 8th', frets: [8, 8, 10, 8], baseFret: 8, difficulty: 'Medium', description: 'F minor barre chord 8th fret' },
      { name: 'Partial Fm', frets: [1, 1, 3, 'x'], baseFret: 0, difficulty: 'Medium', description: 'F minor partial chord' }
    ],
    'Dominant 7th': [
      { name: 'Barre 1st', frets: [3, 1, 3, 1], baseFret: 1, difficulty: 'Medium', description: 'F7 barre chord 1st fret' },
      { name: 'Barre 8th', frets: [10, 8, 10, 8], baseFret: 8, difficulty: 'Medium', description: 'F7 barre chord 8th fret' },
      { name: 'Partial F7', frets: [3, 1, 3, 'x'], baseFret: 0, difficulty: 'Medium', description: 'F7 partial chord' }
    ]
  },
  'G': {
    'Major': [
      { name: 'Barre 3rd', frets: [4, 5, 5, 3], baseFret: 3, difficulty: 'Medium', description: 'G major barre chord 3rd fret' },
      { name: 'Upper Triad (A-root)', frets: [7, 5, 5, 'x'], baseFret: 5, difficulty: 'Medium', description: 'G major upper triad' },
      { name: 'Barre 10th', frets: [11, 12, 12, 10], baseFret: 10, difficulty: 'Hard', description: 'G major barre chord 10th fret' }
    ],
    'Minor': [
      { name: 'Barre 3rd', frets: [3, 3, 5, 3], baseFret: 3, difficulty: 'Medium', description: 'G minor barre chord 3rd fret' },
      { name: 'Barre 10th', frets: [10, 10, 12, 10], baseFret: 10, difficulty: 'Hard', description: 'G minor barre chord 10th fret' },
      { name: 'Partial Gm', frets: [3, 3, 5, 'x'], baseFret: 0, difficulty: 'Medium', description: 'G minor partial chord' }
    ],
    'Dominant 7th': [
      { name: 'Barre 3rd', frets: [5, 3, 5, 3], baseFret: 3, difficulty: 'Medium', description: 'G7 barre chord 3rd fret' },
      { name: 'Open G7 shape (upper)', frets: [5, 4, 5, 'x'], baseFret: 0, difficulty: 'Medium', description: 'G7 upper shape' },
      { name: 'Barre 10th', frets: [12, 10, 12, 10], baseFret: 10, difficulty: 'Hard', description: 'G7 barre chord 10th fret' }
    ],
    'Major 7th': [
      { name: 'Barre 3rd', frets: ['x', 4, 5, 3], baseFret: 3, difficulty: 'Hard', description: 'Gmaj7 barre chord 3rd fret' },
      { name: 'Open Gmaj7 (partial)', frets: [2, 4, 5, 3], baseFret: 0, difficulty: 'Hard', description: 'Gmaj7 partial chord' },
      { name: 'Barre 10th', frets: ['x', 11, 12, 10], baseFret: 10, difficulty: 'Hard', description: 'Gmaj7 barre chord 10th fret' }
    ],
    'Minor 7th': [
      { name: 'Open Gm7', frets: [3, 3, 5, 3], baseFret: 0, difficulty: 'Medium', description: 'Open G minor 7th chord' },
      { name: 'Barre 3rd', frets: [5, 3, 5, 3], baseFret: 3, difficulty: 'Medium', description: 'Gm7 barre chord 3rd fret' },
      { name: 'Barre 10th', frets: [10, 10, 12, 10], baseFret: 10, difficulty: 'Hard', description: 'Gm7 barre chord 10th fret' }
    ],
    'Sus2': [
      { name: 'Open Gsus2', frets: [0, 0, 0, 3], baseFret: 0, difficulty: 'Easy', description: 'Open G sus2 chord' },
      { name: 'Barre 3rd', frets: ['x', 5, 5, 3], baseFret: 3, difficulty: 'Medium', description: 'Gsus2 barre chord 3rd fret' },
      { name: 'Barre 10th', frets: ['x', 12, 12, 10], baseFret: 10, difficulty: 'Hard', description: 'Gsus2 barre chord 10th fret' }
    ],
    'Sus4': [
      { name: 'Open Gsus4', frets: [0, 0, 3, 3], baseFret: 0, difficulty: 'Medium', description: 'Open G sus4 chord' },
      { name: 'Barre 3rd', frets: ['x', 6, 5, 3], baseFret: 3, difficulty: 'Hard', description: 'Gsus4 barre chord 3rd fret' },
      { name: 'Barre 10th', frets: ['x', 13, 12, 10], baseFret: 10, difficulty: 'Hard', description: 'Gsus4 barre chord 10th fret' }
    ]
  },
  'A': {
    'Major': [
      { name: 'Open A', frets: [2, 2, 0, 'x'], baseFret: 0, difficulty: 'Easy', description: 'Basic open A chord' },
      { name: 'Barre 5th', frets: [6, 7, 7, 5], baseFret: 5, difficulty: 'Medium', description: 'A major barre chord 5th fret' },
      { name: 'Barre 12th', frets: [13, 14, 14, 12], baseFret: 12, difficulty: 'Hard', description: 'A major barre chord 12th fret' }
    ],
    'Minor': [
      { name: 'Open Am', frets: [0, 2, 0, 'x'], baseFret: 0, difficulty: 'Easy', description: 'Basic open A minor' },
      { name: 'Barre 5th', frets: [5, 5, 7, 5], baseFret: 5, difficulty: 'Medium', description: 'A minor barre chord 5th fret' },
      { name: 'Barre 12th', frets: [12, 12, 14, 12], baseFret: 12, difficulty: 'Hard', description: 'A minor barre chord 12th fret' }
    ],
    'Dominant 7th': [
      { name: 'Open A7', frets: [0, 2, 0, 'x'], baseFret: 0, difficulty: 'Easy', description: 'Open A7 chord' },
      { name: 'Barre 5th', frets: [7, 5, 7, 5], baseFret: 5, difficulty: 'Medium', description: 'A7 barre chord 5th fret' },
      { name: 'Barre 12th', frets: [14, 12, 14, 12], baseFret: 12, difficulty: 'Hard', description: 'A7 barre chord 12th fret' }
    ],
    'Major 7th': [
      { name: 'Open Amaj7', frets: [1, 2, 0, 'x'], baseFret: 0, difficulty: 'Medium', description: 'Open A major 7th chord' },
      { name: 'Barre 5th', frets: ['x', 6, 7, 5], baseFret: 5, difficulty: 'Hard', description: 'Amaj7 barre chord 5th fret' },
      { name: 'Barre 12th', frets: ['x', 13, 14, 12], baseFret: 12, difficulty: 'Hard', description: 'Amaj7 barre chord 12th fret' }
    ],
    'Minor 7th': [
      { name: 'Open Am7', frets: [0, 2, 0, 'x'], baseFret: 0, difficulty: 'Easy', description: 'Open A minor 7th chord' },
      { name: 'Barre 5th', frets: [5, 5, 7, 5], baseFret: 5, difficulty: 'Medium', description: 'Am7 barre chord 5th fret' },
      { name: 'Barre 12th', frets: [12, 12, 14, 12], baseFret: 12, difficulty: 'Hard', description: 'Am7 barre chord 12th fret' }
    ]
  },
  'B': {
    'Major': [
      { name: 'Barre 2nd', frets: [3, 4, 4, 2], baseFret: 2, difficulty: 'Medium', description: 'B major barre chord 2nd fret' },
      { name: 'Barre 7th', frets: [8, 9, 9, 7], baseFret: 7, difficulty: 'Medium', description: 'B major barre chord 7th fret' },
      { name: 'Barre 14th', frets: [15, 16, 16, 14], baseFret: 14, difficulty: 'Hard', description: 'B major barre chord 14th fret' }
    ],
    'Minor': [
      { name: 'Barre 2nd', frets: [2, 2, 4, 2], baseFret: 2, difficulty: 'Medium', description: 'B minor barre chord 2nd fret' },
      { name: 'Barre 7th', frets: [7, 7, 9, 7], baseFret: 7, difficulty: 'Medium', description: 'B minor barre chord 7th fret' },
      { name: 'Upper Bm', frets: [7, 7, 9, 'x'], baseFret: 0, difficulty: 'Medium', description: 'B minor upper position' }
    ],
    'Dominant 7th': [
      { name: 'Barre 2nd', frets: [4, 2, 4, 2], baseFret: 2, difficulty: 'Medium', description: 'B7 barre chord 2nd fret' },
      { name: 'Barre 7th', frets: [9, 7, 9, 7], baseFret: 7, difficulty: 'Medium', description: 'B7 barre chord 7th fret' },
      { name: 'Open B7 (partial)', frets: [2, 1, 2, 'x'], baseFret: 0, difficulty: 'Medium', description: 'B7 partial chord' }
    ]
  },
  'C#': {
    'Major': [
      { name: 'Barre 4th', frets: [5, 6, 6, 4], baseFret: 4, difficulty: 'Medium', description: 'C# major barre chord 4th fret' },
      { name: 'Barre 9th', frets: [10, 11, 11, 9], baseFret: 9, difficulty: 'Hard', description: 'C# major barre chord 9th fret' },
      { name: 'Barre 16th', frets: [17, 18, 18, 16], baseFret: 16, difficulty: 'Hard', description: 'C# major barre chord 16th fret' }
    ],
    'Minor': [
      { name: 'Barre 4th', frets: [4, 4, 6, 4], baseFret: 4, difficulty: 'Medium', description: 'C# minor barre chord 4th fret' },
      { name: 'Barre 9th', frets: [9, 9, 11, 9], baseFret: 9, difficulty: 'Hard', description: 'C# minor barre chord 9th fret' },
      { name: 'Barre 16th', frets: [16, 16, 18, 16], baseFret: 16, difficulty: 'Hard', description: 'C# minor barre chord 16th fret' }
    ],
    'Dominant 7th': [
      { name: 'Barre 4th', frets: [6, 4, 6, 4], baseFret: 4, difficulty: 'Medium', description: 'C#7 barre chord 4th fret' },
      { name: 'Barre 9th', frets: [11, 9, 11, 9], baseFret: 9, difficulty: 'Hard', description: 'C#7 barre chord 9th fret' }
    ]
  },
  'D#': {
    'Major': [
      { name: 'Barre 6th', frets: [7, 8, 8, 6], baseFret: 6, difficulty: 'Medium', description: 'D# major barre chord 6th fret' },
      { name: 'Barre 11th', frets: [12, 13, 13, 11], baseFret: 11, difficulty: 'Hard', description: 'D# major barre chord 11th fret' },
      { name: 'Barre 18th', frets: [19, 20, 20, 18], baseFret: 18, difficulty: 'Hard', description: 'D# major barre chord 18th fret' }
    ],
    'Minor': [
      { name: 'Barre 6th', frets: [6, 6, 8, 6], baseFret: 6, difficulty: 'Medium', description: 'D# minor barre chord 6th fret' },
      { name: 'Barre 11th', frets: [11, 11, 13, 11], baseFret: 11, difficulty: 'Hard', description: 'D# minor barre chord 11th fret' },
      { name: 'Barre 18th', frets: [18, 18, 20, 18], baseFret: 18, difficulty: 'Hard', description: 'D# minor barre chord 18th fret' }
    ],
    'Dominant 7th': [
      { name: 'Barre 6th', frets: [8, 6, 8, 6], baseFret: 6, difficulty: 'Medium', description: 'D#7 barre chord 6th fret' },
      { name: 'Barre 11th', frets: [13, 11, 13, 11], baseFret: 11, difficulty: 'Hard', description: 'D#7 barre chord 11th fret' }
    ]
  },
  'F#': {
    'Major': [
      { name: 'Barre 2nd', frets: [3, 4, 4, 2], baseFret: 2, difficulty: 'Medium', description: 'F# major barre chord 2nd fret' },
      { name: 'Barre 9th', frets: [10, 11, 11, 9], baseFret: 9, difficulty: 'Medium', description: 'F# major barre chord 9th fret' },
      { name: 'Barre 16th', frets: [17, 18, 18, 16], baseFret: 16, difficulty: 'Hard', description: 'F# major barre chord 16th fret' }
    ],
    'Minor': [
      { name: 'Barre 2nd', frets: [2, 2, 4, 2], baseFret: 2, difficulty: 'Medium', description: 'F# minor barre chord 2nd fret' },
      { name: 'Barre 9th', frets: [9, 9, 11, 9], baseFret: 9, difficulty: 'Medium', description: 'F# minor barre chord 9th fret' },
      { name: 'Barre 16th', frets: [16, 16, 18, 16], baseFret: 16, difficulty: 'Hard', description: 'F# minor barre chord 16th fret' }
    ],
    'Dominant 7th': [
      { name: 'Barre 2nd', frets: [4, 2, 4, 2], baseFret: 2, difficulty: 'Medium', description: 'F#7 barre chord 2nd fret' },
      { name: 'Barre 9th', frets: [11, 9, 11, 9], baseFret: 9, difficulty: 'Medium', description: 'F#7 barre chord 9th fret' }
    ]
  },
  'G#': {
    'Major': [
      { name: 'Barre 4th', frets: [5, 6, 6, 4], baseFret: 4, difficulty: 'Medium', description: 'G# major barre chord 4th fret' },
      { name: 'Barre 11th', frets: [12, 13, 13, 11], baseFret: 11, difficulty: 'Hard', description: 'G# major barre chord 11th fret' },
      { name: 'Barre 18th', frets: [19, 20, 20, 18], baseFret: 18, difficulty: 'Hard', description: 'G# major barre chord 18th fret' }
    ],
    'Minor': [
      { name: 'Barre 4th', frets: [4, 4, 6, 4], baseFret: 4, difficulty: 'Medium', description: 'G# minor barre chord 4th fret' },
      { name: 'Barre 11th', frets: [11, 11, 13, 11], baseFret: 11, difficulty: 'Hard', description: 'G# minor barre chord 11th fret' },
      { name: 'Barre 18th', frets: [18, 18, 20, 18], baseFret: 18, difficulty: 'Hard', description: 'G# minor barre chord 18th fret' }
    ],
    'Dominant 7th': [
      { name: 'Barre 4th', frets: [6, 4, 6, 4], baseFret: 4, difficulty: 'Medium', description: 'G#7 barre chord 4th fret' },
      { name: 'Barre 11th', frets: [13, 11, 13, 11], baseFret: 11, difficulty: 'Hard', description: 'G#7 barre chord 11th fret' }
    ]
  },
  'A#': {
    'Major': [
      { name: 'Barre 6th', frets: [7, 8, 8, 6], baseFret: 6, difficulty: 'Medium', description: 'A# major barre chord 6th fret' },
      { name: 'Barre 1st', frets: [3, 3, 1, 'x'], baseFret: 1, difficulty: 'Medium', description: 'A# major barre chord 1st fret' },
      { name: 'Barre 13th', frets: [14, 15, 15, 13], baseFret: 13, difficulty: 'Hard', description: 'A# major barre chord 13th fret' }
    ],
    'Minor': [
      { name: 'Barre 6th', frets: [6, 6, 8, 6], baseFret: 6, difficulty: 'Medium', description: 'A# minor barre chord 6th fret' },
      { name: 'Barre 1st', frets: [1, 3, 1, 'x'], baseFret: 1, difficulty: 'Medium', description: 'A# minor barre chord 1st fret' },
      { name: 'Barre 13th', frets: [13, 13, 15, 13], baseFret: 13, difficulty: 'Hard', description: 'A# minor barre chord 13th fret' }
    ],
    'Dominant 7th': [
      { name: 'Barre 6th', frets: [8, 6, 8, 6], baseFret: 6, difficulty: 'Medium', description: 'A#7 barre chord 6th fret' },
      { name: 'Barre 1st', frets: [1, 3, 1, 'x'], baseFret: 1, difficulty: 'Medium', description: 'A#7 barre chord 1st fret' }
    ]
  }
}

// Function to get note name from semitone offset
const getNoteFromInterval = (rootNote: string, interval: number): string => {
  const rootIndex = BASS_CHORD_ROOT_NOTES.indexOf(rootNote)
  if (rootIndex === -1) return rootNote

  const noteIndex = (rootIndex + interval) % 12
  return BASS_CHORD_ROOT_NOTES[noteIndex]
}

// Function to get all notes in a chord given root note and chord
export const getBassChordNotes = (rootNote: string, chord: BassChord): string[] => {
  return chord.intervals.map(interval => getNoteFromInterval(rootNote, interval))
}

// Function to check if a note belongs to a bass chord
export const isNoteInBassChord = (noteName: string, rootNote: string, chord: BassChord): boolean => {
  const chordNotes = getBassChordNotes(rootNote, chord)
  // Remove octave numbers for comparison (e.g., "C4" becomes "C")
  const noteNameWithoutOctave = noteName.replace(/\d+$/, '')
  return chordNotes.includes(noteNameWithoutOctave)
}

// Function to get chord positions on the bass fretboard
export const getBassChordPositions = (
  rootNote: string,
  chord: BassChord,
  bassNotes: BassNote[]
): BassChordPosition[] => {
  const chordNotes = getBassChordNotes(rootNote, chord)
  const positions: BassChordPosition[] = []

  bassNotes.forEach(bassNote => {
    const noteNameWithoutOctave = bassNote.name.replace(/\d+$/, '')

    // Check if note is in chord
    if (chordNotes.includes(noteNameWithoutOctave)) {
      positions.push({
        string: bassNote.string,
        fret: bassNote.fret,
        note: bassNote.name,
        isRoot: noteNameWithoutOctave === rootNote
      })
    }
  })

  return positions
}

// Function to get proper bass chord fingerings for a given chord and root
export const getBassChordFingerings = (
  rootNote: string,
  chord: BassChord
): BassChordFingering[] => {
  // Handle sharp/flat notes by converting to their enharmonic equivalents
  const normalizedRoot = normalizeBassChordRoot(rootNote)

  if (BASS_CHORD_FINGERINGS[normalizedRoot] && BASS_CHORD_FINGERINGS[normalizedRoot][chord.name]) {
    return BASS_CHORD_FINGERINGS[normalizedRoot][chord.name]
  }

  // If no predefined fingerings, return transposed chord shapes
  return getTransposedBassChords(rootNote, chord)
}

// Helper function to normalize bass chord root (handle enharmonic equivalents)
const normalizeBassChordRoot = (rootNote: string): string => {
  const enharmonicMap: { [key: string]: string } = {
    'C#': 'C#', 'Db': 'C#',
    'D#': 'D#', 'Eb': 'D#',
    'F#': 'F#', 'Gb': 'F#',
    'G#': 'G#', 'Ab': 'G#',
    'A#': 'A#', 'Bb': 'A#'
  }
  return enharmonicMap[rootNote] || rootNote
}

// Function to transpose bass chord shapes for sharp/flat notes
const getTransposedBassChords = (rootNote: string, chord: BassChord): BassChordFingering[] => {
  const rootIndex = BASS_CHORD_ROOT_NOTES.indexOf(rootNote)
  if (rootIndex === -1) return []

  // Find a suitable reference chord to transpose from
  const referenceChords = ['E', 'A', 'C', 'G', 'D', 'F']
  let referenceRoot = 'E'

  for (const ref of referenceChords) {
    if (BASS_CHORD_FINGERINGS[ref] && BASS_CHORD_FINGERINGS[ref][chord.name]) {
      referenceRoot = ref
      break
    }
  }

  if (!BASS_CHORD_FINGERINGS[referenceRoot] || !BASS_CHORD_FINGERINGS[referenceRoot][chord.name]) {
    return []
  }

  const referenceIndex = BASS_CHORD_ROOT_NOTES.indexOf(referenceRoot)
  const semitoneOffset = (rootIndex - referenceIndex + 12) % 12

  return BASS_CHORD_FINGERINGS[referenceRoot][chord.name].map(fingering => {
    const transposedFrets = fingering.frets.map(fret =>
      fret === 'x' ? 'x' : (typeof fret === 'number' ? fret + semitoneOffset : fret)
    )

    return {
      name: `${fingering.name.replace(referenceRoot, rootNote)}`,
      frets: transposedFrets,
      baseFret: fingering.baseFret + semitoneOffset,
      difficulty: semitoneOffset > 7 ? 'Hard' : fingering.difficulty,
      description: fingering.description?.replace(referenceRoot, rootNote)
    }
  })
}

// Function to convert bass chord fingering to positions for selection
export const applyBassChordFingeringToBass = (
  fingering: BassChordFingering,
  bassNotes: BassNote[]
): { stringIndex: number, fretIndex: number }[] => {
  const selections: { stringIndex: number, fretIndex: number }[] = []

  fingering.frets.forEach((fret, stringNumber) => {
    if (fret === 'x') return // Skip muted strings

    const actualFret = typeof fret === 'number' ? fret : 0
    // Convert bass string number (0-3, low E to G) to visual string index
    // bassNotes: 1=low E, 2=A, 3=D, 4=G
    // Visual strings: 0=G, 1=D, 2=A, 3=low E
    // stringNumber 0 (low E) -> visual index 3, stringNumber 3 (G) -> visual index 0
    const stringIndex = 3 - stringNumber
    const fretIndex = actualFret

    selections.push({ stringIndex, fretIndex })
  })

  return selections
}

// Function to get chord shapes/voicings for a given chord and root (updated to use fingerings)
export const getBassChordShapes = (
  rootNote: string,
  chord: BassChord,
  bassNotes: BassNote[]
): BassChordShape[] => {
  const fingerings = getBassChordFingerings(rootNote, chord)
  const shapes: BassChordShape[] = []

  fingerings.forEach(fingering => {
    const positions = convertBassFingeringToPositions(fingering, bassNotes)
    const minFret = Math.min(...positions.map(p => p.fret))
    const maxFret = Math.max(...positions.map(p => p.fret))

    shapes.push({
      name: fingering.name,
      minFret,
      maxFret,
      positions,
      difficulty: fingering.difficulty
    })
  })

  return shapes
}

// Helper function to convert bass fingering to chord positions
const convertBassFingeringToPositions = (
  fingering: BassChordFingering,
  bassNotes: BassNote[]
): BassChordPosition[] => {
  const positions: BassChordPosition[] = []

  fingering.frets.forEach((fret, stringNumber) => {
    if (fret === 'x') return // Skip muted strings

    const actualFret = typeof fret === 'number' ? fret : 0
    // Fingering format is [low E, A, D, G] (stringNumber 0-3)
    // Bass string numbering is: 1=G, 2=D, 3=A, 4=low E
    // So we need to reverse: stringNumber 0 (low E) -> bassString 4, stringNumber 3 (G) -> bassString 1
    const bassString = 4 - stringNumber

    // Find the corresponding bass note
    const bassNote = bassNotes.find((note: BassNote) =>
      note.string === bassString && note.fret === actualFret
    )

    if (bassNote) {
      positions.push({
        string: bassString,
        fret: actualFret,
        note: bassNote.name,
        isRoot: false // We'll determine this separately
      })
    }
  })

  return positions
}

// Function to apply chord to bass note selection (using first available fingering)
export const applyChordToBass = (
  rootNote: string,
  chord: BassChord,
  bassNotes: BassNote[]
): { stringIndex: number, fretIndex: number }[] => {
  const fingerings = getBassChordFingerings(rootNote, chord)

  if (fingerings.length > 0) {
    // Use the first (usually easiest) fingering
    return applyBassChordFingeringToBass(fingerings[0], bassNotes)
  }

  // Fallback to theoretical approach if no fingerings available
  const chordPositions = getBassChordPositions(rootNote, chord, bassNotes)
  const selections: { stringIndex: number, fretIndex: number }[] = []

  chordPositions.forEach(position => {
    const stringIndex = 4 - position.string
    const fretIndex = position.fret
    selections.push({ stringIndex, fretIndex })
  })

  return selections
}

// Function to apply a specific chord shape to bass note selection
export const applyBassChordShapeToBass = (
  chordShape: BassChordShape
): { stringIndex: number, fretIndex: number }[] => {
  const selections: { stringIndex: number, fretIndex: number }[] = []

  chordShape.positions.forEach(position => {
    // Convert bass string number (1-4) to visual string index (0-3)
    const stringIndex = 4 - position.string
    const fretIndex = position.fret

    selections.push({ stringIndex, fretIndex })
  })

  return selections
}

// Function to get chord boxes/positions for a given chord and root (similar to scale boxes)
export const getBassChordBoxes = (
  rootNote: string,
  chord: BassChord,
  bassNotes: BassNote[]
): BassChordBox[] => {
  const allPositions = getBassChordPositions(rootNote, chord, bassNotes)
  const boxes: BassChordBox[] = []

  // Define box ranges based on clean, non-overlapping positions (0-24 frets)
  // Same ranges as scales for consistency
  const boxRanges = [
    { name: 'Open Position', minFret: 0, maxFret: 4 },
    { name: 'Position 2', minFret: 5, maxFret: 8 },
    { name: 'Position 3', minFret: 9, maxFret: 12 },
    { name: 'Position 4', minFret: 13, maxFret: 16 },
    { name: 'Position 5', minFret: 17, maxFret: 20 },
    { name: 'Position 6', minFret: 21, maxFret: 24 }
  ]

  boxRanges.forEach(range => {
    const boxPositions = allPositions.filter(pos =>
      pos.fret >= range.minFret && pos.fret <= range.maxFret
    )

    if (boxPositions.length > 0) {
      boxes.push({
        name: range.name,
        minFret: range.minFret,
        maxFret: range.maxFret,
        positions: boxPositions
      })
    }
  })

  return boxes
}

// Function to apply a specific chord box to bass note selection
export const applyBassChordBoxToBass = (
  chordBox: BassChordBox
): { stringIndex: number, fretIndex: number }[] => {
  const selections: { stringIndex: number, fretIndex: number }[] = []

  chordBox.positions.forEach(position => {
    // Convert bass string number (1-4) to visual string index (0-3)
    const stringIndex = 4 - position.string
    const fretIndex = position.fret

    selections.push({ stringIndex, fretIndex })
  })

  return selections
}
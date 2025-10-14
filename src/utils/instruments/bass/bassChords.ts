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
  }
]

// Root notes available for bass chords
export const BASS_CHORD_ROOT_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

// Predefined bass chord fingerings for common chords
// Format: [low E, A, D, G] - fret numbers or 'x' for muted
export const BASS_CHORD_FINGERINGS: { [key: string]: { [chordType: string]: BassChordFingering[] } } = {
  'C': {
    'Major': [
      { name: 'Root + 5th', frets: [3, 'x', 2, 'x'], baseFret: 0, difficulty: 'Easy', description: 'C power chord (root + fifth)' },
      { name: 'Triad', frets: [3, 3, 2, 0], baseFret: 0, difficulty: 'Medium', description: 'C major triad' },
      { name: 'High Position', frets: [8, 10, 10, 'x'], baseFret: 8, difficulty: 'Medium', description: 'C major high position' }
    ],
    'Minor': [
      { name: 'Root + 5th', frets: [3, 'x', 2, 'x'], baseFret: 0, difficulty: 'Easy', description: 'C power chord (same as major)' },
      { name: 'Triad', frets: [3, 1, 1, 'x'], baseFret: 0, difficulty: 'Medium', description: 'C minor triad' },
      { name: 'High Position', frets: [8, 10, 9, 'x'], baseFret: 8, difficulty: 'Medium', description: 'C minor high position' }
    ],
    'Dominant 7th': [
      { name: 'Root + 7th', frets: [3, 'x', 'x', 1], baseFret: 0, difficulty: 'Easy', description: 'C7 (root + seventh)' },
      { name: 'Full Chord', frets: [3, 3, 2, 1], baseFret: 0, difficulty: 'Hard', description: 'C7 full chord' }
    ],
    'Major 7th': [
      { name: 'Root + Maj7', frets: [3, 'x', 'x', 0], baseFret: 0, difficulty: 'Easy', description: 'Cmaj7 (root + major seventh)' },
      { name: 'Full Chord', frets: [3, 3, 2, 0], baseFret: 0, difficulty: 'Hard', description: 'Cmaj7 full chord' }
    ],
    'Minor 7th': [
      { name: 'Root + 7th', frets: [3, 'x', 'x', 1], baseFret: 0, difficulty: 'Easy', description: 'Cm7 (root + seventh, same as major)' },
      { name: 'Full Chord', frets: [3, 1, 1, 1], baseFret: 0, difficulty: 'Hard', description: 'Cm7 full chord' }
    ],
    'Sus2': [
      { name: 'Root + 2nd', frets: [3, 'x', 0, 'x'], baseFret: 0, difficulty: 'Easy', description: 'Csus2 (root + second)' },
      { name: 'Full Chord', frets: [3, 0, 0, 'x'], baseFret: 0, difficulty: 'Medium', description: 'Csus2 partial chord' }
    ],
    'Sus4': [
      { name: 'Root + 4th', frets: [3, 'x', 3, 'x'], baseFret: 0, difficulty: 'Easy', description: 'Csus4 (root + fourth)' },
      { name: 'Full Chord', frets: [3, 3, 3, 'x'], baseFret: 0, difficulty: 'Medium', description: 'Csus4 partial chord' }
    ],
    'Diminished': [
      { name: 'Root + b3 + b5', frets: [3, 'x', 1, 'x'], baseFret: 0, difficulty: 'Medium', description: 'Cdim (root + minor third + diminished fifth)' },
      { name: 'Full Chord', frets: [3, 1, 1, 'x'], baseFret: 0, difficulty: 'Hard', description: 'Cdim partial chord' }
    ],
    'Augmented': [
      { name: 'Root + #5', frets: [3, 'x', 3, 'x'], baseFret: 0, difficulty: 'Medium', description: 'Caug (root + augmented fifth)' },
      { name: 'Partial Aug', frets: [3, 3, 3, 2], baseFret: 0, difficulty: 'Hard', description: 'Caug partial chord' }
    ],
    'Add9': [
      { name: 'Root + 9th', frets: [3, 'x', 'x', 'x'], baseFret: 0, difficulty: 'Easy', description: 'Cadd9 root note (add ninth elsewhere)' },
      { name: 'Partial Add9', frets: [3, 0, 2, 0], baseFret: 0, difficulty: 'Hard', description: 'Cadd9 partial chord' }
    ]
  },
  'D': {
    'Major': [
      { name: 'Root + 5th', frets: [5, 'x', 4, 'x'], baseFret: 0, difficulty: 'Easy', description: 'D power chord' },
      { name: 'Triad', frets: [5, 5, 4, 2], baseFret: 0, difficulty: 'Medium', description: 'D major triad' },
      { name: 'Open Position', frets: ['x', 0, 0, 2], baseFret: 0, difficulty: 'Easy', description: 'D major open position' }
    ],
    'Minor': [
      { name: 'Root + 5th', frets: [5, 'x', 4, 'x'], baseFret: 0, difficulty: 'Easy', description: 'D power chord' },
      { name: 'Triad', frets: [5, 3, 3, 'x'], baseFret: 0, difficulty: 'Medium', description: 'D minor triad' },
      { name: 'Open Position', frets: ['x', 0, 0, 1], baseFret: 0, difficulty: 'Easy', description: 'D minor open position' }
    ],
    'Dominant 7th': [
      { name: 'Root + 7th', frets: [5, 'x', 'x', 3], baseFret: 0, difficulty: 'Easy', description: 'D7 (root + seventh)' },
      { name: 'Open D7', frets: ['x', 0, 0, 'x'], baseFret: 0, difficulty: 'Easy', description: 'D7 open position' }
    ],
    'Major 7th': [
      { name: 'Root + Maj7', frets: [5, 'x', 'x', 2], baseFret: 0, difficulty: 'Easy', description: 'Dmaj7 (root + major seventh)' },
      { name: 'Open Dmaj7', frets: ['x', 0, 0, 2], baseFret: 0, difficulty: 'Easy', description: 'Dmaj7 open position' }
    ],
    'Minor 7th': [
      { name: 'Root + 7th', frets: [5, 'x', 'x', 3], baseFret: 0, difficulty: 'Easy', description: 'Dm7 (root + seventh)' },
      { name: 'Open Dm7', frets: ['x', 0, 0, 1], baseFret: 0, difficulty: 'Easy', description: 'Dm7 open position' }
    ],
    'Sus2': [
      { name: 'Root + 2nd', frets: [5, 'x', 2, 'x'], baseFret: 0, difficulty: 'Easy', description: 'Dsus2 (root + second)' },
      { name: 'Open Dsus2', frets: ['x', 0, 2, 'x'], baseFret: 0, difficulty: 'Easy', description: 'Dsus2 open position' }
    ],
    'Sus4': [
      { name: 'Root + 4th', frets: [5, 'x', 5, 'x'], baseFret: 0, difficulty: 'Medium', description: 'Dsus4 (root + fourth)' },
      { name: 'Open Dsus4', frets: ['x', 0, 0, 3], baseFret: 0, difficulty: 'Easy', description: 'Dsus4 open position' }
    ]
  },
  'E': {
    'Major': [
      { name: 'Open Root', frets: [0, 'x', 'x', 'x'], baseFret: 0, difficulty: 'Easy', description: 'E root note' },
      { name: 'Root + 5th', frets: [0, 'x', 2, 'x'], baseFret: 0, difficulty: 'Easy', description: 'E power chord' },
      { name: 'Triad', frets: [0, 2, 2, 1], baseFret: 0, difficulty: 'Medium', description: 'E major triad' }
    ],
    'Minor': [
      { name: 'Open Root', frets: [0, 'x', 'x', 'x'], baseFret: 0, difficulty: 'Easy', description: 'E root note' },
      { name: 'Root + 5th', frets: [0, 'x', 2, 'x'], baseFret: 0, difficulty: 'Easy', description: 'E power chord' },
      { name: 'Triad', frets: [0, 2, 2, 0], baseFret: 0, difficulty: 'Medium', description: 'E minor triad' }
    ],
    'Dominant 7th': [
      { name: 'Root + 7th', frets: [0, 'x', 'x', 3], baseFret: 0, difficulty: 'Easy', description: 'E7 (root + seventh)' },
      { name: 'Full Chord', frets: [0, 2, 0, 1], baseFret: 0, difficulty: 'Medium', description: 'E7 full chord' }
    ],
    'Major 7th': [
      { name: 'Root + Maj7', frets: [0, 'x', 'x', 2], baseFret: 0, difficulty: 'Easy', description: 'Emaj7 (root + major seventh)' },
      { name: 'Full Chord', frets: [0, 2, 1, 1], baseFret: 0, difficulty: 'Medium', description: 'Emaj7 full chord' }
    ],
    'Minor 7th': [
      { name: 'Root + 7th', frets: [0, 'x', 'x', 3], baseFret: 0, difficulty: 'Easy', description: 'Em7 (root + seventh)' },
      { name: 'Full Chord', frets: [0, 2, 0, 0], baseFret: 0, difficulty: 'Medium', description: 'Em7 full chord' }
    ],
    'Sus2': [
      { name: 'Root + 2nd', frets: [0, 'x', 2, 'x'], baseFret: 0, difficulty: 'Easy', description: 'Esus2 (root + second)' },
      { name: 'Full Sus2', frets: [0, 2, 2, 'x'], baseFret: 0, difficulty: 'Medium', description: 'Esus2 partial chord' }
    ],
    'Sus4': [
      { name: 'Root + 4th', frets: [0, 'x', 0, 'x'], baseFret: 0, difficulty: 'Easy', description: 'Esus4 (root + fourth)' },
      { name: 'Full Sus4', frets: [0, 2, 2, 2], baseFret: 0, difficulty: 'Hard', description: 'Esus4 full chord' }
    ]
  },
  'F': {
    'Major': [
      { name: 'Root + 5th', frets: [1, 'x', 3, 'x'], baseFret: 0, difficulty: 'Easy', description: 'F power chord' },
      { name: 'Triad', frets: [1, 3, 3, 2], baseFret: 0, difficulty: 'Medium', description: 'F major triad' },
      { name: 'High Position', frets: [8, 8, 10, 'x'], baseFret: 8, difficulty: 'Medium', description: 'F major high position' }
    ],
    'Minor': [
      { name: 'Root + 5th', frets: [1, 'x', 3, 'x'], baseFret: 0, difficulty: 'Easy', description: 'F power chord' },
      { name: 'Triad', frets: [1, 3, 3, 1], baseFret: 0, difficulty: 'Medium', description: 'F minor triad' },
      { name: 'High Position', frets: [8, 8, 9, 'x'], baseFret: 8, difficulty: 'Medium', description: 'F minor high position' }
    ],
    'Dominant 7th': [
      { name: 'Root + 7th', frets: [1, 'x', 'x', 4], baseFret: 0, difficulty: 'Easy', description: 'F7 (root + seventh)' },
      { name: 'Full Chord', frets: [1, 3, 1, 2], baseFret: 0, difficulty: 'Hard', description: 'F7 full chord' }
    ]
  },
  'G': {
    'Major': [
      { name: 'Root + 5th', frets: [3, 'x', 0, 'x'], baseFret: 0, difficulty: 'Easy', description: 'G power chord' },
      { name: 'Triad', frets: [3, 5, 5, 4], baseFret: 0, difficulty: 'Medium', description: 'G major triad' },
      { name: 'Open Position', frets: [3, 'x', 0, 0], baseFret: 0, difficulty: 'Easy', description: 'G major open position' }
    ],
    'Minor': [
      { name: 'Root + 5th', frets: [3, 'x', 0, 'x'], baseFret: 0, difficulty: 'Easy', description: 'G power chord' },
      { name: 'Triad', frets: [3, 5, 5, 3], baseFret: 0, difficulty: 'Medium', description: 'G minor triad' },
      { name: 'Barre 3rd', frets: [3, 3, 5, 'x'], baseFret: 3, difficulty: 'Medium', description: 'G minor barre position' }
    ],
    'Dominant 7th': [
      { name: 'Root + 7th', frets: [3, 'x', 'x', 1], baseFret: 0, difficulty: 'Easy', description: 'G7 (root + seventh)' },
      { name: 'Open G7', frets: [3, 'x', 0, 1], baseFret: 0, difficulty: 'Easy', description: 'G7 open position' }
    ],
    'Major 7th': [
      { name: 'Root + Maj7', frets: [3, 'x', 'x', 0], baseFret: 0, difficulty: 'Easy', description: 'Gmaj7 (root + major seventh)' },
      { name: 'Open Gmaj7', frets: [3, 'x', 0, 0], baseFret: 0, difficulty: 'Easy', description: 'Gmaj7 open position' }
    ],
    'Minor 7th': [
      { name: 'Root + 7th', frets: [3, 'x', 'x', 1], baseFret: 0, difficulty: 'Easy', description: 'Gm7 (root + seventh)' },
      { name: 'Barre Gm7', frets: [3, 3, 3, 1], baseFret: 3, difficulty: 'Hard', description: 'Gm7 barre position' }
    ],
    'Sus2': [
      { name: 'Root + 2nd', frets: [3, 'x', 0, 'x'], baseFret: 0, difficulty: 'Easy', description: 'Gsus2 (root + second)' },
      { name: 'Open Gsus2', frets: [3, 0, 0, 'x'], baseFret: 0, difficulty: 'Easy', description: 'Gsus2 open position' }
    ],
    'Sus4': [
      { name: 'Root + 4th', frets: [3, 'x', 1, 'x'], baseFret: 0, difficulty: 'Easy', description: 'Gsus4 (root + fourth)' },
      { name: 'Open Gsus4', frets: [3, 'x', 0, 1], baseFret: 0, difficulty: 'Easy', description: 'Gsus4 open position' }
    ]
  },
  'A': {
    'Major': [
      { name: 'Open Root', frets: ['x', 0, 'x', 'x'], baseFret: 0, difficulty: 'Easy', description: 'A root note' },
      { name: 'Root + 5th', frets: ['x', 0, 2, 'x'], baseFret: 0, difficulty: 'Easy', description: 'A power chord' },
      { name: 'Triad', frets: ['x', 0, 2, 2], baseFret: 0, difficulty: 'Medium', description: 'A major triad' }
    ],
    'Minor': [
      { name: 'Open Root', frets: ['x', 0, 'x', 'x'], baseFret: 0, difficulty: 'Easy', description: 'A root note' },
      { name: 'Root + 5th', frets: ['x', 0, 2, 'x'], baseFret: 0, difficulty: 'Easy', description: 'A power chord' },
      { name: 'Triad', frets: ['x', 0, 2, 1], baseFret: 0, difficulty: 'Medium', description: 'A minor triad' }
    ],
    'Dominant 7th': [
      { name: 'Root + 7th', frets: ['x', 0, 'x', 3], baseFret: 0, difficulty: 'Easy', description: 'A7 (root + seventh)' },
      { name: 'Open A7', frets: ['x', 0, 2, 0], baseFret: 0, difficulty: 'Easy', description: 'A7 open position' }
    ],
    'Major 7th': [
      { name: 'Root + Maj7', frets: ['x', 0, 'x', 2], baseFret: 0, difficulty: 'Easy', description: 'Amaj7 (root + major seventh)' },
      { name: 'Open Amaj7', frets: ['x', 0, 2, 1], baseFret: 0, difficulty: 'Medium', description: 'Amaj7 open position' }
    ],
    'Minor 7th': [
      { name: 'Root + 7th', frets: ['x', 0, 'x', 3], baseFret: 0, difficulty: 'Easy', description: 'Am7 (root + seventh)' },
      { name: 'Open Am7', frets: ['x', 0, 2, 0], baseFret: 0, difficulty: 'Easy', description: 'Am7 open position' }
    ],
    'Sus2': [
      { name: 'Root + 2nd', frets: ['x', 0, 'x', 0], baseFret: 0, difficulty: 'Easy', description: 'Asus2 (root + second)' },
      { name: 'Open Asus2', frets: ['x', 0, 2, 'x'], baseFret: 0, difficulty: 'Easy', description: 'Asus2 open position' }
    ],
    'Sus4': [
      { name: 'Root + 4th', frets: ['x', 0, 'x', 3], baseFret: 0, difficulty: 'Easy', description: 'Asus4 (root + fourth)' },
      { name: 'Open Asus4', frets: ['x', 0, 2, 3], baseFret: 0, difficulty: 'Medium', description: 'Asus4 open position' }
    ]
  },
  'B': {
    'Major': [
      { name: 'Root + 5th', frets: [2, 'x', 4, 'x'], baseFret: 0, difficulty: 'Easy', description: 'B power chord' },
      { name: 'Triad', frets: [2, 4, 4, 4], baseFret: 0, difficulty: 'Medium', description: 'B major triad' },
      { name: 'High Position', frets: [7, 9, 9, 'x'], baseFret: 7, difficulty: 'Medium', description: 'B major high position' }
    ],
    'Minor': [
      { name: 'Root + 5th', frets: [2, 'x', 4, 'x'], baseFret: 0, difficulty: 'Easy', description: 'B power chord' },
      { name: 'Triad', frets: [2, 4, 4, 3], baseFret: 0, difficulty: 'Medium', description: 'B minor triad' },
      { name: 'High Position', frets: [7, 9, 8, 'x'], baseFret: 7, difficulty: 'Medium', description: 'B minor high position' }
    ],
    'Dominant 7th': [
      { name: 'Root + 7th', frets: [2, 'x', 'x', 0], baseFret: 0, difficulty: 'Easy', description: 'B7 (root + seventh)' },
      { name: 'Full Chord', frets: [2, 4, 2, 4], baseFret: 0, difficulty: 'Hard', description: 'B7 full chord' }
    ]
  },
  'C#': {
    'Major': [
      { name: 'Root + 5th', frets: [4, 'x', 3, 'x'], baseFret: 0, difficulty: 'Easy', description: 'C# power chord' },
      { name: 'Triad', frets: [4, 4, 3, 1], baseFret: 0, difficulty: 'Medium', description: 'C# major triad' },
      { name: 'High Position', frets: [9, 11, 11, 'x'], baseFret: 9, difficulty: 'Medium', description: 'C# major high position' }
    ],
    'Minor': [
      { name: 'Root + 5th', frets: [4, 'x', 3, 'x'], baseFret: 0, difficulty: 'Easy', description: 'C# power chord' },
      { name: 'Triad', frets: [4, 2, 2, 'x'], baseFret: 0, difficulty: 'Medium', description: 'C# minor triad' },
      { name: 'High Position', frets: [9, 11, 10, 'x'], baseFret: 9, difficulty: 'Medium', description: 'C# minor high position' }
    ],
    'Dominant 7th': [
      { name: 'Root + 7th', frets: [4, 'x', 'x', 2], baseFret: 0, difficulty: 'Easy', description: 'C#7 (root + seventh)' },
      { name: 'Full Chord', frets: [4, 4, 3, 2], baseFret: 0, difficulty: 'Hard', description: 'C#7 full chord' }
    ]
  },
  'D#': {
    'Major': [
      { name: 'Root + 5th', frets: [6, 'x', 5, 'x'], baseFret: 0, difficulty: 'Medium', description: 'D# power chord' },
      { name: 'Triad', frets: [6, 6, 5, 3], baseFret: 0, difficulty: 'Medium', description: 'D# major triad' },
      { name: 'High Position', frets: [11, 13, 13, 'x'], baseFret: 11, difficulty: 'Hard', description: 'D# major high position' }
    ],
    'Minor': [
      { name: 'Root + 5th', frets: [6, 'x', 5, 'x'], baseFret: 0, difficulty: 'Medium', description: 'D# power chord' },
      { name: 'Triad', frets: [6, 4, 4, 'x'], baseFret: 0, difficulty: 'Medium', description: 'D# minor triad' },
      { name: 'High Position', frets: [11, 13, 12, 'x'], baseFret: 11, difficulty: 'Hard', description: 'D# minor high position' }
    ],
    'Dominant 7th': [
      { name: 'Root + 7th', frets: [6, 'x', 'x', 4], baseFret: 0, difficulty: 'Medium', description: 'D#7 (root + seventh)' },
      { name: 'Full Chord', frets: [6, 6, 5, 4], baseFret: 0, difficulty: 'Hard', description: 'D#7 full chord' }
    ]
  },
  'F#': {
    'Major': [
      { name: 'Root + 5th', frets: [2, 'x', 4, 'x'], baseFret: 0, difficulty: 'Easy', description: 'F# power chord' },
      { name: 'Triad', frets: [2, 4, 4, 3], baseFret: 0, difficulty: 'Medium', description: 'F# major triad' },
      { name: 'High Position', frets: [9, 9, 11, 'x'], baseFret: 9, difficulty: 'Medium', description: 'F# major high position' }
    ],
    'Minor': [
      { name: 'Root + 5th', frets: [2, 'x', 4, 'x'], baseFret: 0, difficulty: 'Easy', description: 'F# power chord' },
      { name: 'Triad', frets: [2, 4, 4, 2], baseFret: 0, difficulty: 'Medium', description: 'F# minor triad' },
      { name: 'High Position', frets: [9, 9, 10, 'x'], baseFret: 9, difficulty: 'Medium', description: 'F# minor high position' }
    ],
    'Dominant 7th': [
      { name: 'Root + 7th', frets: [2, 'x', 'x', 0], baseFret: 0, difficulty: 'Easy', description: 'F#7 (root + seventh)' },
      { name: 'Full Chord', frets: [2, 4, 2, 3], baseFret: 0, difficulty: 'Hard', description: 'F#7 full chord' }
    ]
  },
  'G#': {
    'Major': [
      { name: 'Root + 5th', frets: [4, 'x', 1, 'x'], baseFret: 0, difficulty: 'Easy', description: 'G# power chord' },
      { name: 'Triad', frets: [4, 6, 6, 5], baseFret: 0, difficulty: 'Medium', description: 'G# major triad' },
      { name: 'High Position', frets: [11, 11, 13, 'x'], baseFret: 11, difficulty: 'Hard', description: 'G# major high position' }
    ],
    'Minor': [
      { name: 'Root + 5th', frets: [4, 'x', 1, 'x'], baseFret: 0, difficulty: 'Easy', description: 'G# power chord' },
      { name: 'Triad', frets: [4, 6, 6, 4], baseFret: 0, difficulty: 'Medium', description: 'G# minor triad' },
      { name: 'High Position', frets: [11, 11, 12, 'x'], baseFret: 11, difficulty: 'Hard', description: 'G# minor high position' }
    ],
    'Dominant 7th': [
      { name: 'Root + 7th', frets: [4, 'x', 'x', 2], baseFret: 0, difficulty: 'Easy', description: 'G#7 (root + seventh)' },
      { name: 'Full Chord', frets: [4, 6, 4, 5], baseFret: 0, difficulty: 'Hard', description: 'G#7 full chord' }
    ]
  },
  'A#': {
    'Major': [
      { name: 'Root + 5th', frets: [1, 'x', 3, 'x'], baseFret: 0, difficulty: 'Easy', description: 'A# power chord' },
      { name: 'Triad', frets: [1, 1, 3, 3], baseFret: 0, difficulty: 'Medium', description: 'A# major triad' },
      { name: 'High Position', frets: [6, 8, 8, 'x'], baseFret: 6, difficulty: 'Medium', description: 'A# major high position' }
    ],
    'Minor': [
      { name: 'Root + 5th', frets: [1, 'x', 3, 'x'], baseFret: 0, difficulty: 'Easy', description: 'A# power chord' },
      { name: 'Triad', frets: [1, 1, 3, 2], baseFret: 0, difficulty: 'Medium', description: 'A# minor triad' },
      { name: 'High Position', frets: [6, 8, 7, 'x'], baseFret: 6, difficulty: 'Medium', description: 'A# minor high position' }
    ],
    'Dominant 7th': [
      { name: 'Root + 7th', frets: [1, 'x', 'x', 4], baseFret: 0, difficulty: 'Easy', description: 'A#7 (root + seventh)' },
      { name: 'Full Chord', frets: [1, 1, 3, 1], baseFret: 0, difficulty: 'Medium', description: 'A#7 full chord' }
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
  bassNotes: any[]
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
  bassNotes: any[]
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
  bassNotes: any[]
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
  bassNotes: any[]
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
    const bassNote = bassNotes.find((note: any) =>
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
  bassNotes: any[]
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
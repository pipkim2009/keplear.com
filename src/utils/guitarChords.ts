export type GuitarChord = {
  name: string
  intervals: number[] // Semitone intervals from root note
  description: string
}

export type ChordPosition = {
  string: number // 1-6
  fret: number   // 0-24
  note: string   // Note name
  isRoot: boolean // Is this the root note of the chord
}

export type ChordFingering = {
  name: string // Shape name like "Open", "Barre F", etc.
  frets: (number | 'x')[] // Fret numbers for each string (6 strings, low E to high E), 'x' means don't play
  baseFret: number // Base fret for barre chords (0 for open chords)
  difficulty: 'Easy' | 'Medium' | 'Hard'
  description?: string
}

export type ChordShape = {
  name: string // Shape name like "Open", "Barre", etc.
  minFret: number // Starting fret position
  maxFret: number // Ending fret position
  positions: ChordPosition[] // All notes in this chord shape
  difficulty: 'Easy' | 'Medium' | 'Hard' // Difficulty level
}

// Common guitar chords with their interval patterns
export const GUITAR_CHORDS: GuitarChord[] = [
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
    name: 'Minor 9th',
    intervals: [0, 3, 7, 10, 14],
    description: 'Rich, complex minor sound'
  },
  {
    name: 'Major 9th',
    intervals: [0, 4, 7, 11, 14],
    description: 'Rich, complex major sound'
  }
]

// Root notes available for chords (same as scales)
export const CHORD_ROOT_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

// Predefined chord fingerings for common chords
// Format: [low E, A, D, G, B, high E] - fret numbers or 'x' for muted
export const CHORD_FINGERINGS: { [key: string]: { [chordType: string]: ChordFingering[] } } = {
  'C': {
    'Major': [
      { name: 'Open C', frets: ['x', 3, 2, 0, 1, 0], baseFret: 0, difficulty: 'Easy', description: 'Basic open C chord' },
      { name: 'Barre 3rd', frets: [3, 3, 5, 5, 5, 3], baseFret: 3, difficulty: 'Medium', description: 'C major barre chord 3rd fret' },
      { name: 'Barre 8th', frets: [8, 10, 10, 9, 8, 8], baseFret: 8, difficulty: 'Hard', description: 'C major barre chord 8th fret' }
    ],
    'Minor': [
      { name: 'Open Cm', frets: ['x', 3, 1, 0, 1, 3], baseFret: 0, difficulty: 'Medium', description: 'Open C minor' },
      { name: 'Barre 3rd', frets: [3, 3, 5, 5, 4, 3], baseFret: 3, difficulty: 'Medium', description: 'C minor barre chord 3rd fret' },
      { name: 'Barre 8th', frets: [8, 10, 10, 8, 8, 8], baseFret: 8, difficulty: 'Hard', description: 'C minor barre chord 8th fret' }
    ],
    'Dominant 7th': [
      { name: 'Open C7', frets: ['x', 3, 2, 3, 1, 0], baseFret: 0, difficulty: 'Medium', description: 'Open C7 chord' },
      { name: 'Barre 3rd', frets: [3, 3, 5, 3, 5, 3], baseFret: 3, difficulty: 'Medium', description: 'C7 barre chord 3rd fret' }
    ]
  },
  'D': {
    'Major': [
      { name: 'Open D', frets: ['x', 'x', 0, 2, 3, 2], baseFret: 0, difficulty: 'Easy', description: 'Basic open D chord' },
      { name: 'Barre 5th', frets: [5, 5, 7, 7, 7, 5], baseFret: 5, difficulty: 'Medium', description: 'D major barre chord 5th fret' },
      { name: 'Barre 10th', frets: [10, 12, 12, 11, 10, 10], baseFret: 10, difficulty: 'Hard', description: 'D major barre chord 10th fret' }
    ],
    'Minor': [
      { name: 'Open Dm', frets: ['x', 'x', 0, 2, 3, 1], baseFret: 0, difficulty: 'Easy', description: 'Basic open D minor' },
      { name: 'Barre 5th', frets: [5, 5, 7, 7, 6, 5], baseFret: 5, difficulty: 'Medium', description: 'D minor barre chord 5th fret' },
      { name: 'Barre 10th', frets: [10, 12, 12, 10, 10, 10], baseFret: 10, difficulty: 'Hard', description: 'D minor barre chord 10th fret' }
    ],
    'Dominant 7th': [
      { name: 'Open D7', frets: ['x', 'x', 0, 2, 1, 2], baseFret: 0, difficulty: 'Easy', description: 'Open D7 chord' },
      { name: 'Barre 5th', frets: [5, 5, 7, 5, 7, 5], baseFret: 5, difficulty: 'Medium', description: 'D7 barre chord 5th fret' }
    ]
  },
  'E': {
    'Major': [
      { name: 'Open E', frets: [0, 2, 2, 1, 0, 0], baseFret: 0, difficulty: 'Easy', description: 'Basic open E chord' },
      { name: 'Barre 7th', frets: [7, 7, 9, 9, 9, 7], baseFret: 7, difficulty: 'Medium', description: 'E major barre chord 7th fret' },
      { name: 'Barre 12th', frets: [12, 14, 14, 13, 12, 12], baseFret: 12, difficulty: 'Hard', description: 'E major barre chord 12th fret' }
    ],
    'Minor': [
      { name: 'Open Em', frets: [0, 2, 2, 0, 0, 0], baseFret: 0, difficulty: 'Easy', description: 'Basic open E minor' },
      { name: 'Barre 7th', frets: [7, 7, 9, 9, 8, 7], baseFret: 7, difficulty: 'Medium', description: 'E minor barre chord 7th fret' },
      { name: 'Barre 12th', frets: [12, 14, 14, 12, 12, 12], baseFret: 12, difficulty: 'Hard', description: 'E minor barre chord 12th fret' }
    ],
    'Dominant 7th': [
      { name: 'Open E7', frets: [0, 2, 0, 1, 0, 0], baseFret: 0, difficulty: 'Easy', description: 'Open E7 chord' },
      { name: 'Barre 7th', frets: [7, 7, 9, 7, 9, 7], baseFret: 7, difficulty: 'Medium', description: 'E7 barre chord 7th fret' }
    ]
  },
  'F': {
    'Major': [
      { name: 'Barre 1st', frets: [1, 3, 3, 2, 1, 1], baseFret: 1, difficulty: 'Medium', description: 'F major barre chord 1st fret' },
      { name: 'Partial F', frets: ['x', 'x', 3, 2, 1, 1], baseFret: 0, difficulty: 'Medium', description: 'Partial F chord' },
      { name: 'Barre 8th', frets: [8, 8, 10, 10, 10, 8], baseFret: 8, difficulty: 'Medium', description: 'F major barre chord 8th fret' }
    ],
    'Minor': [
      { name: 'Barre 1st', frets: [1, 3, 3, 1, 1, 1], baseFret: 1, difficulty: 'Medium', description: 'F minor barre chord 1st fret' },
      { name: 'Barre 8th', frets: [8, 8, 10, 10, 9, 8], baseFret: 8, difficulty: 'Medium', description: 'F minor barre chord 8th fret' }
    ],
    'Dominant 7th': [
      { name: 'Barre 1st', frets: [1, 3, 1, 2, 1, 1], baseFret: 1, difficulty: 'Medium', description: 'F7 barre chord 1st fret' },
      { name: 'Barre 8th', frets: [8, 8, 10, 8, 10, 8], baseFret: 8, difficulty: 'Medium', description: 'F7 barre chord 8th fret' }
    ]
  },
  'G': {
    'Major': [
      { name: 'Open G', frets: [3, 2, 0, 0, 3, 3], baseFret: 0, difficulty: 'Easy', description: 'Basic open G chord' },
      { name: 'Open G Alt', frets: [3, 2, 0, 0, 0, 3], baseFret: 0, difficulty: 'Easy', description: 'Alternative open G chord' },
      { name: 'Barre 3rd', frets: [3, 3, 5, 5, 5, 3], baseFret: 3, difficulty: 'Medium', description: 'G major barre chord 3rd fret' }
    ],
    'Minor': [
      { name: 'Open Gm', frets: [3, 5, 5, 3, 3, 3], baseFret: 0, difficulty: 'Medium', description: 'Open G minor' },
      { name: 'Barre 3rd', frets: [3, 3, 5, 5, 4, 3], baseFret: 3, difficulty: 'Medium', description: 'G minor barre chord 3rd fret' }
    ],
    'Dominant 7th': [
      { name: 'Open G7', frets: [3, 2, 0, 0, 0, 1], baseFret: 0, difficulty: 'Easy', description: 'Open G7 chord' },
      { name: 'Barre 3rd', frets: [3, 3, 5, 3, 5, 3], baseFret: 3, difficulty: 'Medium', description: 'G7 barre chord 3rd fret' }
    ]
  },
  'A': {
    'Major': [
      { name: 'Open A', frets: ['x', 0, 2, 2, 2, 0], baseFret: 0, difficulty: 'Easy', description: 'Basic open A chord' },
      { name: 'Barre 5th', frets: [5, 5, 7, 7, 7, 5], baseFret: 5, difficulty: 'Medium', description: 'A major barre chord 5th fret' }
    ],
    'Minor': [
      { name: 'Open Am', frets: ['x', 0, 2, 2, 1, 0], baseFret: 0, difficulty: 'Easy', description: 'Basic open A minor' },
      { name: 'Barre 5th', frets: [5, 5, 7, 7, 6, 5], baseFret: 5, difficulty: 'Medium', description: 'A minor barre chord 5th fret' }
    ],
    'Dominant 7th': [
      { name: 'Open A7', frets: ['x', 0, 2, 0, 2, 0], baseFret: 0, difficulty: 'Easy', description: 'Open A7 chord' },
      { name: 'Barre 5th', frets: [5, 5, 7, 5, 7, 5], baseFret: 5, difficulty: 'Medium', description: 'A7 barre chord 5th fret' }
    ]
  },
  'B': {
    'Major': [
      { name: 'Barre 2nd', frets: [2, 2, 4, 4, 4, 2], baseFret: 2, difficulty: 'Medium', description: 'B major barre chord 2nd fret' },
      { name: 'Barre 7th', frets: [7, 9, 9, 8, 7, 7], baseFret: 7, difficulty: 'Hard', description: 'B major barre chord 7th fret' }
    ],
    'Minor': [
      { name: 'Barre 2nd', frets: [2, 2, 4, 4, 3, 2], baseFret: 2, difficulty: 'Medium', description: 'B minor barre chord 2nd fret' },
      { name: 'Barre 7th', frets: [7, 9, 9, 7, 7, 7], baseFret: 7, difficulty: 'Hard', description: 'B minor barre chord 7th fret' }
    ],
    'Dominant 7th': [
      { name: 'Barre 2nd', frets: [2, 2, 4, 2, 4, 2], baseFret: 2, difficulty: 'Medium', description: 'B7 barre chord 2nd fret' },
      { name: 'Open B7', frets: ['x', 2, 1, 2, 0, 2], baseFret: 0, difficulty: 'Medium', description: 'Open B7 chord' }
    ]
  },
  'C#': {
    'Major': [
      { name: 'Barre 4th', frets: [4, 4, 6, 6, 6, 4], baseFret: 4, difficulty: 'Medium', description: 'C# major barre chord 4th fret' },
      { name: 'Barre 9th', frets: [9, 11, 11, 10, 9, 9], baseFret: 9, difficulty: 'Hard', description: 'C# major barre chord 9th fret' }
    ],
    'Minor': [
      { name: 'Barre 4th', frets: [4, 4, 6, 6, 5, 4], baseFret: 4, difficulty: 'Medium', description: 'C# minor barre chord 4th fret' },
      { name: 'Barre 9th', frets: [9, 11, 11, 9, 9, 9], baseFret: 9, difficulty: 'Hard', description: 'C# minor barre chord 9th fret' }
    ],
    'Dominant 7th': [
      { name: 'Barre 4th', frets: [4, 4, 6, 4, 6, 4], baseFret: 4, difficulty: 'Medium', description: 'C#7 barre chord 4th fret' }
    ]
  },
  'D#': {
    'Major': [
      { name: 'Barre 6th', frets: [6, 6, 8, 8, 8, 6], baseFret: 6, difficulty: 'Medium', description: 'D# major barre chord 6th fret' },
      { name: 'Barre 11th', frets: [11, 13, 13, 12, 11, 11], baseFret: 11, difficulty: 'Hard', description: 'D# major barre chord 11th fret' }
    ],
    'Minor': [
      { name: 'Barre 6th', frets: [6, 6, 8, 8, 7, 6], baseFret: 6, difficulty: 'Medium', description: 'D# minor barre chord 6th fret' },
      { name: 'Barre 11th', frets: [11, 13, 13, 11, 11, 11], baseFret: 11, difficulty: 'Hard', description: 'D# minor barre chord 11th fret' }
    ],
    'Dominant 7th': [
      { name: 'Barre 6th', frets: [6, 6, 8, 6, 8, 6], baseFret: 6, difficulty: 'Medium', description: 'D#7 barre chord 6th fret' }
    ]
  },
  'F#': {
    'Major': [
      { name: 'Barre 2nd', frets: [2, 4, 4, 3, 2, 2], baseFret: 2, difficulty: 'Medium', description: 'F# major barre chord 2nd fret' },
      { name: 'Barre 9th', frets: [9, 9, 11, 11, 11, 9], baseFret: 9, difficulty: 'Medium', description: 'F# major barre chord 9th fret' }
    ],
    'Minor': [
      { name: 'Barre 2nd', frets: [2, 4, 4, 2, 2, 2], baseFret: 2, difficulty: 'Medium', description: 'F# minor barre chord 2nd fret' },
      { name: 'Barre 9th', frets: [9, 9, 11, 11, 10, 9], baseFret: 9, difficulty: 'Medium', description: 'F# minor barre chord 9th fret' }
    ],
    'Dominant 7th': [
      { name: 'Barre 2nd', frets: [2, 4, 2, 3, 2, 2], baseFret: 2, difficulty: 'Medium', description: 'F#7 barre chord 2nd fret' },
      { name: 'Barre 9th', frets: [9, 9, 11, 9, 11, 9], baseFret: 9, difficulty: 'Medium', description: 'F#7 barre chord 9th fret' }
    ]
  },
  'G#': {
    'Major': [
      { name: 'Barre 4th', frets: [4, 6, 6, 5, 4, 4], baseFret: 4, difficulty: 'Medium', description: 'G# major barre chord 4th fret' },
      { name: 'Barre 11th', frets: [11, 11, 13, 13, 13, 11], baseFret: 11, difficulty: 'Hard', description: 'G# major barre chord 11th fret' }
    ],
    'Minor': [
      { name: 'Barre 4th', frets: [4, 6, 6, 4, 4, 4], baseFret: 4, difficulty: 'Medium', description: 'G# minor barre chord 4th fret' },
      { name: 'Barre 11th', frets: [11, 11, 13, 13, 12, 11], baseFret: 11, difficulty: 'Hard', description: 'G# minor barre chord 11th fret' }
    ],
    'Dominant 7th': [
      { name: 'Barre 4th', frets: [4, 6, 4, 5, 4, 4], baseFret: 4, difficulty: 'Medium', description: 'G#7 barre chord 4th fret' }
    ]
  },
  'A#': {
    'Major': [
      { name: 'Barre 6th', frets: [6, 6, 8, 8, 8, 6], baseFret: 6, difficulty: 'Medium', description: 'A# major barre chord 6th fret' },
      { name: 'Barre 1st', frets: [1, 1, 3, 3, 3, 1], baseFret: 1, difficulty: 'Medium', description: 'A# major barre chord 1st fret' }
    ],
    'Minor': [
      { name: 'Barre 6th', frets: [6, 6, 8, 8, 7, 6], baseFret: 6, difficulty: 'Medium', description: 'A# minor barre chord 6th fret' },
      { name: 'Barre 1st', frets: [1, 1, 3, 3, 2, 1], baseFret: 1, difficulty: 'Medium', description: 'A# minor barre chord 1st fret' }
    ],
    'Dominant 7th': [
      { name: 'Barre 6th', frets: [6, 6, 8, 6, 8, 6], baseFret: 6, difficulty: 'Medium', description: 'A#7 barre chord 6th fret' },
      { name: 'Barre 1st', frets: [1, 1, 3, 1, 3, 1], baseFret: 1, difficulty: 'Medium', description: 'A#7 barre chord 1st fret' }
    ]
  }
}

// Function to get note name from semitone offset
const getNoteFromInterval = (rootNote: string, interval: number): string => {
  const rootIndex = CHORD_ROOT_NOTES.indexOf(rootNote)
  if (rootIndex === -1) return rootNote

  const noteIndex = (rootIndex + interval) % 12
  return CHORD_ROOT_NOTES[noteIndex]
}

// Function to get all notes in a chord given root note and chord
export const getChordNotes = (rootNote: string, chord: GuitarChord): string[] => {
  return chord.intervals.map(interval => getNoteFromInterval(rootNote, interval))
}

// Function to check if a note belongs to a chord
export const isNoteInChord = (noteName: string, rootNote: string, chord: GuitarChord): boolean => {
  const chordNotes = getChordNotes(rootNote, chord)
  // Remove octave numbers for comparison (e.g., "C4" becomes "C")
  const noteNameWithoutOctave = noteName.replace(/\d+$/, '')
  return chordNotes.includes(noteNameWithoutOctave)
}

// Function to get chord positions on the guitar fretboard
export const getChordPositions = (
  rootNote: string,
  chord: GuitarChord,
  guitarNotes: any[]
): ChordPosition[] => {
  const chordNotes = getChordNotes(rootNote, chord)
  const positions: ChordPosition[] = []

  guitarNotes.forEach(guitarNote => {
    const noteNameWithoutOctave = guitarNote.name.replace(/\d+$/, '')

    // Check if note is in chord
    if (chordNotes.includes(noteNameWithoutOctave)) {
      positions.push({
        string: guitarNote.string,
        fret: guitarNote.fret,
        note: guitarNote.name,
        isRoot: noteNameWithoutOctave === rootNote
      })
    }
  })

  return positions
}

// Function to get proper guitar chord fingerings for a given chord and root
export const getGuitarChordFingerings = (
  rootNote: string,
  chord: GuitarChord
): ChordFingering[] => {
  // Handle sharp/flat notes by converting to their enharmonic equivalents
  const normalizedRoot = normalizeChordRoot(rootNote)

  if (CHORD_FINGERINGS[normalizedRoot] && CHORD_FINGERINGS[normalizedRoot][chord.name]) {
    return CHORD_FINGERINGS[normalizedRoot][chord.name]
  }

  // If no predefined fingerings, return transposed barre chord shapes
  return getTransposedBarreChords(rootNote, chord)
}

// Helper function to normalize chord root (handle enharmonic equivalents)
const normalizeChordRoot = (rootNote: string): string => {
  const enharmonicMap: { [key: string]: string } = {
    'C#': 'C#', 'Db': 'C#',
    'D#': 'D#', 'Eb': 'D#',
    'F#': 'F#', 'Gb': 'F#',
    'G#': 'G#', 'Ab': 'G#',
    'A#': 'A#', 'Bb': 'A#'
  }
  return enharmonicMap[rootNote] || rootNote
}

// Function to transpose barre chord shapes for sharp/flat notes
const getTransposedBarreChords = (rootNote: string, chord: GuitarChord): ChordFingering[] => {
  const rootIndex = CHORD_ROOT_NOTES.indexOf(rootNote)
  if (rootIndex === -1) return []

  // Find a suitable reference chord to transpose from
  const referenceChords = ['E', 'A', 'C', 'G', 'D', 'F']
  let referenceRoot = 'E'

  for (const ref of referenceChords) {
    if (CHORD_FINGERINGS[ref] && CHORD_FINGERINGS[ref][chord.name]) {
      referenceRoot = ref
      break
    }
  }

  if (!CHORD_FINGERINGS[referenceRoot] || !CHORD_FINGERINGS[referenceRoot][chord.name]) {
    return []
  }

  const referenceIndex = CHORD_ROOT_NOTES.indexOf(referenceRoot)
  const semitoneOffset = (rootIndex - referenceIndex + 12) % 12

  return CHORD_FINGERINGS[referenceRoot][chord.name].map(fingering => {
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

// Function to convert chord fingering to guitar positions for selection
export const applyChordFingeringToGuitar = (
  fingering: ChordFingering,
  guitarNotes: any[]
): { stringIndex: number, fretIndex: number }[] => {
  const selections: { stringIndex: number, fretIndex: number }[] = []

  fingering.frets.forEach((fret, stringNumber) => {
    if (fret === 'x') return // Skip muted strings

    const actualFret = typeof fret === 'number' ? fret : 0
    // Convert guitar string number (0-5, low E to high E) to visual string index
    // guitarNotes: 1=low E, 2=A, 3=D, 4=G, 5=B, 6=high E
    // Visual strings: 0=high E, 1=B, 2=G, 3=D, 4=A, 5=low E
    // stringNumber 0 (low E) -> visual index 5, stringNumber 5 (high E) -> visual index 0
    const stringIndex = 5 - stringNumber
    const fretIndex = actualFret

    selections.push({ stringIndex, fretIndex })
  })

  return selections
}

// Function to get chord shapes/voicings for a given chord and root (updated to use fingerings)
export const getChordShapes = (
  rootNote: string,
  chord: GuitarChord,
  guitarNotes: any[]
): ChordShape[] => {
  const fingerings = getGuitarChordFingerings(rootNote, chord)
  const shapes: ChordShape[] = []

  fingerings.forEach(fingering => {
    const positions = convertFingeringToPositions(fingering, guitarNotes)
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

// Helper function to convert fingering to chord positions
const convertFingeringToPositions = (
  fingering: ChordFingering,
  guitarNotes: any[]
): ChordPosition[] => {
  const positions: ChordPosition[] = []

  fingering.frets.forEach((fret, stringNumber) => {
    if (fret === 'x') return // Skip muted strings

    const actualFret = typeof fret === 'number' ? fret : 0
    const guitarString = stringNumber + 1 // Convert 0-based to 1-based

    // Find the corresponding guitar note
    const guitarNote = guitarNotes.find((note: any) =>
      note.string === guitarString && note.fret === actualFret
    )

    if (guitarNote) {
      positions.push({
        string: guitarString,
        fret: actualFret,
        note: guitarNote.name,
        isRoot: false // We'll determine this separately
      })
    }
  })

  return positions
}

// Function to apply chord to guitar note selection (using first available fingering)
export const applyChordToGuitar = (
  rootNote: string,
  chord: GuitarChord,
  guitarNotes: any[]
): { stringIndex: number, fretIndex: number }[] => {
  const fingerings = getGuitarChordFingerings(rootNote, chord)

  if (fingerings.length > 0) {
    // Use the first (usually easiest) fingering
    return applyChordFingeringToGuitar(fingerings[0], guitarNotes)
  }

  // Fallback to theoretical approach if no fingerings available
  const chordPositions = getChordPositions(rootNote, chord, guitarNotes)
  const selections: { stringIndex: number, fretIndex: number }[] = []

  chordPositions.forEach(position => {
    const stringIndex = 6 - position.string
    const fretIndex = position.fret
    selections.push({ stringIndex, fretIndex })
  })

  return selections
}

// Function to apply a specific chord shape to guitar note selection
export const applyChordShapeToGuitar = (
  chordShape: ChordShape
): { stringIndex: number, fretIndex: number }[] => {
  const selections: { stringIndex: number, fretIndex: number }[] = []

  chordShape.positions.forEach(position => {
    // Convert guitar string number (1-6) to visual string index (0-5)
    const stringIndex = 6 - position.string
    const fretIndex = position.fret

    selections.push({ stringIndex, fretIndex })
  })

  return selections
}
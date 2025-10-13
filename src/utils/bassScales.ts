export type BassScale = {
  name: string
  intervals: number[] // Semitone intervals from root note
  description: string
}

export type BassScalePosition = {
  string: number // 1-4
  fret: number   // 0-24
  note: string   // Note name
  isRoot: boolean // Is this the root note of the scale
}

export type BassScaleBox = {
  name: string // Box 1, Box 2, etc.
  minFret: number // Starting fret position
  maxFret: number // Ending fret position
  positions: BassScalePosition[] // All notes in this position
}

// Common bass scales with their interval patterns
export const BASS_SCALES: BassScale[] = [
  {
    name: 'Major',
    intervals: [0, 2, 4, 5, 7, 9, 11],
    description: 'The most common scale, bright and happy sounding'
  },
  {
    name: 'Minor',
    intervals: [0, 2, 3, 5, 7, 8, 10],
    description: 'Minor scale with a sad, melancholic sound'
  },
  {
    name: 'Dorian',
    intervals: [0, 2, 3, 5, 7, 9, 10],
    description: 'Minor scale with a raised 6th, jazzy sound'
  },
  {
    name: 'Phrygian',
    intervals: [0, 1, 3, 5, 7, 8, 10],
    description: 'Minor scale with a flattened 2nd, Spanish sound'
  },
  {
    name: 'Lydian',
    intervals: [0, 2, 4, 6, 7, 9, 11],
    description: 'Major scale with a raised 4th, dreamy sound'
  },
  {
    name: 'Mixolydian',
    intervals: [0, 2, 4, 5, 7, 9, 10],
    description: 'Major scale with a flattened 7th, bluesy sound'
  },
  {
    name: 'Locrian',
    intervals: [0, 1, 3, 5, 6, 8, 10],
    description: 'Diminished scale, unstable and dark'
  },
  {
    name: 'Pentatonic Major',
    intervals: [0, 2, 4, 7, 9],
    description: 'Five-note scale, great for blues and rock'
  },
  {
    name: 'Pentatonic Minor',
    intervals: [0, 3, 5, 7, 10],
    description: 'Five-note minor scale, essential for blues and rock'
  },
  {
    name: 'Harmonic Minor',
    intervals: [0, 2, 3, 5, 7, 8, 11],
    description: 'Minor scale with a raised 7th, exotic sound'
  },
  {
    name: 'Blues Scale',
    intervals: [0, 3, 5, 6, 7, 10],
    description: 'Minor pentatonic with added blue note'
  },
  {
    name: 'Chromatic',
    intervals: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    description: 'All twelve notes, used for warm-ups and runs'
  }
]

// Root notes available for scales
export const BASS_ROOT_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

// Function to get note name from semitone offset
const getNoteFromInterval = (rootNote: string, interval: number): string => {
  const rootIndex = BASS_ROOT_NOTES.indexOf(rootNote)
  if (rootIndex === -1) return rootNote

  const noteIndex = (rootIndex + interval) % 12
  return BASS_ROOT_NOTES[noteIndex]
}

// Function to get all notes in a scale given root note and scale
export const getBassScaleNotes = (rootNote: string, scale: BassScale): string[] => {
  return scale.intervals.map(interval => getNoteFromInterval(rootNote, interval))
}

// Function to check if a note belongs to a scale
export const isNoteInBassScale = (noteName: string, rootNote: string, scale: BassScale): boolean => {
  const scaleNotes = getBassScaleNotes(rootNote, scale)
  // Remove octave numbers for comparison (e.g., "C4" becomes "C")
  const noteNameWithoutOctave = noteName.replace(/\d+$/, '')
  return scaleNotes.includes(noteNameWithoutOctave)
}

// Function to get scale positions on the bass fretboard
export const getBassScalePositions = (
  rootNote: string,
  scale: BassScale,
  bassNotes: any[]
): BassScalePosition[] => {
  const scaleNotes = getBassScaleNotes(rootNote, scale)
  const positions: BassScalePosition[] = []

  bassNotes.forEach(bassNote => {
    const noteNameWithoutOctave = bassNote.name.replace(/\d+$/, '')

    // Check if note is in scale
    if (scaleNotes.includes(noteNameWithoutOctave)) {
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

// Function to get scale boxes/positions for a given scale and root
export const getBassScaleBoxes = (
  rootNote: string,
  scale: BassScale,
  bassNotes: any[]
): BassScaleBox[] => {
  const allPositions = getBassScalePositions(rootNote, scale, bassNotes)
  const boxes: BassScaleBox[] = []

  // Define box ranges based on common bass patterns (0-24 frets)
  const boxRanges = [
    { name: 'Open Position', minFret: 0, maxFret: 4 },
    { name: 'Position 2', minFret: 3, maxFret: 7 },
    { name: 'Position 3', minFret: 5, maxFret: 9 },
    { name: 'Position 4', minFret: 7, maxFret: 11 },
    { name: 'Position 5', minFret: 8, maxFret: 12 },
    { name: 'Position 6', minFret: 10, maxFret: 14 },
    { name: 'Position 7', minFret: 12, maxFret: 16 },
    { name: 'Position 8', minFret: 14, maxFret: 18 },
    { name: 'Position 9', minFret: 16, maxFret: 20 },
    { name: 'Position 10', minFret: 18, maxFret: 22 },
    { name: 'Position 11', minFret: 20, maxFret: 24 }
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

// Function to apply scale to bass note selection
export const applyScaleToBass = (
  rootNote: string,
  scale: BassScale,
  bassNotes: any[]
): { stringIndex: number, fretIndex: number }[] => {
  const scalePositions = getBassScalePositions(rootNote, scale, bassNotes)
  const selections: { stringIndex: number, fretIndex: number }[] = []

  scalePositions.forEach(position => {
    // Convert bass string number (1-4) to visual string index (0-3)
    // bassNotes: 1=high G, 2=D, 3=A, 4=low E
    // Visual strings: 0=high G, 1=D, 2=A, 3=low E
    // So we need to map: bassNotes string 1→visual 0, 2→1, 3→2, 4→3
    const stringIndex = position.string - 1 // Convert 1→0, 2→1, 3→2, 4→3
    const fretIndex = position.fret

    selections.push({ stringIndex, fretIndex })
  })

  return selections
}

// Function to apply a specific scale box to bass note selection
export const applyScaleBoxToBass = (
  scaleBox: BassScaleBox
): { stringIndex: number, fretIndex: number }[] => {
  const selections: { stringIndex: number, fretIndex: number }[] = []

  scaleBox.positions.forEach(position => {
    // Convert bass string number (1-4) to visual string index (0-3)
    const stringIndex = position.string - 1
    const fretIndex = position.fret

    selections.push({ stringIndex, fretIndex })
  })

  return selections
}
export type GuitarScale = {
  name: string
  intervals: number[] // Semitone intervals from root note
  description: string
}

export type ScalePosition = {
  string: number // 1-6
  fret: number   // 0-12
  note: string   // Note name
  isRoot: boolean // Is this the root note of the scale
}

// Common guitar scales with their interval patterns
export const GUITAR_SCALES: GuitarScale[] = [
  {
    name: 'Major (Ionian)',
    intervals: [0, 2, 4, 5, 7, 9, 11],
    description: 'The most common scale, bright and happy sounding'
  },
  {
    name: 'Natural Minor (Aeolian)',
    intervals: [0, 2, 3, 5, 7, 8, 10],
    description: 'Minor scale with a sad, melancholic sound'
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
    name: 'Harmonic Minor',
    intervals: [0, 2, 3, 5, 7, 8, 11],
    description: 'Minor scale with a raised 7th, exotic sound'
  },
  {
    name: 'Blues Scale',
    intervals: [0, 3, 5, 6, 7, 10],
    description: 'Minor pentatonic with added blue note'
  }
]

// Root notes available for scales
export const ROOT_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

// Function to get note name from semitone offset
const getNoteFromInterval = (rootNote: string, interval: number): string => {
  const rootIndex = ROOT_NOTES.indexOf(rootNote)
  if (rootIndex === -1) return rootNote
  
  const noteIndex = (rootIndex + interval) % 12
  return ROOT_NOTES[noteIndex]
}

// Function to get all notes in a scale given root note and scale
export const getScaleNotes = (rootNote: string, scale: GuitarScale): string[] => {
  return scale.intervals.map(interval => getNoteFromInterval(rootNote, interval))
}

// Function to check if a note belongs to a scale
export const isNoteInScale = (noteName: string, rootNote: string, scale: GuitarScale): boolean => {
  const scaleNotes = getScaleNotes(rootNote, scale)
  // Remove octave numbers for comparison (e.g., "C4" becomes "C")
  const noteNameWithoutOctave = noteName.replace(/\d+$/, '')
  return scaleNotes.includes(noteNameWithoutOctave)
}

// Function to get scale positions on the guitar fretboard
export const getScalePositions = (
  rootNote: string, 
  scale: GuitarScale, 
  guitarNotes: any[]
): ScalePosition[] => {
  const scaleNotes = getScaleNotes(rootNote, scale)
  const positions: ScalePosition[] = []
  
  guitarNotes.forEach(guitarNote => {
    const noteNameWithoutOctave = guitarNote.name.replace(/\d+$/, '')
    const octaveMatch = guitarNote.name.match(/\d+$/)
    const octave = octaveMatch ? parseInt(octaveMatch[0]) : 0
    
    // Check if note is in scale
    if (scaleNotes.includes(noteNameWithoutOctave)) {
      
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

// Function to apply scale to guitar note selection
export const applyScaleToGuitar = (
  rootNote: string, 
  scale: GuitarScale, 
  guitarNotes: any[]
): { stringIndex: number, fretIndex: number }[] => {
  const scalePositions = getScalePositions(rootNote, scale, guitarNotes)
  const selections: { stringIndex: number, fretIndex: number }[] = []
  
  scalePositions.forEach(position => {
    // Convert guitar string number (1-6) to visual string index (0-5)
    // guitarNotes: 1=low E, 2=A, 3=D, 4=G, 5=B, 6=high E
    // Visual strings: 0=high E, 1=B, 2=G, 3=D, 4=A, 5=low E
    // So we need to map: guitarNotes string 6→visual 0, 5→1, 4→2, 3→3, 2→4, 1→5
    const stringIndex = 6 - position.string // Convert 1→5, 2→4, 3→3, 4→2, 5→1, 6→0
    const fretIndex = position.fret
    
    selections.push({ stringIndex, fretIndex })
  })
  
  return selections
}
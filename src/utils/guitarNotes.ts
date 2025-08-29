export type GuitarNote = {
  name: string
  frequency: number
  string: number // 1-6 (low E to high E)
  fret: number   // 0-12 (open to 12th fret)
  position: number // unique position for melody generation
}

// Standard guitar tuning (low to high): E2, A2, D3, G3, B3, E4
const openStringNotes = [
  { name: 'E2', frequency: 82.41, basePosition: -12 },   // String 6 (lowest)
  { name: 'A2', frequency: 110.00, basePosition: -7 },  // String 5
  { name: 'D3', frequency: 146.83, basePosition: -2 },  // String 4
  { name: 'G3', frequency: 196.00, basePosition: 3 },   // String 3
  { name: 'B3', frequency: 246.94, basePosition: 7 },   // String 2
  { name: 'E4', frequency: 329.63, basePosition: 12 },  // String 1 (highest)
]

export const generateGuitarNotes = (): GuitarNote[] => {
  const guitarNotes: GuitarNote[] = []
  
  openStringNotes.forEach((openString, stringIndex) => {
    for (let fret = 0; fret <= 12; fret++) {
      // Calculate semitone offset from the open string
      const semitoneOffset = fret
      const frequency = openString.frequency * Math.pow(2, semitoneOffset / 12)
      
      // Calculate note name
      const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
      const baseNoteIndex = getBaseNoteIndex(openString.name.charAt(0))
      const noteIndex = (baseNoteIndex + semitoneOffset) % 12
      const octave = Math.floor((baseNoteIndex + semitoneOffset + parseInt(openString.name.slice(1)) * 12) / 12)
      const noteName = `${noteNames[noteIndex]}${octave}`
      
      guitarNotes.push({
        name: noteName,
        frequency: Math.round(frequency * 100) / 100,
        string: stringIndex + 1, // 1-indexed for display
        fret: fret,
        position: openString.basePosition + semitoneOffset
      })
    }
  })
  
  return guitarNotes
}

const getBaseNoteIndex = (note: string): number => {
  const noteIndices: { [key: string]: number } = {
    'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11
  }
  return noteIndices[note] || 0
}

export const guitarNotes = generateGuitarNotes()

// Helper function to get available notes based on selected strings and frets
export const getAvailableGuitarNotes = (
  selectedStrings: boolean[], 
  selectedFrets: boolean[]
): GuitarNote[] => {
  return guitarNotes.filter(note => {
    const stringIndex = note.string - 1 // Convert to 0-indexed
    const fretIndex = note.fret
    
    return selectedStrings[stringIndex] && 
           (selectedFrets[fretIndex] || note.fret === 0) // Include open strings
  })
}

// Helper function to find the closest guitar notes to keyboard notes for compatibility
export const findGuitarNoteByName = (noteName: string): GuitarNote | undefined => {
  return guitarNotes.find(note => note.name === noteName)
}
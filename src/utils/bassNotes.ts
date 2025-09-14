export type BassNote = {
  name: string
  frequency: number
  string: number // 1-4 (low E to high G)
  fret: number   // 0-24 (open to 24th fret)
  position: number // unique position for melody generation
}

// Standard bass tuning (low to high): E1, A1, D2, G2
const openStringNotes = [
  { name: 'E1', frequency: 41.20, basePosition: -24 },   // String 4 (lowest)
  { name: 'A1', frequency: 55.00, basePosition: -19 },  // String 3
  { name: 'D2', frequency: 73.42, basePosition: -14 },  // String 2
  { name: 'G2', frequency: 98.00, basePosition: -9 },   // String 1 (highest)
]

export const generateBassNotes = (): BassNote[] => {
  const bassNotes: BassNote[] = []

  openStringNotes.forEach((openString, stringIndex) => {
    for (let fret = 0; fret <= 24; fret++) {
      // Calculate semitone offset from the open string
      const semitoneOffset = fret
      const frequency = openString.frequency * Math.pow(2, semitoneOffset / 12)

      // Calculate note name
      const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
      const baseNoteIndex = getBaseNoteIndex(openString.name.charAt(0))
      const noteIndex = (baseNoteIndex + semitoneOffset) % 12
      const octave = Math.floor((baseNoteIndex + semitoneOffset + parseInt(openString.name.slice(1)) * 12) / 12)
      const noteName = `${noteNames[noteIndex]}${octave}`

      bassNotes.push({
        name: noteName,
        frequency: Math.round(frequency * 100) / 100,
        string: stringIndex + 1, // 1-indexed for display
        fret: fret,
        position: openString.basePosition + semitoneOffset
      })
    }
  })

  return bassNotes
}

const getBaseNoteIndex = (note: string): number => {
  const noteIndices: { [key: string]: number } = {
    'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11
  }
  return noteIndices[note] || 0
}

export const bassNotes = generateBassNotes()

// Helper function to get available notes based on selected strings and frets
export const getAvailableBassNotes = (
  selectedStrings: boolean[],
  selectedFrets: boolean[]
): BassNote[] => {
  return bassNotes.filter(note => {
    const stringIndex = note.string - 1 // Convert to 0-indexed
    const fretIndex = note.fret

    return selectedStrings[stringIndex] &&
           (selectedFrets[fretIndex] || note.fret === 0) // Include open strings
  })
}

// Helper function to find the closest bass notes to keyboard notes for compatibility
export const findBassNoteByName = (noteName: string): BassNote | undefined => {
  return bassNotes.find(note => note.name === noteName)
}
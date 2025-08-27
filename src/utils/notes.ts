export type Note = {
  name: string
  frequency: number
  isBlack: boolean
  position: number
}

export const generateNotes = (): Note[] => {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  const baseFrequency = 261.63 // C4
  const notes: Note[] = []
  
  for (let octave = 4; octave <= 5; octave++) {
    noteNames.forEach((noteName, index) => {
      const octaveOffset = (octave - 4) * 12
      const position = octaveOffset + index
      const frequency = baseFrequency * Math.pow(2, position / 12)
      
      notes.push({
        name: `${noteName}${octave}`,
        frequency: Math.round(frequency * 100) / 100,
        isBlack: noteName.includes('#'),
        position
      })
    })
  }
  
  return notes
}

export const notes = generateNotes()

export const whiteKeys = notes.filter(note => !note.isBlack)
export const blackKeys = notes.filter(note => note.isBlack)

export const getBlackKeyLeft = (position: number): number => {
  const whiteKeyWidth = 62 // 60px + 2px margin
  const blackKeyWidth = 36
  
  const positions: { [key: number]: number } = {
    // First octave
    1: whiteKeyWidth * 1 - blackKeyWidth / 2,   // C#4
    3: whiteKeyWidth * 2 - blackKeyWidth / 2,   // D#4
    6: whiteKeyWidth * 4 - blackKeyWidth / 2,   // F#4
    8: whiteKeyWidth * 5 - blackKeyWidth / 2,   // G#4
    10: whiteKeyWidth * 6 - blackKeyWidth / 2,  // A#4
    
    // Second octave
    13: whiteKeyWidth * 8 - blackKeyWidth / 2,  // C#5
    15: whiteKeyWidth * 9 - blackKeyWidth / 2,  // D#5
    18: whiteKeyWidth * 11 - blackKeyWidth / 2, // F#5
    20: whiteKeyWidth * 12 - blackKeyWidth / 2, // G#5
    22: whiteKeyWidth * 13 - blackKeyWidth / 2, // A#5
  }
  
  return positions[position] || 0
}
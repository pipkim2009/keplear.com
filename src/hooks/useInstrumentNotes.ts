import { useMemo } from 'react'
import { notes, type Note } from '../utils/notes'
import { guitarNotes, type GuitarNote } from '../utils/guitarNotes'

export const useInstrumentNotes = (instrument: string) => {
  const instrumentNotes = useMemo(() => {
    if (instrument === 'keyboard') {
      return notes
    } else if (instrument === 'guitar') {
      // Convert guitar notes to Note format for compatibility
      return guitarNotes.map((guitarNote: GuitarNote): Note => ({
        name: guitarNote.name,
        frequency: guitarNote.frequency,
        isBlack: guitarNote.name.includes('#'),
        position: guitarNote.position
      }))
    }
    return notes // fallback to keyboard
  }, [instrument])

  return instrumentNotes
}
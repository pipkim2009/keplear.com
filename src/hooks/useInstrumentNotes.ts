import { useMemo } from 'react'
import { notes, type Note } from '../utils/notes'
import { guitarNotes, type GuitarNote } from '../utils/guitarNotes'
import { bassNotes, type BassNote } from '../utils/bassNotes'

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
    } else if (instrument === 'bass') {
      // Convert bass notes to Note format for compatibility
      return bassNotes.map((bassNote: BassNote): Note => ({
        name: bassNote.name,
        frequency: bassNote.frequency,
        isBlack: bassNote.name.includes('#'),
        position: bassNote.position
      }))
    }
    return notes // fallback to keyboard
  }, [instrument])

  return instrumentNotes
}
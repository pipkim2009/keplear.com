import { useMemo } from 'react'
import { notes, type Note } from '../utils/notes'
import { guitarNotes, type GuitarNote } from '../utils/instruments/guitar/guitarNotes'
import { bassNotes, type BassNote } from '../utils/instruments/bass/bassNotes'

export const useInstrumentNotes = (instrument: string): Note[] => {
  const instrumentNotes = useMemo((): Note[] => {
    if (instrument === 'keyboard') {
      return notes
    } else if (instrument === 'guitar') {
      // Convert guitar notes to Note format for compatibility
      return guitarNotes.map((guitarNote: GuitarNote): Note => ({
        id: guitarNote.id,
        name: guitarNote.name,
        frequency: guitarNote.frequency,
        isBlack: guitarNote.name.includes('#'),
        position: guitarNote.position
      }))
    } else if (instrument === 'bass') {
      // Convert bass notes to Note format for compatibility
      return bassNotes.map((bassNote: BassNote): Note => ({
        id: bassNote.id,
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
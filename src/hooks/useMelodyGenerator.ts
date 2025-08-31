import { useState } from 'react'

export type Note = {
  name: string
  frequency: number
  isBlack: boolean
  position: number
}

export const useMelodyGenerator = () => {
  const [selectedNotes, setSelectedNotes] = useState<Note[]>([])
  const [generatedMelody, setGeneratedMelody] = useState<Note[]>([])
  const [clearTrigger, setClearTrigger] = useState<number>(0)

  const selectNote = (note: Note) => {
    setSelectedNotes(prev => prev.length < 2 ? [...prev, note] : [note])
    setGeneratedMelody([])
  }

  const generateMelody = (notes: Note[], numberOfNotes: number, instrument: string = 'keyboard') => {
    if (instrument === 'keyboard') {
      // Original keyboard logic - requires exactly 2 notes for range
      if (selectedNotes.length !== 2) return

      const [note1, note2] = selectedNotes.sort((a, b) => a.position - b.position)
      
      // If the same key is selected twice, use only that key
      if (note1.name === note2.name) {
        setGeneratedMelody(Array(numberOfNotes).fill(note1))
        return
      }
      
      // Otherwise, use the range
      const startPos = note1.position
      const endPos = note2.position
      
      const notesInRange = notes.filter(note => 
        note.position >= startPos && note.position <= endPos
      )

      const melody = Array(numberOfNotes).fill(null).map(() => 
        notesInRange[Math.floor(Math.random() * notesInRange.length)]
      )

      setGeneratedMelody(melody)
    } else if (instrument === 'guitar') {
      // Guitar logic - use ALL selected notes directly
      if (selectedNotes.length === 0) return

      const melody = Array(numberOfNotes).fill(null).map(() => 
        selectedNotes[Math.floor(Math.random() * selectedNotes.length)]
      )

      setGeneratedMelody(melody)
    }
  }

  // Guitar-specific method to set all selected notes at once
  const setGuitarNotes = (notes: Note[]) => {
    setSelectedNotes(notes)
    setGeneratedMelody([])
  }

  const isSelected = (note: Note) => selectedNotes.some(n => n.name === note.name)
  const isInMelody = (note: Note, showNotes: boolean) => 
    showNotes && generatedMelody.some(n => n.name === note.name)

  const clearSelection = () => {
    setSelectedNotes([])
    setGeneratedMelody([])
    setClearTrigger(prev => prev + 1)
  }

  return {
    selectedNotes,
    generatedMelody,
    selectNote,
    generateMelody,
    setGuitarNotes,
    isSelected,
    isInMelody,
    clearSelection,
    clearTrigger
  }
}
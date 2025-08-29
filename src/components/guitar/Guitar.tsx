import React, { useState, useEffect } from 'react'
import '../../styles/Guitar.css'
import { guitarNotes } from '../../utils/guitarNotes'
import { getAvailableGuitarNotes } from '../../utils/guitarNotes'
import type { Note } from '../../utils/notes'

interface GuitarProps {
  setGuitarNotes: (notes: Note[]) => void
  isSelected: (note: Note) => boolean
  isInMelody: (note: Note, showNotes: boolean) => boolean
  showNotes: boolean
  onNoteClick?: (note: Note) => void
}

const Guitar: React.FC<GuitarProps> = ({ setGuitarNotes, isSelected, isInMelody, showNotes, onNoteClick }) => {
  const [stringCheckboxes, setStringCheckboxes] = useState<boolean[]>(new Array(6).fill(false))
  const [fretCheckboxes, setFretCheckboxes] = useState<boolean[]>(new Array(12).fill(false))
  const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set())

  // Check if at least one string is selected
  const hasStringSelected = stringCheckboxes.some(checked => checked)

  const handleStringCheckboxChange = (index: number) => {
    const newCheckboxes = [...stringCheckboxes]
    const wasChecked = newCheckboxes[index]
    newCheckboxes[index] = !newCheckboxes[index]
    setStringCheckboxes(newCheckboxes)
    
    // If unchecking, remove all individual selections for this string
    if (wasChecked) {
      const newSelectedNotes = new Set(selectedNotes)
      for (let fretIndex = 0; fretIndex < 12; fretIndex++) {
        const noteKey = `${index}-${fretIndex}`
        newSelectedNotes.delete(noteKey)
        // Also remove any negative selections for this string
        newSelectedNotes.delete(`-${noteKey}`)
      }
      setSelectedNotes(newSelectedNotes)
    }
  }

  const handleFretCheckboxChange = (index: number) => {
    const newCheckboxes = [...fretCheckboxes]
    const wasChecked = newCheckboxes[index]
    newCheckboxes[index] = !newCheckboxes[index]
    setFretCheckboxes(newCheckboxes)
    
    // If unchecking, remove all individual selections for this fret
    if (wasChecked) {
      const newSelectedNotes = new Set(selectedNotes)
      for (let stringIndex = 0; stringIndex < 6; stringIndex++) {
        const noteKey = `${stringIndex}-${index}`
        newSelectedNotes.delete(noteKey)
        // Also remove any negative selections for this fret
        newSelectedNotes.delete(`-${noteKey}`)
      }
      setSelectedNotes(newSelectedNotes)
    }
  }

  // Get note name for a specific string and fret
  const getNoteForStringAndFret = (stringIndex: number, fretIndex: number): string => {
    // Map visual string index to technical string number (E B G D A E -> 1 2 3 4 5 6)
    const stringMapping = [1, 2, 3, 4, 5, 6] // High E to Low E in guitarNotes
    const guitarString = stringMapping[5 - stringIndex] // Reverse the order since guitarNotes goes low to high
    const fret = fretIndex + 1 // Convert to 1-indexed for fret (0 = open, but we're showing frets 1-12)
    
    const note = guitarNotes.find(note => note.string === guitarString && note.fret === fret)
    return note ? note.name : ''
  }

  // Handle clicking on individual fret positions
  const handleNoteClick = async (stringIndex: number, fretIndex: number) => {
    const noteKey = `${stringIndex}-${fretIndex}`
    const newSelectedNotes = new Set(selectedNotes)
    
    // Play the note sound if onNoteClick is provided
    if (onNoteClick) {
      const noteName = getNoteForStringAndFret(stringIndex, fretIndex)
      if (noteName) {
        // Find the corresponding guitar note for full Note object
        const stringMapping = [6, 5, 4, 3, 2, 1] // Map visual index to guitar string number
        const guitarString = stringMapping[stringIndex]
        const guitarNote = guitarNotes.find(note => 
          note.string === guitarString && note.fret === fretIndex + 1
        )
        
        if (guitarNote) {
          const noteObj: Note = {
            name: noteName,
            frequency: guitarNote.frequency,
            isBlack: noteName.includes('#'),
            position: stringIndex * 100 + fretIndex
          }
          await onNoteClick(noteObj)
        }
      }
    }
    
    // Check current state without calling isNoteSelected to avoid circular dependency
    const isIndividuallySelected = selectedNotes.has(noteKey)
    const isNegativelySelected = selectedNotes.has(`-${noteKey}`)
    const isStringSelected = stringCheckboxes[stringIndex]
    const isFretSelected = fretCheckboxes[fretIndex]
    const isCheckboxSelected = isStringSelected || isFretSelected
    const currentlyVisible = (isIndividuallySelected || isCheckboxSelected) && !isNegativelySelected
    
    if (currentlyVisible) {
      // Note is currently showing - we need to hide it
      if (isIndividuallySelected) {
        // It's individually selected, just remove it
        newSelectedNotes.delete(noteKey)
      } else {
        // It's selected via checkboxes - we need to:
        // 1. Convert checkbox selections to individual selections 
        // 2. Remove the clicked note
        // 3. Uncheck the relevant checkboxes
        
        const newStringCheckboxes = [...stringCheckboxes]
        const newFretCheckboxes = [...fretCheckboxes]
        
        // Convert string checkbox selections to individual selections
        if (isStringSelected) {
          newStringCheckboxes[stringIndex] = false
          // Add all other notes on this string as individual selections (except the clicked one)
          for (let fret = 0; fret < 12; fret++) {
            if (fret !== fretIndex) {
              newSelectedNotes.add(`${stringIndex}-${fret}`)
            }
          }
        }
        
        // Convert fret checkbox selections to individual selections  
        if (isFretSelected) {
          newFretCheckboxes[fretIndex] = false
          // Add all other notes on this fret as individual selections (except the clicked one)
          for (let str = 0; str < 6; str++) {
            if (str !== stringIndex) {
              newSelectedNotes.add(`${str}-${fretIndex}`)
            }
          }
        }
        
        setStringCheckboxes(newStringCheckboxes)
        setFretCheckboxes(newFretCheckboxes)
      }
    } else {
      // Note is not showing - we need to show it
      if (isNegativelySelected) {
        // It was negatively selected, remove the negative
        newSelectedNotes.delete(`-${noteKey}`)
      } else {
        // Just add positive selection
        newSelectedNotes.add(noteKey)
      }
    }
    
    setSelectedNotes(newSelectedNotes)
  }

  // Check if a specific note is selected
  const isNoteSelected = (stringIndex: number, fretIndex: number): boolean => {
    const noteKey = `${stringIndex}-${fretIndex}`
    const negativeKey = `-${noteKey}`
    
    // If explicitly deselected, always return false
    if (selectedNotes.has(negativeKey)) {
      return false
    }
    
    // Check if individually selected
    if (selectedNotes.has(noteKey)) {
      return true
    }
    
    // Check if selected via string checkbox (all notes on this string)
    if (stringCheckboxes[stringIndex]) {
      return true
    }
    
    // Check if selected via fret checkbox (this fret on all strings)
    if (fretCheckboxes[fretIndex]) {
      return true
    }
    
    return false
  }

  // Convert guitar notes to the Note format expected by the melody system
  const convertToMelodyNotes = (): Note[] => {
    const melodyNotes: Note[] = []
    
    // Check all possible note positions
    for (let stringIndex = 0; stringIndex < 6; stringIndex++) {
      for (let fretIndex = 0; fretIndex < 12; fretIndex++) {
        if (isNoteSelected(stringIndex, fretIndex)) {
          const noteName = getNoteForStringAndFret(stringIndex, fretIndex)
          if (noteName) {
            // Find the corresponding guitar note for frequency
            const stringMapping = [6, 5, 4, 3, 2, 1] // Map visual index to guitar string number
            const guitarString = stringMapping[stringIndex]
            const guitarNote = guitarNotes.find(note => 
              note.string === guitarString && note.fret === fretIndex + 1
            )
            
            // Convert to melody system format
            melodyNotes.push({
              name: noteName,
              frequency: guitarNote ? guitarNote.frequency : 0,
              isBlack: noteName.includes('#'),
              position: stringIndex * 100 + fretIndex // Unique position for guitar notes
            })
          }
        }
      }
    }
    
    return melodyNotes
  }

  // Update melody system whenever selections change
  useEffect(() => {
    const melodyNotes = convertToMelodyNotes()
    setGuitarNotes(melodyNotes)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stringCheckboxes, fretCheckboxes, selectedNotes])

  return (
    <div className="guitar-container">
      <div className="fretboard">
        {/* Frets */}
        {[...Array(12)].map((_, index) => (
          <div key={index} className="fret" style={{ left: `${(index + 1) * 60}px` }}>
            <div className="fret-wire"></div>
            {/* Fret markers on 3rd, 5th, 7th, 9th frets */}
            {[3, 5, 7, 9].includes(index + 1) && (
              <div className="fret-marker"></div>
            )}
            {/* Double marker on 12th fret */}
            {index + 1 === 12 && (
              <>
                <div className="fret-marker double-marker-1"></div>
                <div className="fret-marker double-marker-2"></div>
              </>
            )}
            {/* Checkbox beneath each fret */}
            <div className="fret-checkbox-container">
              <input
                type="checkbox"
                id={`fret-${index}`}
                className="fret-checkbox"
                checked={fretCheckboxes[index]}
                onChange={() => handleFretCheckboxChange(index)}
              />
              <label htmlFor={`fret-${index}`} className="fret-checkbox-label">{index + 1}</label>
            </div>
          </div>
        ))}
        
        {/* Strings */}
        {[...Array(6)].map((_, index) => (
          <div 
            key={index} 
            className="guitar-string" 
            style={{ top: `${15 + index * 28}px` }}
          ></div>
        ))}

        {/* Clickable fret positions */}
        {[...Array(6)].map((_, stringIndex) => (
          [...Array(12)].map((_, fretIndex) => (
            <div
              key={`fret-position-${stringIndex}-${fretIndex}`}
              className="fret-position"
              style={{
                left: `${fretIndex * 60 + 3}px`, // Start just after the previous fret line
                top: `${15 + stringIndex * 28 - 12}px`, // Expand height above and below string
                width: `${60 - 6}px`, // Full width between fret lines minus small margins
                height: `24px`, // Height of string spacing minus 4px to prevent overlap
              }}
              onClick={() => handleNoteClick(stringIndex, fretIndex)}
            />
          ))
        ))}

        {/* String checkboxes beside each string */}
        {[...Array(6)].map((_, index) => (
          <div 
            key={`string-checkbox-${index}`}
            className="string-checkbox-container"
            style={{ top: `${15 + index * 28}px` }}
          >
            <input
              type="checkbox"
              id={`string-${index}`}
              className="string-checkbox"
              checked={stringCheckboxes[index]}
              onChange={() => handleStringCheckboxChange(index)}
            />
            <label htmlFor={`string-${index}`} className="string-checkbox-label">{['E', 'B', 'G', 'D', 'A', 'E'][index]}</label>
          </div>
        ))}

        {/* Note visualization circles */}
        {[...Array(6)].map((_, stringIndex) =>
          [...Array(12)].map((_, fretIndex) => {
            if (!isNoteSelected(stringIndex, fretIndex)) return null
            
            const noteName = getNoteForStringAndFret(stringIndex, fretIndex)
            const noteObj: Note = {
              name: noteName,
              frequency: 0,
              isBlack: noteName.includes('#'),
              position: stringIndex * 100 + fretIndex
            }
            
            const isInGeneratedMelody = isInMelody(noteObj, showNotes)
            
            return (
              <div
                key={`note-${stringIndex}-${fretIndex}`}
                className={`note-circle ${isInGeneratedMelody ? 'melody-note' : ''}`}
                style={{
                  left: `${(fretIndex + 1) * 60 - 38}px`, // Align with fret checkboxes below
                  top: `${15 + stringIndex * 28 - 10}px`, // Center on string
                }}
              >
                <span className="note-name">
                  {noteName}
                </span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default Guitar
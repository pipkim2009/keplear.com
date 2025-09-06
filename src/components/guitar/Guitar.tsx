import React, { useState, useEffect, useCallback, useRef } from 'react'
import '../../styles/Guitar.css'
import { guitarNotes } from '../../utils/guitarNotes'
import { applyScaleToGuitar, isNoteInScale, type GuitarScale } from '../../utils/guitarScales'
import type { Note } from '../../utils/notes'

interface GuitarProps {
  setGuitarNotes: (notes: Note[]) => void
  isInMelody: (note: Note, showNotes: boolean) => boolean
  showNotes: boolean
  onNoteClick?: (note: Note) => void
  clearTrigger?: number
  onScaleHandlersReady?: (handlers: {
    handleScaleSelect: (rootNote: string, scale: GuitarScale, octaveRange?: { min: number; max: number }) => void;
    handleClearScale: () => void;
  }) => void
}

const Guitar: React.FC<GuitarProps> = ({ setGuitarNotes, isInMelody, showNotes, onNoteClick, clearTrigger, onScaleHandlersReady }) => {
  const [stringCheckboxes, setStringCheckboxes] = useState<boolean[]>(new Array(6).fill(false))
  const [fretCheckboxes, setFretCheckboxes] = useState<boolean[]>(new Array(13).fill(false))
  const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set())
  const [currentScale, setCurrentScale] = useState<{ root: string; scale: GuitarScale } | null>(null)

  const handleStringCheckboxChange = (index: number) => {
    const newCheckboxes = [...stringCheckboxes]
    const wasChecked = newCheckboxes[index]
    newCheckboxes[index] = !newCheckboxes[index]
    setStringCheckboxes(newCheckboxes)
    
    // If unchecking, remove all individual selections for this string
    if (wasChecked) {
      const newSelectedNotes = new Set(selectedNotes)
      
      // Remove open string selection
      const openKey = `${index}-open`
      newSelectedNotes.delete(openKey)
      newSelectedNotes.delete(`-${openKey}`)
      
      // Remove fretted note selections
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
        if (index === 0) {
          // Open fret - remove open string selections
          const noteKey = `${stringIndex}-open`
          newSelectedNotes.delete(noteKey)
          newSelectedNotes.delete(`-${noteKey}`)
        } else {
          // Regular fret
          const noteKey = `${stringIndex}-${index - 1}` // Adjust for open fret offset
          newSelectedNotes.delete(noteKey)
          newSelectedNotes.delete(`-${noteKey}`)
        }
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

  // Handle clicking on open strings (fret 0)
  const handleOpenStringClick = async (stringIndex: number) => {
    const noteKey = `${stringIndex}-open`
    const newSelectedNotes = new Set(selectedNotes)
    
    // Play the note sound if onNoteClick is provided
    if (onNoteClick) {
      // Get open string note (fret 0)
      const stringMapping = [6, 5, 4, 3, 2, 1] // Map visual index to guitar string number
      const guitarString = stringMapping[stringIndex]
      const openNote = guitarNotes.find(note => note.string === guitarString && note.fret === 0)
      
      if (openNote) {
        const noteObj: Note = {
          name: openNote.name,
          frequency: openNote.frequency,
          isBlack: openNote.name.includes('#'),
          position: stringIndex * 100 - 1 // Unique position for open strings
        }
        await onNoteClick(noteObj)
      }
    }
    
    // Check current state
    const isIndividuallySelected = selectedNotes.has(noteKey)
    const isNegativelySelected = selectedNotes.has(`-${noteKey}`)
    const isStringSelected = stringCheckboxes[stringIndex]
    const isOpenFretSelected = fretCheckboxes[0]
    const isCheckboxSelected = isStringSelected || isOpenFretSelected
    const currentlyVisible = (isIndividuallySelected || isCheckboxSelected) && !isNegativelySelected
    
    if (currentlyVisible) {
      // Note is currently showing - we need to hide it
      if (isIndividuallySelected && !isCheckboxSelected) {
        // It's ONLY individually selected, just remove it
        newSelectedNotes.delete(noteKey)
      } else {
        // It's selected via checkboxes (or both individual + checkbox) - convert to individual selections
        const newStringCheckboxes = [...stringCheckboxes]
        const newFretCheckboxes = [...fretCheckboxes]
        
        // Convert string checkbox selections to individual selections
        if (isStringSelected) {
          newStringCheckboxes[stringIndex] = false
          // Add all other notes on this string as individual selections (except the clicked one)
          // Don't add open string since we're clicking on it to deselect
          for (let fret = 0; fret < 12; fret++) {
            newSelectedNotes.add(`${stringIndex}-${fret}`)
          }
          // Explicitly ensure the clicked note is not individually selected
          newSelectedNotes.delete(noteKey)
        }
        
        // Convert open fret checkbox selections to individual selections  
        if (isOpenFretSelected) {
          newFretCheckboxes[0] = false
          // Add all other open strings as individual selections (except the clicked one)
          for (let str = 0; str < 6; str++) {
            if (str !== stringIndex) {
              newSelectedNotes.add(`${str}-open`)
            }
          }
          // Explicitly ensure the clicked note is not individually selected
          newSelectedNotes.delete(noteKey)
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
    const isFretSelected = fretCheckboxes[fretIndex + 1] // Adjust for open fret offset
    const isCheckboxSelected = isStringSelected || isFretSelected
    const currentlyVisible = (isIndividuallySelected || isCheckboxSelected) && !isNegativelySelected
    
    if (currentlyVisible) {
      // Note is currently showing - we need to hide it
      if (isIndividuallySelected && !isCheckboxSelected) {
        // It's ONLY individually selected, just remove it
        newSelectedNotes.delete(noteKey)
      } else {
        // It's selected via checkboxes (or both individual + checkbox) - we need to:
        // 1. Convert checkbox selections to individual selections 
        // 2. Remove the clicked note
        // 3. Uncheck the relevant checkboxes
        
        const newStringCheckboxes = [...stringCheckboxes]
        const newFretCheckboxes = [...fretCheckboxes]
        
        // Convert string checkbox selections to individual selections
        if (isStringSelected) {
          newStringCheckboxes[stringIndex] = false
          // Add all other notes on this string as individual selections (except the clicked one)
          newSelectedNotes.add(`${stringIndex}-open`) // Add open string (will be removed below if it's the clicked note)
          for (let fret = 0; fret < 12; fret++) {
            if (fret !== fretIndex) {
              newSelectedNotes.add(`${stringIndex}-${fret}`)
            }
          }
          // Explicitly ensure the clicked note is not individually selected
          newSelectedNotes.delete(noteKey)
        }
        
        // Convert fret checkbox selections to individual selections  
        if (isFretSelected) {
          newFretCheckboxes[fretIndex + 1] = false // Adjust for open fret offset
          // Add all other notes on this fret as individual selections (except the clicked one)
          for (let str = 0; str < 6; str++) {
            if (str !== stringIndex) {
              newSelectedNotes.add(`${str}-${fretIndex}`)
            }
          }
          // Explicitly ensure the clicked note is not individually selected
          newSelectedNotes.delete(noteKey)
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
    if (fretCheckboxes[fretIndex + 1]) { // Adjust for open fret offset
      return true
    }
    
    return false
  }

  // Check if an open string is selected
  const isOpenStringSelected = (stringIndex: number): boolean => {
    const openKey = `${stringIndex}-open`
    return selectedNotes.has(openKey) || stringCheckboxes[stringIndex] || fretCheckboxes[0] // Include open fret checkbox
  }

  // Convert guitar notes to the Note format expected by the melody system
  const convertToMelodyNotes = (): Note[] => {
    const melodyNotes: Note[] = []
    
    // Check open strings first
    for (let stringIndex = 0; stringIndex < 6; stringIndex++) {
      if (isOpenStringSelected(stringIndex)) {
        const stringMapping = [6, 5, 4, 3, 2, 1] // Map visual index to guitar string number
        const guitarString = stringMapping[stringIndex]
        const openNote = guitarNotes.find(note => note.string === guitarString && note.fret === 0)
        
        if (openNote) {
          melodyNotes.push({
            name: openNote.name,
            frequency: openNote.frequency,
            isBlack: openNote.name.includes('#'),
            position: stringIndex * 100 - 1 // Position for open strings
          })
        }
      }
    }
    
    // Check all fretted note positions
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


  // Auto-apply checkboxes when all individual notes are selected
  // DISABLED: This was causing infinite render loops and flickering with the scale system

  // Update melody system whenever selections change
  useEffect(() => {
    const melodyNotes = convertToMelodyNotes()
    setGuitarNotes(melodyNotes)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stringCheckboxes, fretCheckboxes, selectedNotes])

  // Handle scale selection
  const handleScaleSelect = useCallback((rootNote: string, scale: GuitarScale, octaveRange?: { min: number; max: number }) => {
    // Apply scale to guitar with octave filtering
    const scaleSelections = applyScaleToGuitar(rootNote, scale, guitarNotes, octaveRange)
    const newSelectedNotes = new Set<string>()
    
    // Add scale notes to selection
    scaleSelections.forEach(({ stringIndex, fretIndex }) => {
      if (fretIndex === 0) {
        newSelectedNotes.add(`${stringIndex}-open`)
      } else {
        newSelectedNotes.add(`${stringIndex}-${fretIndex - 1}`) // Convert to 0-indexed fret for internal use
      }
    })
    
    // Update all state at once to minimize re-renders
    setCurrentScale({ root: rootNote, scale })
    setStringCheckboxes(new Array(6).fill(false))
    setFretCheckboxes(new Array(13).fill(false))
    setSelectedNotes(newSelectedNotes)
  }, [])

  // Handle clearing scale
  const handleClearScale = useCallback(() => {
    setCurrentScale(null)
    setStringCheckboxes(new Array(6).fill(false))
    setFretCheckboxes(new Array(13).fill(false))
    setSelectedNotes(new Set())
  }, [])

  // Check if a note is part of the current scale
  const isNoteInCurrentScale = (stringIndex: number, fretIndex: number): boolean => {
    if (!currentScale) return false
    
    const noteName = getNoteForStringAndFret(stringIndex, fretIndex)
    return isNoteInScale(noteName, currentScale.root, currentScale.scale)
  }

  // Check if an open string is part of the current scale
  const isOpenStringInCurrentScale = (stringIndex: number): boolean => {
    if (!currentScale) return false
    
    const stringMapping = [6, 5, 4, 3, 2, 1]
    const guitarString = stringMapping[stringIndex]
    const openNote = guitarNotes.find(note => note.string === guitarString && note.fret === 0)
    
    if (!openNote) return false
    
    return isNoteInScale(openNote.name, currentScale.root, currentScale.scale)
  }

  // Check if a note is the root note of the current scale
  const isRootNote = (noteName: string): boolean => {
    if (!currentScale) return false
    const noteNameWithoutOctave = noteName.replace(/\d+$/, '')
    return noteNameWithoutOctave === currentScale.root
  }

  // Provide scale handlers to parent component
  useEffect(() => {
    if (onScaleHandlersReady) {
      onScaleHandlersReady({
        handleScaleSelect,
        handleClearScale
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleScaleSelect, handleClearScale])

  // Clear all selections when clearTrigger changes
  useEffect(() => {
    if (clearTrigger !== undefined) {
      setStringCheckboxes(new Array(6).fill(false))
      setFretCheckboxes(new Array(13).fill(false))
      setSelectedNotes(new Set())
      setCurrentScale(null)
    }
  }, [clearTrigger])

  return (
    <div className="guitar-container">
      <div className="fretboard">
        {/* Open fret checkbox */}
        <div className="fret-checkbox-container" style={{ left: '5.5px', bottom: '-45px' }}>
          <input
            type="checkbox"
            id="fret-open"
            className="fret-checkbox"
            checked={fretCheckboxes[0]}
            onChange={() => handleFretCheckboxChange(0)}
          />
          <label htmlFor="fret-open" className="fret-checkbox-label">Open</label>
        </div>

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
                id={`fret-${index + 1}`}
                className="fret-checkbox"
                checked={fretCheckboxes[index + 1]}
                onChange={() => handleFretCheckboxChange(index + 1)}
              />
              <label htmlFor={`fret-${index + 1}`} className="fret-checkbox-label">{index + 1}</label>
            </div>
          </div>
        ))}
        
        {/* Strings */}
        {[...Array(6)].map((_, index) => {
          const stringHeights = [1, 1.5, 2, 2.5, 3, 3.5] // Heights for strings 1-6
          return (
            <div 
              key={index} 
              className="guitar-string" 
              style={{ 
                top: `${15 + index * 28}px`,
                height: `${stringHeights[index]}px`
              }}
            ></div>
          )
        })}

        {/* Clickable open string positions (fret 0) */}
        {[...Array(6)].map((_, stringIndex) => (
          <div
            key={`open-string-${stringIndex}`}
            className="fret-position open-string-position"
            style={{
              left: `0px`, // At the very left edge
              top: `${15 + stringIndex * 28 - 12}px`,
              width: `15px`, // 25% of first fret zone (60px * 0.25)
              height: `24px`,
            }}
            onClick={() => handleOpenStringClick(stringIndex)}
          />
        ))}

        {/* Clickable fret positions */}
        {[...Array(6)].map((_, stringIndex) => (
          [...Array(12)].map((_, fretIndex) => (
            <div
              key={`fret-position-${stringIndex}-${fretIndex}`}
              className="fret-position"
              style={{
                left: `${fretIndex === 0 ? 15 + 3 : fretIndex * 60 + 3}px`, // Start after open string area for first fret
                top: `${15 + stringIndex * 28 - 12}px`, // Expand height above and below string
                width: `${fretIndex === 0 ? 60 - 18 : 60 - 6}px`, // 75% width for first fret (42px)
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
            <label htmlFor={`string-${index}`} className="string-checkbox-label">{index + 1}</label>
          </div>
        ))}

        {/* Open string note visualization circles */}
        {[...Array(6)].map((_, stringIndex) => {
          if (!isOpenStringSelected(stringIndex)) return null
          
          const stringMapping = [6, 5, 4, 3, 2, 1]
          const guitarString = stringMapping[stringIndex]
          const openNote = guitarNotes.find(note => note.string === guitarString && note.fret === 0)
          
          if (!openNote) return null
          
          const noteObj: Note = {
            name: openNote.name,
            frequency: openNote.frequency,
            isBlack: openNote.name.includes('#'),
            position: stringIndex * 100 - 1
          }
          
          const isInGeneratedMelody = isInMelody(noteObj, showNotes)
          const isInScale = isOpenStringInCurrentScale(stringIndex)
          const isRoot = isRootNote(openNote.name)
          
          let noteClass = 'note-circle'
          if (isInGeneratedMelody) {
            noteClass += ' melody-note'
          } else if (isRoot && isInScale) {
            noteClass += ' scale-root-note'
          } else if (isInScale) {
            noteClass += ' scale-note'
          }
          
          return (
            <div
              key={`open-note-${stringIndex}`}
              className={noteClass}
              style={{
                left: `-2.5px`, // Center of the open string click field (15px width / 2 - 10px for note circle centering)
                top: `${15 + stringIndex * 28 - 10}px`, // Center on string
              }}
            >
              <span className="note-name">
                {openNote.name}
              </span>
            </div>
          )
        })}

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
            const isInScale = isNoteInCurrentScale(stringIndex, fretIndex)
            const isRoot = isRootNote(noteName)
            
            let noteClass = 'note-circle'
            if (isInGeneratedMelody) {
              noteClass += ' melody-note'
            } else if (isRoot && isInScale) {
              noteClass += ' scale-root-note'
            } else if (isInScale) {
              noteClass += ' scale-note'
            }
            
            return (
              <div
                key={`note-${stringIndex}-${fretIndex}`}
                className={noteClass}
                style={{
                  left: `${fretIndex === 0 ? 30 : (fretIndex + 1) * 60 - 38}px`, // Center first fret in its area, others align with checkboxes
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
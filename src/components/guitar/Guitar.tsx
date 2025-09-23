import React, { useState, useEffect, useCallback, useRef } from 'react'
import '../../styles/Guitar.css'
import { guitarNotes } from '../../utils/guitarNotes'
import { applyScaleToGuitar, applyScaleBoxToGuitar, isNoteInScale, GUITAR_SCALES, type GuitarScale, type ScaleBox } from '../../utils/guitarScales'
import { applyChordToGuitar, applyChordShapeToGuitar, isNoteInChord, GUITAR_CHORDS, type GuitarChord, type ChordShape } from '../../utils/guitarChords'
import type { Note } from '../../utils/notes'

interface GuitarProps {
  setGuitarNotes: (notes: Note[]) => void
  isInMelody: (note: Note, showNotes: boolean) => boolean
  showNotes: boolean
  onNoteClick?: (note: Note) => void
  clearTrigger?: number
  onScaleHandlersReady?: (handlers: {
    handleScaleSelect: (rootNote: string, scale: GuitarScale) => void;
    handleScaleBoxSelect: (scaleBox: ScaleBox) => void;
    handleClearScale: () => void;
  }) => void
  onChordHandlersReady?: (handlers: {
    handleChordSelect: (rootNote: string, chord: GuitarChord) => void;
    handleChordShapeSelect: (chordShape: ChordShape) => void;
    handleClearChord: () => void;
    handleRemoveChordNotes: (noteKeys: string[]) => void;
  }) => void
}

const Guitar: React.FC<GuitarProps> = ({ setGuitarNotes, isInMelody, showNotes, onNoteClick, clearTrigger, onScaleHandlersReady, onChordHandlersReady }) => {
  const [stringCheckboxes, setStringCheckboxes] = useState<boolean[]>(new Array(6).fill(false))
  const [fretCheckboxes, setFretCheckboxes] = useState<boolean[]>(new Array(25).fill(false))
  const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set())
  const [currentScale, setCurrentScale] = useState<{ root: string; scale: GuitarScale } | null>(null)
  const [scaleSelectedNotes, setScaleSelectedNotes] = useState<Set<string>>(new Set())
  const [currentChord, setCurrentChord] = useState<{ root: string; chord: GuitarChord } | null>(null)
  const [chordSelectedNotes, setChordSelectedNotes] = useState<Set<string>>(new Set())
  const [hoveredString, setHoveredString] = useState<number | null>(null)
  const [hoveredFret, setHoveredFret] = useState<number | null>(null)
  const [hoveredNote, setHoveredNote] = useState<{ string: number; fret: number } | null>(null)

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
      for (let fretIndex = 0; fretIndex < 24; fretIndex++) {
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
          for (let fret = 0; fret < 24; fret++) {
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
    // Clear scale tracking when making individual selections
    setScaleSelectedNotes(new Set())
    setCurrentScale(null)
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
          for (let fret = 0; fret < 24; fret++) {
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
    // Clear scale tracking when making individual selections
    setScaleSelectedNotes(new Set())
    setCurrentScale(null)
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
      for (let fretIndex = 0; fretIndex < 24; fretIndex++) {
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
  const handleScaleSelect = useCallback((rootNote: string, scale: GuitarScale) => {
    // Apply scale to guitar
    const scaleSelections = applyScaleToGuitar(rootNote, scale, guitarNotes)
    const newSelectedNotes = new Set<string>()
    const newScaleSelectedNotes = new Set<string>()
    
    // Add scale notes to selection
    scaleSelections.forEach(({ stringIndex, fretIndex }) => {
      const noteKey = fretIndex === 0 ? `${stringIndex}-open` : `${stringIndex}-${fretIndex - 1}`
      newSelectedNotes.add(noteKey)
      newScaleSelectedNotes.add(noteKey)
    })
    
    // Update all state at once to minimize re-renders
    setCurrentScale({ root: rootNote, scale })
    setStringCheckboxes(new Array(6).fill(false))
    setFretCheckboxes(new Array(25).fill(false))
    setSelectedNotes(newSelectedNotes)
    setScaleSelectedNotes(newScaleSelectedNotes)
  }, [])

  // Handle scale box selection
  const handleScaleBoxSelect = useCallback((scaleBox: ScaleBox) => {
    // Apply scale box to guitar
    const scaleSelections = applyScaleBoxToGuitar(scaleBox)
    const newSelectedNotes = new Set<string>()
    const newScaleSelectedNotes = new Set<string>()
    
    // Add scale notes to selection
    scaleSelections.forEach(({ stringIndex, fretIndex }) => {
      const noteKey = fretIndex === 0 ? `${stringIndex}-open` : `${stringIndex}-${fretIndex - 1}`
      newSelectedNotes.add(noteKey)
      newScaleSelectedNotes.add(noteKey)
    })
    
    // For box selection, we need to derive the scale info from the box
    // We'll use the first position's root information
    const rootPosition = scaleBox.positions.find(pos => pos.isRoot)
    if (rootPosition) {
      const rootNote = rootPosition.note.replace(/\d+$/, '') // Remove octave
      // We need to find the scale that matches this box - for now, use the current scale
      // In a more complete implementation, you'd store scale info with the box
      setCurrentScale({ root: rootNote, scale: currentScale?.scale || GUITAR_SCALES[0] })
    }
    
    // Update all state at once to minimize re-renders
    setStringCheckboxes(new Array(6).fill(false))
    setFretCheckboxes(new Array(25).fill(false))
    setSelectedNotes(newSelectedNotes)
    setScaleSelectedNotes(newScaleSelectedNotes)
  }, [currentScale])

  // Handle clearing scale
  const handleClearScale = useCallback(() => {
    setCurrentScale(null)
    setStringCheckboxes(new Array(6).fill(false))
    setFretCheckboxes(new Array(25).fill(false))
    setSelectedNotes(new Set())
    setScaleSelectedNotes(new Set())
    // Clear chord state when clearing scale
    setCurrentChord(null)
    setChordSelectedNotes(new Set())
  }, [])

  // Handle chord selection
  const handleChordSelect = useCallback((rootNote: string, chord: GuitarChord) => {
    // Apply chord to guitar
    const chordSelections = applyChordToGuitar(rootNote, chord, guitarNotes)
    const newSelectedNotes = new Set(selectedNotes) // Start with existing selections
    const newChordSelectedNotes = new Set(chordSelectedNotes) // Start with existing chord selections

    // Add chord notes to existing selection
    chordSelections.forEach(({ stringIndex, fretIndex }) => {
      const noteKey = fretIndex === 0 ? `${stringIndex}-open` : `${stringIndex}-${fretIndex - 1}`
      newSelectedNotes.add(noteKey)
      newChordSelectedNotes.add(noteKey)
    })

    // Update state - keep checkboxes and don't clear existing selections
    setCurrentChord({ root: rootNote, chord })
    setSelectedNotes(newSelectedNotes)
    setChordSelectedNotes(newChordSelectedNotes)
    // Clear scale state when chord is applied
    setCurrentScale(null)
    setScaleSelectedNotes(new Set())
  }, [selectedNotes, chordSelectedNotes])

  // Handle chord shape selection
  const handleChordShapeSelect = useCallback((chordShape: ChordShape) => {
    // Apply chord shape to guitar
    const chordSelections = applyChordShapeToGuitar(chordShape)
    const newSelectedNotes = new Set(selectedNotes) // Start with existing selections
    const newChordSelectedNotes = new Set(chordSelectedNotes) // Start with existing chord selections

    // Add chord notes to existing selection
    chordSelections.forEach(({ stringIndex, fretIndex }) => {
      const noteKey = fretIndex === 0 ? `${stringIndex}-open` : `${stringIndex}-${fretIndex - 1}`
      newSelectedNotes.add(noteKey)
      newChordSelectedNotes.add(noteKey)
    })

    // Update state - keep existing selections
    setSelectedNotes(newSelectedNotes)
    setChordSelectedNotes(newChordSelectedNotes)
    // Clear scale state when chord shape is applied
    setCurrentScale(null)
    setScaleSelectedNotes(new Set())
  }, [selectedNotes, chordSelectedNotes])

  // Handle clearing chord
  const handleClearChord = useCallback(() => {
    setCurrentChord(null)
    setStringCheckboxes(new Array(6).fill(false))
    setFretCheckboxes(new Array(25).fill(false))
    setSelectedNotes(new Set())
    setChordSelectedNotes(new Set())
  }, [])

  // Handle removing specific chord notes
  const handleRemoveChordNotes = useCallback((noteKeys: string[]) => {
    setSelectedNotes(prev => {
      const newSet = new Set(prev)
      noteKeys.forEach(key => newSet.delete(key))
      return newSet
    })
    setChordSelectedNotes(prev => {
      const newSet = new Set(prev)
      noteKeys.forEach(key => newSet.delete(key))
      return newSet
    })
  }, [])

  // Check if a note was selected as part of the current scale application
  const isNoteInCurrentScale = (stringIndex: number, fretIndex: number): boolean => {
    const noteKey = `${stringIndex}-${fretIndex}`
    return scaleSelectedNotes.has(noteKey)
  }

  // Check if an open string was selected as part of the current scale application
  const isOpenStringInCurrentScale = (stringIndex: number): boolean => {
    const noteKey = `${stringIndex}-open`
    return scaleSelectedNotes.has(noteKey)
  }

  // Check if a note is the root note of the current scale or chord
  const isRootNote = (noteName: string): boolean => {
    if (currentScale) {
      const noteNameWithoutOctave = noteName.replace(/\d+$/, '')
      return noteNameWithoutOctave === currentScale.root
    }
    if (currentChord) {
      const noteNameWithoutOctave = noteName.replace(/\d+$/, '')
      return noteNameWithoutOctave === currentChord.root
    }
    return false
  }

  // Check if a note was selected as part of the current chord application
  const isNoteInCurrentChord = (stringIndex: number, fretIndex: number): boolean => {
    const noteKey = `${stringIndex}-${fretIndex}`
    return chordSelectedNotes.has(noteKey)
  }

  // Check if an open string was selected as part of the current chord application
  const isOpenStringInCurrentChord = (stringIndex: number): boolean => {
    const noteKey = `${stringIndex}-open`
    return chordSelectedNotes.has(noteKey)
  }

  // Check if a note should show preview on string hover
  const shouldShowStringPreview = (stringIndex: number): boolean => {
    return hoveredString === stringIndex && !stringCheckboxes[stringIndex]
  }

  // Check if a note should show preview on fret hover
  const shouldShowFretPreview = (fretIndex: number): boolean => {
    return hoveredFret === fretIndex && !fretCheckboxes[fretIndex]
  }

  // Check if a specific note should show preview on individual note hover
  const shouldShowNotePreview = (stringIndex: number, fretIndex: number): boolean => {
    return hoveredNote?.string === stringIndex && hoveredNote?.fret === fretIndex
  }

  // Provide scale handlers to parent component
  useEffect(() => {
    if (onScaleHandlersReady) {
      onScaleHandlersReady({
        handleScaleSelect,
        handleScaleBoxSelect,
        handleClearScale
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleScaleSelect, handleScaleBoxSelect, handleClearScale])

  // Provide chord handlers to parent component
  useEffect(() => {
    if (onChordHandlersReady) {
      onChordHandlersReady({
        handleChordSelect,
        handleChordShapeSelect,
        handleClearChord,
        handleRemoveChordNotes
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleChordSelect, handleChordShapeSelect, handleClearChord, handleRemoveChordNotes])

  // Clear all selections when clearTrigger changes
  useEffect(() => {
    if (clearTrigger !== undefined) {
      setStringCheckboxes(new Array(6).fill(false))
      setFretCheckboxes(new Array(25).fill(false))
      setSelectedNotes(new Set())
      setScaleSelectedNotes(new Set())
      setCurrentScale(null)
      setChordSelectedNotes(new Set())
      setCurrentChord(null)
    }
  }, [clearTrigger])

  return (
    <div className="guitar-container">
      <div className="fretboard">
        {/* Open fret checkbox */}
        <div className="fret-checkbox-container" style={{ left: '4.5px', bottom: '-40px' }}>
          <input
            type="checkbox"
            id="fret-open"
            className="fret-checkbox"
            checked={fretCheckboxes[0] || false}
            onChange={() => handleFretCheckboxChange(0)}
            onMouseEnter={() => setHoveredFret(0)}
            onMouseLeave={() => setHoveredFret(null)}
          />
          <label htmlFor="fret-open" className="fret-checkbox-label">0</label>
        </div>

        {/* Frets */}
        {[...Array(24)].map((_, index) => (
          <div key={index} className="fret" style={{ left: `${(index + 1) * 60}px` }}>
            <div className="fret-wire"></div>
            {/* Fret markers on 3rd, 5th, 7th, 9th, 15th, 17th, 19th, 21st frets */}
            {[3, 5, 7, 9, 15, 17, 19, 21].includes(index + 1) && (
              <div className="fret-marker"></div>
            )}
            {/* Double markers on 12th and 24th frets */}
            {(index + 1 === 12 || index + 1 === 24) && (
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
                checked={fretCheckboxes[index + 1] || false}
                onChange={() => handleFretCheckboxChange(index + 1)}
                onMouseEnter={() => setHoveredFret(index + 1)}
                onMouseLeave={() => setHoveredFret(null)}
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
            onMouseEnter={() => setHoveredNote({ string: stringIndex, fret: 0 })}
            onMouseLeave={() => setHoveredNote(null)}
          />
        ))}

        {/* Clickable fret positions */}
        {[...Array(6)].map((_, stringIndex) => (
          [...Array(24)].map((_, fretIndex) => (
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
              onMouseEnter={() => setHoveredNote({ string: stringIndex, fret: fretIndex + 1 })}
              onMouseLeave={() => setHoveredNote(null)}
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
              checked={stringCheckboxes[index] || false}
              onChange={() => handleStringCheckboxChange(index)}
              onMouseEnter={() => setHoveredString(index)}
              onMouseLeave={() => setHoveredString(null)}
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
          const isInChord = isOpenStringInCurrentChord(stringIndex)
          const isRoot = isRootNote(openNote.name)

          let noteClass = 'note-circle'
          if (isInGeneratedMelody) {
            noteClass += ' melody-note'
          } else if (isRoot && (isInScale || isInChord)) {
            if (isInChord) {
              noteClass += ' chord-root-note'
            } else {
              noteClass += ' scale-root-note'
            }
          } else if (isInChord) {
            noteClass += ' chord-note'
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
          [...Array(24)].map((_, fretIndex) => {
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
            const isInChord = isNoteInCurrentChord(stringIndex, fretIndex)
            const isRoot = isRootNote(noteName)

            let noteClass = 'note-circle'
            if (isInGeneratedMelody) {
              noteClass += ' melody-note'
            } else if (isRoot && (isInScale || isInChord)) {
              if (isInChord) {
                noteClass += ' chord-root-note'
              } else {
                noteClass += ' scale-root-note'
              }
            } else if (isInChord) {
              noteClass += ' chord-note'
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

        {/* Preview note visualization circles for hover effects */}
        {[...Array(6)].map((_, stringIndex) =>
          [...Array(25)].map((_, fretIndex) => {
            const adjustedFretIndex = fretIndex === 0 ? 0 : fretIndex - 1 // Adjust for open string
            const shouldShowPreview = (
              shouldShowStringPreview(stringIndex) ||
              shouldShowFretPreview(fretIndex) ||
              shouldShowNotePreview(stringIndex, fretIndex)
            ) && !isNoteSelected(stringIndex, adjustedFretIndex)

            if (!shouldShowPreview) return null

            const noteName = fretIndex === 0
              ? getNoteForStringAndFret(stringIndex, -1) // Open string (1 semitone lower)
              : getNoteForStringAndFret(stringIndex, fretIndex - 1) // Regular fret

            return (
              <div
                key={`preview-note-${stringIndex}-${fretIndex}`}
                className="note-circle preview"
                style={{
                  left: fretIndex === 0
                    ? `-2.5px` // Open string position
                    : fretIndex === 1
                    ? `${fretIndex * 60 - 38 + 9}px` // First fret moved right by 9px
                    : `${fretIndex * 60 - 38}px`, // Regular fret position
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
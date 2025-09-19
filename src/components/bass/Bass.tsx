import React, { useState, useEffect, useCallback } from 'react'
import '../../styles/Bass.css'
import { bassNotes } from '../../utils/bassNotes'
import { applyScaleToBass, applyScaleBoxToBass, BASS_SCALES, type BassScale, type BassScaleBox } from '../../utils/bassScales'
import type { Note } from '../../utils/notes'

interface BassProps {
  setBassNotes: (notes: Note[]) => void
  isInMelody: (note: Note, showNotes: boolean) => boolean
  showNotes: boolean
  onNoteClick?: (note: Note) => void
  clearTrigger?: number
  onScaleHandlersReady?: (handlers: {
    handleScaleSelect: (rootNote: string, scale: BassScale) => void;
    handleScaleBoxSelect: (scaleBox: BassScaleBox) => void;
    handleClearScale: () => void;
  }) => void
}

const Bass: React.FC<BassProps> = ({ setBassNotes, isInMelody, showNotes, onNoteClick, clearTrigger, onScaleHandlersReady }) => {
  const [stringCheckboxes, setStringCheckboxes] = useState<boolean[]>(new Array(4).fill(false))
  const [fretCheckboxes, setFretCheckboxes] = useState<boolean[]>(new Array(25).fill(false))
  const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set())
  const [currentScale, setCurrentScale] = useState<{ root: string; scale: BassScale } | null>(null)
  const [scaleSelectedNotes, setScaleSelectedNotes] = useState<Set<string>>(new Set())
  const [hoveredString, setHoveredString] = useState<number | null>(null)
  const [hoveredFret, setHoveredFret] = useState<number | null>(null)

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
      for (let stringIndex = 0; stringIndex < 4; stringIndex++) {
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
    // Map visual string index to technical string number (G D A E -> 1 2 3 4)
    const stringMapping = [1, 2, 3, 4] // High G to Low E in bassNotes
    const bassString = stringMapping[stringIndex] // Direct mapping since bass is simpler
    const fret = fretIndex + 1 // Convert to 1-indexed for fret (0 = open, but we're showing frets 1-12)

    const note = bassNotes.find(note => note.string === bassString && note.fret === fret)
    return note ? note.name : ''
  }

  // Handle clicking on open strings (fret 0)
  const handleOpenStringClick = async (stringIndex: number) => {
    const noteKey = `${stringIndex}-open`
    const newSelectedNotes = new Set(selectedNotes)

    // Play the note sound if onNoteClick is provided
    if (onNoteClick) {
      // Get open string note (fret 0)
      const stringMapping = [1, 2, 3, 4] // Map visual index to bass string number
      const bassString = stringMapping[stringIndex]
      const openNote = bassNotes.find(note => note.string === bassString && note.fret === 0)

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
          for (let str = 0; str < 4; str++) {
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
        // Find the corresponding bass note for full Note object
        const stringMapping = [1, 2, 3, 4] // Map visual index to bass string number
        const bassString = stringMapping[stringIndex]
        const bassNote = bassNotes.find(note =>
          note.string === bassString && note.fret === fretIndex + 1
        )

        if (bassNote) {
          const noteObj: Note = {
            name: noteName,
            frequency: bassNote.frequency,
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
          for (let str = 0; str < 4; str++) {
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

  // Convert bass notes to the Note format expected by the melody system
  const convertToMelodyNotes = (): Note[] => {
    const melodyNotes: Note[] = []

    // Check open strings first
    for (let stringIndex = 0; stringIndex < 4; stringIndex++) {
      if (isOpenStringSelected(stringIndex)) {
        const stringMapping = [1, 2, 3, 4] // Map visual index to bass string number
        const bassString = stringMapping[stringIndex]
        const openNote = bassNotes.find(note => note.string === bassString && note.fret === 0)

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
    for (let stringIndex = 0; stringIndex < 4; stringIndex++) {
      for (let fretIndex = 0; fretIndex < 24; fretIndex++) {
        if (isNoteSelected(stringIndex, fretIndex)) {
          const noteName = getNoteForStringAndFret(stringIndex, fretIndex)
          if (noteName) {
            // Find the corresponding bass note for frequency
            const stringMapping = [1, 2, 3, 4] // Map visual index to bass string number
            const bassString = stringMapping[stringIndex]
            const bassNote = bassNotes.find(note =>
              note.string === bassString && note.fret === fretIndex + 1
            )

            // Convert to melody system format
            melodyNotes.push({
              name: noteName,
              frequency: bassNote ? bassNote.frequency : 0,
              isBlack: noteName.includes('#'),
              position: stringIndex * 100 + fretIndex // Unique position for bass notes
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
    setBassNotes(melodyNotes)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stringCheckboxes, fretCheckboxes, selectedNotes])

  // Handle scale selection
  const handleScaleSelect = useCallback((rootNote: string, scale: BassScale) => {
    // Apply scale to bass
    const scaleSelections = applyScaleToBass(rootNote, scale, bassNotes)
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
    setStringCheckboxes(new Array(4).fill(false))
    setFretCheckboxes(new Array(25).fill(false))
    setSelectedNotes(newSelectedNotes)
    setScaleSelectedNotes(newScaleSelectedNotes)
  }, [])

  // Handle scale box selection
  const handleScaleBoxSelect = useCallback((scaleBox: BassScaleBox) => {
    // Apply scale box to bass
    const scaleSelections = applyScaleBoxToBass(scaleBox)
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
      setCurrentScale({ root: rootNote, scale: currentScale?.scale || BASS_SCALES[0] })
    }

    // Update all state at once to minimize re-renders
    setStringCheckboxes(new Array(4).fill(false))
    setFretCheckboxes(new Array(25).fill(false))
    setSelectedNotes(newSelectedNotes)
    setScaleSelectedNotes(newScaleSelectedNotes)
  }, [currentScale])

  // Handle clearing scale
  const handleClearScale = useCallback(() => {
    setCurrentScale(null)
    setStringCheckboxes(new Array(4).fill(false))
    setFretCheckboxes(new Array(25).fill(false))
    setSelectedNotes(new Set())
    setScaleSelectedNotes(new Set())
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

  // Check if a note is the root note of the current scale
  const isRootNote = (noteName: string): boolean => {
    if (!currentScale) return false
    const noteNameWithoutOctave = noteName.replace(/\d+$/, '')
    return noteNameWithoutOctave === currentScale.root
  }

  // Check if a note should show preview on string hover
  const shouldShowStringPreview = (stringIndex: number): boolean => {
    return hoveredString === stringIndex && !stringCheckboxes[stringIndex]
  }

  // Check if a note should show preview on fret hover
  const shouldShowFretPreview = (fretIndex: number): boolean => {
    return hoveredFret === fretIndex && !fretCheckboxes[fretIndex]
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

  // Clear all selections when clearTrigger changes
  useEffect(() => {
    if (clearTrigger !== undefined) {
      setStringCheckboxes(new Array(4).fill(false))
      setFretCheckboxes(new Array(25).fill(false))
      setSelectedNotes(new Set())
      setScaleSelectedNotes(new Set())
      setCurrentScale(null)
    }
  }, [clearTrigger])

  return (
    <div className="bass-container">
      <div className="bass-fretboard">
        {/* Open fret checkbox */}
        <div className="bass-fret-checkbox-container" style={{ left: '4.5px', bottom: '-40px' }}>
          <input
            type="checkbox"
            id="bass-fret-open"
            className="bass-fret-checkbox"
            checked={fretCheckboxes[0] || false}
            onChange={() => handleFretCheckboxChange(0)}
            onMouseEnter={() => setHoveredFret(0)}
            onMouseLeave={() => setHoveredFret(null)}
          />
          <label htmlFor="bass-fret-open" className="bass-fret-checkbox-label">0</label>
        </div>

        {/* Frets */}
        {[...Array(24)].map((_, index) => (
          <div key={index} className="bass-fret" style={{ left: `${(index + 1) * 60}px` }}>
            <div className="bass-fret-wire"></div>
            {/* Fret markers on 3rd, 5th, 7th, 9th, 15th, 17th, 19th, 21st frets */}
            {[3, 5, 7, 9, 15, 17, 19, 21].includes(index + 1) && (
              <div className="bass-fret-marker"></div>
            )}
            {/* Double markers on 12th and 24th frets */}
            {(index + 1 === 12 || index + 1 === 24) && (
              <>
                <div className="bass-fret-marker bass-double-marker-1"></div>
                <div className="bass-fret-marker bass-double-marker-2"></div>
              </>
            )}
            {/* Checkbox beneath each fret */}
            <div className="bass-fret-checkbox-container">
              <input
                type="checkbox"
                id={`bass-fret-${index + 1}`}
                className="bass-fret-checkbox"
                checked={fretCheckboxes[index + 1] || false}
                onChange={() => handleFretCheckboxChange(index + 1)}
                onMouseEnter={() => setHoveredFret(index + 1)}
                onMouseLeave={() => setHoveredFret(null)}
              />
              <label htmlFor={`bass-fret-${index + 1}`} className="bass-fret-checkbox-label">{index + 1}</label>
            </div>
          </div>
        ))}

        {/* Strings */}
        {[...Array(4)].map((_, index) => {
          const stringHeights = [3.5, 4.5, 5.5, 6.5] // Heights for bass strings 1-4
          // Align string center with open position marker center
          const openMarkerCenter = 22 + index * 30
          const stringTop = openMarkerCenter - (stringHeights[index] / 2)
          return (
            <div
              key={index}
              className="bass-string"
              style={{
                top: `${stringTop}px`,
                height: `${stringHeights[index]}px`
              }}
            ></div>
          )
        })}

        {/* Clickable open string positions (fret 0) */}
        {[...Array(4)].map((_, stringIndex) => (
          <div
            key={`bass-open-string-${stringIndex}`}
            className="bass-fret-position bass-open-string-position"
            style={{
              left: `0px`, // At the very left edge
              top: `${22 + stringIndex * 30 - 12}px`,
              width: `15px`, // 25% of first fret zone (60px * 0.25)
              height: `24px`,
            }}
            onClick={() => handleOpenStringClick(stringIndex)}
          />
        ))}

        {/* Clickable fret positions */}
        {[...Array(4)].map((_, stringIndex) => (
          [...Array(24)].map((_, fretIndex) => (
            <div
              key={`bass-fret-position-${stringIndex}-${fretIndex}`}
              className="bass-fret-position"
              style={{
                left: `${fretIndex === 0 ? 15 + 3 : fretIndex * 60 + 3}px`, // Start after open string area for first fret
                top: `${22 + stringIndex * 30 - 12}px`, // Expand height above and below string
                width: `${fretIndex === 0 ? 60 - 18 : 60 - 6}px`, // 75% width for first fret (42px)
                height: `24px`, // Height of string spacing minus 4px to prevent overlap
              }}
              onClick={() => handleNoteClick(stringIndex, fretIndex)}
            />
          ))
        ))}

        {/* String checkboxes beside each string */}
        {[...Array(4)].map((_, index) => (
          <div
            key={`bass-string-checkbox-${index}`}
            className="bass-string-checkbox-container"
            style={{ top: `${22 + index * 30}px` }}
          >
            <input
              type="checkbox"
              id={`bass-string-${index}`}
              className="bass-string-checkbox"
              checked={stringCheckboxes[index] || false}
              onChange={() => handleStringCheckboxChange(index)}
              onMouseEnter={() => setHoveredString(index)}
              onMouseLeave={() => setHoveredString(null)}
            />
            <label htmlFor={`bass-string-${index}`} className="bass-string-checkbox-label">{index + 1}</label>
          </div>
        ))}

        {/* Open string note visualization circles */}
        {[...Array(4)].map((_, stringIndex) => {
          if (!isOpenStringSelected(stringIndex)) return null

          const stringMapping = [1, 2, 3, 4]
          const bassString = stringMapping[stringIndex]
          const openNote = bassNotes.find(note => note.string === bassString && note.fret === 0)

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

          let noteClass = 'bass-note-circle'
          if (isInGeneratedMelody) {
            noteClass += ' melody-note'
          } else if (isRoot && isInScale) {
            noteClass += ' scale-root-note'
          } else if (isInScale) {
            noteClass += ' scale-note'
          }

          return (
            <div
              key={`bass-open-note-${stringIndex}`}
              className={noteClass}
              style={{
                left: `-3px`, // Center of the open string click field (15px width / 2 - 11px for note circle centering)
                top: `${22 + stringIndex * 30 - 11}px`, // Center on string
              }}
            >
              <span className="bass-note-name">
                {openNote.name}
              </span>
            </div>
          )
        })}

        {/* Note visualization circles */}
        {[...Array(4)].map((_, stringIndex) =>
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
            const isRoot = isRootNote(noteName)

            let noteClass = 'bass-note-circle'
            if (isInGeneratedMelody) {
              noteClass += ' melody-note'
            } else if (isRoot && isInScale) {
              noteClass += ' scale-root-note'
            } else if (isInScale) {
              noteClass += ' scale-note'
            }

            return (
              <div
                key={`bass-note-${stringIndex}-${fretIndex}`}
                className={noteClass}
                style={{
                  left: `${fretIndex === 0 ? 30 : (fretIndex + 1) * 60 - 39}px`, // Center first fret in its area, others align with checkboxes
                  top: `${22 + stringIndex * 30 - 11}px`, // Center on string
                }}
              >
                <span className="bass-note-name">
                  {noteName}
                </span>
              </div>
            )
          })
        )}

        {/* Preview bass note visualization circles for hover effects */}
        {[...Array(4)].map((_, stringIndex) =>
          [...Array(25)].map((_, fretIndex) => {
            const adjustedFretIndex = fretIndex === 0 ? 0 : fretIndex - 1 // Adjust for open string
            const shouldShowPreview = (
              shouldShowStringPreview(stringIndex) ||
              shouldShowFretPreview(fretIndex)
            ) && !isNoteSelected(stringIndex, adjustedFretIndex)

            if (!shouldShowPreview) return null

            const noteName = fretIndex === 0
              ? getNoteForStringAndFret(stringIndex, 0) // Open string
              : getNoteForStringAndFret(stringIndex, fretIndex - 1) // Regular fret

            return (
              <div
                key={`bass-preview-note-${stringIndex}-${fretIndex}`}
                className="bass-note-circle preview"
                style={{
                  left: fretIndex === 0
                    ? `-2.5px` // Open string position
                    : `${fretIndex * 60 - 39}px`, // Regular fret position
                  top: `${22 + stringIndex * 30 - 11}px`, // Center on string
                }}
              >
                <span className="bass-note-name">
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

export default Bass
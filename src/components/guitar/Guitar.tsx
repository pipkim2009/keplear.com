import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import '../../styles/Guitar.css'
import { guitarNotes } from '../../utils/guitarNotes'
import { applyScaleToGuitar, applyScaleBoxToGuitar, GUITAR_SCALES, type GuitarScale, type ScaleBox } from '../../utils/guitarScales'
import { applyChordToGuitar, applyChordShapeToGuitar, type GuitarChord, type ChordShape } from '../../utils/guitarChords'
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
    handleScaleDelete: (rootNote: string, scale: GuitarScale) => void;
  }) => void
  onChordHandlersReady?: (handlers: {
    handleChordSelect: (rootNote: string, chord: GuitarChord) => void;
    handleChordShapeSelect: (chordShape: ChordShape & { root?: string }) => void;
    handleClearChord: () => void;
    handleRemoveChordNotes: (noteKeys: string[]) => void;
  }) => void
}

const Guitar: React.FC<GuitarProps> = ({ setGuitarNotes, isInMelody, showNotes, onNoteClick, clearTrigger, onScaleHandlersReady, onChordHandlersReady }) => {
  const [stringCheckboxes, setStringCheckboxes] = useState<boolean[]>(() => new Array(6).fill(false))
  const [fretCheckboxes, setFretCheckboxes] = useState<boolean[]>(() => new Array(25).fill(false))
  const [selectedNotes, setSelectedNotes] = useState<Set<string>>(() => new Set())
  const [manualSelectedNotes, setManualSelectedNotes] = useState<Set<string>>(() => new Set()) // Track manual selections separately
  const [currentScale, setCurrentScale] = useState<{ root: string; scale: GuitarScale } | null>(null)
  const [appliedScales, setAppliedScales] = useState<{ root: string; scale: GuitarScale; notes: Set<string> }[]>([])
  const [scaleSelectedNotes, setScaleSelectedNotes] = useState<Set<string>>(() => new Set())
  const [currentChord, setCurrentChord] = useState<{ root: string; chord: GuitarChord } | null>(null)
  const [chordSelectedNotes, setChordSelectedNotes] = useState<Set<string>>(() => new Set())
  const [hoveredString, setHoveredString] = useState<number | null>(null)
  const [hoveredFret, setHoveredFret] = useState<number | null>(null)
  const [hoveredNote, setHoveredNote] = useState<{ string: number; fret: number } | null>(null)

  const STRING_COUNT = 6
  const FRET_COUNT = 24
  const STRING_MAPPING = useMemo(() => [1, 2, 3, 4, 5, 6], [])

  const handleStringCheckboxChange = useCallback((index: number) => {
    setStringCheckboxes(prev => {
      const newCheckboxes = [...prev]
      const wasChecked = newCheckboxes[index]

      if (wasChecked) {
        // If unchecking, clear manual layer notes for this string (scales/chords remain)
        setManualSelectedNotes(prevManual => {
          const newManualNotes = new Set(prevManual)

          // Remove open string from manual layer
          newManualNotes.delete(`${index}-open`)

          // Remove all frets on this string from manual layer
          for (let fretIndex = 0; fretIndex < FRET_COUNT; fretIndex++) {
            newManualNotes.delete(`${index}-${fretIndex}`)
          }

          return newManualNotes
        })
      } else {
        // If checking, add all notes on this string to manual layer
        setManualSelectedNotes(prevManual => {
          const newManualNotes = new Set(prevManual)

          // Add open string to manual layer
          newManualNotes.add(`${index}-open`)

          // Add all frets on this string to manual layer
          for (let fretIndex = 0; fretIndex < FRET_COUNT; fretIndex++) {
            newManualNotes.add(`${index}-${fretIndex}`)
          }

          return newManualNotes
        })
      }

      newCheckboxes[index] = !wasChecked
      return newCheckboxes
    })
  }, [])

  const handleFretCheckboxChange = useCallback((index: number) => {
    setFretCheckboxes(prev => {
      const newCheckboxes = [...prev]
      const wasChecked = newCheckboxes[index]

      if (wasChecked) {
        // If unchecking, clear manual layer notes for this fret (scales/chords remain)
        setManualSelectedNotes(prevManual => {
          const newManualNotes = new Set(prevManual)

          for (let stringIndex = 0; stringIndex < STRING_COUNT; stringIndex++) {
            let noteKey: string
            if (index === 0) {
              noteKey = `${stringIndex}-open`
            } else {
              noteKey = `${stringIndex}-${index - 1}`
            }
            newManualNotes.delete(noteKey)
          }

          return newManualNotes
        })
      } else {
        // If checking, add all notes on this fret to manual layer
        setManualSelectedNotes(prevManual => {
          const newManualNotes = new Set(prevManual)

          for (let stringIndex = 0; stringIndex < STRING_COUNT; stringIndex++) {
            let noteKey: string
            if (index === 0) {
              noteKey = `${stringIndex}-open`
            } else {
              noteKey = `${stringIndex}-${index - 1}`
            }
            newManualNotes.add(noteKey)
          }

          return newManualNotes
        })
      }

      newCheckboxes[index] = !wasChecked
      return newCheckboxes
    })
  }, [])

  // Get note name for a specific string and fret
  const getNoteForStringAndFret = useCallback((stringIndex: number, fretIndex: number): string => {
    const guitarString = STRING_MAPPING[5 - stringIndex]
    const fret = fretIndex + 1

    const note = guitarNotes.find(n => n.string === guitarString && n.fret === fret)
    return note?.name ?? ''
  }, [STRING_MAPPING])

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

    // Check if note is part of an applied scale or chord - prevent deselection if so
    const isInScale = scaleSelectedNotes.has(noteKey)
    const isInChord = chordSelectedNotes.has(noteKey)

    // Check current state
    const isIndividuallySelected = selectedNotes.has(noteKey)
    const isNegativelySelected = selectedNotes.has(`-${noteKey}`)
    const isStringSelected = stringCheckboxes[stringIndex]
    const isOpenFretSelected = fretCheckboxes[0]
    const isCheckboxSelected = isStringSelected || isOpenFretSelected
    const currentlyVisible = (isIndividuallySelected || isCheckboxSelected) && !isNegativelySelected

    if (currentlyVisible) {
      // Note is currently showing - check if we can hide it
      if (isInScale || isInChord) {
        // Note is part of a scale or chord - prevent manual deselection
        console.log(`Cannot deselect open string ${noteKey} - it's part of an applied scale or chord`)
        return
      }

      // Note can be deselected - proceed with normal logic
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

    // Check current state - note is visible if it's in ANY layer
    const isInScaleChordLayer = scaleSelectedNotes.has(noteKey) || chordSelectedNotes.has(noteKey)
    const isManuallySelected = manualSelectedNotes.has(noteKey)
    const isStringSelected = stringCheckboxes[stringIndex]
    const isFretSelected = fretCheckboxes[fretIndex + 1] // Adjust for open fret offset
    const isCheckboxSelected = isStringSelected || isFretSelected
    const isInManualLayer = isManuallySelected || isCheckboxSelected
    const currentlyVisible = isInScaleChordLayer || isInManualLayer

    if (currentlyVisible && isInManualLayer) {
      // Note is currently showing and has a manual layer - remove only the manual layer
      setManualSelectedNotes(prev => {
        const newSet = new Set(prev)
        newSet.delete(noteKey) // Remove from manual layer
        return newSet
      })

      // Handle checkbox conversions if needed
      if (isCheckboxSelected && !isManuallySelected) {
        const newStringCheckboxes = [...stringCheckboxes]
        const newFretCheckboxes = [...fretCheckboxes]

        // Convert string checkbox selections to individual selections
        if (isStringSelected) {
          newStringCheckboxes[stringIndex] = false
          // Add all other notes on this string as individual manual selections (except the clicked one)
          setManualSelectedNotes(prev => {
            const newSet = new Set(prev)
            newSet.add(`${stringIndex}-open`) // Add open string
            for (let fret = 0; fret < 24; fret++) {
              if (fret !== fretIndex) {
                newSet.add(`${stringIndex}-${fret}`)
              }
            }
            // Don't add the clicked note since we're deselecting it
            return newSet
          })
        }

        // Convert fret checkbox selections to individual selections
        if (isFretSelected) {
          newFretCheckboxes[fretIndex + 1] = false // Adjust for open fret offset
          // Add all other notes on this fret as individual manual selections (except the clicked one)
          setManualSelectedNotes(prev => {
            const newSet = new Set(prev)
            for (let str = 0; str < 6; str++) {
              if (str !== stringIndex) {
                newSet.add(`${str}-${fretIndex}`)
              }
            }
            // Don't add the clicked note since we're deselecting it
            return newSet
          })
        }

        setStringCheckboxes(newStringCheckboxes)
        setFretCheckboxes(newFretCheckboxes)
      }
    } else if (!currentlyVisible || (currentlyVisible && !isInManualLayer)) {
      // Note is not showing OR it's only showing via scale/chord layer - add to manual layer
      setManualSelectedNotes(prev => {
        const newSet = new Set(prev)
        newSet.add(noteKey) // Add to manual layer
        return newSet
      })
    }
  }

  // Check if a specific note is selected (considering all layers)
  const isNoteSelected = useCallback((stringIndex: number, fretIndex: number): boolean => {
    const noteKey = `${stringIndex}-${fretIndex}`

    // A note is selected if it's in any layer: scale/chord layer OR manual layer
    const isInScaleChordLayer = scaleSelectedNotes.has(noteKey) || chordSelectedNotes.has(noteKey)
    const isInManualLayer = manualSelectedNotes.has(noteKey) || stringCheckboxes[stringIndex] || fretCheckboxes[fretIndex + 1]

    return isInScaleChordLayer || isInManualLayer
  }, [scaleSelectedNotes, chordSelectedNotes, manualSelectedNotes, stringCheckboxes, fretCheckboxes])

  // Check if an open string is selected (considering all layers)
  const isOpenStringSelected = useCallback((stringIndex: number): boolean => {
    const openKey = `${stringIndex}-open`

    // A note is selected if it's in any layer: scale/chord layer OR manual layer
    const isInScaleChordLayer = scaleSelectedNotes.has(openKey) || chordSelectedNotes.has(openKey)
    const isInManualLayer = manualSelectedNotes.has(openKey) || stringCheckboxes[stringIndex] || fretCheckboxes[0]

    return isInScaleChordLayer || isInManualLayer
  }, [scaleSelectedNotes, chordSelectedNotes, manualSelectedNotes, stringCheckboxes, fretCheckboxes])

  // Convert guitar notes to the Note format expected by the melody system
  const convertToMelodyNotes = useCallback((): Note[] => {
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
  }, [isOpenStringSelected, isNoteSelected, getNoteForStringAndFret, guitarNotes])


  // Auto-apply checkboxes when all individual notes are selected
  // DISABLED: This was causing infinite render loops and flickering with the scale system

  // Sync guitar selections with parent component for deselect all button visibility
  // Only sync when selectedNotes, stringCheckboxes, or fretCheckboxes change
  // Use a ref to prevent infinite loops by tracking the last synced state
  const lastSyncedState = useRef<string>('')

  useEffect(() => {
    const melodyNotes = convertToMelodyNotes()

    // Create a state signature to prevent unnecessary updates
    const currentStateSignature = JSON.stringify({
      selectedNotes: Array.from(selectedNotes).sort(),
      stringCheckboxes,
      fretCheckboxes
    })

    // Only update parent if the state actually changed
    if (currentStateSignature !== lastSyncedState.current) {
      lastSyncedState.current = currentStateSignature
      setGuitarNotes(melodyNotes)
    }
  }, [selectedNotes, stringCheckboxes, fretCheckboxes, convertToMelodyNotes, setGuitarNotes])

  // Handle scale selection - COPY THE CHORD PATTERN EXACTLY
  const handleScaleSelect = useCallback((rootNote: string, scale: GuitarScale) => {
    // Apply scale to guitar
    const scaleSelections = applyScaleToGuitar(rootNote, scale, guitarNotes)

    // Use functional updates to avoid dependencies on current state (SAME AS CHORDS)
    setSelectedNotes(prev => {
      const newSelectedNotes = new Set(prev)
      scaleSelections.forEach(({ stringIndex, fretIndex }) => {
        const noteKey = fretIndex === 0 ? `${stringIndex}-open` : `${stringIndex}-${fretIndex - 1}`
        newSelectedNotes.add(noteKey)
      })
      return newSelectedNotes
    })

    setScaleSelectedNotes(prev => {
      const newScaleSelectedNotes = new Set(prev)
      scaleSelections.forEach(({ stringIndex, fretIndex }) => {
        const noteKey = fretIndex === 0 ? `${stringIndex}-open` : `${stringIndex}-${fretIndex - 1}`
        newScaleSelectedNotes.add(noteKey)
      })
      return newScaleSelectedNotes
    })

      // Update scale state
    setCurrentScale({ root: rootNote, scale })
    // Keep scale state when scale is applied - allow coexistence
  }, [guitarNotes])

  // Handle scale deletion
  const handleScaleDelete = useCallback((rootNote: string, scale: GuitarScale) => {

    // For scale box selections (empty intervals), we need a different approach
    let scaleSelections: any[] = []

    if (scale.intervals && scale.intervals.length > 0) {
      // Traditional scale with intervals - use the normal approach
      scaleSelections = applyScaleToGuitar(rootNote, scale, guitarNotes)
    } else {
      // Scale box selection - we need to re-derive which notes belong to this scale

      // For scale boxes, we need to determine which notes belong to this specific scale
      // Since the scale name contains the fret range, we can derive the scale box
      const scaleName = scale.name // "Open Position (Frets 0-4)"
      const fretRangeMatch = scaleName.match(/Frets (\d+)-(\d+)/)

      if (fretRangeMatch) {
        const minFret = parseInt(fretRangeMatch[1])
        const maxFret = parseInt(fretRangeMatch[2])


        // Create a scale box object to re-apply and get the selections
        const scaleBox = {
          name: scaleName,
          minFret: minFret,
          maxFret: maxFret,
          positions: [] // We'll derive this or use a different approach
        }

        // For "Open Position (Frets 0-4)", we'll manually create selections for the common notes
        // This is a targeted approach for this specific scale box
        scaleSelections = []

        // Re-derive the scale box selections to remove them, regardless of current state

        // Create a fake scale box and re-apply it to get the original selections
        const fakeScaleBox = {
          name: scaleName,
          minFret: minFret,
          maxFret: maxFret,
          positions: [] as any[] // We don't need positions for this approach
        }

        // Re-apply the scale box to get the original selections
        const originalScaleSelections = applyScaleBoxToGuitar(fakeScaleBox)

        scaleSelections = originalScaleSelections

      } else {
        scaleSelections = Array.from(scaleSelectedNotes).map(noteKey => {
          const [stringIndex, fretInfo] = noteKey.split('-')
          const fretIndex = fretInfo === 'open' ? 0 : parseInt(fretInfo) + 1
          return { stringIndex: parseInt(stringIndex), fretIndex }
        })
      }

      // Clear all scale selected notes
      setScaleSelectedNotes(new Set())
    }

    setSelectedNotes(prev => {
      const newSelectedNotes = new Set(prev)
      scaleSelections.forEach(({ stringIndex, fretIndex }) => {
        const noteKey = fretIndex === 0 ? `${stringIndex}-open` : `${stringIndex}-${fretIndex - 1}`
        newSelectedNotes.delete(noteKey)
      })
      return newSelectedNotes
    })

    setScaleSelectedNotes(prev => {
      const newScaleSelectedNotes = new Set(prev)
      scaleSelections.forEach(({ stringIndex, fretIndex }) => {
        const noteKey = fretIndex === 0 ? `${stringIndex}-open` : `${stringIndex}-${fretIndex - 1}`
        newScaleSelectedNotes.delete(noteKey)
      })
      return newScaleSelectedNotes
    })

    // Note: Visual highlighting clearing is handled by useEffect watching appliedScales
  }, [guitarNotes])

  // Handle scale box selection
  const handleScaleBoxSelect = useCallback((scaleBox: ScaleBox) => {
    // Apply scale box to guitar
    const scaleSelections = applyScaleBoxToGuitar(scaleBox)

    // Use functional updates to accumulate scales (SAME AS handleScaleSelect)
    setSelectedNotes(prev => {
      const newSelectedNotes = new Set(prev)
      scaleSelections.forEach(({ stringIndex, fretIndex }) => {
        const noteKey = fretIndex === 0 ? `${stringIndex}-open` : `${stringIndex}-${fretIndex - 1}`
        newSelectedNotes.add(noteKey)
      })
      return newSelectedNotes
    })

    setScaleSelectedNotes(prev => {
      const newScaleSelectedNotes = new Set(prev)
      scaleSelections.forEach(({ stringIndex, fretIndex }) => {
        const noteKey = fretIndex === 0 ? `${stringIndex}-open` : `${stringIndex}-${fretIndex - 1}`
        newScaleSelectedNotes.add(noteKey)
      })
      return newScaleSelectedNotes
    })
    
    // For box selection, we need to derive the scale info from the box
    // We'll use the first position's root information
    const rootPosition = scaleBox.positions.find(pos => pos.isRoot)
    if (rootPosition) {
      const rootNote = rootPosition.note.replace(/\d+$/, '') // Remove octave
      // We need to find the scale that matches this box - for now, use the current scale
      // In a more complete implementation, you'd store scale info with the box
      setCurrentScale({ root: rootNote, scale: GUITAR_SCALES[0] })
    }
    
    // Update checkboxes to reflect no individual selections
    setStringCheckboxes(new Array(6).fill(false))
    setFretCheckboxes(new Array(25).fill(false))

    // Convert scale selections to melody notes and update melody system
    const melodyNotes: Note[] = []
    scaleSelections.forEach(({ stringIndex, fretIndex }) => {
      const noteName = getNoteForStringAndFret(stringIndex, fretIndex)
      if (noteName) {
        const stringMapping = [6, 5, 4, 3, 2, 1]
        const guitarString = stringMapping[stringIndex]
        const guitarNote = guitarNotes.find(note =>
          note.string === guitarString && note.fret === fretIndex + 1
        )

        if (guitarNote) {
          melodyNotes.push({
            name: noteName,
            frequency: guitarNote.frequency,
            isBlack: noteName.includes('#'),
            position: stringIndex * 100 + fretIndex
          })
        }
      }
    })
    setGuitarNotes(melodyNotes)
  }, [guitarNotes])

  // Handle clearing scale
  const handleClearScale = useCallback(() => {
    setCurrentScale(null)
    setAppliedScales([])
    setStringCheckboxes(new Array(6).fill(false))
    setFretCheckboxes(new Array(25).fill(false))
    setSelectedNotes(new Set())
    setScaleSelectedNotes(new Set())
    // Clear chord state when clearing scale
    setCurrentChord(null)
    setChordSelectedNotes(new Set())

    // Notify parent that selections are cleared for "deselect all" button visibility
    setGuitarNotes([])
  }, [setGuitarNotes])

  // Handle chord selection
  const handleChordSelect = useCallback((rootNote: string, chord: GuitarChord) => {
    // Apply chord to guitar
    const chordSelections = applyChordToGuitar(rootNote, chord, guitarNotes)

    // Use functional updates to avoid dependencies on current state
    setSelectedNotes(prev => {
      const newSelectedNotes = new Set(prev)
      chordSelections.forEach(({ stringIndex, fretIndex }) => {
        const noteKey = fretIndex === 0 ? `${stringIndex}-open` : `${stringIndex}-${fretIndex - 1}`
        newSelectedNotes.add(noteKey)
      })
      return newSelectedNotes
    })

    setChordSelectedNotes(prev => {
      const newChordSelectedNotes = new Set(prev)
      chordSelections.forEach(({ stringIndex, fretIndex }) => {
        const noteKey = fretIndex === 0 ? `${stringIndex}-open` : `${stringIndex}-${fretIndex - 1}`
        newChordSelectedNotes.add(noteKey)
      })
      return newChordSelectedNotes
    })

    // Update chord state
    setCurrentChord({ root: rootNote, chord })
    // Don't clear scale state - let chords and scales coexist
  }, [])

  // Handle chord shape selection
  const handleChordShapeSelect = useCallback((chordShape: ChordShape & { root?: string }) => {
    // Apply chord shape to guitar
    const chordSelections = applyChordShapeToGuitar(chordShape)

    // Use functional updates to avoid dependencies on current state
    setSelectedNotes(prev => {
      const newSelectedNotes = new Set(prev)
      chordSelections.forEach(({ stringIndex, fretIndex }) => {
        const noteKey = fretIndex === 0 ? `${stringIndex}-open` : `${stringIndex}-${fretIndex - 1}`
        newSelectedNotes.add(noteKey)
      })
      return newSelectedNotes
    })

    setChordSelectedNotes(prev => {
      const newChordSelectedNotes = new Set(prev)
      chordSelections.forEach(({ stringIndex, fretIndex }) => {
        const noteKey = fretIndex === 0 ? `${stringIndex}-open` : `${stringIndex}-${fretIndex - 1}`
        newChordSelectedNotes.add(noteKey)
      })
      return newChordSelectedNotes
    })

    // Set current chord information for root note detection
    if (chordShape.root) {
      // Create a basic chord object for root detection
      const basicChord = { name: chordShape.name, intervals: [] }
      setCurrentChord({ root: chordShape.root, chord: basicChord as GuitarChord })
    }

    // Don't clear scale state - let chords and scales coexist
  }, [])

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
    // Also remove from scale highlighting state to prevent visual artifacts
    setScaleSelectedNotes(prev => {
      const newSet = new Set(prev)
      noteKeys.forEach(key => newSet.delete(key))
      return newSet
    })
  }, [])

  // Handle removing chord notes only (preserves scale notes for individual chord deletion)
  const handleRemoveChordNotesOnly = useCallback((noteKeys: string[]) => {
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
    // Do NOT remove from scaleSelectedNotes to preserve scale highlighting
  }, [])

  // Check if a note was selected as part of the current scale application
  const isNoteInCurrentScale = useCallback((stringIndex: number, fretIndex: number): boolean => {
    const noteKey = `${stringIndex}-${fretIndex}`
    return scaleSelectedNotes.has(noteKey)
  }, [scaleSelectedNotes])

  // Check if an open string was selected as part of the current scale application
  const isOpenStringInCurrentScale = useCallback((stringIndex: number): boolean => {
    const noteKey = `${stringIndex}-open`
    return scaleSelectedNotes.has(noteKey)
  }, [scaleSelectedNotes])

  // Check if a note is the root note of any applied scale
  const isScaleRootNote = (noteName: string): boolean => {
    const noteNameWithoutOctave = noteName.replace(/\d+$/, '')

    // Check against all applied scales first
    if (appliedScales.length > 0) {
      return appliedScales.some(appliedScale => noteNameWithoutOctave === appliedScale.root)
    }

    // Fallback to current scale for backward compatibility
    if (currentScale) {
      return noteNameWithoutOctave === currentScale.root
    }

    return false
  }

  // Check if a note is the root note of the current chord
  const isChordRootNote = (noteName: string): boolean => {
    if (currentChord) {
      const noteNameWithoutOctave = noteName.replace(/\d+$/, '')
      return noteNameWithoutOctave === currentChord.root
    }
    return false
  }

  // Check if a note is the root note of the current scale or chord
  const isRootNote = (noteName: string): boolean => {
    return isScaleRootNote(noteName) || isChordRootNote(noteName)
  }

  // Check if a note was selected as part of the current chord application
  const isNoteInCurrentChord = useCallback((stringIndex: number, fretIndex: number): boolean => {
    const noteKey = `${stringIndex}-${fretIndex}`
    return chordSelectedNotes.has(noteKey)
  }, [chordSelectedNotes])

  // Check if an open string was selected as part of the current chord application
  const isOpenStringInCurrentChord = useCallback((stringIndex: number): boolean => {
    const noteKey = `${stringIndex}-open`
    return chordSelectedNotes.has(noteKey)
  }, [chordSelectedNotes])

  // Check if a note should show preview on string hover
  const shouldShowStringPreview = useCallback((stringIndex: number): boolean => {
    return hoveredString === stringIndex && !stringCheckboxes[stringIndex]
  }, [hoveredString, stringCheckboxes])

  // Check if a note should show preview on fret hover
  const shouldShowFretPreview = useCallback((fretIndex: number): boolean => {
    return hoveredFret === fretIndex && !fretCheckboxes[fretIndex]
  }, [hoveredFret, fretCheckboxes])

  // Check if a specific note should show preview on individual note hover
  const shouldShowNotePreview = useCallback((stringIndex: number, fretIndex: number): boolean => {
    return hoveredNote?.string === stringIndex && hoveredNote?.fret === fretIndex
  }, [hoveredNote])

  // Provide scale handlers to parent component
  useEffect(() => {
    if (onScaleHandlersReady) {
      onScaleHandlersReady({
        handleScaleSelect,
        handleScaleBoxSelect,
        handleClearScale,
        handleScaleDelete
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleScaleSelect, handleScaleBoxSelect, handleClearScale, handleScaleDelete])

  // Provide chord handlers to parent component
  useEffect(() => {
    if (onChordHandlersReady) {
      onChordHandlersReady({
        handleChordSelect,
        handleChordShapeSelect,
        handleClearChord,
        handleRemoveChordNotes,
        handleRemoveChordNotesOnly
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleChordSelect, handleChordShapeSelect, handleClearChord, handleRemoveChordNotes])

  // Clear all selections when clearTrigger changes
  useEffect(() => {
    if (clearTrigger !== undefined && clearTrigger > 0) {
      setStringCheckboxes(new Array(6).fill(false))
      setFretCheckboxes(new Array(25).fill(false))
      setSelectedNotes(new Set())
      setManualSelectedNotes(new Set()) // Clear manual blue notes
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
          <div key={index} className="fret" style={{ left: `${(index + 1) * 54}px` }}>
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

        {/* Clickable open string positions (fret 0) - always present like regular fret positions */}
        {[...Array(6)].map((_, stringIndex) => (
          <div
            key={`open-string-${stringIndex}`}
            className="fret-position open-string-position"
            style={{
              left: `0px`, // At the very left edge
              top: `${15 + stringIndex * 28 - 12}px`,
              width: `14px`, // 25% of first fret zone (54px * 0.25)
              height: `24px`,
              opacity: isOpenStringSelected(stringIndex) ? 0 : undefined, // Fully transparent when note is selected
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
                left: `${fretIndex === 0 ? 15 + 3 : fretIndex * 54 + 3}px`, // Start after open string area for first fret
                top: `${15 + stringIndex * 28 - 12}px`, // Expand height above and below string
                width: `${fretIndex === 0 ? 54 - 18 : 54 - 6}px`, // 75% width for first fret (36px)
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

          let noteClass = 'note-circle'
          if (isInGeneratedMelody) {
            noteClass += ' melody-note'
          } else {
            // Check all possible combinations of chord/scale and root states
            const isChordRoot = isChordRootNote(openNote.name) && isInChord
            const isScaleRoot = isScaleRootNote(openNote.name) && isInScale

            if (isChordRoot && isScaleRoot) {
              // Both roots - stays red
              noteClass += ' chord-root-scale-root'
            } else if (isChordRoot && isInScale) {
              // Chord root + scale note - red + orange mix
              noteClass += ' chord-root-scale-note'
            } else if (isInChord && isScaleRoot) {
              // Chord note + scale root - purple + red mix
              noteClass += ' chord-note-scale-root'
            } else if (isChordRoot) {
              // Just chord root
              noteClass += ' chord-root-note'
            } else if (isScaleRoot) {
              // Just scale root
              noteClass += ' scale-root-note'
            } else if (isInChord && isInScale) {
              // Regular chord note + scale note - purple + orange mix
              noteClass += ' chord-scale-note'
            } else if (isInChord) {
              // Just chord note
              noteClass += ' chord-note'
            } else if (isInScale) {
              // Just scale note
              noteClass += ' scale-note'
            }
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

            let noteClass = 'note-circle'
            if (isInGeneratedMelody) {
              noteClass += ' melody-note'
            } else {
              // Check all possible combinations of chord/scale and root states
              const isChordRoot = isChordRootNote(noteName) && isInChord
              const isScaleRoot = isScaleRootNote(noteName) && isInScale

              if (isChordRoot && isScaleRoot) {
                // Both roots - stays red
                noteClass += ' chord-root-scale-root'
              } else if (isChordRoot && isInScale) {
                // Chord root + scale note - red + orange mix
                noteClass += ' chord-root-scale-note'
              } else if (isInChord && isScaleRoot) {
                // Chord note + scale root - purple + red mix
                noteClass += ' chord-note-scale-root'
              } else if (isChordRoot) {
                // Just chord root
                noteClass += ' chord-root-note'
              } else if (isScaleRoot) {
                // Just scale root
                noteClass += ' scale-root-note'
              } else if (isInChord && isInScale) {
                // Regular chord note + scale note - purple + orange mix
                noteClass += ' chord-scale-note'
              } else if (isInChord) {
                // Just chord note
                noteClass += ' chord-note'
              } else if (isInScale) {
                // Just scale note
                noteClass += ' scale-note'
              }
            }
            
            return (
              <div
                key={`note-${stringIndex}-${fretIndex}`}
                className={noteClass}
                style={{
                  left: `${fretIndex === 0 ? 27 : (fretIndex + 1) * 54 - 34}px`, // Center first fret in its area, others align with checkboxes
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
            const isCurrentNoteSelected = fretIndex === 0
              ? isOpenStringSelected(stringIndex)
              : isNoteSelected(stringIndex, adjustedFretIndex)
            const shouldShowPreview = (
              shouldShowStringPreview(stringIndex) ||
              shouldShowFretPreview(fretIndex) ||
              shouldShowNotePreview(stringIndex, fretIndex)
            ) && !isCurrentNoteSelected

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
                    ? `${fretIndex * 54 - 34 + 9}px` // First fret moved right by 9px
                    : `${fretIndex * 54 - 34}px`, // Regular fret position
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
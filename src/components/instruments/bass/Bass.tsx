import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import '../../../styles/Bass.css'
import { bassNotes } from '../../../utils/instruments/bass/bassNotes'
import { applyScaleToBass, applyScaleBoxToBass, BASS_SCALES, type BassScale, type BassScaleBox } from '../../../utils/instruments/bass/bassScales'
import { applyChordToBass, applyBassChordShapeToBass, type BassChord, type BassChordShape } from '../../../utils/instruments/bass/bassChords'
import type { Note } from '../../../utils/notes'
import type { AppliedChord, AppliedScale, FretboardPreview } from '../../common/ScaleChordOptions'

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
    handleScaleDelete: (rootNote: string, scale: BassScale) => void;
  }) => void
  onChordHandlersReady?: (handlers: {
    handleChordSelect: (rootNote: string, chord: BassChord) => void;
    handleChordShapeSelect: (chordShape: BassChordShape & { root?: string }) => void;
    handleClearChord: () => void;
    handleRemoveChordNotes: (noteKeys: string[]) => void;
  }) => void
  onNoteHandlersReady?: (handlers: {
    handleSetManualNotes: (noteIds: string[]) => void;
  }) => void
  appliedScales?: AppliedScale[]
  appliedChords?: AppliedChord[]
  currentlyPlayingNote?: Note | null
  currentlyPlayingNoteNames?: string[]
  currentlyPlayingNoteIds?: string[]
  currentlyPlayingChordId?: string | null
  previewPositions?: FretboardPreview | null
  disableNoteSelection?: boolean
  fretRangeLow?: number
  fretRangeHigh?: number
}

const Bass: React.FC<BassProps> = ({ setBassNotes, isInMelody, showNotes, onNoteClick, clearTrigger, onScaleHandlersReady, onChordHandlersReady, onNoteHandlersReady, appliedScales, appliedChords, currentlyPlayingNote, currentlyPlayingNoteNames = [], currentlyPlayingNoteIds = [], currentlyPlayingChordId = null, previewPositions = null, disableNoteSelection = false, fretRangeLow, fretRangeHigh }) => {
  const [stringCheckboxes, setStringCheckboxes] = useState<boolean[]>(() => new Array(4).fill(false))
  const [fretCheckboxes, setFretCheckboxes] = useState<boolean[]>(() => new Array(25).fill(false))
  const [selectedNotes, setSelectedNotes] = useState<Set<string>>(() => new Set())
  const [manualSelectedNotes, setManualSelectedNotes] = useState<Set<string>>(() => new Set())
  const [currentScale, setCurrentScale] = useState<{ root: string; scale: BassScale } | null>(null)
  const [scaleSelectedNotes, setScaleSelectedNotes] = useState<Set<string>>(() => new Set())
  const scaleSelectedNotesRef = useRef<Set<string>>(new Set())
  const [currentChord, setCurrentChord] = useState<{ root: string; chord: BassChord } | null>(null)
  const [chordSelectedNotes, setChordSelectedNotes] = useState<Set<string>>(() => new Set())
  const chordSelectedNotesRef = useRef<Set<string>>(new Set())
  const [hoveredString, setHoveredString] = useState<number | null>(null)
  const [hoveredFret, setHoveredFret] = useState<number | null>(null)
  const [hoveredNote, setHoveredNote] = useState<{ string: number; fret: number } | null>(null)

  const STRING_COUNT = 4
  const FRET_COUNT = 24
  const STRING_MAPPING = useMemo(() => [4, 3, 2, 1], []) // Top visual string = highest pitch (G), bottom = lowest (E)

  const handleStringCheckboxChange = useCallback((index: number) => {
    setStringCheckboxes(prev => {
      const newCheckboxes = [...prev]
      newCheckboxes[index] = !newCheckboxes[index]
      return newCheckboxes
    })
    // Note: We don't modify manualSelectedNotes here
    // Checkbox selections are tracked separately via stringCheckboxes/fretCheckboxes
  }, [])

  const handleFretCheckboxChange = useCallback((index: number) => {
    setFretCheckboxes(prev => {
      const newCheckboxes = [...prev]
      newCheckboxes[index] = !newCheckboxes[index]
      return newCheckboxes
    })
    // Note: We don't modify manualSelectedNotes here
    // Checkbox selections are tracked separately via stringCheckboxes/fretCheckboxes
  }, [])

  const getNoteForStringAndFret = useCallback((stringIndex: number, fretIndex: number): string => {
    const bassString = STRING_MAPPING[stringIndex]
    const fret = fretIndex + 1
    const note = bassNotes.find(n => n.string === bassString && n.fret === fret)
    return note?.name ?? ''
  }, [STRING_MAPPING])

  const handleOpenStringClick = async (stringIndex: number) => {
    // Don't allow selection changes in practice mode
    if (disableNoteSelection) return

    const noteKey = `${stringIndex}-open`
    const newSelectedNotes = new Set(selectedNotes)

    if (onNoteClick) {
      const bassString = STRING_MAPPING[stringIndex]
      const openNote = bassNotes.find(note => note.string === bassString && note.fret === 0)

      if (openNote) {
        const noteObj: Note = {
          id: `b-s${bassString}-f0`,
          name: openNote.name,
          frequency: openNote.frequency,
          isBlack: openNote.name.includes('#'),
          position: stringIndex * 100 - 1
        }
        await onNoteClick(noteObj)
      }
    }

    // Check current state - note is visible if it's in ANY layer
    const isInScaleChordLayer = scaleSelectedNotes.has(noteKey) || chordSelectedNotes.has(noteKey)
    const isManuallySelected = manualSelectedNotes.has(noteKey)
    const isStringSelected = stringCheckboxes[stringIndex]
    const isOpenFretSelected = fretCheckboxes[0]
    const isCheckboxSelected = isStringSelected || isOpenFretSelected
    const isInManualLayer = isManuallySelected || isCheckboxSelected
    const currentlyVisible = isInScaleChordLayer || isInManualLayer

    if (currentlyVisible && isInManualLayer) {
      // Handle checkbox conversions if needed
      if (isCheckboxSelected && !isManuallySelected) {
        const newStringCheckboxes = [...stringCheckboxes]
        const newFretCheckboxes = [...fretCheckboxes]

        // Single state update to add all notes from checkbox conversions
        setManualSelectedNotes(prev => {
          const newSet = new Set(prev)

          // Convert string checkbox selections to individual selections
          if (isStringSelected) {
            // Don't add open string since we're clicking on it to deselect
            for (let fret = 0; fret < 24; fret++) {
              newSet.add(`${stringIndex}-${fret}`)
            }
          }

          // Convert open fret checkbox selections to individual selections
          if (isOpenFretSelected) {
            // Add all other open strings as individual manual selections (except the clicked one)
            for (let str = 0; str < 4; str++) {
              if (str !== stringIndex) {
                newSet.add(`${str}-open`)
              }
            }
            // Don't add the clicked note since we're deselecting it
          }

          return newSet
        })

        // Uncheck the checkboxes
        if (isStringSelected) {
          newStringCheckboxes[stringIndex] = false
        }
        if (isOpenFretSelected) {
          newFretCheckboxes[0] = false
        }

        setStringCheckboxes(newStringCheckboxes)
        setFretCheckboxes(newFretCheckboxes)
      } else {
        // Note is manually selected (not via checkbox) - just remove it
        setManualSelectedNotes(prev => {
          const newSet = new Set(prev)
          newSet.delete(noteKey) // Remove from manual layer
          return newSet
        })
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

  const handleNoteClick = async (stringIndex: number, fretIndex: number) => {
    // Don't allow selection changes in practice mode
    if (disableNoteSelection) return

    const noteKey = `${stringIndex}-${fretIndex}`
    const newSelectedNotes = new Set(selectedNotes)

    if (onNoteClick) {
      const noteName = getNoteForStringAndFret(stringIndex, fretIndex)
      if (noteName) {
        const bassString = STRING_MAPPING[stringIndex]
        const bassNote = bassNotes.find(note =>
          note.string === bassString && note.fret === fretIndex + 1
        )

        if (bassNote) {
          const noteObj: Note = {
            id: `b-s${bassString}-f${fretIndex + 1}`,
            name: noteName,
            frequency: bassNote.frequency,
            isBlack: noteName.includes('#'),
            position: stringIndex * 100 + fretIndex
          }
          await onNoteClick(noteObj)
        }
      }
    }

    const isInScaleChordLayer = scaleSelectedNotes.has(noteKey) || chordSelectedNotes.has(noteKey)
    const isManuallySelected = manualSelectedNotes.has(noteKey)
    const isStringSelected = stringCheckboxes[stringIndex]
    const isFretSelected = fretCheckboxes[fretIndex + 1]
    const isCheckboxSelected = isStringSelected || isFretSelected
    const isInManualLayer = isManuallySelected || isCheckboxSelected
    const currentlyVisible = isInScaleChordLayer || isInManualLayer

    if (currentlyVisible && isInManualLayer) {
      if (isCheckboxSelected && !isManuallySelected) {
        const newStringCheckboxes = [...stringCheckboxes]
        const newFretCheckboxes = [...fretCheckboxes]

        // Single state update to add all notes from checkbox conversions
        setManualSelectedNotes(prev => {
          const newSet = new Set(prev)

          if (isStringSelected) {
            newSet.add(`${stringIndex}-open`)
            for (let fret = 0; fret < 24; fret++) {
              if (fret !== fretIndex) {
                newSet.add(`${stringIndex}-${fret}`)
              }
            }
          }

          if (isFretSelected) {
            for (let str = 0; str < 4; str++) {
              if (str !== stringIndex) {
                newSet.add(`${str}-${fretIndex}`)
              }
            }
          }

          return newSet
        })

        // Uncheck the checkboxes
        if (isStringSelected) {
          newStringCheckboxes[stringIndex] = false
        }
        if (isFretSelected) {
          newFretCheckboxes[fretIndex + 1] = false
        }

        setStringCheckboxes(newStringCheckboxes)
        setFretCheckboxes(newFretCheckboxes)
      } else {
        setManualSelectedNotes(prev => {
          const newSet = new Set(prev)
          newSet.delete(noteKey)
          return newSet
        })
      }
    } else if (!currentlyVisible || (currentlyVisible && !isInManualLayer)) {
      setManualSelectedNotes(prev => {
        const newSet = new Set(prev)
        newSet.add(noteKey)
        return newSet
      })
    }
  }

  const isNoteSelected = useCallback((stringIndex: number, fretIndex: number): boolean => {
    const noteKey = `${stringIndex}-${fretIndex}`
    // Also check refs as fallback for practice mode state sync issues
    const isInScaleChordLayer = scaleSelectedNotes.has(noteKey) || chordSelectedNotes.has(noteKey) ||
                                 scaleSelectedNotesRef.current.has(noteKey) || chordSelectedNotesRef.current.has(noteKey)
    const isInManualLayer = manualSelectedNotes.has(noteKey) || stringCheckboxes[stringIndex] || fretCheckboxes[fretIndex + 1]
    return isInScaleChordLayer || isInManualLayer
  }, [scaleSelectedNotes, chordSelectedNotes, manualSelectedNotes, stringCheckboxes, fretCheckboxes])

  const isOpenStringSelected = useCallback((stringIndex: number): boolean => {
    const openKey = `${stringIndex}-open`
    // Also check refs as fallback for practice mode state sync issues
    const isInScaleChordLayer = scaleSelectedNotes.has(openKey) || chordSelectedNotes.has(openKey) ||
                                 scaleSelectedNotesRef.current.has(openKey) || chordSelectedNotesRef.current.has(openKey)
    const isInManualLayer = manualSelectedNotes.has(openKey) || stringCheckboxes[stringIndex] || fretCheckboxes[0]
    return isInScaleChordLayer || isInManualLayer
  }, [scaleSelectedNotes, chordSelectedNotes, manualSelectedNotes, stringCheckboxes, fretCheckboxes])

  // Check if a note is in the manual layer (manually selected)
  const isNoteInManualLayer = useCallback((stringIndex: number, fretIndex: number): boolean => {
    const noteKey = `${stringIndex}-${fretIndex}`
    const isManuallySelected = manualSelectedNotes.has(noteKey)
    const isStringSelected = stringCheckboxes[stringIndex]
    const isFretSelected = fretCheckboxes[fretIndex + 1]
    const isCheckboxSelected = isStringSelected || isFretSelected
    return isManuallySelected || isCheckboxSelected
  }, [manualSelectedNotes, stringCheckboxes, fretCheckboxes])

  // Check if an open string is in the manual layer (manually selected)
  const isOpenStringInManualLayer = useCallback((stringIndex: number): boolean => {
    const openKey = `${stringIndex}-open`
    const isManuallySelected = manualSelectedNotes.has(openKey)
    const isStringSelected = stringCheckboxes[stringIndex]
    const isOpenFretSelected = fretCheckboxes[0]
    const isCheckboxSelected = isStringSelected || isOpenFretSelected
    return isManuallySelected || isCheckboxSelected
  }, [manualSelectedNotes, stringCheckboxes, fretCheckboxes])

  const convertToMelodyNotes = useCallback((): Note[] => {
    const melodyNotes: Note[] = []

    // Check open strings first
    for (let stringIndex = 0; stringIndex < 4; stringIndex++) {
      if (isOpenStringSelected(stringIndex)) {
        const bassString = STRING_MAPPING[stringIndex]
        const openNote = bassNotes.find(note => note.string === bassString && note.fret === 0)

        if (openNote) {
          // Check if this note is in the manual layer
          const isManual = isOpenStringInManualLayer(stringIndex)

          melodyNotes.push({
            name: openNote.name,
            frequency: openNote.frequency,
            isBlack: openNote.name.includes('#'),
            position: stringIndex * 100 - 1,
            isManualSelection: isManual // Tag whether this is a manual selection
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
            const bassString = STRING_MAPPING[stringIndex]
            const bassNote = bassNotes.find(note =>
              note.string === bassString && note.fret === fretIndex + 1
            )

            // Check if this note is in the manual layer
            const isManual = isNoteInManualLayer(stringIndex, fretIndex)

            melodyNotes.push({
              name: noteName,
              frequency: bassNote ? bassNote.frequency : 0,
              isBlack: noteName.includes('#'),
              position: stringIndex * 100 + fretIndex,
              isManualSelection: isManual // Tag whether this is a manual selection
            })
          }
        }
      }
    }

    return melodyNotes
  }, [isOpenStringSelected, isNoteSelected, getNoteForStringAndFret, bassNotes, isOpenStringInManualLayer, isNoteInManualLayer])

  const lastSyncedState = useRef<string>('')

  useEffect(() => {
    const melodyNotes = convertToMelodyNotes()

    const currentStateSignature = JSON.stringify({
      selectedNotes: Array.from(selectedNotes).sort(),
      manualSelectedNotes: Array.from(manualSelectedNotes).sort(),
      stringCheckboxes,
      fretCheckboxes
    })

    if (currentStateSignature !== lastSyncedState.current) {
      lastSyncedState.current = currentStateSignature
      setBassNotes(melodyNotes)
    }
  }, [selectedNotes, manualSelectedNotes, stringCheckboxes, fretCheckboxes, convertToMelodyNotes, setBassNotes])

  const handleScaleSelect = useCallback((rootNote: string, scale: BassScale) => {
    const scaleSelections = applyScaleToBass(rootNote, scale, bassNotes)

    // Update refs for practice mode (state updates don't work reliably)
    scaleSelections.forEach(({ stringIndex, fretIndex }) => {
      const noteKey = fretIndex === 0 ? `${stringIndex}-open` : `${stringIndex}-${fretIndex - 1}`
      scaleSelectedNotesRef.current.add(noteKey)
    })

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

    setCurrentScale({ root: rootNote, scale })
  }, [bassNotes])

  const handleScaleDelete = useCallback((rootNote: string, scale: BassScale) => {
    let scaleSelections: any[] = []

    if (scale.intervals && scale.intervals.length > 0) {
      scaleSelections = applyScaleToBass(rootNote, scale, bassNotes)
    } else {
      const scaleName = scale.name
      const fretRangeMatch = scaleName.match(/Frets (\d+)-(\d+)/)

      if (fretRangeMatch) {
        const minFret = parseInt(fretRangeMatch[1])
        const maxFret = parseInt(fretRangeMatch[2])

        const fakeScaleBox = {
          name: scaleName,
          minFret: minFret,
          maxFret: maxFret,
          positions: [] as any[]
        }

        const originalScaleSelections = applyScaleBoxToBass(fakeScaleBox)
        scaleSelections = originalScaleSelections
      } else {
        scaleSelections = Array.from(scaleSelectedNotes).map(noteKey => {
          const [stringIndex, fretInfo] = noteKey.split('-')
          const fretIndex = fretInfo === 'open' ? 0 : parseInt(fretInfo) + 1
          return { stringIndex: parseInt(stringIndex), fretIndex }
        })
      }

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
  }, [bassNotes])

  const handleScaleBoxSelect = useCallback((scaleBox: BassScaleBox) => {
    const scaleSelections = applyScaleBoxToBass(scaleBox)

    // Update refs for practice mode (state updates don't work reliably)
    scaleSelections.forEach(({ stringIndex, fretIndex }) => {
      const noteKey = fretIndex === 0 ? `${stringIndex}-open` : `${stringIndex}-${fretIndex - 1}`
      scaleSelectedNotesRef.current.add(noteKey)
    })

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

    const rootPosition = scaleBox.positions.find(pos => pos.isRoot)
    if (rootPosition) {
      const rootNote = rootPosition.note.replace(/\d+$/, '')
      setCurrentScale({ root: rootNote, scale: BASS_SCALES[0] })
    }

    setStringCheckboxes(new Array(4).fill(false))
    setFretCheckboxes(new Array(25).fill(false))

    const melodyNotes: Note[] = []
    scaleSelections.forEach(({ stringIndex, fretIndex }) => {
      const noteName = getNoteForStringAndFret(stringIndex, fretIndex)
      if (noteName) {
        const bassString = STRING_MAPPING[stringIndex]
        const bassNote = bassNotes.find(note =>
          note.string === bassString && note.fret === fretIndex + 1
        )

        if (bassNote) {
          melodyNotes.push({
            name: noteName,
            frequency: bassNote.frequency,
            isBlack: noteName.includes('#'),
            position: stringIndex * 100 + fretIndex
          })
        }
      }
    })
    setBassNotes(melodyNotes)
  }, [bassNotes])

  const handleClearScale = useCallback(() => {
    setCurrentScale(null)
    setStringCheckboxes(new Array(4).fill(false))
    setFretCheckboxes(new Array(25).fill(false))
    setSelectedNotes(new Set())
    setScaleSelectedNotes(new Set())
    // Clear refs as well (they're used for highlighting)
    scaleSelectedNotesRef.current = new Set()
    setCurrentChord(null)
    setChordSelectedNotes(new Set())
    chordSelectedNotesRef.current = new Set()
    setBassNotes([])
  }, [setBassNotes])

  const handleChordSelect = useCallback((rootNote: string, chord: BassChord) => {
    const chordSelections = applyChordToBass(rootNote, chord, bassNotes)

    // Update refs for practice mode (state updates don't work reliably)
    chordSelections.forEach(({ stringIndex, fretIndex }) => {
      const noteKey = fretIndex === 0 ? `${stringIndex}-open` : `${stringIndex}-${fretIndex - 1}`
      chordSelectedNotesRef.current.add(noteKey)
    })

    // Only add to chordSelectedNotes, NOT to selectedNotes
    // This way selectedNotes only contains manually selected notes/scales
    // and can be used for mixing with chords in progression mode
    setChordSelectedNotes(prev => {
      const newChordSelectedNotes = new Set(prev)
      chordSelections.forEach(({ stringIndex, fretIndex }) => {
        const noteKey = fretIndex === 0 ? `${stringIndex}-open` : `${stringIndex}-${fretIndex - 1}`
        newChordSelectedNotes.add(noteKey)
      })
      return newChordSelectedNotes
    })

    setCurrentChord({ root: rootNote, chord })
  }, [])

  const handleChordShapeSelect = useCallback((chordShape: BassChordShape & { root?: string }) => {
    const chordSelections = applyBassChordShapeToBass(chordShape)

    // Update refs for practice mode (state updates don't work reliably)
    chordSelections.forEach(({ stringIndex, fretIndex }) => {
      const noteKey = fretIndex === 0 ? `${stringIndex}-open` : `${stringIndex}-${fretIndex - 1}`
      chordSelectedNotesRef.current.add(noteKey)
    })

    // Only add to chordSelectedNotes, NOT to selectedNotes
    // This way selectedNotes only contains manually selected notes/scales
    // and can be used for mixing with chords in progression mode
    setChordSelectedNotes(prev => {
      const newChordSelectedNotes = new Set(prev)
      chordSelections.forEach(({ stringIndex, fretIndex }) => {
        const noteKey = fretIndex === 0 ? `${stringIndex}-open` : `${stringIndex}-${fretIndex - 1}`
        newChordSelectedNotes.add(noteKey)
      })
      return newChordSelectedNotes
    })

    if (chordShape.root) {
      const basicChord = { name: chordShape.name, intervals: [] }
      setCurrentChord({ root: chordShape.root, chord: basicChord as BassChord })
    }
  }, [])

  const handleClearChord = useCallback(() => {
    setCurrentChord(null)
    setStringCheckboxes(new Array(4).fill(false))
    setFretCheckboxes(new Array(25).fill(false))
    setSelectedNotes(new Set())
    setChordSelectedNotes(new Set())
    // Clear refs as well (they're used for highlighting)
    chordSelectedNotesRef.current = new Set()
    scaleSelectedNotesRef.current = new Set()
    setScaleSelectedNotes(new Set())
    setCurrentScale(null)
  }, [])

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
    setScaleSelectedNotes(prev => {
      const newSet = new Set(prev)
      noteKeys.forEach(key => newSet.delete(key))
      return newSet
    })
    // Also update refs to ensure visual removal
    noteKeys.forEach(key => {
      chordSelectedNotesRef.current.delete(key)
      scaleSelectedNotesRef.current.delete(key)
    })
  }, [])

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
    // Also update refs to ensure visual removal (but NOT scaleSelectedNotesRef to preserve scale highlighting)
    noteKeys.forEach(key => {
      chordSelectedNotesRef.current.delete(key)
    })
  }, [])

  // Handle setting manual notes from external source
  // Takes note IDs like "b-s1-f3" and converts to internal noteKey format
  const handleSetManualNotes = useCallback((noteIds: string[]) => {
    const noteKeys: string[] = []

    noteIds.forEach(noteId => {
      // Parse note ID format: "b-s{string}-f{fret}" e.g., "b-s1-f3"
      const match = noteId.match(/^b-s(\d+)-f(\d+)$/)
      if (match) {
        const bassString = parseInt(match[1]) // 1-4
        const fret = parseInt(match[2]) // 0-24

        // Convert bass string number to visual stringIndex
        // STRING_MAPPING = [4, 3, 2, 1], so stringIndex = 4 - bassString
        const stringIndex = 4 - bassString

        // Convert fret to visual fretIndex (open = "open", others = fret - 1)
        const noteKey = fret === 0 ? `${stringIndex}-open` : `${stringIndex}-${fret - 1}`
        noteKeys.push(noteKey)
      }
    })

    // Set the manual notes
    setManualSelectedNotes(new Set(noteKeys))
    setSelectedNotes(new Set(noteKeys))
  }, [])

  const isNoteInCurrentScale = useCallback((stringIndex: number, fretIndex: number): boolean => {
    const noteKey = `${stringIndex}-${fretIndex}`
    return scaleSelectedNotes.has(noteKey) || scaleSelectedNotesRef.current.has(noteKey)
  }, [scaleSelectedNotes])

  const isOpenStringInCurrentScale = useCallback((stringIndex: number): boolean => {
    const noteKey = `${stringIndex}-open`
    return scaleSelectedNotes.has(noteKey) || scaleSelectedNotesRef.current.has(noteKey)
  }, [scaleSelectedNotes])

  const isScaleRootNote = (noteName: string, stringIndex?: number, fretIndex?: number): boolean => {
    const noteNameWithoutOctave = noteName.replace(/\d+$/, '')

    if (stringIndex !== undefined && fretIndex !== undefined) {
      const noteKey = fretIndex === -1 ? `${stringIndex}-open` : `${stringIndex}-${fretIndex}`

      if (scaleSelectedNotes.has(noteKey) || scaleSelectedNotesRef.current.has(noteKey)) {
        if (appliedScales && appliedScales.length > 0) {
          return appliedScales.some(appliedScale => {
            return noteNameWithoutOctave === appliedScale.root &&
                   appliedScale.notes &&
                   appliedScale.notes.some((note: any) => {
                     if (note.__bassCoord) {
                       const { stringIndex: noteStringIndex, fretIndex: noteFretIndex } = note.__bassCoord
                       const appliedNoteKey = noteFretIndex === 0 ? `${noteStringIndex}-open` : `${noteStringIndex}-${noteFretIndex - 1}`
                       return appliedNoteKey === noteKey
                     }
                     return false
                   })
          })
        }

        return currentScale && noteNameWithoutOctave === currentScale.root
      }
      return false
    }

    if (currentScale) {
      return noteNameWithoutOctave === currentScale.root
    }

    return false
  }

  const isChordRootNote = (noteName: string, stringIndex?: number, fretIndex?: number): boolean => {
    const noteNameWithoutOctave = noteName.replace(/\d+$/, '')

    if (stringIndex !== undefined && fretIndex !== undefined) {
      const noteKey = fretIndex === -1 ? `${stringIndex}-open` : `${stringIndex}-${fretIndex}`

      if (chordSelectedNotes.has(noteKey) || chordSelectedNotesRef.current.has(noteKey)) {
        if (appliedChords && appliedChords.length > 0) {
          return appliedChords.some(appliedChord => {
            return noteNameWithoutOctave === appliedChord.root &&
                   appliedChord.notes &&
                   appliedChord.notes.some((note: any) => {
                     if (note.__bassCoord) {
                       const { stringIndex: noteStringIndex, fretIndex: noteFretIndex } = note.__bassCoord
                       const appliedNoteKey = noteFretIndex === 0 ? `${noteStringIndex}-open` : `${noteStringIndex}-${noteFretIndex - 1}`
                       return appliedNoteKey === noteKey
                     }
                     return false
                   })
          })
        }

        return currentChord && noteNameWithoutOctave === currentChord.root
      }
      return false
    }

    if (currentChord) {
      return noteNameWithoutOctave === currentChord.root
    }

    return false
  }

  const isNoteInCurrentChord = useCallback((stringIndex: number, fretIndex: number): boolean => {
    const noteKey = `${stringIndex}-${fretIndex}`
    return chordSelectedNotes.has(noteKey) || chordSelectedNotesRef.current.has(noteKey)
  }, [chordSelectedNotes])

  const isOpenStringInCurrentChord = useCallback((stringIndex: number): boolean => {
    const noteKey = `${stringIndex}-open`
    return chordSelectedNotes.has(noteKey) || chordSelectedNotesRef.current.has(noteKey)
  }, [chordSelectedNotes])

  const shouldShowStringPreview = useCallback((stringIndex: number): boolean => {
    return hoveredString === stringIndex && !stringCheckboxes[stringIndex]
  }, [hoveredString, stringCheckboxes])

  const shouldShowFretPreview = useCallback((fretIndex: number): boolean => {
    return hoveredFret === fretIndex && !fretCheckboxes[fretIndex]
  }, [hoveredFret, fretCheckboxes])

  const shouldShowNotePreview = useCallback((stringIndex: number, fretIndex: number): boolean => {
    return hoveredNote?.string === stringIndex && hoveredNote?.fret === fretIndex
  }, [hoveredNote])

  useEffect(() => {
    if (onScaleHandlersReady) {
      onScaleHandlersReady({
        handleScaleSelect,
        handleScaleBoxSelect,
        handleClearScale,
        handleScaleDelete
      })
    }
  }, [onScaleHandlersReady, handleScaleSelect, handleScaleBoxSelect, handleClearScale, handleScaleDelete])

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
  }, [onChordHandlersReady, handleChordSelect, handleChordShapeSelect, handleClearChord, handleRemoveChordNotes, handleRemoveChordNotesOnly])

  // Provide note handlers to parent component
  useEffect(() => {
    if (onNoteHandlersReady) {
      onNoteHandlersReady({
        handleSetManualNotes
      })
    }
  }, [onNoteHandlersReady, handleSetManualNotes])

  // Sync internal state from appliedScales/appliedChords props (for assignment loading)
  const prevAppliedScalesLength = useRef(0)
  const prevAppliedChordsLength = useRef(0)

  useEffect(() => {
    // Only sync when scales are added (not when cleared)
    if (appliedScales && appliedScales.length > 0 && appliedScales.length !== prevAppliedScalesLength.current) {
      console.log('Bass: Syncing from appliedScales prop:', appliedScales)

      // Build note keys from all applied scales
      const newScaleNotes = new Set<string>()
      appliedScales.forEach(appliedScale => {
        if (appliedScale.notes) {
          appliedScale.notes.forEach((note: any) => {
            if (note.__bassCoord) {
              const { stringIndex, fretIndex } = note.__bassCoord
              const noteKey = fretIndex === 0 ? `${stringIndex}-open` : `${stringIndex}-${fretIndex - 1}`
              newScaleNotes.add(noteKey)
            }
          })
        }
      })

      if (newScaleNotes.size > 0) {
        console.log('Bass: Setting scale notes from props:', newScaleNotes)
        setScaleSelectedNotes(newScaleNotes)
        setSelectedNotes(prev => new Set([...prev, ...newScaleNotes]))
      }
    }
    prevAppliedScalesLength.current = appliedScales?.length || 0
  }, [appliedScales])

  useEffect(() => {
    // Only sync when chords are added (not when cleared)
    if (appliedChords && appliedChords.length > 0 && appliedChords.length !== prevAppliedChordsLength.current) {
      console.log('Bass: Syncing from appliedChords prop:', appliedChords)

      // Build note keys from all applied chords
      const newChordNotes = new Set<string>()
      appliedChords.forEach(appliedChord => {
        if (appliedChord.noteKeys) {
          appliedChord.noteKeys.forEach((noteKey: string) => {
            newChordNotes.add(noteKey)
          })
        } else if (appliedChord.notes) {
          appliedChord.notes.forEach((note: any) => {
            if (note.__bassCoord) {
              const { stringIndex, fretIndex } = note.__bassCoord
              const noteKey = fretIndex === 0 ? `${stringIndex}-open` : `${stringIndex}-${fretIndex - 1}`
              newChordNotes.add(noteKey)
            }
          })
        }
      })

      if (newChordNotes.size > 0) {
        console.log('Bass: Setting chord notes from props:', newChordNotes)
        setChordSelectedNotes(newChordNotes)
        setSelectedNotes(prev => new Set([...prev, ...newChordNotes]))
      }
    }
    prevAppliedChordsLength.current = appliedChords?.length || 0
  }, [appliedChords])

  // Track previous clearTrigger to only clear on actual changes
  const prevClearTrigger = useRef(clearTrigger)

  useEffect(() => {
    if (clearTrigger !== undefined && clearTrigger > 0 && clearTrigger !== prevClearTrigger.current) {
      setStringCheckboxes(new Array(4).fill(false))
      setFretCheckboxes(new Array(25).fill(false))
      setSelectedNotes(new Set())
      setManualSelectedNotes(new Set())
      setScaleSelectedNotes(new Set())
      scaleSelectedNotesRef.current = new Set()
      setCurrentScale(null)
      setChordSelectedNotes(new Set())
      chordSelectedNotesRef.current = new Set()
      setCurrentChord(null)
    }
    prevClearTrigger.current = clearTrigger
  }, [clearTrigger])

  return (
    <div className={`bass-container ${disableNoteSelection ? 'practice-mode' : ''}`}>
      <div className={`bass-fretboard ${showNotes ? 'melody-active' : ''}`}>
        {/* Fret range dimming overlays */}
        {fretRangeLow !== undefined && fretRangeLow > 0 && (
          <div
            className="bass-fret-range-dim bass-fret-range-dim-left"
            style={{ width: `${fretRangeLow * 54}px` }}
          />
        )}
        {fretRangeHigh !== undefined && fretRangeHigh < 24 && (
          <div
            className="bass-fret-range-dim bass-fret-range-dim-right"
            style={{ left: `${fretRangeHigh * 54}px` }}
          />
        )}

        {/* Open fret checkbox */}
        {!disableNoteSelection && (
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
        )}

        {/* Frets */}
        {[...Array(24)].map((_, index) => (
          <div key={index} className="bass-fret" style={{ left: `${(index + 1) * 54}px` }}>
            <div className="bass-fret-wire"></div>
            {[3, 5, 7, 9, 15, 17, 19, 21].includes(index + 1) && (
              <div className="bass-fret-marker"></div>
            )}
            {(index + 1 === 12 || index + 1 === 24) && (
              <>
                <div className="bass-fret-marker bass-double-marker-1"></div>
                <div className="bass-fret-marker bass-double-marker-2"></div>
              </>
            )}
            {!disableNoteSelection && (
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
            )}
          </div>
        ))}

        {/* Strings */}
        {[...Array(4)].map((_, index) => {
          const stringHeights = [3.5, 4.5, 5.5, 6.5]
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

        {/* Clickable open string positions */}
        {[...Array(4)].map((_, stringIndex) => (
          <div
            key={`bass-open-string-${stringIndex}`}
            className="bass-fret-position bass-open-string-position"
            style={{
              left: `0px`,
              top: `${22 + stringIndex * 30 - 12}px`,
              width: `14px`,
              height: `24px`,
              opacity: isOpenStringSelected(stringIndex) ? 0 : undefined,
            }}
            onClick={() => handleOpenStringClick(stringIndex)}
            onMouseEnter={() => setHoveredNote({ string: stringIndex, fret: 0 })}
            onMouseLeave={() => setHoveredNote(null)}
          />
        ))}

        {/* Clickable fret positions */}
        {[...Array(4)].map((_, stringIndex) => (
          [...Array(24)].map((_, fretIndex) => (
            <div
              key={`bass-fret-position-${stringIndex}-${fretIndex}`}
              className="bass-fret-position"
              style={{
                left: `${fretIndex === 0 ? 15 + 3 : fretIndex * 54 + 3}px`,
                top: `${22 + stringIndex * 30 - 12}px`,
                width: `${fretIndex === 0 ? 54 - 18 : 54 - 6}px`,
                height: `24px`,
              }}
              onClick={() => handleNoteClick(stringIndex, fretIndex)}
              onMouseEnter={() => setHoveredNote({ string: stringIndex, fret: fretIndex + 1 })}
              onMouseLeave={() => setHoveredNote(null)}
            />
          ))
        ))}

        {/* String checkboxes */}
        {!disableNoteSelection && [...Array(4)].map((_, index) => (
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
            <label htmlFor={`bass-string-${index}`} className="bass-string-checkbox-label">{4 - index}</label>
          </div>
        ))}

        {/* Open string note visualization circles */}
        {[...Array(4)].map((_, stringIndex) => {
          if (!isOpenStringSelected(stringIndex)) return null

          const bassString = STRING_MAPPING[stringIndex]
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
          const isInChord = isOpenStringInCurrentChord(stringIndex)
          const isInManual = isOpenStringInManualLayer(stringIndex)

          // For chords, match by chord ID to get specific shape; otherwise check note IDs then names
          const noteKey = `${stringIndex}-open`
          const noteId = `b-s${stringIndex + 1}-f0` // Bass note ID format for open string
          let isCurrentlyPlaying = false
          if (showNotes) {
            // First priority: check by note ID for position-accurate matching
            if (currentlyPlayingNoteIds.length > 0 && currentlyPlayingNoteIds.includes(noteId)) {
              isCurrentlyPlaying = true
            } else if (currentlyPlayingChordId && appliedChords && appliedChords.length > 0) {
              // Second: check by chord ID to get specific shape
              const playingChord = appliedChords.find(c => c.id === currentlyPlayingChordId)
              if (playingChord && playingChord.noteKeys && playingChord.noteKeys.length > 0) {
                isCurrentlyPlaying = playingChord.noteKeys.includes(noteKey)
              } else if (currentlyPlayingNoteNames.length > 0) {
                // Fallback: chord found but no noteKeys, use note name
                isCurrentlyPlaying = currentlyPlayingNoteNames.includes(noteObj.name)
              }
            } else if (currentlyPlayingNoteNames.length > 0) {
              // Fallback: use note name matching (highlights all instances)
              isCurrentlyPlaying = currentlyPlayingNoteNames.includes(noteObj.name)
            }
          }

          let noteClass = 'bass-note-circle'
          if (isCurrentlyPlaying) {
            noteClass += ' currently-playing'
          } else if (isInGeneratedMelody) {
            noteClass += ' melody-note'
          } else {
            const isChordRoot = isChordRootNote(openNote.name, stringIndex, -1) && isInChord
            const isScaleRoot = isScaleRootNote(openNote.name, stringIndex, -1) && isInScale
            const isAnyRoot = isChordRoot || isScaleRoot

            // Manual note combinations with gradients
            if (isInManual) {
              if (isScaleRoot && isChordRoot) {
                // Both roots - just red + blue (no orange/purple for non-root notes)
                noteClass += ' manual-scale-root'
              } else if (isAnyRoot && isInChord && isInScale) {
                // Root + scale note + chord note - all 4 colors
                noteClass += ' manual-scale-chord-root-note'
              } else if (isAnyRoot && isInChord) {
                // Root + chord note - red + purple + blue
                noteClass += ' manual-chord-root-note'
              } else if (isInChord && isInScale) {
                // Scale note + chord note - purple + orange + blue
                noteClass += ' manual-scale-chord-note'
              } else if (isAnyRoot) {
                // Just root - red + blue
                noteClass += isScaleRoot ? ' manual-scale-root' : ' manual-chord-root'
              } else if (isInScale) {
                // Just scale - orange + blue
                noteClass += ' manual-scale-note'
              } else if (isInChord) {
                // Just chord - purple + blue
                noteClass += ' manual-chord-note'
              } else {
                // Just manual - blue
                noteClass += ' manual-note'
              }
            } else {
              // Non-manual combinations
              if (isChordRoot && isScaleRoot) {
                noteClass += ' chord-root-scale-root'
              } else if (isChordRoot && isInScale) {
                noteClass += ' chord-root-scale-note'
              } else if (isInChord && isScaleRoot) {
                noteClass += ' chord-note-scale-root'
              } else if (isChordRoot) {
                noteClass += ' chord-root-note'
              } else if (isScaleRoot) {
                noteClass += ' scale-root-note'
              } else if (isInChord && isInScale) {
                noteClass += ' chord-scale-note'
              } else if (isInChord) {
                noteClass += ' chord-note'
              } else if (isInScale) {
                noteClass += ' scale-note'
              }
            }
          }

          return (
            <div
              key={`bass-open-note-${stringIndex}`}
              className={noteClass}
              style={{
                left: `-3px`,
                top: `${22 + stringIndex * 30 - 11}px`,
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
            const isInChord = isNoteInCurrentChord(stringIndex, fretIndex)
            const isInManual = isNoteInManualLayer(stringIndex, fretIndex)

            // For chords, match by chord ID to get specific shape; otherwise check note IDs then names
            const noteKey = `${stringIndex}-${fretIndex}`
            const noteId = `b-s${stringIndex + 1}-f${fretIndex}` // Bass note ID format
            let isCurrentlyPlaying = false
            if (showNotes) {
              // First priority: check by note ID for position-accurate matching
              if (currentlyPlayingNoteIds.length > 0 && currentlyPlayingNoteIds.includes(noteId)) {
                isCurrentlyPlaying = true
              } else if (currentlyPlayingChordId && appliedChords && appliedChords.length > 0) {
                // Second: check by chord ID to get specific shape
                const playingChord = appliedChords.find(c => c.id === currentlyPlayingChordId)
                if (playingChord && playingChord.noteKeys && playingChord.noteKeys.length > 0) {
                  isCurrentlyPlaying = playingChord.noteKeys.includes(noteKey)
                } else if (currentlyPlayingNoteNames.length > 0) {
                  // Fallback: chord found but no noteKeys, use note name
                  isCurrentlyPlaying = currentlyPlayingNoteNames.includes(noteObj.name)
                }
              } else if (currentlyPlayingNoteNames.length > 0) {
                // Fallback: use note name matching (highlights all instances)
                isCurrentlyPlaying = currentlyPlayingNoteNames.includes(noteObj.name)
              }
            }

            let noteClass = 'bass-note-circle'
            if (isCurrentlyPlaying) {
              noteClass += ' currently-playing'
            } else if (isInGeneratedMelody) {
              noteClass += ' melody-note'
            } else {
              const isChordRoot = isChordRootNote(noteName, stringIndex, fretIndex) && isInChord
              const isScaleRoot = isScaleRootNote(noteName, stringIndex, fretIndex) && isInScale
              const isAnyRoot = isChordRoot || isScaleRoot

              // Manual note combinations with gradients
              if (isInManual) {
                if (isScaleRoot && isChordRoot) {
                  // Both roots - just red + blue (no orange/purple for non-root notes)
                  noteClass += ' manual-scale-root'
                } else if (isAnyRoot && isInChord && isInScale) {
                  // Root + scale note + chord note - all 4 colors
                  noteClass += ' manual-scale-chord-root-note'
                } else if (isAnyRoot && isInChord) {
                  // Root + chord note - red + purple + blue
                  noteClass += ' manual-chord-root-note'
                } else if (isInChord && isInScale) {
                  // Scale note + chord note - purple + orange + blue
                  noteClass += ' manual-scale-chord-note'
                } else if (isAnyRoot) {
                  // Just root - red + blue
                  noteClass += isScaleRoot ? ' manual-scale-root' : ' manual-chord-root'
                } else if (isInScale) {
                  // Just scale - orange + blue
                  noteClass += ' manual-scale-note'
                } else if (isInChord) {
                  // Just chord - purple + blue
                  noteClass += ' manual-chord-note'
                } else {
                  // Just manual - blue
                  noteClass += ' manual-note'
                }
              } else {
                // Non-manual combinations
                if (isChordRoot && isScaleRoot) {
                  noteClass += ' chord-root-scale-root'
                } else if (isChordRoot && isInScale) {
                  noteClass += ' chord-root-scale-note'
                } else if (isInChord && isScaleRoot) {
                  noteClass += ' chord-note-scale-root'
                } else if (isChordRoot) {
                  noteClass += ' chord-root-note'
                } else if (isScaleRoot) {
                  noteClass += ' scale-root-note'
                } else if (isInChord && isInScale) {
                  noteClass += ' chord-scale-note'
                } else if (isInChord) {
                  noteClass += ' chord-note'
                } else if (isInScale) {
                  noteClass += ' scale-note'
                }
              }
            }

            return (
              <div
                key={`bass-note-${stringIndex}-${fretIndex}`}
                className={noteClass}
                style={{
                  left: `${fretIndex === 0 ? 27 : (fretIndex + 1) * 54 - 35}px`,
                  top: `${22 + stringIndex * 30 - 11}px`,
                }}
              >
                <span className="bass-note-name">
                  {noteName}
                </span>
              </div>
            )
          })
        )}

        {/* Preview note visualization circles */}
        {[...Array(4)].map((_, stringIndex) =>
          [...Array(25)].map((_, fretIndex) => {
            const adjustedFretIndex = fretIndex === 0 ? 0 : fretIndex - 1
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
              ? getNoteForStringAndFret(stringIndex, -1)
              : getNoteForStringAndFret(stringIndex, fretIndex - 1)

            return (
              <div
                key={`bass-preview-note-${stringIndex}-${fretIndex}`}
                className="bass-note-circle preview"
                style={{
                  left: fretIndex === 0
                    ? `-2.5px`
                    : fretIndex === 1
                    ? `${fretIndex * 54 - 35 + 9}px`
                    : `${fretIndex * 54 - 35}px`,
                  top: `${22 + stringIndex * 30 - 11}px`,
                }}
              >
                <span className="bass-note-name">
                  {noteName}
                </span>
              </div>
            )
          })
        )}

        {/* Scale/Chord menu preview circles */}
        {previewPositions?.positions?.map((pos, idx) => {
          // Check if this position is already selected (don't show preview for already selected notes)
          // Note: Applied scales/chords use fretIndex-1 for storage, so we must match that format
          const noteKey = pos.fretIndex === 0 ? `${pos.stringIndex}-open` : `${pos.stringIndex}-${pos.fretIndex - 1}`
          const isAlreadySelected = selectedNotes.has(noteKey) || scaleSelectedNotes.has(noteKey) || chordSelectedNotes.has(noteKey)
          if (isAlreadySelected) return null

          // Determine preview type class
          const isRoot = previewPositions.rootPositions?.some(
            rp => rp.stringIndex === pos.stringIndex && rp.fretIndex === pos.fretIndex
          ) ?? false
          const previewClass = previewPositions.isChord
            ? (isRoot ? 'chord-root-note' : 'chord-note')
            : (isRoot ? 'scale-root-note' : 'scale-note')

          const noteName = pos.fretIndex === 0
            ? getNoteForStringAndFret(pos.stringIndex, -1)
            : getNoteForStringAndFret(pos.stringIndex, pos.fretIndex - 1)

          // Calculate position - fretIndex from preview is the actual fret (0 = open, 1-24 = frets)
          // Open string: -3px, Fret 1: 27px, Frets 2+: fret * 54 - 35
          const leftPosition = pos.fretIndex === 0
            ? -3
            : pos.fretIndex === 1
            ? 27
            : pos.fretIndex * 54 - 35

          return (
            <div
              key={`bass-menu-preview-${pos.stringIndex}-${pos.fretIndex}-${idx}`}
              className={`bass-note-circle preview ${previewClass}`}
              style={{
                left: `${leftPosition}px`,
                top: `${22 + pos.stringIndex * 30 - 11}px`,
              }}
            >
              <span className="bass-note-name">
                {noteName}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default Bass
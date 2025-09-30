import React, { useState, useEffect, useCallback } from 'react'
import '../../styles/Bass.css'
import { bassNotes } from '../../utils/bassNotes'
import { applyScaleToBass, applyScaleBoxToBass, BASS_SCALES, type BassScale, type BassScaleBox } from '../../utils/bassScales'
import { applyChordToBass, applyBassChordShapeToBass, type BassChord, type BassChordShape } from '../../utils/bassChords'
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
    handleScaleDelete: (rootNote: string, scale: BassScale) => void;
  }) => void
  onChordHandlersReady?: (handlers: {
    handleChordSelect: (rootNote: string, chord: BassChord) => void;
    handleChordShapeSelect: (chordShape: BassChordShape & { root?: string }) => void;
    handleClearChord: () => void;
    handleRemoveChordNotes: (noteKeys: string[]) => void;
  }) => void
}

const Bass: React.FC<BassProps> = ({ setBassNotes, isInMelody, showNotes, onNoteClick, clearTrigger, onScaleHandlersReady, onChordHandlersReady }) => {
  const [stringCheckboxes, setStringCheckboxes] = useState<boolean[]>(new Array(4).fill(false))
  const [fretCheckboxes, setFretCheckboxes] = useState<boolean[]>(new Array(25).fill(false))
  const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set())
  const [manualSelectedNotes, setManualSelectedNotes] = useState<Set<string>>(new Set())
  const [currentScale, setCurrentScale] = useState<{ root: string; scale: BassScale } | null>(null)
  const [appliedScales, setAppliedScales] = useState<{ root: string; scale: BassScale; notes: Set<string> }[]>([])
  const [scaleSelectedNotes, setScaleSelectedNotes] = useState<Set<string>>(new Set())
  const [currentChord, setCurrentChord] = useState<{ root: string; chord: BassChord } | null>(null)
  const [chordSelectedNotes, setChordSelectedNotes] = useState<Set<string>>(new Set())
  const [hoveredString, setHoveredString] = useState<number | null>(null)
  const [hoveredFret, setHoveredFret] = useState<number | null>(null)
  const [hoveredNote, setHoveredNote] = useState<{ string: number; fret: number } | null>(null)

  const handleStringCheckboxChange = (index: number) => {
    // No functionality
  }

  const handleFretCheckboxChange = (index: number) => {
    // No functionality
  }

  // Get note name for a specific string and fret
  const getNoteForStringAndFret = useCallback((stringIndex: number, fretIndex: number): string => {
    const stringMapping = [1, 2, 3, 4]
    const bassString = stringMapping[stringIndex]
    const fret = fretIndex + 1
    const note = bassNotes.find(note => note.string === bassString && note.fret === fret)
    return note ? note.name : ''
  }, [])

  // Handle clicking on open strings (fret 0)
  const handleOpenStringClick = async (stringIndex: number) => {
    // No functionality
  }

  // Handle clicking on individual fret positions
  const handleNoteClick = async (stringIndex: number, fretIndex: number) => {
    // No functionality
  }

  // Check if a specific note is selected
  const isNoteSelected = useCallback((stringIndex: number, fretIndex: number): boolean => {
    return false
  }, [])

  // Check if an open string is selected (considering all layers)
  const isOpenStringSelected = useCallback((stringIndex: number): boolean => {
    return false
  }, [])

  // Convert bass notes to the Note format expected by the melody system
  const convertToMelodyNotes = useCallback((): Note[] => {
    return []
  }, [])

  // Sync bass selections with parent component for deselect all button visibility
  useEffect(() => {
    const melodyNotes = convertToMelodyNotes()
    setBassNotes(melodyNotes)
  }, [selectedNotes, stringCheckboxes, fretCheckboxes, convertToMelodyNotes, setBassNotes])

  // Handle scale selection
  const handleScaleSelect = useCallback((rootNote: string, scale: BassScale) => {
    // No functionality
  }, [])

  // Handle scale deletion
  const handleScaleDelete = useCallback((rootNote: string, scale: BassScale) => {
    // No functionality
  }, [])

  // Handle scale box selection
  const handleScaleBoxSelect = useCallback((scaleBox: BassScaleBox) => {
    // No functionality
  }, [])

  // Handle clearing scale
  const handleClearScale = useCallback(() => {
    // No functionality
  }, [])

  // Handle chord selection
  const handleChordSelect = useCallback((rootNote: string, chord: BassChord) => {
    // No functionality
  }, [])

  // Handle chord shape selection
  const handleChordShapeSelect = useCallback((chordShape: BassChordShape & { root?: string }) => {
    // No functionality
  }, [])

  // Handle clearing chord
  const handleClearChord = useCallback(() => {
    // No functionality
  }, [])

  // Handle removing specific chord notes
  const handleRemoveChordNotes = useCallback((noteKeys: string[]) => {
    // No functionality
  }, [])

  // Handle removing chord notes only
  const handleRemoveChordNotesOnly = useCallback((noteKeys: string[]) => {
    // No functionality
  }, [])

  // Check if a note was selected as part of the current scale application
  const isNoteInCurrentScale = (stringIndex: number, fretIndex: number): boolean => {
    return false
  }

  // Check if an open string was selected as part of the current scale application
  const isOpenStringInCurrentScale = (stringIndex: number): boolean => {
    return false
  }

  // Check if a note is the root note of any applied scale
  const isScaleRootNote = (noteName: string): boolean => {
    return false
  }

  // Check if a note is the root note of the current chord
  const isChordRootNote = (noteName: string): boolean => {
    return false
  }

  // Check if a note is the root note of the current scale or chord
  const isRootNote = (noteName: string): boolean => {
    return false
  }

  // Check if a note was selected as part of the current chord application
  const isNoteInCurrentChord = (stringIndex: number, fretIndex: number): boolean => {
    return false
  }

  // Check if an open string was selected as part of the current chord application
  const isOpenStringInCurrentChord = (stringIndex: number): boolean => {
    return false
  }

  // Check if a note should show preview on string hover
  const shouldShowStringPreview = (stringIndex: number): boolean => {
    return false
  }

  // Check if a note should show preview on fret hover
  const shouldShowFretPreview = (fretIndex: number): boolean => {
    return false
  }

  // Check if a specific note should show preview on individual note hover
  const shouldShowNotePreview = (stringIndex: number, fretIndex: number): boolean => {
    return false
  }

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
      setStringCheckboxes(new Array(4).fill(false))
      setFretCheckboxes(new Array(25).fill(false))
      setSelectedNotes(new Set())
      setScaleSelectedNotes(new Set())
      setCurrentScale(null)
      setChordSelectedNotes(new Set())
      setCurrentChord(null)
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
          <div key={index} className="bass-fret" style={{ left: `${(index + 1) * 54}px` }}>
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

        {/* Clickable open string positions (fret 0) - always present like regular fret positions */}
        {[...Array(4)].map((_, stringIndex) => (
          <div
            key={`bass-open-string-${stringIndex}`}
            className="bass-fret-position bass-open-string-position"
            style={{
              left: `0px`, // At the very left edge
              top: `${22 + stringIndex * 30 - 12}px`,
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
        {[...Array(4)].map((_, stringIndex) => (
          [...Array(24)].map((_, fretIndex) => (
            <div
              key={`bass-fret-position-${stringIndex}-${fretIndex}`}
              className="bass-fret-position"
              style={{
                left: `${fretIndex === 0 ? 15 + 3 : fretIndex * 54 + 3}px`, // Start after open string area for first fret
                top: `${22 + stringIndex * 30 - 12}px`, // Expand height above and below string
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
          const isInChord = isOpenStringInCurrentChord(stringIndex)

          let noteClass = 'bass-note-circle'
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
            const isInChord = isNoteInCurrentChord(stringIndex, fretIndex)

            let noteClass = 'bass-note-circle'
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
                key={`bass-note-${stringIndex}-${fretIndex}`}
                className={noteClass}
                style={{
                  left: `${fretIndex === 0 ? 27 : (fretIndex + 1) * 54 - 35}px`, // Center first fret in its area, others align with checkboxes
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
                key={`bass-preview-note-${stringIndex}-${fretIndex}`}
                className="bass-note-circle preview"
                style={{
                  left: fretIndex === 0
                    ? `-2.5px` // Open string position
                    : fretIndex === 1
                    ? `${fretIndex * 54 - 35 + 9}px` // First fret moved right by 9px
                    : `${fretIndex * 54 - 35}px`, // Regular fret position
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
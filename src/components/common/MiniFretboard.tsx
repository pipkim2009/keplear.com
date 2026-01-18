import React from 'react'
import { guitarNotes } from '../../utils/instruments/guitar/guitarNotes'
import { bassNotes } from '../../utils/instruments/bass/bassNotes'
import '../../styles/MiniFretboard.css'

interface MiniFretboardProps {
  noteKeys: string[]
  instrument: 'guitar' | 'bass'
  root: string
  mode?: 'scale' | 'chord'
}

const MiniFretboard: React.FC<MiniFretboardProps> = ({ noteKeys, instrument, root, mode = 'scale' }) => {
  const stringCount = instrument === 'guitar' ? 6 : 4
  const notesData = instrument === 'guitar' ? guitarNotes : bassNotes

  // Parse noteKeys to get positions: format is "stringIndex-fret" or "stringIndex-open"
  const positions = noteKeys.map(key => {
    const parts = key.split('-')
    const stringIndex = parseInt(parts[0], 10)
    const fret = parts[1] === 'open' ? 0 : parseInt(parts[1], 10) + 1 // +1 because noteKey uses 0-indexed frets
    return { stringIndex, fret }
  }).filter(p => !isNaN(p.stringIndex) && !isNaN(p.fret))

  if (positions.length === 0) {
    return <div className="mini-fretboard-empty">No positions available</div>
  }

  // Determine fret range
  const frets = positions.map(p => p.fret)
  const minFret = Math.min(...frets)
  const maxFret = Math.max(...frets)

  // Show at least 4 frets, expand range if needed
  const hasOpenStrings = minFret === 0
  const startFret = hasOpenStrings ? 0 : Math.max(0, minFret - 1)
  const endFret = Math.max(startFret + 4, maxFret + 1)

  // Generate fret numbers to display
  const fretNumbers = []
  for (let f = startFret; f <= endFret; f++) {
    fretNumbers.push(f)
  }

  // Find root note positions
  const isRootPosition = (stringIndex: number, fret: number): boolean => {
    const note = notesData.find(n => {
      if (instrument === 'guitar') {
        const stringIdx = 6 - n.string
        return stringIdx === stringIndex && n.fret === fret
      } else {
        const stringIdx = 4 - n.string
        return stringIdx === stringIndex && n.fret === fret
      }
    })
    return note ? note.name.replace(/\d+$/, '') === root : false
  }

  // Check if a position has a note
  const hasNoteAt = (stringIndex: number, fret: number): boolean => {
    return positions.some(p => p.stringIndex === stringIndex && p.fret === fret)
  }

  // String labels (high to low for display)
  const stringLabels = instrument === 'guitar'
    ? ['e', 'B', 'G', 'D', 'A', 'E']
    : ['G', 'D', 'A', 'E']

  return (
    <div className={`mini-fretboard ${mode === 'chord' ? 'chord-mode' : ''}`}>
      {/* String labels on the left */}
      <div className="mini-fretboard-string-labels">
        {stringLabels.map((label, i) => (
          <div key={i} className="mini-string-label">{label}</div>
        ))}
      </div>

      {/* Fretboard */}
      <div className="mini-fretboard-board">
        {/* Fret numbers at top */}
        <div className="mini-fret-numbers">
          {fretNumbers.map(fret => (
            <div key={fret} className={`mini-fret-number ${fret === 0 ? 'open' : ''}`}>
              {fret}
            </div>
          ))}
        </div>

        {/* Strings and notes */}
        <div className="mini-fretboard-strings">
          {Array.from({ length: stringCount }, (_, stringIndex) => (
            <div key={stringIndex} className="mini-string-row">
              <div className="mini-string-line"></div>
              {fretNumbers.map(fret => {
                const hasNote = hasNoteAt(stringIndex, fret)
                const isRoot = hasNote && isRootPosition(stringIndex, fret)
                return (
                  <div
                    key={fret}
                    className={`mini-fret-position ${fret === 0 ? 'open' : ''}`}
                  >
                    {hasNote && (
                      <div className={`mini-note-circle ${isRoot ? 'root' : ''}`}></div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        {/* Fret wires */}
        <div className="mini-fret-wires">
          {fretNumbers.map(fret => (
            <div key={fret} className={`mini-fret-wire ${fret === 0 ? 'nut' : ''}`}></div>
          ))}
        </div>

        {/* Fret markers */}
        <div className="mini-fret-markers">
          {fretNumbers.map(fret => {
            const showSingleMarker = [3, 5, 7, 9, 15, 17, 19, 21].includes(fret)
            const showDoubleMarker = [12, 24].includes(fret)
            return (
              <div key={fret} className="mini-marker-slot">
                {showSingleMarker && <div className="mini-fret-marker"></div>}
                {showDoubleMarker && (
                  <>
                    <div className="mini-fret-marker double-1"></div>
                    <div className="mini-fret-marker double-2"></div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default MiniFretboard

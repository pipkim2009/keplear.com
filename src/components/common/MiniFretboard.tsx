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

  // Parse noteKeys to get positions
  const positions = noteKeys.map(key => {
    const parts = key.split('-')
    const stringIndex = parseInt(parts[0], 10)
    const fret = parts[1] === 'open' ? 0 : parseInt(parts[1], 10) + 1
    return { stringIndex, fret }
  }).filter(p => !isNaN(p.stringIndex) && !isNaN(p.fret))

  if (positions.length === 0) {
    return <div className="mini-fretboard-empty">No positions available</div>
  }

  // Determine fret range
  const frets = positions.map(p => p.fret)
  const minFret = Math.min(...frets)
  const maxFret = Math.max(...frets)
  const hasOpenStrings = minFret === 0

  // Calculate display range - always show at least 4 frets
  // For scales (which span all frets), limit to first position (frets 0-4)
  const startFret = hasOpenStrings ? 1 : Math.max(1, minFret)
  const maxDisplayFrets = 4
  const endFret = mode === 'scale' && (maxFret - startFret) > maxDisplayFrets
    ? startFret + maxDisplayFrets - 1
    : Math.max(startFret + 3, maxFret)

  // Find root positions
  const isRootPosition = (stringIndex: number, fret: number): boolean => {
    const note = notesData.find(n => {
      const stringIdx = instrument === 'guitar' ? 6 - n.string : 4 - n.string
      return stringIdx === stringIndex && n.fret === fret
    })
    return note ? note.name.replace(/\d+$/, '') === root : false
  }

  // Filter positions to only include those within the display range
  const displayPositions = positions.filter(p =>
    p.fret === 0 || (p.fret >= startFret && p.fret <= endFret)
  )

  const hasNoteAt = (stringIndex: number, fret: number): boolean => {
    return displayPositions.some(p => p.stringIndex === stringIndex && p.fret === fret)
  }

  // Get note name for a position (includes octave number)
  const getNoteName = (stringIndex: number, fret: number): string => {
    const note = notesData.find(n => {
      const stringIdx = instrument === 'guitar' ? 6 - n.string : 4 - n.string
      return stringIdx === stringIndex && n.fret === fret
    })
    return note ? note.name : ''
  }

  // Fret width and string spacing (same ratios as main fretboard)
  const fretWidth = 54
  const stringSpacing = 28
  const fretCount = endFret - startFret + 1
  const totalWidth = fretCount * fretWidth
  const totalHeight = stringCount * stringSpacing

  return (
    <div className="mini-fretboard">
      <div
        className="mini-fb"
        style={{
          width: `${totalWidth}px`,
          height: `${totalHeight}px`
        }}
      >
        {/* Open string positions - individual boxes per string */}
        {hasOpenStrings && Array.from({ length: stringCount }, (_, i) => (
          <div
            key={`open-pos-${i}`}
            className="mini-fb-open-position"
            style={{ top: `${14 + i * stringSpacing - 12}px` }}
          />
        ))}

        {/* Strings */}
        {Array.from({ length: stringCount }, (_, i) => (
          <div
            key={`string-${i}`}
            className={`mini-fb-string mini-fb-string-${i + 1}`}
            style={{ top: `${14 + i * stringSpacing}px` }}
          />
        ))}

        {/* Frets */}
        {Array.from({ length: fretCount }, (_, i) => {
          const fretNum = startFret + i
          return (
            <div
              key={`fret-${fretNum}`}
              className="mini-fb-fret"
              style={{ left: `${(i + 1) * fretWidth}px` }}
            >
              <div className="mini-fb-fret-wire"></div>
              {/* Fret markers */}
              {[3, 5, 7, 9, 15, 17, 19, 21].includes(fretNum) && (
                <div className="mini-fb-fret-marker"></div>
              )}
              {[12, 24].includes(fretNum) && (
                <>
                  <div className="mini-fb-fret-marker mini-fb-double-1"></div>
                  <div className="mini-fb-fret-marker mini-fb-double-2"></div>
                </>
              )}
            </div>
          )
        })}

        {/* Fret numbers */}
        {Array.from({ length: fretCount }, (_, i) => {
          const fretNum = startFret + i
          return (
            <div
              key={`fret-num-${fretNum}`}
              className="mini-fb-fret-number"
              style={{ left: `${i * fretWidth + fretWidth / 2}px` }}
            >
              {fretNum}
            </div>
          )
        })}

        {/* String numbers */}
        {Array.from({ length: stringCount }, (_, i) => (
          <div
            key={`string-num-${i}`}
            className="mini-fb-string-number"
            style={{ top: `${14 + i * stringSpacing}px` }}
          >
            {instrument === 'guitar' ? 6 - i : 4 - i}
          </div>
        ))}

        {/* Open string notes */}
        {hasOpenStrings && Array.from({ length: stringCount }, (_, stringIndex) => {
          if (!hasNoteAt(stringIndex, 0)) return null
          const isRoot = isRootPosition(stringIndex, 0)
          const noteClass = mode === 'chord'
            ? (isRoot ? 'chord-root-note' : 'chord-note')
            : (isRoot ? 'scale-root-note' : 'scale-note')
          const noteName = getNoteName(stringIndex, 0)
          return (
            <div
              key={`open-note-${stringIndex}`}
              className={`mini-fb-note ${noteClass}`}
              style={{
                left: `-3px`,
                top: `${14 + stringIndex * stringSpacing - 10}px`
              }}
            >
              <span className="note-name">{noteName}</span>
            </div>
          )
        })}

        {/* Fretted notes */}
        {Array.from({ length: stringCount }, (_, stringIndex) =>
          Array.from({ length: fretCount }, (_, fretIdx) => {
            const fret = startFret + fretIdx
            if (!hasNoteAt(stringIndex, fret)) return null
            const isRoot = isRootPosition(stringIndex, fret)
            const noteClass = mode === 'chord'
              ? (isRoot ? 'chord-root-note' : 'chord-note')
              : (isRoot ? 'scale-root-note' : 'scale-note')
            const noteName = getNoteName(stringIndex, fret)
            return (
              <div
                key={`note-${stringIndex}-${fret}`}
                className={`mini-fb-note ${noteClass}`}
                style={{
                  left: `${fretIdx * fretWidth + fretWidth / 2 - 10}px`,
                  top: `${14 + stringIndex * stringSpacing - 10}px`
                }}
              >
                <span className="note-name">{noteName}</span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default MiniFretboard

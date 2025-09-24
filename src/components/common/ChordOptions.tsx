import React, { useState, useEffect } from 'react'
import { CHORD_ROOT_NOTES, GUITAR_CHORDS, getChordShapes, type GuitarChord, type ChordShape } from '../../utils/guitarChords'
import { guitarNotes } from '../../utils/guitarNotes'
import { BASS_CHORD_ROOT_NOTES, BASS_CHORDS, getBassChordShapes, type BassChord, type BassChordShape } from '../../utils/bassChords'
import { bassNotes } from '../../utils/bassNotes'
import { KEYBOARD_CHORDS, type KeyboardChord } from '../../utils/keyboardChords'
import '../../styles/ScaleOptions.css'

interface ChordOptionsProps {
  instrument: string
  selectedRoot?: string
  onRootChange?: (rootNote: string) => void
  onChordSelect?: (rootNote: string, chord: GuitarChord) => void
  onChordShapeSelect?: (chordShape: ChordShape) => void
  onKeyboardChordApply?: (rootNote: string, chord: KeyboardChord) => void
}

const ChordOptions: React.FC<ChordOptionsProps> = ({
  instrument,
  selectedRoot = 'C',
  onRootChange,
  onChordSelect,
  onChordShapeSelect,
  onKeyboardChordApply
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [selectedChord, setSelectedChord] = useState<GuitarChord>(GUITAR_CHORDS[0])
  const [selectedBassChord, setSelectedBassChord] = useState<BassChord>(BASS_CHORDS[0])
  const [keyboardSelectedChord, setKeyboardSelectedChord] = useState<KeyboardChord>(KEYBOARD_CHORDS[0])
  const [availableShapes, setAvailableShapes] = useState<ChordShape[]>([])
  const [availableBassShapes, setAvailableBassShapes] = useState<BassChordShape[]>([])
  const [selectedShapeIndex, setSelectedShapeIndex] = useState<number>(0)
  const [showShapes, setShowShapes] = useState<boolean>(true)

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded)
  }

  // Update available shapes when root or chord changes
  useEffect(() => {
    if (instrument === 'guitar') {
      const shapes = getChordShapes(selectedRoot, selectedChord, guitarNotes)
      setAvailableShapes(shapes)
      setSelectedShapeIndex(0)
    } else if (instrument === 'bass') {
      const shapes = getBassChordShapes(selectedRoot, selectedBassChord, bassNotes)
      setAvailableBassShapes(shapes)
      setSelectedShapeIndex(0)
    }
  }, [selectedRoot, selectedChord, selectedBassChord, instrument])

  const handleChordChange = (chord: GuitarChord) => {
    setSelectedChord(chord)
  }

  const handleBassChordChange = (chord: BassChord) => {
    setSelectedBassChord(chord)
  }

  const handleKeyboardChordChange = (chord: KeyboardChord) => {
    setKeyboardSelectedChord(chord)
  }

  const handleShapeChange = (shapeIndex: number) => {
    setSelectedShapeIndex(shapeIndex)
    // If "All Shapes" is selected (index equals availableShapes.length), use full chord
    const currentShapes = instrument === 'bass' ? availableBassShapes : availableShapes
    if (shapeIndex >= currentShapes.length) {
      setShowShapes(false)
    } else {
      setShowShapes(true)
    }
  }

  const handleApplyChord = () => {
    if (instrument === 'guitar') {
      if (showShapes && availableShapes.length > 0 && onChordShapeSelect) {
        // Add root note context to chord shape
        const chordShapeWithRoot = { ...availableShapes[selectedShapeIndex], root: selectedRoot }
        onChordShapeSelect(chordShapeWithRoot as any)
      } else if (onChordSelect) {
        onChordSelect(selectedRoot, selectedChord)
      }
    } else if (instrument === 'bass') {
      if (showShapes && availableBassShapes.length > 0 && onChordShapeSelect) {
        // Add root note context to bass chord shape
        const bassChordShapeWithRoot = { ...availableBassShapes[selectedShapeIndex], root: selectedRoot }
        onChordShapeSelect(bassChordShapeWithRoot as any)
      } else if (onChordSelect) {
        onChordSelect(selectedRoot, selectedBassChord as any)
      }
    } else if (instrument === 'keyboard' && onKeyboardChordApply) {
      onKeyboardChordApply(selectedRoot, keyboardSelectedChord)
    }
  }

  return (
    <div className={`scale-options-container ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <button
        className="scale-options-toggle"
        onClick={toggleExpanded}
        title={isExpanded ? 'Collapse Chord Options' : 'Expand Chord Options'}
      >
        {isExpanded ? '▼' : '▶'}
        <span className="toggle-text">{isExpanded ? 'Chord Options' : '\u00A0\u00A0\u00A0Chord Options'}</span>
      </button>

      {isExpanded && (
        <div className="scale-options-content">
          <div className="scale-controls">
            <div className="control-section">
              <label className="control-label">Root Note</label>
              <select
                value={selectedRoot}
                onChange={(e) => onRootChange && onRootChange(e.target.value)}
                className="control-select"
              >
                {(instrument === 'bass' ? BASS_CHORD_ROOT_NOTES : CHORD_ROOT_NOTES).map(note => (
                  <option key={note} value={note}>{note}</option>
                ))}
              </select>
            </div>

            <div className="control-section">
              <label className="control-label">Chord</label>
              <select
                value={instrument === 'guitar' ? selectedChord.name : instrument === 'bass' ? selectedBassChord.name : keyboardSelectedChord.name}
                onChange={(e) => {
                  if (instrument === 'guitar') {
                    const chord = GUITAR_CHORDS.find(c => c.name === e.target.value)
                    if (chord) handleChordChange(chord)
                  } else if (instrument === 'bass') {
                    const chord = BASS_CHORDS.find(c => c.name === e.target.value)
                    if (chord) handleBassChordChange(chord)
                  } else {
                    const chord = KEYBOARD_CHORDS.find(c => c.name === e.target.value)
                    if (chord) handleKeyboardChordChange(chord)
                  }
                }}
                className="control-select"
              >
                {(instrument === 'guitar' ? GUITAR_CHORDS : instrument === 'bass' ? BASS_CHORDS : KEYBOARD_CHORDS).map(chord => (
                  <option key={chord.name} value={chord.name}>{chord.name}</option>
                ))}
              </select>
            </div>

            {instrument === 'guitar' && availableShapes.length > 0 && (
              <div className="control-section">
                <label className="control-label">Shape</label>
                <select
                  value={selectedShapeIndex}
                  onChange={(e) => handleShapeChange(parseInt(e.target.value))}
                  className="control-select"
                >
                  {availableShapes.map((shape, index) => (
                    <option key={index} value={index}>
                      {shape.name} ({shape.difficulty})
                    </option>
                  ))}
                  <option key="all" value={availableShapes.length}>
                    All Fretboard
                  </option>
                </select>
              </div>
            )}

            {instrument === 'bass' && availableBassShapes.length > 0 && (
              <div className="control-section">
                <label className="control-label">Shape</label>
                <select
                  value={selectedShapeIndex}
                  onChange={(e) => handleShapeChange(parseInt(e.target.value))}
                  className="control-select"
                >
                  {availableBassShapes.map((shape, index) => (
                    <option key={index} value={index}>
                      {shape.name} ({shape.difficulty})
                    </option>
                  ))}
                  <option key="all" value={availableBassShapes.length}>
                    All Fretboard
                  </option>
                </select>
              </div>
            )}

            <div className="control-section">
              <button
                onClick={handleApplyChord}
                className="apply-button"
                title={`Apply chord to ${instrument}`}
              >
                Apply Chord
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ChordOptions
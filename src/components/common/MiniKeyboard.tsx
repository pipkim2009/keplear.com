import React, { useState } from 'react'
import '../../styles/MiniKeyboard.css'
import '../../styles/Controls.css'
import Tooltip from './Tooltip'
import { useTranslation } from '../../contexts/TranslationContext'

interface MiniKeyboardProps {
  notes: { name: string }[]
  root: string
  mode?: 'scale' | 'chord'
  playingNotes?: string[]  // Note names that are currently playing
}

// Standard piano key pattern for one octave
const WHITE_KEYS = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
const BLACK_KEYS = ['C#', 'D#', 'F#', 'G#', 'A#']
const BLACK_KEY_POSITIONS: Record<string, number> = {
  'C#': 0, 'D#': 1, 'F#': 3, 'G#': 4, 'A#': 5
}

const MiniKeyboard: React.FC<MiniKeyboardProps> = ({ notes, root, mode = 'scale', playingNotes = [] }) => {
  const { t } = useTranslation()

  // Determine available octaves from notes
  const availableOctaves = notes
    .map(n => {
      const match = n.name.match(/\d+$/)
      return match ? parseInt(match[0], 10) : 4
    })
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort((a, b) => a - b)

  const minAvailableOctave = availableOctaves[0] || 4
  const maxAvailableOctave = availableOctaves[availableOctaves.length - 1] || 4
  const [selectedOctave, setSelectedOctave] = useState(minAvailableOctave)

  if (!notes || notes.length === 0) {
    return <div className="mini-keyboard-empty">{t('sandbox.noNotesAvailable')}</div>
  }

  // Extract note names without octave numbers
  const noteNames = notes.map(n => n.name.replace(/\d+$/, ''))

  const whiteKeyWidth = 32
  const whiteKeyHeight = 90
  const blackKeyWidth = 20
  const blackKeyHeight = 55
  const totalWidth = 7 * whiteKeyWidth

  // Check if a note is in the chord/scale
  const isNoteActive = (noteName: string): boolean => {
    return noteNames.includes(noteName)
  }

  // Check if a note is the root
  const isRootNote = (noteName: string): boolean => {
    return noteName === root
  }

  // Check if a note is currently playing
  const isNotePlaying = (noteName: string, octave: number): boolean => {
    const fullNoteName = `${noteName}${octave}`
    return playingNotes.includes(fullNoteName)
  }

  // Get class for a key
  const getKeyClass = (noteName: string, isBlack: boolean, octave: number): string => {
    const baseClass = isBlack ? 'mini-kb-black-key' : 'mini-kb-white-key'
    if (!isNoteActive(noteName)) return baseClass

    const isRoot = isRootNote(noteName)
    const isPlaying = isNotePlaying(noteName, octave)
    let classes = baseClass

    if (mode === 'chord') {
      classes += ` ${isRoot ? 'chord-root-note' : 'chord-note'}`
    } else {
      classes += ` ${isRoot ? 'scale-root-note' : 'scale-note'}`
    }

    if (isPlaying) {
      classes += ' playing'
    }

    return classes
  }

  // Calculate dim percentages for keyboard visual
  const leftDimPercent = ((selectedOctave - 1) / 8) * 100
  const rightDimPercent = ((8 - selectedOctave) / 8) * 100

  return (
    <div className="mini-keyboard">
      {/* Octave range selector */}
      <div className="control-group octave-range-control">
        <div className="label-with-tooltip">
          <label className="control-label">{t('sandbox.octaveRange')}</label>
          <Tooltip title={t('sandbox.octaveRange')} text={t('sandbox.octaveRangeTooltip')}>
            <div className="tooltip-icon">?</div>
          </Tooltip>
        </div>
        <div className="octave-range-slider slider-hidden">
          <div className="range-labels-center">
            <span className="range-label-center">
              {selectedOctave} - {selectedOctave}
            </span>
          </div>
          <div className="octave-visual">
            <div className="keyboard-range-container">
              <img
                src="/Keyboard.png"
                alt="Keyboard octave range"
                className="keyboard-range-image"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect()
                  const clickX = e.clientX - rect.left
                  const clickPercent = clickX / rect.width
                  const clickedOctave = Math.round(clickPercent * 8) + 1
                  const clampedOctave = Math.max(minAvailableOctave, Math.min(maxAvailableOctave, clickedOctave))
                  setSelectedOctave(clampedOctave)
                }}
                style={{ cursor: 'pointer' }}
              />
              <div
                className="keyboard-dim-overlay keyboard-dim-left"
                style={{ width: `${leftDimPercent}%` }}
              />
              <div
                className="keyboard-dim-overlay keyboard-dim-right"
                style={{ width: `${rightDimPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mini-kb" style={{ width: `${totalWidth}px`, height: `${whiteKeyHeight}px` }}>
        {/* White keys */}
        {WHITE_KEYS.map((note, keyIdx) => {
          const noteName = note
          const fullNoteName = `${note}${selectedOctave}`
          const displayName = fullNoteName
          return (
            <div
              key={`white-${selectedOctave}-${note}`}
              className={getKeyClass(noteName, false, selectedOctave)}
              style={{
                left: `${keyIdx * whiteKeyWidth}px`,
                width: `${whiteKeyWidth}px`,
                height: `${whiteKeyHeight}px`
              }}
            >
              <span className="mini-kb-note-label">{displayName}</span>
            </div>
          )
        })}

        {/* Black keys */}
        {BLACK_KEYS.map((note) => {
          const noteName = note
          const fullNoteName = `${note}${selectedOctave}`
          const displayName = fullNoteName
          const position = BLACK_KEY_POSITIONS[note]
          // Black key position: between white keys
          const leftOffset = position * whiteKeyWidth + whiteKeyWidth - blackKeyWidth / 2
          return (
            <div
              key={`black-${selectedOctave}-${note}`}
              className={getKeyClass(noteName, true, selectedOctave)}
              style={{
                left: `${leftOffset}px`,
                width: `${blackKeyWidth}px`,
                height: `${blackKeyHeight}px`
              }}
            >
              <span className="mini-kb-note-label">{displayName}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default MiniKeyboard

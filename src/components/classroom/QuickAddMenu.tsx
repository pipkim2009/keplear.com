/**
 * QuickAddMenu - Dropdown for adding Warmup, Practice, or Song exercises
 */

import { useState, useRef, useEffect } from 'react'
import { PiBrainFill, PiMusicNotesFill, PiPianoKeysFill } from 'react-icons/pi'
import { GiGuitarHead, GiGuitarBassHead } from 'react-icons/gi'
import { QUICK_ADD_PRESETS, type QuickAddPreset } from '../../utils/exercisePresets'
import type { ExerciseData } from '../../types/exercise'
import type { InstrumentType } from '../../types/instrument'
import practiceStyles from '../../styles/Practice.module.css'

interface QuickAddMenuProps {
  readonly instrument: InstrumentType
  readonly rootNote: string
  readonly exerciseCount: number
  readonly maxExercises: number
  readonly onAddExercise: (exercise: ExerciseData) => void
}

const PRESET_COLORS: Record<string, string> = {
  warmup: '#e53e3e',
  practice: '#f59e0b',
  song: '#7c3aed',
}

export default function QuickAddMenu({
  instrument,
  rootNote,
  exerciseCount,
  maxExercises,
  onAddExercise,
}: QuickAddMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isOpen])

  if (exerciseCount >= maxExercises) return null

  const getIcon = (preset: QuickAddPreset) => {
    if (preset.key === 'warmup') return <PiBrainFill size={16} />
    if (preset.key === 'practice') {
      if (instrument === 'keyboard') return <PiPianoKeysFill size={16} />
      if (instrument === 'guitar') return <GiGuitarHead size={16} />
      if (instrument === 'bass') return <GiGuitarBassHead size={16} />
      return <PiMusicNotesFill size={16} />
    }
    return <PiMusicNotesFill size={16} />
  }

  const handleSelect = (preset: QuickAddPreset) => {
    const exercise = preset.create(instrument, rootNote, exerciseCount)
    onAddExercise(exercise)
    setIsOpen(false)
  }

  return (
    <div
      ref={menuRef}
      className={practiceStyles.exerciseCircleWrapper}
      style={{ position: 'relative' }}
    >
      <button
        className={practiceStyles.exerciseCircle}
        onClick={() => setIsOpen(!isOpen)}
        title="Add new exercise"
      >
        +
      </button>
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginTop: '8px',
            background: 'var(--bg-secondary, #1a1a2e)',
            border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
            borderRadius: '12px',
            padding: '6px',
            minWidth: '180px',
            zIndex: 100,
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }}
        >
          {QUICK_ADD_PRESETS.map(preset => (
            <button
              key={preset.key}
              onClick={() => handleSelect(preset)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                width: '100%',
                padding: '10px 12px',
                background: 'transparent',
                border: 'none',
                borderRadius: '8px',
                color: 'var(--text-primary, #fff)',
                cursor: 'pointer',
                fontSize: '0.85rem',
                textAlign: 'left',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e =>
                (e.currentTarget.style.background = 'var(--bg-hover, rgba(255,255,255,0.08))')
              }
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  background: PRESET_COLORS[preset.key] || '#7c3aed',
                  color: '#fff',
                  flexShrink: 0,
                }}
              >
                {getIcon(preset)}
              </span>
              <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{preset.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

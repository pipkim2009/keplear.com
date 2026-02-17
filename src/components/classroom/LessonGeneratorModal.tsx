/**
 * LessonGeneratorModal - Generate a full lesson from a topic
 * Teacher picks root note, scale, instrument, difficulty → gets pre-built exercises
 */

import { useState } from 'react'
import { PiMusicNotesFill, PiX } from 'react-icons/pi'
import { ROOT_NOTES, parseLessonTopic, type DifficultyLevel } from '../../utils/musicTheory'
import { generateLesson } from '../../utils/lessonGenerator'
import type { ExerciseData } from '../../types/exercise'
import type { InstrumentType } from '../../types/instrument'
import styles from '../../styles/Classroom.module.css'

// Scale names available for all instruments
const SCALE_OPTIONS = [
  'Major',
  'Minor',
  'Dorian',
  'Phrygian',
  'Lydian',
  'Mixolydian',
  'Pentatonic Major',
  'Pentatonic Minor',
  'Harmonic Minor',
  'Blues Scale',
]

interface LessonGeneratorModalProps {
  readonly isOpen: boolean
  readonly instrument: InstrumentType
  readonly onClose: () => void
  readonly onGenerate: (exercises: ExerciseData[]) => void
}

export default function LessonGeneratorModal({
  isOpen,
  instrument,
  onClose,
  onGenerate,
}: LessonGeneratorModalProps) {
  const [rootNote, setRootNote] = useState('C')
  const [scale, setScale] = useState('Major')
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('intermediate')
  const [exerciseCount, setExerciseCount] = useState(0) // 0 = auto
  const [freeText, setFreeText] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)

  if (!isOpen) return null

  const handleFreeTextParse = () => {
    if (!freeText.trim()) return
    const parsed = parseLessonTopic(freeText)
    setRootNote(parsed.root)
    setScale(parsed.scale)
    setDifficulty(parsed.difficulty)
  }

  const handleGenerate = () => {
    const exercises = generateLesson({
      root: rootNote,
      scale,
      instrument,
      difficulty,
      exerciseCount: exerciseCount > 0 ? exerciseCount : undefined,
    })
    onGenerate(exercises)
    onClose()
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(4px)',
      }}
      onClick={e => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        style={{
          background: 'var(--bg-secondary, #1a1a2e)',
          borderRadius: '16px',
          padding: '2rem',
          width: '90%',
          maxWidth: '480px',
          maxHeight: '90vh',
          overflowY: 'auto',
          border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
          boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'var(--primary-purple, #7c3aed)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <PiMusicNotesFill size={18} color="#fff" />
            </div>
            <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary, #fff)' }}>
              Generate Lesson
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary, #888)',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '8px',
            }}
          >
            <PiX size={20} />
          </button>
        </div>

        {/* Free text input */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={labelStyle}>Quick describe (optional)</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              value={freeText}
              onChange={e => setFreeText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleFreeTextParse()}
              placeholder="e.g. A Minor Guitar Beginner"
              style={inputStyle}
            />
            <button
              onClick={handleFreeTextParse}
              disabled={!freeText.trim()}
              style={{
                ...buttonSecondaryStyle,
                opacity: freeText.trim() ? 1 : 0.5,
              }}
            >
              Parse
            </button>
          </div>
        </div>

        {/* Root Note */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={labelStyle}>Root Note</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {ROOT_NOTES.map(note => (
              <button
                key={note}
                onClick={() => setRootNote(note)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border:
                    note === rootNote
                      ? '2px solid var(--primary-purple, #7c3aed)'
                      : '1px solid var(--border-color, rgba(255,255,255,0.1))',
                  background: note === rootNote ? 'var(--primary-purple, #7c3aed)' : 'transparent',
                  color: note === rootNote ? '#fff' : 'var(--text-primary, #fff)',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                }}
              >
                {note}
              </button>
            ))}
          </div>
        </div>

        {/* Scale */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={labelStyle}>Scale</label>
          <select value={scale} onChange={e => setScale(e.target.value)} style={selectStyle}>
            {SCALE_OPTIONS.map(s => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Difficulty */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={labelStyle}>Difficulty</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {(['beginner', 'intermediate', 'advanced'] as DifficultyLevel[]).map(d => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border:
                    d === difficulty
                      ? '2px solid var(--primary-purple, #7c3aed)'
                      : '1px solid var(--border-color, rgba(255,255,255,0.1))',
                  background: d === difficulty ? 'var(--primary-purple, #7c3aed)' : 'transparent',
                  color: d === difficulty ? '#fff' : 'var(--text-primary, #fff)',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  textTransform: 'capitalize',
                }}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Advanced options toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary, #888)',
            cursor: 'pointer',
            fontSize: '0.8rem',
            padding: '4px 0',
            marginBottom: '0.5rem',
          }}
        >
          {showAdvanced ? 'Hide' : 'Show'} advanced options
        </button>

        {showAdvanced && (
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Exercise Count (0 = auto)</label>
            <input
              type="number"
              min={0}
              max={7}
              value={exerciseCount}
              onChange={e => setExerciseCount(parseInt(e.target.value, 10) || 0)}
              style={inputStyle}
            />
          </div>
        )}

        {/* Summary */}
        <div
          style={{
            background: 'var(--bg-tertiary, rgba(255,255,255,0.03))',
            borderRadius: '10px',
            padding: '12px 14px',
            marginBottom: '1.5rem',
            fontSize: '0.85rem',
            color: 'var(--text-secondary, #aaa)',
          }}
        >
          Will generate a{' '}
          <strong style={{ color: 'var(--text-primary, #fff)' }}>{difficulty}</strong> lesson for{' '}
          <strong style={{ color: 'var(--text-primary, #fff)' }}>
            {rootNote} {scale}
          </strong>{' '}
          on <strong style={{ color: 'var(--text-primary, #fff)' }}>{instrument}</strong>
          {exerciseCount > 0 && (
            <>
              {' '}
              with <strong style={{ color: 'var(--text-primary, #fff)' }}>
                {exerciseCount}
              </strong>{' '}
              exercises
            </>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={buttonSecondaryStyle}>
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            className={styles.editSaveButton}
            style={{
              padding: '10px 24px',
              borderRadius: '10px',
              fontSize: '0.9rem',
              fontWeight: 600,
            }}
          >
            Generate Lesson
          </button>
        </div>
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontWeight: 600,
  fontSize: '0.85rem',
  color: 'var(--text-secondary, #aaa)',
  marginBottom: '6px',
}

const inputStyle: React.CSSProperties = {
  flex: 1,
  padding: '10px 12px',
  borderRadius: '10px',
  border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
  background: 'var(--bg-tertiary, rgba(255,255,255,0.05))',
  color: 'var(--text-primary, #fff)',
  fontSize: '0.9rem',
  outline: 'none',
}

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: '10px',
  border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
  background: 'var(--bg-tertiary, rgba(255,255,255,0.05))',
  color: 'var(--text-primary, #fff)',
  fontSize: '0.9rem',
  outline: 'none',
}

const buttonSecondaryStyle: React.CSSProperties = {
  padding: '10px 18px',
  borderRadius: '10px',
  border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
  background: 'transparent',
  color: 'var(--text-primary, #fff)',
  cursor: 'pointer',
  fontSize: '0.85rem',
  fontWeight: 600,
}

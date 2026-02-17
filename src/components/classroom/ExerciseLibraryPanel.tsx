/**
 * ExerciseLibraryPanel - Slide-out panel showing saved exercises
 * Allows saving, searching, and inserting saved exercises into lessons
 */

import { useState } from 'react'
import { PiX, PiTrash, PiMagnifyingGlass, PiMusicNotesFill } from 'react-icons/pi'
import type { SavedExercise } from '../../hooks/useExerciseLibrary'
import type { ExerciseData } from '../../types/exercise'
import { getExerciseCategoryInfo } from '../../utils/exercisePresets'

interface ExerciseLibraryPanelProps {
  readonly isOpen: boolean
  readonly exercises: SavedExercise[]
  readonly loading: boolean
  readonly onClose: () => void
  readonly onInsert: (exercise: ExerciseData) => void
  readonly onDelete: (exerciseId: string) => void
}

export default function ExerciseLibraryPanel({
  isOpen,
  exercises,
  loading,
  onClose,
  onInsert,
  onDelete,
}: ExerciseLibraryPanelProps) {
  const [searchQuery, setSearchQuery] = useState('')

  if (!isOpen) return null

  const filtered = searchQuery.trim()
    ? exercises.filter(
        e =>
          e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
          e.instrument.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : exercises

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: '360px',
        maxWidth: '90vw',
        background: 'var(--bg-secondary, #1a1a2e)',
        borderLeft: '1px solid var(--border-color, rgba(255,255,255,0.1))',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.3)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1rem 1.25rem',
          borderBottom: '1px solid var(--border-color, rgba(255,255,255,0.1))',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <PiMusicNotesFill size={18} color="var(--primary-purple, #7c3aed)" />
          <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary, #fff)' }}>
            Exercise Library
          </h3>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary, #888)',
            cursor: 'pointer',
            padding: '4px',
          }}
        >
          <PiX size={20} />
        </button>
      </div>

      {/* Search */}
      <div style={{ padding: '0.75rem 1.25rem' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            borderRadius: '10px',
            border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
            background: 'var(--bg-tertiary, rgba(255,255,255,0.05))',
          }}
        >
          <PiMagnifyingGlass size={16} color="var(--text-secondary, #888)" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search saved exercises..."
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              color: 'var(--text-primary, #fff)',
              fontSize: '0.85rem',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Exercise list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 1.25rem 1.25rem' }}>
        {loading ? (
          <p
            style={{ color: 'var(--text-secondary, #888)', textAlign: 'center', padding: '2rem 0' }}
          >
            Loading...
          </p>
        ) : filtered.length === 0 ? (
          <p
            style={{
              color: 'var(--text-secondary, #888)',
              textAlign: 'center',
              padding: '2rem 0',
              fontSize: '0.85rem',
            }}
          >
            {exercises.length === 0
              ? 'No saved exercises yet. Save exercises from the timeline to build your library.'
              : 'No exercises match your search.'}
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filtered.map(saved => {
              const categoryInfo = getExerciseCategoryInfo(saved.exercise_data)
              return (
                <div
                  key={saved.id}
                  style={{
                    background: 'var(--bg-tertiary, rgba(255,255,255,0.03))',
                    borderRadius: '10px',
                    padding: '12px',
                    border: '1px solid var(--border-color, rgba(255,255,255,0.06))',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '6px',
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        color: 'var(--text-primary, #fff)',
                      }}
                    >
                      {saved.name}
                    </span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: 'var(--primary-purple, #7c3aed)',
                          color: '#fff',
                          fontWeight: 600,
                        }}
                      >
                        {categoryInfo.label}
                      </span>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: 'rgba(255,255,255,0.08)',
                          color: 'var(--text-secondary, #aaa)',
                        }}
                      >
                        {saved.instrument}
                      </span>
                    </div>
                  </div>

                  {saved.exercise_data.transcript && (
                    <p
                      style={{
                        margin: '0 0 8px',
                        fontSize: '0.75rem',
                        color: 'var(--text-secondary, #888)',
                        lineHeight: 1.4,
                      }}
                    >
                      {saved.exercise_data.transcript.slice(0, 80)}
                      {saved.exercise_data.transcript.length > 80 ? '...' : ''}
                    </p>
                  )}

                  <div
                    style={{
                      display: 'flex',
                      gap: '6px',
                      fontSize: '0.75rem',
                      color: 'var(--text-secondary, #888)',
                      marginBottom: '8px',
                    }}
                  >
                    {saved.exercise_data.bpm && <span>BPM: {saved.exercise_data.bpm}</span>}
                    {saved.exercise_data.appliedScales?.length > 0 && (
                      <span>Scales: {saved.exercise_data.appliedScales.length}</span>
                    )}
                    {saved.exercise_data.appliedChords?.length > 0 && (
                      <span>Chords: {saved.exercise_data.appliedChords.length}</span>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => onDelete(saved.id)}
                      style={{
                        padding: '5px 10px',
                        borderRadius: '6px',
                        border: '1px solid rgba(255,0,0,0.2)',
                        background: 'transparent',
                        color: '#f87171',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <PiTrash size={12} /> Delete
                    </button>
                    <button
                      onClick={() => onInsert(saved.exercise_data)}
                      style={{
                        padding: '5px 12px',
                        borderRadius: '6px',
                        border: 'none',
                        background: 'var(--primary-purple, #7c3aed)',
                        color: '#fff',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                      }}
                    >
                      Insert
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

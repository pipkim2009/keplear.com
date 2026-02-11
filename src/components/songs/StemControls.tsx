/**
 * StemControls - Custom instrument picker + stem mixer.
 *
 * States:
 * - Idle: toggleable instrument chips + "Separate Stems" button
 * - Loading: Progress bar with stage description
 * - Ready: Dynamic stem mixer (selected instruments + Music remainder)
 * - Error: Error message with retry button
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import type { StemType, SeparationStatus } from '../../hooks/useStemSeparation'
import { checkAllModelAvailability, getModelForInstrument } from '../../hooks/useStemSeparation'
import styles from '../../styles/Songs.module.css'

interface StemControlsProps {
  // Separation state
  status: SeparationStatus
  progress: number
  error: string | null
  hasStemData: boolean

  // Stem names from the current separation result
  stemNames: string[]

  // Actions
  onSeparate: (instruments: string[]) => void
  onCancel: () => void
  onClearStems: () => void

  // Stem player state
  volumes: Record<StemType, number>
  mutes: Record<StemType, boolean>
  soloed: StemType | null

  // Stem player actions
  onVolumeChange: (stem: StemType, volume: number) => void
  onToggleMute: (stem: StemType) => void
  onToggleSolo: (stem: StemType) => void

  // Stem mode
  stemMode: boolean
  onToggleStemMode: () => void
}

// Instruments the user can choose to isolate
const AVAILABLE_INSTRUMENTS = [
  { id: 'vocals', label: 'Vocals', icon: '\uD83C\uDFA4', color: '#a855f7' },
  { id: 'drums', label: 'Drums', icon: '\uD83E\uDD41', color: '#f97316' },
  { id: 'bass', label: 'Bass', icon: '\uD83C\uDFB8', color: '#ef4444' },
  { id: 'piano', label: 'Piano', icon: '\uD83C\uDFB9', color: '#6366f1' },
]

// Visual config for mixer rows (including the auto-generated "music" remainder)
const STEM_CONFIGS: Record<string, { label: string; icon: string; color: string }> = {
  vocals: { label: 'Vocals', icon: '\uD83C\uDFA4', color: '#a855f7' },
  drums: { label: 'Drums', icon: '\uD83E\uDD41', color: '#f97316' },
  bass: { label: 'Bass', icon: '\uD83C\uDFB8', color: '#ef4444' },
  piano: { label: 'Piano', icon: '\uD83C\uDFB9', color: '#6366f1' },
  music: { label: 'Music', icon: '\uD83C\uDFB5', color: '#10b981' },
  other: { label: 'Other', icon: '\uD83C\uDFB9', color: '#3b82f6' },
  accompaniment: { label: 'Music', icon: '\uD83C\uDFB5', color: '#10b981' },
}

const DEFAULT_STEM_CONFIG = { label: 'Track', icon: '\uD83C\uDFB5', color: '#6b7280' }

function getStageLabel(status: SeparationStatus): string {
  switch (status) {
    case 'downloading':
      return 'Downloading audio...'
    case 'loading_model':
      return 'Loading AI model...'
    case 'separating':
      return 'Separating stems...'
    default:
      return 'Processing...'
  }
}

export default function StemControls({
  status,
  progress,
  error,
  hasStemData,
  stemNames,
  onSeparate,
  onCancel,
  onClearStems,
  volumes,
  mutes,
  soloed,
  onVolumeChange,
  onToggleMute,
  onToggleSolo,
  stemMode,
  onToggleStemMode,
}: StemControlsProps) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(['vocals']))
  // Remember the last selection so Retry uses the same instruments
  const lastSelectionRef = useRef<string[]>(['vocals'])

  // Model availability: maps model name → available boolean
  const [modelAvail, setModelAvail] = useState<Record<string, boolean>>({
    '2stems': true,
    '4stems': false,
    '5stems': false,
  })

  useEffect(() => {
    checkAllModelAvailability().then(setModelAvail)
  }, [])

  const toggleInstrument = useCallback((id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const handleSeparate = useCallback(() => {
    const instruments = Array.from(selected)
    lastSelectionRef.current = instruments
    onSeparate(instruments)
  }, [onSeparate, selected])

  const handleRetry = useCallback(() => {
    onSeparate(lastSelectionRef.current)
  }, [onSeparate])

  const handleVolumeInput = useCallback(
    (stem: StemType, e: React.ChangeEvent<HTMLInputElement>) => {
      onVolumeChange(stem, parseFloat(e.target.value))
    },
    [onVolumeChange]
  )

  const isLoading =
    status === 'downloading' || status === 'loading_model' || status === 'separating'

  // Idle state — instrument picker + separate button
  if (status === 'idle' && !hasStemData) {
    return (
      <div className={styles.stemControls}>
        <div className={styles.stemInstrumentPicker}>
          {AVAILABLE_INSTRUMENTS.map(inst => {
            const isActive = selected.has(inst.id)
            const requiredModel = getModelForInstrument(inst.id)
            const isAvailable = modelAvail[requiredModel] !== false
            return (
              <button
                key={inst.id}
                className={`${styles.stemInstrumentChip} ${isActive ? styles.stemInstrumentChipActive : ''} ${!isAvailable ? styles.stemInstrumentChipUnavailable : ''}`}
                style={
                  {
                    '--chip-color': isAvailable ? inst.color : '#6b7280',
                    '--chip-bg': isAvailable ? `${inst.color}20` : '#6b728015',
                  } as React.CSSProperties
                }
                onClick={() => isAvailable && toggleInstrument(inst.id)}
                disabled={!isAvailable}
                title={
                  !isAvailable
                    ? `${inst.label} requires the ${requiredModel} model (not yet available)`
                    : undefined
                }
              >
                <span className={styles.stemChipIcon}>{inst.icon}</span>
                {inst.label}
                {!isAvailable && <span className={styles.stemChipBadge}>soon</span>}
              </button>
            )
          })}
        </div>
        <button
          className={styles.stemSeparateBtn}
          onClick={handleSeparate}
          disabled={selected.size === 0}
        >
          Separate Stems
        </button>
      </div>
    )
  }

  // Loading state — show progress
  if (isLoading) {
    return (
      <div className={styles.stemControls}>
        <div className={styles.stemLoadingSection}>
          <span className={styles.stemLoadingLabel}>{getStageLabel(status)}</span>
          <div className={styles.stemProgressTrack}>
            <div
              className={styles.stemProgressFill}
              style={{ width: `${Math.max(2, progress)}%` }}
            />
          </div>
          <div className={styles.stemLoadingActions}>
            <span className={styles.stemProgressText}>{progress}%</span>
            <button className={styles.stemCancelBtn} onClick={onCancel}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (status === 'error') {
    return (
      <div className={styles.stemControls}>
        <div className={styles.stemError}>
          <span>{error || 'Stem separation failed'}</span>
          <button className={styles.stemSeparateBtn} onClick={handleRetry}>
            Retry
          </button>
        </div>
      </div>
    )
  }

  // Ready state — show mixer with dynamic stem rows
  if (hasStemData) {
    return (
      <div className={styles.stemControls}>
        <div className={styles.stemMixerHeader}>
          <span className={styles.controlLabel}>Stem Mixer</span>
          <div className={styles.stemMixerActions}>
            {stemMode ? (
              <button className={styles.stemOriginalBtn} onClick={onToggleStemMode}>
                Original Audio
              </button>
            ) : (
              <button
                className={`${styles.stemOriginalBtn} ${styles.stemOriginalBtnActive}`}
                onClick={onToggleStemMode}
              >
                Play Stems
              </button>
            )}
            <button className={styles.stemResetBtn} onClick={onClearStems}>
              Reset
            </button>
          </div>
        </div>

        {stemMode && (
          <div className={styles.stemRows}>
            {stemNames.map(stemName => {
              const config = STEM_CONFIGS[stemName] || {
                ...DEFAULT_STEM_CONFIG,
                label: stemName.charAt(0).toUpperCase() + stemName.slice(1),
              }
              const isMuted = mutes[stemName] ?? false
              const isSoloed = soloed === stemName
              const isInactive = isMuted || (soloed !== null && !isSoloed)
              const displayVolume = volumes[stemName] ?? 1

              return (
                <div
                  key={stemName}
                  className={`${styles.stemRow} ${isInactive ? styles.stemRowInactive : ''}`}
                >
                  <span
                    className={styles.stemLabel}
                    style={{ '--stem-color': config.color } as React.CSSProperties}
                  >
                    <span className={styles.stemIcon}>{config.icon}</span>
                    {config.label}
                  </span>
                  <input
                    type="range"
                    className={styles.stemSlider}
                    min={0}
                    max={1}
                    step={0.01}
                    value={displayVolume}
                    onChange={e => handleVolumeInput(stemName, e)}
                    style={
                      {
                        '--stem-color': config.color,
                        '--stem-volume': `${displayVolume * 100}%`,
                      } as React.CSSProperties
                    }
                  />
                  <span className={styles.stemVolumeText}>{Math.round(displayVolume * 100)}%</span>
                  <button
                    className={`${styles.stemMuteBtn} ${isMuted ? styles.stemMuteBtnActive : ''}`}
                    onClick={() => onToggleMute(stemName)}
                    title={isMuted ? 'Unmute' : 'Mute'}
                  >
                    M
                  </button>
                  <button
                    className={`${styles.stemSoloBtn} ${isSoloed ? styles.stemSoloBtnActive : ''}`}
                    onClick={() => onToggleSolo(stemName)}
                    title={isSoloed ? 'Unsolo' : 'Solo'}
                  >
                    S
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return null
}

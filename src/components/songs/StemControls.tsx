/**
 * StemControls - UI for stem mixer (volume sliders, mute, solo buttons).
 *
 * States:
 * - Idle: "Separate Stems" button
 * - Loading: Progress bar with stage description
 * - Ready: 4-stem mixer with volume/mute/solo
 * - Error: Error message with retry button
 */

import { useCallback } from 'react'
import type { StemType, SeparationStatus } from '../../hooks/useStemSeparation'
import styles from '../../styles/Songs.module.css'

interface StemControlsProps {
  // Separation state
  status: SeparationStatus
  progress: number
  error: string | null
  hasStemData: boolean

  // Actions
  onSeparate: () => void
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

const STEM_CONFIG: { type: StemType; label: string; icon: string; color: string }[] = [
  { type: 'vocals', label: 'Vocals', icon: '\uD83C\uDFA4', color: '#a855f7' },
  { type: 'drums', label: 'Drums', icon: '\uD83E\uDD41', color: '#f97316' },
  { type: 'bass', label: 'Bass', icon: '\uD83C\uDFB8', color: '#ef4444' },
  { type: 'other', label: 'Other', icon: '\uD83C\uDFB9', color: '#3b82f6' },
]

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
  const handleVolumeInput = useCallback(
    (stem: StemType, e: React.ChangeEvent<HTMLInputElement>) => {
      onVolumeChange(stem, parseFloat(e.target.value))
    },
    [onVolumeChange]
  )

  const isLoading =
    status === 'downloading' || status === 'loading_model' || status === 'separating'

  // Idle state - show separate button
  if (status === 'idle' && !hasStemData) {
    return (
      <div className={styles.stemControls}>
        <button className={styles.stemSeparateBtn} onClick={onSeparate}>
          Separate Stems
        </button>
      </div>
    )
  }

  // Loading state - show progress
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
          <button className={styles.stemSeparateBtn} onClick={onSeparate}>
            Retry
          </button>
        </div>
      </div>
    )
  }

  // Ready state - show mixer
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
            {STEM_CONFIG.map(({ type, label, icon, color }) => {
              const isMuted = mutes[type]
              const isSoloed = soloed === type
              const isInactive = isMuted || (soloed !== null && !isSoloed)
              const displayVolume = volumes[type]

              return (
                <div
                  key={type}
                  className={`${styles.stemRow} ${isInactive ? styles.stemRowInactive : ''}`}
                >
                  <span
                    className={styles.stemLabel}
                    style={{ '--stem-color': color } as React.CSSProperties}
                  >
                    <span className={styles.stemIcon}>{icon}</span>
                    {label}
                  </span>
                  <input
                    type="range"
                    className={styles.stemSlider}
                    min={0}
                    max={1}
                    step={0.01}
                    value={displayVolume}
                    onChange={e => handleVolumeInput(type, e)}
                    style={
                      {
                        '--stem-color': color,
                        '--stem-volume': `${displayVolume * 100}%`,
                      } as React.CSSProperties
                    }
                  />
                  <span className={styles.stemVolumeText}>{Math.round(displayVolume * 100)}%</span>
                  <button
                    className={`${styles.stemMuteBtn} ${isMuted ? styles.stemMuteBtnActive : ''}`}
                    onClick={() => onToggleMute(type)}
                    title={isMuted ? 'Unmute' : 'Mute'}
                  >
                    M
                  </button>
                  <button
                    className={`${styles.stemSoloBtn} ${isSoloed ? styles.stemSoloBtnActive : ''}`}
                    onClick={() => onToggleSolo(type)}
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

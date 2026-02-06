/**
 * SongPlayerUI - Reusable song player with waveform visualization
 * Extracted from Classroom.tsx to eliminate duplication across
 * lesson mode (legacy + multi-exercise) and assignment editor views
 */

import { PiPlay, PiPause, PiSpeakerHigh, PiSpeakerLow, PiSpeakerNone } from 'react-icons/pi'
import songStyles from '../../styles/Songs.module.css'

interface SongPlayerUIProps {
  readonly videoId: string
  readonly videoTitle: string
  readonly markerA: number | null
  readonly markerB: number | null
  readonly currentTime: number
  readonly duration: number
  readonly isPlaying: boolean
  readonly isPlayerReady: boolean
  readonly volume: number
  readonly playbackRate: number
  readonly onTogglePlayPause: () => void
  readonly onSeek: (e: React.ChangeEvent<HTMLInputElement>) => void
  readonly onVolumeChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  readonly onPlaybackRateChange: (rate: number) => void
  readonly formatTime: (time: number) => string
}

export default function SongPlayerUI({
  videoId,
  videoTitle,
  markerA,
  markerB,
  currentTime,
  duration,
  isPlaying,
  isPlayerReady,
  volume,
  playbackRate,
  onTogglePlayPause,
  onSeek,
  onVolumeChange,
  onPlaybackRateChange,
  formatTime,
}: SongPlayerUIProps) {
  const hasLoop =
    typeof markerA === 'number' && !isNaN(markerA) && typeof markerB === 'number' && !isNaN(markerB)

  const VolumeIcon = volume === 0 ? PiSpeakerNone : volume < 50 ? PiSpeakerLow : PiSpeakerHigh

  const loopStart = hasLoop ? markerA! : 0
  const loopEnd = hasLoop ? markerB! : duration
  const loopDuration = loopEnd - loopStart

  return (
    <div className={songStyles.playerSection}>
      <div className={songStyles.playerHeader}>
        <div className={songStyles.playerTrackInfo}>
          <img
            src={`https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`}
            alt={videoTitle}
            className={songStyles.playerArtwork}
          />
          <div className={songStyles.playerTrackDetails}>
            <h2 className={songStyles.nowPlaying}>{videoTitle}</h2>
            <p className={songStyles.playerArtist}>YouTube</p>
          </div>
        </div>
      </div>

      {/* Loading indicator */}
      {!isPlayerReady && <div className={songStyles.audioLoading}>Loading audio...</div>}

      {/* Timeline with waveform visualization */}
      <div className={songStyles.timelineSection}>
        <div className={songStyles.timelineWrapper}>
          <div className={songStyles.waveformContainer}>
            {(() => {
              const numBars = Math.min(300, Math.max(1, Math.ceil(loopDuration * 10)))
              const seed = videoId
                .split('')
                .reduce(
                  (acc: number, char: string, i: number) => acc + char.charCodeAt(0) * (i + 1),
                  0
                )
              const seededRandom = (n: number) => {
                const x = Math.sin(seed + n) * 10000
                return x - Math.floor(x)
              }

              return Array.from({ length: numBars }, (_, i) => {
                const base = 0.35 + seededRandom(i * 3) * 0.15
                const low = Math.sin(i * 0.08 + seed) * 0.12
                const mid = Math.sin(i * 0.25 + seed * 1.5) * 0.18
                const high = seededRandom(i * 2) * 0.2
                const spike = seededRandom(i * 7) > 0.88 ? seededRandom(i * 11) * 0.25 : 0
                const height = Math.max(0.12, Math.min(1, base + low + mid + high + spike))

                const barProgress = (i + 1) / numBars
                const currentProgress =
                  loopDuration > 0
                    ? Math.max(0, Math.min(1, (currentTime - loopStart) / loopDuration))
                    : 0
                const isPassed = barProgress <= currentProgress

                return (
                  <div
                    key={i}
                    className={`${songStyles.waveformBar} ${isPassed ? songStyles.waveformBarPassed : ''}`}
                    style={{ height: `${height * 100}%` }}
                  />
                )
              })
            })()}
          </div>
          <input
            type="range"
            className={songStyles.timeline}
            min={hasLoop ? markerA! : 0}
            max={hasLoop ? markerB! : duration || 100}
            value={currentTime}
            onChange={onSeek}
            step={0.1}
            disabled={!isPlayerReady}
            aria-label="Song timeline"
          />
        </div>
        <div className={songStyles.timeDisplay}>
          <span>{formatTime(hasLoop ? Math.max(0, currentTime - markerA!) : currentTime)}</span>
          <span>{formatTime(hasLoop ? markerB! - markerA! : duration)}</span>
        </div>
      </div>

      {/* Playback Controls */}
      <div className={songStyles.practiceControls}>
        <button
          className={songStyles.controlButton}
          onClick={onTogglePlayPause}
          disabled={!isPlayerReady}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <PiPause /> : <PiPlay />}
        </button>

        <div className={songStyles.volumeControl}>
          <VolumeIcon className={songStyles.volumeIcon} />
          <input
            type="range"
            className={songStyles.volumeSlider}
            min={0}
            max={100}
            step={1}
            value={volume}
            onChange={onVolumeChange}
            style={{ '--volume-percent': `${volume}%` } as React.CSSProperties}
            aria-label="Volume"
          />
        </div>

        <div className={songStyles.speedControl}>
          <div className={songStyles.speedButtons}>
            {[0.5, 0.75, 1, 1.25, 1.5, 2].map(speed => (
              <button
                key={speed}
                className={`${songStyles.speedButton} ${playbackRate === speed ? songStyles.speedButtonActive : ''}`}
                onClick={() => onPlaybackRateChange(speed)}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

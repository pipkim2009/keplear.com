/**
 * SongPlayerUI - Reusable song player with waveform visualization
 * Extracted from Classroom.tsx to eliminate duplication across
 * lesson mode (legacy + multi-exercise) and assignment editor views
 *
 * Design matches Songs page player (minus the looper controls)
 */

import {
  PiPlay,
  PiPause,
  PiSpeakerHigh,
  PiSpeakerLow,
  PiSpeakerNone,
  PiArrowCounterClockwise,
  PiArrowClockwise,
} from 'react-icons/pi'
import { useWaveformData } from '../../hooks/useWaveformData'
import { generateFallbackWaveform, resamplePeaks } from '../../utils/waveformUtils'
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
  readonly onSkip: (seconds: number) => void
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
  onSkip,
  formatTime,
}: SongPlayerUIProps) {
  const hasLoop =
    typeof markerA === 'number' && !isNaN(markerA) && typeof markerB === 'number' && !isNaN(markerB)

  const { peaks: realPeaks } = useWaveformData(videoId)

  const VolumeIcon = volume === 0 ? PiSpeakerNone : volume < 50 ? PiSpeakerLow : PiSpeakerHigh

  const loopStart = hasLoop ? markerA! : 0
  const loopEnd = hasLoop ? markerB! : duration
  const loopDuration = loopEnd - loopStart

  return (
    <div className={songStyles.playerSection}>
      {/* Thumbnail background blur - matches Songs page */}
      <div
        className={songStyles.playerThumbnailBg}
        style={{
          backgroundImage: `url(https://i.ytimg.com/vi/${videoId}/mqdefault.jpg)`,
        }}
      />

      {/* Header: track info + volume */}
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
      </div>

      {/* Loading indicator */}
      {!isPlayerReady && <div className={songStyles.audioLoading}>Loading audio...</div>}

      {/* Transport: play/pause + skip + speed - matches Songs page layout */}
      <div className={songStyles.transportSection}>
        <div className={songStyles.transportRow}>
          <button
            className={songStyles.controlButtonSmall}
            onClick={() => onSkip(-10)}
            disabled={!isPlayerReady}
            aria-label="Rewind 10 seconds"
            title="Rewind 10s"
          >
            <PiArrowCounterClockwise />
          </button>
          <button
            className={songStyles.playButton}
            onClick={onTogglePlayPause}
            disabled={!isPlayerReady}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <PiPause /> : <PiPlay />}
          </button>
          <button
            className={songStyles.controlButtonSmall}
            onClick={() => onSkip(10)}
            disabled={!isPlayerReady}
            aria-label="Forward 10 seconds"
            title="Forward 10s"
          >
            <PiArrowClockwise />
          </button>
        </div>

        <div className={songStyles.speedControl}>
          <div className={songStyles.speedButtons}>
            {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map(speed => (
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

      {/* Timeline with waveform visualization - at the bottom like Songs page */}
      <div className={songStyles.timelineSection}>
        <div className={songStyles.timelineWrapper}>
          <div className={songStyles.waveformContainer}>
            {(() => {
              const numBars = Math.min(600, Math.max(1, Math.ceil(loopDuration * 10)))

              let bars: number[]
              if (realPeaks && hasLoop && duration > 0) {
                const startFrac = loopStart / duration
                const endFrac = loopEnd / duration
                const startIdx = Math.floor(startFrac * realPeaks.length)
                const endIdx = Math.ceil(endFrac * realPeaks.length)
                bars = resamplePeaks(realPeaks.slice(startIdx, endIdx), numBars)
              } else if (realPeaks) {
                bars = resamplePeaks(realPeaks, numBars)
              } else {
                bars = generateFallbackWaveform(videoId, numBars)
              }

              return bars.map((height, i) => {
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
    </div>
  )
}

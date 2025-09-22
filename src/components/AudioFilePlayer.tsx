import React from 'react'
import { useAudioFilePlayer } from '../hooks/useAudioFilePlayer'

interface AudioFilePlayerProps {
  audioBlob: Blob | null
  onClose?: () => void
}

const AudioFilePlayer: React.FC<AudioFilePlayerProps> = ({ audioBlob, onClose }) => {
  const {
    isPlaying,
    currentTime,
    duration,
    volume,
    isLoaded,
    loadAudio,
    togglePlayPause,
    stop,
    setVolume,
    seekTo
  } = useAudioFilePlayer()

  React.useEffect(() => {
    if (audioBlob) {
      loadAudio(audioBlob)
    }
  }, [audioBlob, loadAudio])

  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value)
    seekTo(newTime)
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value)
    setVolume(newVolume)
  }

  if (!audioBlob) {
    return null
  }

  return (
    <div className="audio-file-player">
      <div className="audio-file-player-header">
        <h3>Recorded Melody</h3>
        {onClose && (
          <button onClick={onClose} className="close-button" aria-label="Close player">
            ×
          </button>
        )}
      </div>

      <div className="audio-file-player-controls">
        <div className="playback-controls">
          <button
            onClick={togglePlayPause}
            disabled={!isLoaded}
            className={`button ${isPlaying ? 'button-stop' : ''}`}
          >
            {isPlaying ? 'Pause' : 'Play'}
          </button>

          <button
            onClick={stop}
            disabled={!isLoaded}
            className="button"
          >
            Stop
          </button>
        </div>

        {isLoaded && (
          <>
            <div className="progress-section">
              <div className="time-display">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>

              <input
                type="range"
                min="0"
                max={duration || 0}
                value={currentTime}
                onChange={handleSeek}
                className="progress-slider"
                disabled={!isLoaded}
              />
            </div>

            <div className="volume-section">
              <label htmlFor="volume">Volume:</label>
              <input
                id="volume"
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={handleVolumeChange}
                className="volume-slider"
              />
              <span>{Math.round(volume * 100)}%</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default AudioFilePlayer
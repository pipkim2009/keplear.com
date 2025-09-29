import React, { useState, useRef, useEffect } from 'react'

interface CustomAudioPlayerProps {
  src: string
  preload?: 'none' | 'metadata' | 'auto'
}

const CustomAudioPlayer: React.FC<CustomAudioPlayerProps> = ({
  src,
  preload = 'metadata'
}) => {
  const audioRef = useRef<HTMLAudioElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(() => {
    const savedVolume = localStorage.getItem('audioPlayerVolume')
    return savedVolume ? parseFloat(savedVolume) : 1
  })
  const [showVolumeSlider, setShowVolumeSlider] = useState(false)
  const [hoverTime, setHoverTime] = useState<number | null>(null)
  const [showHoverTime, setShowHoverTime] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    // Set volume to current state when src changes
    audio.volume = volume

    const updateTime = () => setCurrentTime(audio.currentTime)
    const updateDuration = () => setDuration(audio.duration || 0)
    const handleEnded = () => setIsPlaying(false)

    audio.addEventListener('timeupdate', updateTime)
    audio.addEventListener('loadedmetadata', updateDuration)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('timeupdate', updateTime)
      audio.removeEventListener('loadedmetadata', updateDuration)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [src, volume])

  useEffect(() => {
    const handleGlobalMouseMove = (event: MouseEvent) => {
      if (isDragging) {
        updateProgressFromMouse(event)
      }
    }

    const handleGlobalMouseUp = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleGlobalMouseMove)
      document.addEventListener('mouseup', handleGlobalMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove)
      document.removeEventListener('mouseup', handleGlobalMouseUp)
    }
  }, [isDragging, duration])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowVolumeSlider(false)
      }
    }

    if (showVolumeSlider) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showVolumeSlider])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
    } else {
      audio.play()
    }
    setIsPlaying(!isPlaying)
  }

  const updateProgressFromMouse = (event: MouseEvent | React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current
    const progressBar = progressRef.current
    if (!audio || !progressBar || !duration) return

    const rect = progressBar.getBoundingClientRect()
    const clickX = event.clientX - rect.left
    const clickPercentage = Math.max(0, Math.min(1, clickX / rect.width))
    const newTime = clickPercentage * duration

    audio.currentTime = newTime
    setCurrentTime(newTime)
  }

  const handleProgressMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true)
    updateProgressFromMouse(event)
    event.preventDefault()
  }

  const handleProgressMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const progressBar = progressRef.current
    if (!progressBar || !duration) return

    const rect = progressBar.getBoundingClientRect()
    const hoverX = event.clientX - rect.left
    const hoverPercentage = Math.max(0, Math.min(1, hoverX / rect.width))
    const hoverTimeValue = hoverPercentage * duration

    if (!isDragging) {
      setHoverTime(hoverTimeValue)
    }
  }

  const handleProgressMouseEnter = () => {
    setShowHoverTime(true)
  }

  const handleProgressMouseLeave = () => {
    setShowHoverTime(false)
    setHoverTime(null)
  }

  const handleVolumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current
    if (!audio) return

    const newVolume = parseFloat(event.target.value)
    audio.volume = newVolume
    setVolume(newVolume)
    localStorage.setItem('audioPlayerVolume', newVolume.toString())
  }

  const formatTime = (time: number, isCurrentTime: boolean = false, totalDuration: number = 0) => {
    const minutes = Math.floor(time / 60)
    let seconds: number

    if (isCurrentTime && totalDuration > 0 && time >= totalDuration - 0.1) {
      // If current time is very close to end, show the rounded total duration
      const totalMinutes = Math.floor(totalDuration / 60)
      const totalSeconds = Math.round(totalDuration % 60)
      return `${totalMinutes}:${totalSeconds.toString().padStart(2, '0')}`
    } else if (isCurrentTime) {
      // For current time, use floor (normal progression)
      seconds = Math.floor(time % 60)
    } else {
      // For total duration, use round (closest second)
      seconds = Math.round(time % 60)
    }

    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="custom-audio-player" ref={containerRef}>
      <audio
        ref={audioRef}
        src={src}
        preload={preload}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      <div className="audio-controls">
        <button
          className="play-pause-btn"
          onClick={togglePlay}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
          )}
        </button>

        <div className="time-display">
          <span>{formatTime(currentTime, true, duration)}</span>
        </div>

        <div
          className={`progress-bar ${isDragging ? 'dragging' : ''}`}
          ref={progressRef}
          onMouseDown={handleProgressMouseDown}
          onMouseMove={handleProgressMouseMove}
          onMouseEnter={handleProgressMouseEnter}
          onMouseLeave={handleProgressMouseLeave}
        >
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          {showHoverTime && hoverTime !== null && (
            <div
              className="progress-hover-time"
              style={{
                left: `${Math.max(0, Math.min(100, (hoverTime / duration) * 100))}%`
              }}
            >
              {formatTime(hoverTime, true, duration)}
            </div>
          )}
        </div>

        <div className="time-display">
          <span>{formatTime(duration, false)}</span>
        </div>

        <div className="volume-control">
          <button
            className="volume-btn"
            onClick={() => setShowVolumeSlider(!showVolumeSlider)}
            aria-label="Volume"
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              {volume === 0 ? (
                <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
              ) : volume < 0.5 ? (
                <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"/>
              ) : (
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
              )}
            </svg>
          </button>

          {showVolumeSlider && (
            <div className="volume-slider">
              <label htmlFor="volume-slider" className="sr-only">Volume</label>
              <input
                id="volume-slider"
                name="volume"
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={handleVolumeChange}
                aria-label="Volume"
                style={{
                  '--volume-percentage': `${volume * 100}%`
                } as React.CSSProperties}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CustomAudioPlayer
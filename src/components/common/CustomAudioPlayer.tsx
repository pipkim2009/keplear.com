import React, { useState, useRef, useEffect } from 'react'
import { PiPlayFill, PiPauseFill, PiSpeakerHighFill, PiSpeakerLowFill, PiSpeakerSlashFill } from 'react-icons/pi'
import { Eye, EyeOff } from 'lucide-react'
import type { Note } from '../../utils/notes'

interface CustomAudioPlayerProps {
  src: string
  preload?: 'none' | 'metadata' | 'auto'
  bpm?: number
  melodyLength?: number
  onNoteIndexChange?: (index: number | null) => void
  audioRef?: React.RefObject<HTMLAudioElement>
  autoPlayAudio?: boolean
  showNotes?: boolean
  onToggleNotes?: () => void
  melody?: Note[]
  currentlyPlayingNoteIndex?: number | null
}

const CustomAudioPlayer: React.FC<CustomAudioPlayerProps> = ({
  src,
  preload = 'metadata',
  bpm,
  melodyLength,
  onNoteIndexChange,
  audioRef: externalAudioRef,
  autoPlayAudio = false,
  showNotes = false,
  onToggleNotes,
  melody = [],
  currentlyPlayingNoteIndex = null
}) => {
  const internalAudioRef = useRef<HTMLAudioElement>(null)
  const audioRef = externalAudioRef || internalAudioRef
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

    const updateTime = () => {
      const newTime = audio.currentTime
      setCurrentTime(newTime)

      // Calculate currently playing note index
      if (bpm && melodyLength && onNoteIndexChange) {
        const noteDuration = (60 / bpm) // seconds between notes
        const currentNoteIndex = Math.floor(newTime / noteDuration)

        if (currentNoteIndex < melodyLength) {
          onNoteIndexChange(currentNoteIndex)
        } else {
          onNoteIndexChange(null)
        }
      }
    }
    const updateDuration = () => setDuration(audio.duration || 0)
    const handleEnded = () => {
      setIsPlaying(false)
      if (onNoteIndexChange) {
        onNoteIndexChange(null)
      }
    }

    audio.addEventListener('timeupdate', updateTime)
    audio.addEventListener('loadedmetadata', updateDuration)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('timeupdate', updateTime)
      audio.removeEventListener('loadedmetadata', updateDuration)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [src, volume, bpm, melodyLength, onNoteIndexChange])

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

  // Auto-play effect - triggers when autoPlayAudio becomes true
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !autoPlayAudio) return

    // Wait for audio to be ready, then play
    const playWhenReady = () => {
      audio.currentTime = 0
      audio.play().catch(err => {
        console.warn('Auto-play failed:', err)
      })
    }

    if (audio.readyState >= 2) {
      // Audio is ready (HAVE_CURRENT_DATA or higher)
      playWhenReady()
    } else {
      // Wait for audio to load
      audio.addEventListener('canplay', playWhenReady, { once: true })
      return () => {
        audio.removeEventListener('canplay', playWhenReady)
      }
    }
  }, [autoPlayAudio])

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
    <div className={`custom-audio-player ${showNotes && melody.length > 0 ? 'expanded' : ''}`} ref={containerRef}>
      <audio
        ref={audioRef}
        src={src}
        preload={preload}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      <div className="audio-controls">
        {onToggleNotes && (
          <button
            className={`reveal-btn ${showNotes ? 'active' : ''}`}
            onClick={onToggleNotes}
            aria-label={showNotes ? 'Hide notes' : 'Reveal notes'}
            title={showNotes ? 'Hide notes' : 'Reveal notes'}
          >
            {showNotes ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}

        <button
          className="play-pause-btn"
          onClick={togglePlay}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <PiPauseFill size={24} /> : <PiPlayFill size={24} />}
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
            {volume === 0 ? (
              <PiSpeakerSlashFill size={20} />
            ) : volume < 0.5 ? (
              <PiSpeakerLowFill size={20} />
            ) : (
              <PiSpeakerHighFill size={20} />
            )}
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

      {/* Melody Notes Expansion */}
      {showNotes && melody.length > 0 && (
        <div className="melody-expansion">
          <div className="melody-notes-row">
            {melody.map((note, index) => (
              <span
                key={index}
                className={`melody-note-pill ${currentlyPlayingNoteIndex === index ? 'playing' : ''}`}
              >
                {note.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default CustomAudioPlayer
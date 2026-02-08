import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  PiPlayFill,
  PiPauseFill,
  PiSpeakerHighFill,
  PiSpeakerLowFill,
  PiSpeakerSlashFill,
} from 'react-icons/pi'
import { Eye, EyeOff, Mic, MicOff, Check, RotateCcw } from 'lucide-react'
import type { Note } from '../../utils/notes'
import { useMelodyFeedback } from '../../hooks/useMelodyFeedback'
import { useTranslation } from '../../contexts/TranslationContext'
import { getNoteSymbol } from '../../utils/noteEmojis'

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
  /** Instrument type for optimized detection */
  instrument?: 'keyboard' | 'guitar' | 'bass'
  /** Whether to require exact octave match */
  strictOctave?: boolean
  /** Callback when melody feedback is completed */
  onMelodyComplete?: () => void
  /** Auto-start feedback when component mounts */
  autoStartFeedback?: boolean
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
  currentlyPlayingNoteIndex = null,
  instrument = 'keyboard',
  strictOctave = false,
  onMelodyComplete,
  autoStartFeedback = false,
}) => {
  const { t } = useTranslation()
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

  // New melody feedback system - rhythm ignored, polyphonic transcription
  const melodyFeedback = useMelodyFeedback({
    instrument,
    strictOctave,
  })

  // Update melody in feedback system when it changes
  useEffect(() => {
    if (melody.length > 0) {
      melodyFeedback.setMelody(melody)
    }
  }, [melody])

  // Toggle feedback listening
  const handleToggleFeedback = useCallback(() => {
    if (melodyFeedback.state.isActive) {
      melodyFeedback.stop()
    } else {
      melodyFeedback.start()
    }
  }, [melodyFeedback])

  // Reset feedback to start over
  const handleResetFeedback = useCallback(() => {
    melodyFeedback.reset()
  }, [melodyFeedback])

  // Track if we've already called onMelodyComplete for this completion
  const hasCalledCompleteRef = useRef(false)
  const onMelodyCompleteRef = useRef(onMelodyComplete)
  const completionTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Keep callback ref updated
  useEffect(() => {
    onMelodyCompleteRef.current = onMelodyComplete
  }, [onMelodyComplete])

  // Refs for audio ended handler to avoid stale closures
  const autoStartFeedbackRef = useRef(autoStartFeedback)
  const melodyLengthRef = useRef(melody.length)
  const melodyFeedbackRef = useRef(melodyFeedback)

  useEffect(() => {
    autoStartFeedbackRef.current = autoStartFeedback
  }, [autoStartFeedback])

  useEffect(() => {
    melodyLengthRef.current = melody.length
  }, [melody.length])

  useEffect(() => {
    melodyFeedbackRef.current = melodyFeedback
  }, [melodyFeedback])

  // Call onMelodyComplete when melody is completed
  useEffect(() => {
    if (melodyFeedback.state.isComplete && !hasCalledCompleteRef.current) {
      hasCalledCompleteRef.current = true
      // Small delay to let the user see the completion state
      completionTimerRef.current = setTimeout(() => {
        if (onMelodyCompleteRef.current) {
          onMelodyCompleteRef.current()
        }
      }, 1500)
    }
  }, [melodyFeedback.state.isComplete])

  // Reset the completion flag when melody changes or feedback is reset
  useEffect(() => {
    if (!melodyFeedback.state.isComplete) {
      hasCalledCompleteRef.current = false
    }
  }, [melodyFeedback.state.isComplete])

  // Cleanup timer on unmount only
  useEffect(() => {
    return () => {
      if (completionTimerRef.current) {
        clearTimeout(completionTimerRef.current)
      }
    }
  }, [])

  // Stop and reset feedback when melody changes (new exercise)
  useEffect(() => {
    if (melody.length > 0) {
      // Reset feedback for new melody
      if (melodyFeedback.state.isActive) {
        melodyFeedback.stop()
      }
      melodyFeedback.reset()
    }
  }, [melody])

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
        const noteDuration = 60 / bpm // seconds between notes
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
      // Auto-start feedback after playback ends (in lesson mode)
      if (
        autoStartFeedbackRef.current &&
        melodyLengthRef.current > 0 &&
        !melodyFeedbackRef.current.state.isActive
      ) {
        melodyFeedbackRef.current.start().catch(err => {
          console.error('[CustomAudioPlayer] Failed to start feedback after playback:', err)
        })
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
    <div
      className={`custom-audio-player ${showNotes && melody.length > 0 ? 'expanded' : ''}`}
      ref={containerRef}
    >
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
            aria-label={showNotes ? t('sandbox.hideNotes') : t('sandbox.revealNotes')}
            title={showNotes ? t('sandbox.hideNotes') : t('sandbox.revealNotes')}
          >
            {showNotes ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}

        {melody.length > 0 && (
          <button
            className={`mic-btn ${melodyFeedback.state.isActive ? 'active' : ''}`}
            onClick={handleToggleFeedback}
            disabled={melodyFeedback.modelStatus === 'loading'}
            aria-label={
              melodyFeedback.state.isActive ? t('sandbox.stopFeedback') : t('sandbox.startFeedback')
            }
            title={
              melodyFeedback.state.isActive ? t('sandbox.stopFeedback') : t('sandbox.startFeedback')
            }
          >
            {melodyFeedback.state.isActive ? <MicOff size={18} /> : <Mic size={18} />}
          </button>
        )}

        <button
          className="play-pause-btn"
          onClick={togglePlay}
          aria-label={isPlaying ? t('sandbox.stop') : t('sandbox.play')}
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
            <div className="progress-fill" style={{ width: `${progressPercentage}%` }} />
          </div>
          {showHoverTime && hoverTime !== null && (
            <div
              className="progress-hover-time"
              style={{
                left: `${Math.max(0, Math.min(100, (hoverTime / duration) * 100))}%`,
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
            aria-label={t('sandbox.volume')}
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
              <label htmlFor="volume-slider" className="sr-only">
                {t('sandbox.volume')}
              </label>
              <input
                id="volume-slider"
                name="volume"
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={handleVolumeChange}
                aria-label={t('sandbox.volume')}
                style={
                  {
                    '--volume-percentage': `${volume * 100}%`,
                  } as React.CSSProperties
                }
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

      {/* Feedback Expansion - New rhythm-ignored system */}
      {melodyFeedback.state.isActive && melody.length > 0 && (
        <div className="feedback-expansion">
          {/* Completion message with restart (hide restart in lesson mode) */}
          {melodyFeedback.state.isComplete && (
            <div className="feedback-complete">
              <Check size={20} />
              <span>{t('sandbox.complete')}</span>
              {!autoStartFeedback && (
                <button
                  className="feedback-restart-btn"
                  onClick={handleResetFeedback}
                  aria-label={t('sandbox.reset')}
                  title={t('sandbox.reset')}
                >
                  <RotateCcw size={16} />
                </button>
              )}
            </div>
          )}

          {/* Detected note display - hide when complete */}
          {melodyFeedback.state.isActive &&
            melodyFeedback.state.lastDetectedNote &&
            !melodyFeedback.state.isComplete && (
              <div className="feedback-detected">
                <span className="feedback-detected-label">{t('sandbox.detected')}:</span>
                <span className="feedback-detected-note">
                  {melodyFeedback.state.lastDetectedNote}
                </span>
              </div>
            )}

          {/* Note chips - shows played vs remaining */}
          <div className="feedback-notes">
            {melodyFeedback.state.notes.map((note, index) => (
              <div
                key={index}
                className={`feedback-note-chip ${
                  note.isPlayed ? 'played' : note.isCurrent ? 'current' : 'pending'
                }`}
              >
                <span className="feedback-note-name">{getNoteSymbol(note.isChord)}</span>
                {note.isPlayed && <Check size={12} className="feedback-note-check" />}
              </div>
            ))}
          </div>

          {/* Volume indicator */}
          {melodyFeedback.state.isActive && (
            <div className="volume-indicator">
              <span className="volume-indicator-label">{t('sandbox.micLevel')}</span>
              <div className="volume-indicator-bar">
                <div
                  className="volume-indicator-fill"
                  style={{ width: `${Math.min(100, melodyFeedback.state.volumeLevel * 100)}%` }}
                />
              </div>
              <span className="volume-indicator-value">
                {Math.round(melodyFeedback.state.volumeLevel * 100)}%
              </span>
            </div>
          )}

          {/* Instructions when not active */}
          {!melodyFeedback.state.isActive && melodyFeedback.state.playedCount === 0 && (
            <div className="feedback-instructions">
              <p>{t('sandbox.feedbackInstructions')}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default CustomAudioPlayer

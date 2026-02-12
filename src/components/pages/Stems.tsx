/**
 * Stems Page - Standalone audio stem separation tool
 * Upload audio files, separate into stems (vocals, drums, bass, piano),
 * and play back with independent volume/mute/solo controls per stem.
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { useTranslation } from '../../contexts/TranslationContext'
import { PiPlay, PiPause, PiArrowCounterClockwise, PiArrowClockwise } from 'react-icons/pi'
import SEOHead from '../common/SEOHead'
import { useStemSeparation } from '../../hooks/useStemSeparation'
import { useStemPlayer } from '../../hooks/useStemPlayer'
import StemControls from '../stems/StemControls'
import styles from '../../styles/Stems.module.css'

const speedOptions = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]

const Stems = () => {
  const { t } = useTranslation()
  const stemSeparation = useStemSeparation()
  const stemPlayer = useStemPlayer(stemSeparation.stems)

  const [currentTime, setCurrentTime] = useState(0)
  const [playbackRate, setPlaybackRate] = useState(1)

  // Playback time tracking via requestAnimationFrame
  const playStateRef = useRef({ offset: 0, wallTime: 0, rate: 1, playing: false })
  const rafRef = useRef<number>(0)

  const duration = stemPlayer.duration

  // rAF loop to track current playback position
  useEffect(() => {
    const tick = () => {
      const state = playStateRef.current
      if (state.playing) {
        const elapsed = (performance.now() - state.wallTime) / 1000
        const pos = Math.min(state.offset + elapsed * state.rate, duration)
        setCurrentTime(pos)
        if (pos >= duration && duration > 0) {
          state.playing = false
        }
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [duration])

  // Sync with stem player's playing state (e.g. when stems end naturally)
  useEffect(() => {
    if (!stemPlayer.isPlaying) {
      playStateRef.current.playing = false
    }
  }, [stemPlayer.isPlaying])

  const togglePlayPause = useCallback(() => {
    if (stemPlayer.isPlaying) {
      // Save current position before pausing
      const state = playStateRef.current
      const elapsed = (performance.now() - state.wallTime) / 1000
      const pos = Math.min(state.offset + elapsed * state.rate, duration)
      playStateRef.current = { ...state, offset: pos, playing: false }
      setCurrentTime(pos)
      stemPlayer.pause()
    } else {
      const offset = playStateRef.current.offset
      stemPlayer.play(offset)
      playStateRef.current = {
        offset,
        wallTime: performance.now(),
        rate: playbackRate,
        playing: true,
      }
    }
  }, [stemPlayer, duration, playbackRate])

  const handleSeek = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const time = parseFloat(e.target.value)
      setCurrentTime(time)
      if (stemPlayer.isPlaying) {
        stemPlayer.play(time)
        playStateRef.current = {
          offset: time,
          wallTime: performance.now(),
          rate: playbackRate,
          playing: true,
        }
      } else {
        playStateRef.current.offset = time
      }
    },
    [stemPlayer, playbackRate]
  )

  const skipTime = useCallback(
    (seconds: number) => {
      let newTime: number
      if (stemPlayer.isPlaying) {
        const state = playStateRef.current
        const elapsed = (performance.now() - state.wallTime) / 1000
        const pos = state.offset + elapsed * state.rate
        newTime = Math.max(0, Math.min(duration, pos + seconds))
        stemPlayer.play(newTime)
        playStateRef.current = {
          offset: newTime,
          wallTime: performance.now(),
          rate: playbackRate,
          playing: true,
        }
      } else {
        newTime = Math.max(0, Math.min(duration, playStateRef.current.offset + seconds))
        playStateRef.current.offset = newTime
      }
      setCurrentTime(newTime)
    },
    [stemPlayer, duration, playbackRate]
  )

  const changeSpeed = useCallback(
    (speed: number) => {
      // If playing, snapshot current position at the old rate before switching
      if (stemPlayer.isPlaying) {
        const state = playStateRef.current
        const elapsed = (performance.now() - state.wallTime) / 1000
        const pos = state.offset + elapsed * state.rate
        playStateRef.current = {
          offset: pos,
          wallTime: performance.now(),
          rate: speed,
          playing: true,
        }
      } else {
        playStateRef.current.rate = speed
      }
      setPlaybackRate(speed)
      stemPlayer.setPlaybackRate(speed)
    },
    [stemPlayer]
  )

  const handleClearStems = useCallback(() => {
    stemPlayer.pause()
    stemSeparation.clearStems()
    setCurrentTime(0)
    playStateRef.current = { offset: 0, wallTime: 0, rate: playbackRate, playing: false }
  }, [stemPlayer, stemSeparation, playbackRate])

  // Keyboard shortcuts: Space = play/pause, Arrows = skip
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (!stemSeparation.stems) return

      switch (e.key) {
        case ' ':
          e.preventDefault()
          togglePlayPause()
          break
        case 'ArrowLeft':
          e.preventDefault()
          skipTime(-10)
          break
        case 'ArrowRight':
          e.preventDefault()
          skipTime(10)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [stemSeparation.stems, togglePlayPause, skipTime])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    const secsWhole = Math.floor(secs)
    const secsTenth = Math.floor((secs - secsWhole) * 10)
    return `${mins}:${secsWhole.toString().padStart(2, '0')}.${secsTenth}`
  }

  const stemsReady = stemSeparation.stems !== null

  return (
    <div className={styles.stemsContainer}>
      <SEOHead title={t('stems.title')} description={t('stems.subtitle')} path="/stems" />

      <div className={styles.headerSection}>
        <h1 className={styles.pageTitle}>{t('stems.title')}</h1>
        <p className={styles.pageSubtitle}>{t('stems.subtitle')}</p>
      </div>

      <StemControls
        status={stemSeparation.status}
        progress={stemSeparation.progress}
        error={stemSeparation.error}
        hasStemData={stemsReady}
        stemNames={stemSeparation.stems?.stemNames ?? []}
        onSeparate={stemSeparation.separate}
        onCancel={stemSeparation.cancel}
        onClearStems={handleClearStems}
        volumes={stemPlayer.volumes}
        mutes={stemPlayer.mutes}
        soloed={stemPlayer.soloed}
        onVolumeChange={stemPlayer.setVolume}
        onToggleMute={stemPlayer.toggleMute}
        onToggleSolo={stemPlayer.toggleSolo}
      />

      {stemsReady && (
        <div className={styles.transportSection}>
          <div className={styles.transportRow}>
            <button
              className={styles.controlButtonSmall}
              onClick={() => skipTime(-10)}
              aria-label="Rewind 10 seconds"
              title="Rewind 10s"
            >
              <PiArrowCounterClockwise />
            </button>
            <button
              className={styles.playButton}
              onClick={togglePlayPause}
              aria-label={stemPlayer.isPlaying ? 'Pause' : 'Play'}
            >
              {stemPlayer.isPlaying ? <PiPause /> : <PiPlay />}
            </button>
            <button
              className={styles.controlButtonSmall}
              onClick={() => skipTime(10)}
              aria-label="Forward 10 seconds"
              title="Forward 10s"
            >
              <PiArrowClockwise />
            </button>
          </div>

          <div className={styles.seekSection}>
            <input
              type="range"
              className={styles.seekBar}
              min={0}
              max={duration || 1}
              value={currentTime}
              onChange={handleSeek}
              step={0.1}
              style={
                {
                  '--seek-percent': `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
                } as React.CSSProperties
              }
            />
            <div className={styles.timeDisplay}>
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <div className={styles.speedControl}>
            <div className={styles.speedButtons}>
              {speedOptions.map(speed => (
                <button
                  key={speed}
                  className={`${styles.speedButton} ${playbackRate === speed ? styles.speedButtonActive : ''}`}
                  onClick={() => changeSpeed(speed)}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {!stemsReady && stemSeparation.status === 'idle' && (
        <div className={styles.emptyState}>
          <p className={styles.emptyStateText}>{t('stems.emptyState')}</p>
        </div>
      )}
    </div>
  )
}

export default Stems

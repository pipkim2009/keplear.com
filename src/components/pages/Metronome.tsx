import { useCallback, useState, useRef, useEffect } from 'react'
import { useTranslation } from '../../contexts/TranslationContext'
import { useMetronome, PRESET_TIME_SIGNATURES, PRESET_BEATS } from '../../hooks/useMetronome'
import type { PresetTimeSignature } from '../../hooks/useMetronome'
import SEOHead from '../common/SEOHead'
import styles from '../../styles/Metronome.module.css'

export default function Metronome() {
  const { t } = useTranslation()
  const {
    isPlaying,
    bpm,
    beatsPerBar,
    beatValue,
    currentBeat,
    start,
    stop,
    setBpm,
    setBeatsPerBar,
    setBeatValue,
    tapTempo,
  } = useMetronome()

  // Derive matching preset from current values
  const activePreset =
    PRESET_TIME_SIGNATURES.find(
      ts => PRESET_BEATS[ts].top === beatsPerBar && PRESET_BEATS[ts].bottom === beatValue
    ) ?? null

  const [isEditingBpm, setIsEditingBpm] = useState(false)
  const [bpmInputValue, setBpmInputValue] = useState(String(bpm))
  const bpmInputRef = useRef<HTMLInputElement>(null)

  const handleBpmClick = useCallback(() => {
    setBpmInputValue(String(bpm))
    setIsEditingBpm(true)
    setTimeout(() => bpmInputRef.current?.select(), 0)
  }, [bpm])

  const handleBpmInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setBpmInputValue(e.target.value)
  }, [])

  const commitBpmInput = useCallback(() => {
    const value = parseInt(bpmInputValue, 10)
    if (!isNaN(value)) {
      setBpm(value)
    }
    setIsEditingBpm(false)
  }, [bpmInputValue, setBpm])

  const handleBpmInputKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') commitBpmInput()
      if (e.key === 'Escape') setIsEditingBpm(false)
    },
    [commitBpmInput]
  )

  // Hold-to-repeat for +/- buttons
  const holdIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const holdTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const startHold = useCallback(
    (delta: number) => {
      // Fire once immediately via onClick, then start repeating after a short delay
      holdTimeoutRef.current = setTimeout(() => {
        holdIntervalRef.current = setInterval(() => {
          setBpm((prev: number) => prev + delta)
        }, 60)
      }, 300)
    },
    [setBpm]
  )

  const stopHold = useCallback(() => {
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current)
      holdTimeoutRef.current = null
    }
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current)
      holdIntervalRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => stopHold()
  }, [stopHold])

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setBpm(Number(e.target.value))
    },
    [setBpm]
  )

  const sliderPercent = ((bpm - 1) / (999 - 1)) * 100
  const sliderStyle = {
    background: `linear-gradient(to right, #a855f7 ${sliderPercent}%, rgba(150, 150, 150, 0.3) ${sliderPercent}%)`,
  }

  const handleToggle = useCallback(() => {
    if (isPlaying) {
      stop()
    } else {
      start()
    }
  }, [isPlaying, start, stop])

  const handlePresetClick = useCallback(
    (ts: PresetTimeSignature) => {
      setBeatsPerBar(PRESET_BEATS[ts].top)
      setBeatValue(PRESET_BEATS[ts].bottom)
    },
    [setBeatsPerBar, setBeatValue]
  )

  const handleCustomBeatsChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseInt(e.target.value, 10)
      if (!isNaN(value)) {
        setBeatsPerBar(value)
      }
    },
    [setBeatsPerBar]
  )

  const handleBeatValueChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseInt(e.target.value, 10)
      if (!isNaN(value)) {
        setBeatValue(value)
      }
    },
    [setBeatValue]
  )

  return (
    <div className={styles.container}>
      <SEOHead
        title={t('metronome.title')}
        description={t('metronome.subtitle')}
        path="/metronome"
      />

      <div className={styles.headerSection}>
        <h1 className={styles.pageTitle}>{t('metronome.title')}</h1>
        <p className={styles.pageSubtitle}>{t('metronome.subtitle')}</p>
      </div>

      {/* Beat indicator dots */}
      <div className={styles.beatIndicator}>
        {Array.from({ length: beatsPerBar }, (_, i) => (
          <div
            key={i}
            className={`${styles.beatDot} ${i === 0 ? styles.accent : ''} ${
              isPlaying && currentBeat === i ? styles.active : ''
            }`}
          />
        ))}
      </div>

      {/* BPM display and slider */}
      <div className={styles.bpmSection}>
        <div className={styles.bpmRow}>
          <button
            className={styles.bpmBtn}
            onClick={() => setBpm(bpm - 1)}
            onPointerDown={() => startHold(-1)}
            onPointerUp={stopHold}
            onPointerLeave={stopHold}
          >
            -
          </button>
          {isEditingBpm ? (
            <input
              ref={bpmInputRef}
              type="number"
              min={1}
              max={999}
              value={bpmInputValue}
              onChange={handleBpmInputChange}
              onBlur={commitBpmInput}
              onKeyDown={handleBpmInputKeyDown}
              className={styles.bpmInput}
              autoFocus
            />
          ) : (
            <div className={styles.bpmDisplay} onClick={handleBpmClick}>
              {bpm}
            </div>
          )}
          <button
            className={styles.bpmBtn}
            onClick={() => setBpm(bpm + 1)}
            onPointerDown={() => startHold(1)}
            onPointerUp={stopHold}
            onPointerLeave={stopHold}
          >
            +
          </button>
        </div>
        <div className={styles.bpmLabel}>{t('metronome.bpm')}</div>
        <input
          type="range"
          min={1}
          max={999}
          value={bpm}
          onChange={handleSliderChange}
          className={styles.bpmSlider}
          style={sliderStyle}
        />
      </div>

      {/* Time signature selector */}
      <div className={styles.tsSection}>
        <div className={styles.tsLabel}>{t('metronome.timeSignature')}</div>
        <div className={styles.customTs}>
          <input
            type="number"
            min={1}
            max={256}
            value={beatsPerBar}
            onChange={handleCustomBeatsChange}
            className={styles.customTsInput}
          />
          <span className={styles.customTsSeparator}>/</span>
          <input
            type="number"
            min={1}
            max={256}
            value={beatValue}
            onChange={handleBeatValueChange}
            className={styles.customTsInput}
          />
        </div>
        <div className={styles.tsGrid}>
          {PRESET_TIME_SIGNATURES.map(ts => (
            <button
              key={ts}
              className={`${styles.tsBtn} ${ts === activePreset ? styles.active : ''}`}
              onClick={() => handlePresetClick(ts)}
            >
              {ts}
            </button>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className={styles.actions}>
        <button
          className={`${styles.startBtn} ${isPlaying ? styles.playing : ''}`}
          onClick={handleToggle}
        >
          {isPlaying ? t('metronome.stop') : t('metronome.start')}
        </button>
        <button className={styles.tapBtn} onClick={tapTempo}>
          {t('metronome.tapTempo')}
        </button>
      </div>
    </div>
  )
}

import { useMemo, useState, useEffect } from 'react'
import { useTranslation } from '../../contexts/TranslationContext'
import { useInstrumentType } from '../../hooks'
import { useTuner } from '../../hooks/useTuner'
import InstrumentSelector from '../instruments/shared/InstrumentSelector'
import SEOHead from '../common/SEOHead'
import styles from '../../styles/Tuner.module.css'

interface StringInfo {
  name: string
  note: string
  octave: number
}

const TUNINGS: Record<string, StringInfo[]> = {
  guitar: [
    { name: '1', note: 'E', octave: 4 },
    { name: '2', note: 'B', octave: 3 },
    { name: '3', note: 'G', octave: 3 },
    { name: '4', note: 'D', octave: 3 },
    { name: '5', note: 'A', octave: 2 },
    { name: '6', note: 'E', octave: 2 },
  ],
  bass: [
    { name: '1', note: 'G', octave: 2 },
    { name: '2', note: 'D', octave: 2 },
    { name: '3', note: 'A', octave: 1 },
    { name: '4', note: 'E', octave: 1 },
  ],
}

const CHROMATIC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

export default function Tuner() {
  const { t } = useTranslation()
  const { instrument } = useInstrumentType()
  const { detectedPitch, permission, error, volumeLevel, startTuner, stopTuner } = useTuner()

  // Auto-start tuner on mount, stop on unmount
  useEffect(() => {
    startTuner()
    return () => stopTuner()
  }, [startTuner, stopTuner])

  // Default to guitar if keyboard is selected
  const tunerInstrument = instrument === 'keyboard' ? 'guitar' : instrument
  const strings = TUNINGS[tunerInstrument] ?? TUNINGS.guitar

  // User-selected string index (-1 = auto-detect)
  const [selectedString, setSelectedString] = useState(-1)

  // Reset selection when instrument changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const prevInstrumentRef = useMemo(() => ({ current: tunerInstrument }), [])
  if (prevInstrumentRef.current !== tunerInstrument) {
    prevInstrumentRef.current = tunerInstrument
    setSelectedString(-1)
  }

  // Which string is closest to the detected pitch (auto-detect mode)
  const autoDetectedIndex = useMemo(() => {
    if (!detectedPitch) return -1
    let closest = 0
    let minDist = Infinity
    for (let i = 0; i < strings.length; i++) {
      const s = strings[i]
      const stringSemitones = s.octave * 12 + CHROMATIC.indexOf(s.note)
      const detectedSemitones = detectedPitch.octave * 12 + CHROMATIC.indexOf(detectedPitch.note)
      const dist = Math.abs(detectedSemitones - stringSemitones)
      if (dist < minDist) {
        minDist = dist
        closest = i
      }
    }
    return minDist <= 1 ? closest : -1
  }, [detectedPitch, strings])

  // Active string: user selection takes priority, otherwise auto-detect
  const activeStringIndex = selectedString >= 0 ? selectedString : autoDetectedIndex

  const needleOffset = useMemo(() => {
    if (!detectedPitch) return 50
    const clampedCents = Math.max(-50, Math.min(50, detectedPitch.cents))
    return 50 + (clampedCents / 50) * 50
  }, [detectedPitch])

  const centsClass = useMemo(() => {
    if (!detectedPitch) return ''
    const absCents = Math.abs(detectedPitch.cents)
    if (absCents <= 5) return styles.inTune
    return detectedPitch.cents > 0 ? styles.sharp : styles.flat
  }, [detectedPitch])

  const centsLabel = useMemo(() => {
    if (!detectedPitch) return ''
    const absCents = Math.abs(detectedPitch.cents)
    if (absCents <= 5) return t('tuner.inTune')
    if (detectedPitch.cents > 0)
      return `+${detectedPitch.cents} ${t('tuner.cents')} ${t('tuner.high')}`
    return `${detectedPitch.cents} ${t('tuner.cents')} ${t('tuner.low')}`
  }, [detectedPitch, t])

  return (
    <div className={styles.container}>
      <SEOHead title={t('tuner.title')} description={t('tuner.subtitle')} path="/tuner" />

      <div className={styles.headerSection}>
        <h1 className={styles.pageTitle}>{t('tuner.title')}</h1>
        <p className={styles.pageSubtitle}>{t('tuner.subtitle')}</p>
      </div>

      {/* Instrument selector — same UI as Generator, keyboard hidden */}
      <InstrumentSelector exclude={['keyboard']} />

      {/* String reference */}
      <div className={styles.stringsSection}>
        {strings.map((s, i) => {
          const isSelected = selectedString === i
          const isMatch = activeStringIndex === i
          const isInTune = isMatch && detectedPitch && Math.abs(detectedPitch.cents) <= 5
          return (
            <div
              key={`${tunerInstrument}-${i}`}
              className={`${styles.stringDot} ${isSelected ? styles.stringSelected : ''} ${isMatch ? styles.stringActive : ''} ${isInTune ? styles.stringInTune : ''}`}
              onClick={() => setSelectedString(selectedString === i ? -1 : i)}
            >
              <span className={styles.stringNote}>
                {s.note}
                {s.octave}
              </span>
            </div>
          )
        })}
      </div>

      {/* Gauge */}
      <div className={styles.gauge}>
        <div className={styles.gaugeTicks}>
          {Array.from({ length: 21 }, (_, i) => (
            <div
              key={i}
              className={`${styles.tick} ${i === 10 ? styles.tickCenter : ''} ${i % 5 === 0 ? styles.tickMajor : ''}`}
            />
          ))}
        </div>
        <div className={styles.needle} style={{ left: `${needleOffset}%` }} />
        <div className={styles.gaugeLabels}>
          <span className={styles.gaugeLabel}>{t('tuner.low')}</span>
          <span className={styles.gaugeLabel}>{t('tuner.high')}</span>
        </div>
      </div>

      {/* Note display */}
      {detectedPitch ? (
        <div className={styles.noteSection}>
          <div className={styles.noteName}>
            {detectedPitch.note}
            <span className={styles.noteOctave}>{detectedPitch.octave}</span>
          </div>
          <div className={`${styles.centsDisplay} ${centsClass}`}>{centsLabel}</div>
          <div className={styles.frequencyDisplay}>{detectedPitch.frequency.toFixed(1)} Hz</div>
        </div>
      ) : (
        <div className={styles.waitingText}>{t('tuner.waitingForInput')}</div>
      )}

      {/* Volume indicator */}
      <div className={styles.volumeIndicator}>
        <span className={styles.volumeLabel}>{t('tuner.volume')}</span>
        <div className={styles.volumeBar}>
          <div
            className={styles.volumeFill}
            style={{ width: `${Math.min(100, volumeLevel * 100)}%` }}
          />
        </div>
        <span className={styles.volumeValue}>{Math.round(volumeLevel * 100)}%</span>
      </div>

      {/* Error display */}
      {error && <div className={styles.errorText}>{error}</div>}
      {permission === 'denied' && !error && (
        <div className={styles.errorText}>{t('tuner.micDenied')}</div>
      )}
    </div>
  )
}

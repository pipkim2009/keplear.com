import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from '../../contexts/TranslationContext'
import styles from '../../styles/Home.module.css'
import { PiPianoKeysFill, PiLightningFill, PiPlayFill } from 'react-icons/pi'
import { GiGuitarHead, GiGuitarBassHead } from 'react-icons/gi'

interface HomeProps {
  onNavigateToSandbox: () => void
}

function Home({ onNavigateToSandbox }: HomeProps) {
  const { t } = useTranslation()
  const [wordIndex, setWordIndex] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  const rotatingWords = useMemo(() => [
    t('home.yourSound'),
    t('home.anyScale'),
    t('home.anyChord')
  ], [t])

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>
    const interval = setInterval(() => {
      setIsAnimating(true)
      timeoutId = setTimeout(() => {
        setWordIndex((prev) => (prev + 1) % rotatingWords.length)
        setIsAnimating(false)
      }, 300)
    }, 2500)
    return () => {
      clearInterval(interval)
      clearTimeout(timeoutId)
    }
  }, [rotatingWords.length])

  return (
    <div className={styles.home}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.badge}>
            <PiLightningFill />
            <span>{t('home.freeToUse')}</span>
          </div>

          <h1 className={styles.heroTitle}>
            {t('home.trainYourEar')}<br />
            {t('home.master')}{' '}
            <span className={`${styles.rotatingWord} ${isAnimating ? styles.fadeOut : styles.fadeIn}`}>
              {rotatingWords[wordIndex]}
            </span>
          </h1>

          <p className={styles.heroSubtitle}>
            {t('home.heroSubtitle')}
          </p>

          <div className={styles.heroCta}>
            <button className={styles.primaryButton} onClick={onNavigateToSandbox}>
              <PiPlayFill />
              {t('home.startTraining')}
            </button>
            <span className={styles.ctaNote}>{t('home.noSignup')}</span>
          </div>

          <div className={styles.heroInstruments}>
            <div className={styles.instrumentPill}>
              <PiPianoKeysFill />
              <span>{t('instruments.keyboard')}</span>
            </div>
            <div className={styles.instrumentPill}>
              <GiGuitarHead />
              <span>{t('instruments.guitar')}</span>
            </div>
            <div className={styles.instrumentPill}>
              <GiGuitarBassHead />
              <span>{t('instruments.bass')}</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Home

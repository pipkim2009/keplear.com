import { useState, useEffect, useMemo, useContext } from 'react'
import { AuthContext } from '../../contexts/AuthContext'
import { useTranslation } from '../../contexts/TranslationContext'
import styles from '../../styles/Home.module.css'
import {
  PiPianoKeysFill,
  PiLightningFill,
  PiPlayFill,
  PiMusicNotesFill,
  PiMicrophoneFill,
  PiChartLineUpFill,
  PiGraduationCapFill,
  PiGuitarFill,
  PiWaveformFill
} from 'react-icons/pi'
import { GiGuitarHead, GiGuitarBassHead } from 'react-icons/gi'

interface HomeProps {
  onNavigateToSandbox: () => void
  onNavigateToDashboard: () => void
}

function Home({ onNavigateToSandbox, onNavigateToDashboard }: HomeProps) {
  const authContext = useContext(AuthContext)
  const user = authContext?.user
  const loading = authContext?.loading

  const { t } = useTranslation()
  const [wordIndex, setWordIndex] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  // Redirect logged-in users to dashboard
  useEffect(() => {
    if (user && !loading) {
      onNavigateToDashboard()
    }
  }, [user, loading, onNavigateToDashboard])

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

  const features = [
    {
      icon: <PiMusicNotesFill />,
      title: t('home.features.melodyTraining.title'),
      description: t('home.features.melodyTraining.description')
    },
    {
      icon: <PiMicrophoneFill />,
      title: t('home.features.realtimeFeedback.title'),
      description: t('home.features.realtimeFeedback.description')
    },
    {
      icon: <PiGuitarFill />,
      title: t('home.features.multiInstrument.title'),
      description: t('home.features.multiInstrument.description')
    },
    {
      icon: <PiWaveformFill />,
      title: t('home.features.scalesChords.title'),
      description: t('home.features.scalesChords.description')
    },
    {
      icon: <PiGraduationCapFill />,
      title: t('home.features.classroom.title'),
      description: t('home.features.classroom.description')
    },
    {
      icon: <PiChartLineUpFill />,
      title: t('home.features.progress.title'),
      description: t('home.features.progress.description')
    }
  ]

  return (
    <div className={styles.home}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroBackground}>
          <div className={styles.gradientOrb1} />
          <div className={styles.gradientOrb2} />
          <div className={styles.gradientOrb3} />
        </div>

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

      {/* Features Section */}
      <section className={styles.features}>
        <div className={styles.featuresContainer}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionLabel}>{t('home.whyKeplear')}</span>
            <h2>{t('home.featuresTitle')}</h2>
            <p>{t('home.featuresSubtitle')}</p>
          </div>

          <div className={styles.featureGrid}>
            {features.map((feature, index) => (
              <div
                key={index}
                className={styles.featureCard}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className={styles.featureIconWrapper}>
                  {feature.icon}
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className={styles.stats}>
        <div className={styles.statsContainer}>
          <div className={styles.statItem}>
            <span className={styles.statNumber}>3</span>
            <span className={styles.statLabel}>{t('home.stats.instruments')}</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.statItem}>
            <span className={styles.statNumber}>50+</span>
            <span className={styles.statLabel}>{t('home.stats.scales')}</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.statItem}>
            <span className={styles.statNumber}>100%</span>
            <span className={styles.statLabel}>{t('home.stats.free')}</span>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className={styles.finalCta}>
        <div className={styles.ctaContent}>
          <h2>{t('home.readyToStart')}</h2>
          <p>{t('home.ctaDescription')}</p>
          <button className={styles.primaryButton} onClick={onNavigateToSandbox}>
            <PiPlayFill />
            {t('home.startTraining')}
          </button>
        </div>
      </section>
    </div>
  )
}

export default Home

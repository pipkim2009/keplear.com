import { useState, useEffect } from 'react'
import styles from '../../styles/Home.module.css'
import { PiPianoKeysFill, PiLightningFill, PiPlayFill } from 'react-icons/pi'
import { GiGuitarHead, GiGuitarBassHead } from 'react-icons/gi'

interface HomeProps {
  onNavigateToSandbox: () => void
  onNavigateToPractice: () => void
}

const ROTATING_WORDS = ['Your Sound', 'Any Scale', 'Any Chord']

function Home({ onNavigateToSandbox }: HomeProps) {
  const [wordIndex, setWordIndex] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>
    const interval = setInterval(() => {
      setIsAnimating(true)
      timeoutId = setTimeout(() => {
        setWordIndex((prev) => (prev + 1) % ROTATING_WORDS.length)
        setIsAnimating(false)
      }, 300)
    }, 2500)
    return () => {
      clearInterval(interval)
      clearTimeout(timeoutId)
    }
  }, [])

  return (
    <div className={styles.home}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.badge}>
            <PiLightningFill />
            <span>Free to use</span>
          </div>

          <h1 className={styles.heroTitle}>
            Train Your Ear.<br />
            Master{' '}
            <span className={`${styles.rotatingWord} ${isAnimating ? styles.fadeOut : styles.fadeIn}`}>
              {ROTATING_WORDS[wordIndex]}
            </span>
          </h1>

          <p className={styles.heroSubtitle}>
            The ear training app for serious musicians. Practice on keyboard, guitar, or bass with instant feedback.
          </p>

          <div className={styles.heroCta}>
            <button className={styles.primaryButton} onClick={onNavigateToSandbox}>
              <PiPlayFill />
              Start Training Now
            </button>
            <span className={styles.ctaNote}>No signup required</span>
          </div>

          <div className={styles.heroInstruments}>
            <div className={styles.instrumentPill}>
              <PiPianoKeysFill />
              <span>Keyboard</span>
            </div>
            <div className={styles.instrumentPill}>
              <GiGuitarHead />
              <span>Guitar</span>
            </div>
            <div className={styles.instrumentPill}>
              <GiGuitarBassHead />
              <span>Bass</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Home

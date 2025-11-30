import { useState, useEffect } from 'react'
import styles from '../../styles/Home.module.css'
import { PiPianoKeysFill, PiMicrophoneFill, PiMusicNotesFill, PiLightningFill, PiTargetFill, PiTrendUpFill, PiPlayFill, PiArrowRightBold } from 'react-icons/pi'
import { GiGuitarHead, GiGuitarBassHead } from 'react-icons/gi'

interface HomeProps {
  onNavigateToSandbox: () => void
  onNavigateToPractice: () => void
}

const ROTATING_WORDS = ['Perfect Pitch', 'Any Scale', 'Every Chord', 'Your Sound']

function Home({ onNavigateToSandbox }: HomeProps) {
  const [wordIndex, setWordIndex] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true)
      setTimeout(() => {
        setWordIndex((prev) => (prev + 1) % ROTATING_WORDS.length)
        setIsAnimating(false)
      }, 300)
    }, 2500)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className={styles.home}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroBackground}>
          <div className={styles.gradientOrb1}></div>
          <div className={styles.gradientOrb2}></div>
          <div className={styles.gradientOrb3}></div>
        </div>

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

      {/* What You Get Section */}
      <section className={styles.features}>
        <div className={styles.sectionHeader}>
          <h2>Everything you need to level up</h2>
        </div>

        <div className={styles.featureGrid}>
          <div className={styles.featureCard}>
            <div className={styles.featureIconWrapper}>
              <PiMusicNotesFill />
            </div>
            <h3>50+ Scales & Modes</h3>
            <p>From major scales to exotic modes. All visualized on your instrument.</p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIconWrapper}>
              <PiTargetFill />
            </div>
            <h3>100+ Chord Types</h3>
            <p>Triads, sevenths, extensions, alterations. Every voicing you need.</p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIconWrapper}>
              <PiMicrophoneFill />
            </div>
            <h3>Live Feedback</h3>
            <p>Connect your mic and get real-time pitch detection as you play.</p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIconWrapper}>
              <PiTrendUpFill />
            </div>
            <h3>Smart Practice</h3>
            <p>Custom melody generation to target exactly what you want to learn.</p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className={styles.howItWorks}>
        <div className={styles.sectionHeader}>
          <h2>Three steps to better ears</h2>
        </div>

        <div className={styles.stepsGrid}>
          <div className={styles.step}>
            <div className={styles.stepNumber}>1</div>
            <h3>Pick Your Notes</h3>
            <p>Select any notes, scales, or chords you want to practice</p>
          </div>

          <div className={styles.stepArrow}>
            <PiArrowRightBold />
          </div>

          <div className={styles.step}>
            <div className={styles.stepNumber}>2</div>
            <h3>Generate & Listen</h3>
            <p>Create a melody and train your ear to recognize each note</p>
          </div>

          <div className={styles.stepArrow}>
            <PiArrowRightBold />
          </div>

          <div className={styles.step}>
            <div className={styles.stepNumber}>3</div>
            <h3>Play It Back</h3>
            <p>Play along on your instrument with real-time feedback</p>
          </div>
        </div>
      </section>

      {/* Instruments Showcase */}
      <section className={styles.instruments}>
        <div className={styles.sectionHeader}>
          <h2>Your instrument. Your way.</h2>
        </div>

        <div className={styles.instrumentCards}>
          <div className={`${styles.instrumentCard} ${styles.keyboard}`}>
            <div className={styles.instrumentCardIcon}>
              <PiPianoKeysFill />
            </div>
            <h3>Keyboard</h3>
            <p>Full 88-key range with realistic samples. Range selection for focused practice.</p>
            <button className={styles.instrumentButton} onClick={onNavigateToSandbox}>
              Try Keyboard
              <PiArrowRightBold />
            </button>
          </div>

          <div className={`${styles.instrumentCard} ${styles.guitar}`}>
            <div className={styles.instrumentCardIcon}>
              <GiGuitarHead />
            </div>
            <h3>Guitar</h3>
            <p>Complete fretboard visualization. Practice by position with scale boxes.</p>
            <button className={styles.instrumentButton} onClick={onNavigateToSandbox}>
              Try Guitar
              <PiArrowRightBold />
            </button>
          </div>

          <div className={`${styles.instrumentCard} ${styles.bass}`}>
            <div className={styles.instrumentCardIcon}>
              <GiGuitarBassHead />
            </div>
            <h3>Bass</h3>
            <p>4-string bass with all positions. Build your groove foundation.</p>
            <button className={styles.instrumentButton} onClick={onNavigateToSandbox}>
              Try Bass
              <PiArrowRightBold />
            </button>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className={styles.finalCta}>
        <div className={styles.ctaContent}>
          <h2>Ready to transform your ears?</h2>
          <p>Join musicians developing perfect pitch with Keplear</p>
          <button className={styles.primaryButton} onClick={onNavigateToSandbox}>
            <PiPlayFill />
            Start Training Free
          </button>
        </div>
      </section>
    </div>
  )
}

export default Home

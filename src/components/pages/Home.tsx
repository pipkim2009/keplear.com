import styles from '../../styles/Home.module.css'
import { PiPianoKeysFill, PiMicrophoneFill, PiBookOpenFill, PiClockFill, PiChartBarFill } from 'react-icons/pi'
import { GiGuitarHead, GiGuitarBassHead } from 'react-icons/gi'
import { IoMusicalNotes } from 'react-icons/io5'

interface HomeProps {
  onNavigateToSandbox: () => void
  onNavigateToPractice: () => void
}

function Home({ onNavigateToSandbox }: HomeProps) {

  return (
    <div className={styles.homeContainer}>
      {/* Hero Section */}
      <section className={styles.heroSection}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>
            Train Your Musical Ear
          </h1>
          <p className={styles.heroTagline}>Like the Greats</p>
          <p className={styles.heroDescription}>
            Interactive ear training for keyboard, guitar, and bass. Generate custom melodies,
            practice with real-time feedback, and master any note, scale, or chord.
          </p>
          <div className={styles.heroCta}>
            <button
              className={styles.primaryBtn}
              onClick={onNavigateToSandbox}
              aria-label="Start practicing in the Sandbox"
            >
              Start Training Free
            </button>
          </div>
        </div>
        <div className={styles.heroVisual}>
          <div className={styles.floatingNote} style={{ '--delay': '0s' } as React.CSSProperties}>
            <span>C</span>
          </div>
          <div className={styles.floatingNote} style={{ '--delay': '0.5s' } as React.CSSProperties}>
            <span>E</span>
          </div>
          <div className={styles.floatingNote} style={{ '--delay': '1s' } as React.CSSProperties}>
            <span>G</span>
          </div>
          <div className={styles.floatingNote} style={{ '--delay': '1.5s' } as React.CSSProperties}>
            <span>B</span>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className={styles.statsSection}>
        <div className={styles.statItem}>
          <span className={styles.statNumber}>3</span>
          <span className={styles.statLabel}>Instruments</span>
        </div>
        <div className={styles.statDivider}></div>
        <div className={styles.statItem}>
          <span className={styles.statNumber}>50+</span>
          <span className={styles.statLabel}>Scales & Modes</span>
        </div>
        <div className={styles.statDivider}></div>
        <div className={styles.statItem}>
          <span className={styles.statNumber}>100+</span>
          <span className={styles.statLabel}>Chord Types</span>
        </div>
      </section>

      {/* Features Section */}
      <section className={styles.featuresSection}>
        <h2 className={styles.sectionTitle}>Everything You Need</h2>
        <p className={styles.sectionSubtitle}>
          A complete toolkit for developing perfect pitch and musical intuition
        </p>
        <div className={styles.featuresGrid}>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>
              <PiPianoKeysFill />
            </div>
            <h3 className={styles.featureTitle}>Virtual Instruments</h3>
            <p className={styles.featureDescription}>
              Practice on realistic keyboard, guitar, and bass interfaces with high-quality sampled sounds.
            </p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>
              <IoMusicalNotes />
            </div>
            <h3 className={styles.featureTitle}>Smart Melody Generation</h3>
            <p className={styles.featureDescription}>
              Create custom practice melodies from any combination of notes, scales, and chord progressions.
            </p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>
              <PiMicrophoneFill />
            </div>
            <h3 className={styles.featureTitle}>Live Feedback</h3>
            <p className={styles.featureDescription}>
              Connect your instrument and receive instant feedback on pitch accuracy and timing.
            </p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>
              <PiBookOpenFill />
            </div>
            <h3 className={styles.featureTitle}>Music Theory Library</h3>
            <p className={styles.featureDescription}>
              Explore an interactive visual library of scales, modes, and chord voicings.
            </p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>
              <PiClockFill />
            </div>
            <h3 className={styles.featureTitle}>Tempo Control</h3>
            <p className={styles.featureDescription}>
              Adjust BPM from slow practice speeds to performance tempo as your skills improve.
            </p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>
              <PiChartBarFill />
            </div>
            <h3 className={styles.featureTitle}>Progress Tracking</h3>
            <p className={styles.featureDescription}>
              Two-stage learning system that guides you from exploration to mastery.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className={styles.howItWorksSection}>
        <h2 className={styles.sectionTitle}>How It Works</h2>
        <p className={styles.sectionSubtitle}>
          Three simple steps to better ears
        </p>
        <div className={styles.stepsContainer}>
          <div className={styles.stepCard}>
            <div className={styles.stepNumber}>1</div>
            <div className={styles.stepContent}>
              <h3 className={styles.stepTitle}>Choose Your Focus</h3>
              <p className={styles.stepDescription}>
                Select your instrument and pick any notes, scales, or chords you want to practice.
              </p>
            </div>
          </div>

          <div className={styles.stepConnector}></div>

          <div className={styles.stepCard}>
            <div className={styles.stepNumber}>2</div>
            <div className={styles.stepContent}>
              <h3 className={styles.stepTitle}>Generate & Listen</h3>
              <p className={styles.stepDescription}>
                Create a unique practice melody and train your ear to recognize each note.
              </p>
            </div>
          </div>

          <div className={styles.stepConnector}></div>

          <div className={styles.stepCard}>
            <div className={styles.stepNumber}>3</div>
            <div className={styles.stepContent}>
              <h3 className={styles.stepTitle}>Play & Improve</h3>
              <p className={styles.stepDescription}>
                Play along on your instrument and receive real-time feedback on your accuracy.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Instruments Section */}
      <section className={styles.instrumentsSection}>
        <h2 className={styles.sectionTitle}>Pick Your Instrument</h2>
        <div className={styles.instrumentsGrid}>
          <div className={styles.instrumentCard}>
            <div className={styles.instrumentIcon}>
              <PiPianoKeysFill />
            </div>
            <h3>Keyboard</h3>
            <p>Full 88-key range with realistic piano samples</p>
          </div>
          <div className={styles.instrumentCard}>
            <div className={styles.instrumentIcon}>
              <GiGuitarHead />
            </div>
            <h3>Guitar</h3>
            <p>Complete fretboard visualization with multiple positions</p>
          </div>
          <div className={styles.instrumentCard}>
            <div className={styles.instrumentIcon}>
              <GiGuitarBassHead />
            </div>
            <h3>Bass</h3>
            <p>4-string bass with position-based practice modes</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaContent}>
          <h2 className={styles.ctaTitle}>Ready to Transform Your Ear?</h2>
          <p className={styles.ctaDescription}>
            Join musicians who are developing perfect pitch and musical intuition with Keplear.
          </p>
          <button
            className={styles.primaryBtn}
            onClick={onNavigateToSandbox}
            aria-label="Start practicing with Keplear"
          >
            Start Training Now
          </button>
        </div>
      </section>
    </div>
  )
}

export default Home

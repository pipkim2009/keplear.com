import styles from '../../styles/Home.module.css'

interface HomeProps {
  onNavigateToSandbox: () => void
  onNavigateToPractice: () => void
}

function Home({ onNavigateToSandbox, onNavigateToPractice }: HomeProps) {

  return (
    <div className={styles.homeContainer}>
      {/* Hero Section */}
      <section className={styles.heroSection}>
        <h1 className={styles.heroTitle}>Keplear</h1>
        <p className={styles.heroSubtitle}>Learn music like the greats</p>
        <p className={styles.heroDescription}>
          Master keyboard, guitar, or bass through interactive melodies that provide
          live feedback to your practice, so you can train your ears to both recognize
          and play any note, scale, or chord on your instrument.
        </p>
        <div className={styles.heroCta}>
          <button
            className={styles.primaryBtn}
            onClick={onNavigateToSandbox}
            aria-label="Start practicing in the Sandbox"
          >
            Start Practicing
          </button>
        </div>
      </section>

      {/* Features Section */}
      <section className={styles.featuresSection}>
        <h2 className={styles.featuresTitle}>Your toolbox for perfecting your musical ear training</h2>
        <div className={styles.featuresGrid}>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>🎹</div>
            <h3 className={styles.featureTitle}>Virtual Instruments</h3>
            <p className={styles.featureDescription}>
              Utilize realistically sampled interactive instruments to personally
              tailor your ear training experience.
            </p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>🎵</div>
            <h3 className={styles.featureTitle}>Melody Generation</h3>
            <p className={styles.featureDescription}>
              Generate melodies including scales and/or chord arpeggios/progressions
              in order to equip yourself with the melodies needed to fit your ear
              training abilities.
            </p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>🎼</div>
            <h3 className={styles.featureTitle}>Music Theory Library</h3>
            <p className={styles.featureDescription}>
              Explore our comprehensive visual and interactive library of scales
              and chords to aid your ear training sessions.
            </p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>👂</div>
            <h3 className={styles.featureTitle}>Live Feedback</h3>
            <p className={styles.featureDescription}>
              Validate your practice with our live feedback and self-assessment tools.
            </p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>⏺️</div>
            <h3 className={styles.featureTitle}>Practice Templates</h3>
            <p className={styles.featureDescription}>
              Utilize uniquely generated melodies as your practice exercise templates.
            </p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>⚡</div>
            <h3 className={styles.featureTitle}>Customizable Practice</h3>
            <p className={styles.featureDescription}>
              Interactive tempo and note count adjustments available for any
              instrument you use.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className={styles.howItWorksSection}>
        <h2 className={styles.howItWorksTitle}>How It Works</h2>
        <div className={styles.stepsGrid}>
          <div className={styles.stepCard}>
            <div className={styles.stepNumber}>1</div>
            <h3 className={styles.stepTitle}>Select Your Instrument</h3>
            <p className={styles.stepDescription}>
              Select from keyboard, guitar, or bass to get started.
            </p>
          </div>

          <div className={styles.stepCard}>
            <div className={styles.stepNumber}>2</div>
            <h3 className={styles.stepTitle}>Choose Your Note Selection</h3>
            <p className={styles.stepDescription}>
              Select any notes, scales, or chords you wish your melody to include.
            </p>
          </div>

          <div className={styles.stepCard}>
            <div className={styles.stepNumber}>3</div>
            <h3 className={styles.stepTitle}>Generate & Play</h3>
            <p className={styles.stepDescription}>
              Generate your melody and play along.
            </p>
          </div>

          <div className={styles.stepCard}>
            <div className={styles.stepNumber}>4</div>
            <h3 className={styles.stepTitle}>Practice & Improve</h3>
            <p className={styles.stepDescription}>
              Receive live feedback on your practice as you play.
            </p>
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className={styles.ctaSection}>
        <h2 className={styles.ctaTitle}>Ready to Master Your Instrument?</h2>
        <p className={styles.ctaDescription}>
          Join musicians who are learning smarter with Keplear's interactive platform.
        </p>
        <button
          className={styles.primaryBtn}
          onClick={onNavigateToSandbox}
          aria-label="Start practicing with Keplear"
        >
          Start Practicing
        </button>
      </section>
    </div>
  )
}

export default Home

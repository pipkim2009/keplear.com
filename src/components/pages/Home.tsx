import '../../styles/Home.css'
import { FaPlay } from 'react-icons/fa'
import { GiGuitarBassHead, GiPianoKeys, GiGuitarHead } from 'react-icons/gi'
import { IoMusicalNotes } from 'react-icons/io5'

interface HomeProps {
  onNavigateToSandbox: () => void
  onNavigateToPractice: () => void
}

function Home({ onNavigateToSandbox, onNavigateToPractice }: HomeProps) {
  return (
    <div className="home-page">
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            Learn Music Like the Greats
          </h1>
          <p className="hero-description">
            Master keyboard, guitar, and bass with interactive practice tools.
            Apply scales and chords, generate melodies, and develop your musical ear.
          </p>
          <div className="hero-actions">
            <button
              className="cta-button primary"
              onClick={onNavigateToSandbox}
            >
              <FaPlay className="button-icon" />
              Start Learning
            </button>
            <button
              className="cta-button secondary"
              onClick={onNavigateToPractice}
            >
              Practice Mode
            </button>
          </div>
        </div>

        <div className="instruments-showcase">
          <div className="instrument-badge">
            <GiPianoKeys className="badge-icon" />
            <span>Keyboard</span>
          </div>
          <div className="instrument-badge">
            <GiGuitarHead className="badge-icon" />
            <span>Guitar</span>
          </div>
          <div className="instrument-badge">
            <GiGuitarBassHead className="badge-icon" />
            <span>Bass</span>
          </div>
        </div>
      </section>

      <section className="features-section">
        <div className="feature-item">
          <div className="feature-number">3</div>
          <div className="feature-label">Instruments</div>
        </div>
        <div className="feature-item">
          <div className="feature-number">11+</div>
          <div className="feature-label">Scales</div>
        </div>
        <div className="feature-item">
          <div className="feature-number">12+</div>
          <div className="feature-label">Chords</div>
        </div>
        <div className="feature-item">
          <IoMusicalNotes className="feature-icon-large" />
          <div className="feature-label">Smart Generation</div>
        </div>
      </section>
    </div>
  )
}

export default Home

import '../../styles/Home.css'
import { IoMusicalNotes } from 'react-icons/io5'
import { FaRecordVinyl, FaMusic, FaPlay } from 'react-icons/fa'
import { GiGuitarBassHead, GiPianoKeys, GiGuitarHead } from 'react-icons/gi'
import { TbWaveSine } from 'react-icons/tb'
import { HiSparkles } from 'react-icons/hi2'

interface HomeProps {
  onNavigateToSandbox: () => void
  onNavigateToPractice: () => void
}

function Home({ onNavigateToSandbox, onNavigateToPractice }: HomeProps) {
  return (
    <div className="home-page">
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-badge">
            <HiSparkles className="sparkle-icon" />
            <span>Ear Training Reimagined</span>
          </div>
          <h1 className="hero-title">
            Master Music By Ear
            <span className="hero-title-accent"> The Fun Way</span>
          </h1>
          <p className="hero-description">
            Play keyboard, guitar, and bass. Generate melodies from scales and chords.
            Record your sessions. Learn music theory hands-on.
          </p>
          <div className="hero-actions">
            <button
              className="cta-button primary"
              onClick={onNavigateToSandbox}
            >
              <FaPlay className="button-icon" />
              Launch Sandbox
            </button>
            <button
              className="cta-button secondary"
              onClick={onNavigateToPractice}
            >
              Practice Mode
            </button>
          </div>
          <div className="hero-stats">
            <div className="stat-item">
              <span className="stat-number">3</span>
              <span className="stat-label">Instruments</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <span className="stat-number">11+</span>
              <span className="stat-label">Scales</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <span className="stat-number">12+</span>
              <span className="stat-label">Chords</span>
            </div>
          </div>
        </div>
        <div className="hero-visual">
          <div className="instrument-showcase">
            <div className="showcase-card card-1">
              <GiPianoKeys className="showcase-icon" />
              <span className="showcase-label">Keyboard</span>
            </div>
            <div className="showcase-card card-2">
              <GiGuitarHead className="showcase-icon" />
              <span className="showcase-label">Guitar</span>
            </div>
            <div className="showcase-card card-3">
              <GiGuitarBassHead className="showcase-icon" />
              <span className="showcase-label">Bass</span>
            </div>
            <div className="waveform-container">
              <TbWaveSine className="waveform wave-1" />
              <TbWaveSine className="waveform wave-2" />
              <TbWaveSine className="waveform wave-3" />
            </div>
          </div>
        </div>
      </section>

      <section className="instruments-section">
        <div className="instruments-container">
          <div className="section-header">
            <h2 className="section-title">Three Professional Instruments</h2>
            <p className="section-subtitle">Studio-quality samples. Unlimited possibilities.</p>
          </div>
          <div className="instruments-grid">
            <div className="instrument-card">
              <div className="instrument-icon-wrapper">
                <GiPianoKeys className="instrument-icon" />
                <div className="icon-glow"></div>
              </div>
              <h3 className="instrument-name">Keyboard</h3>
              <p className="instrument-description">
                Two-octave range with adjustable octave control (1-8). Range and multi-select modes for versatile melody creation.
              </p>
              <div className="instrument-features">
                <span className="feature-tag">Octave Range</span>
                <span className="feature-tag">Selection Modes</span>
                <span className="feature-tag">Piano Samples</span>
              </div>
            </div>
            <div className="instrument-card featured">
              <div className="featured-badge">Most Popular</div>
              <div className="instrument-icon-wrapper">
                <GiGuitarHead className="instrument-icon" />
                <div className="icon-glow"></div>
              </div>
              <h3 className="instrument-name">Guitar</h3>
              <p className="instrument-description">
                24-fret visualization with scale positions and chord shapes. Perfect for learning fretboard patterns and voicings.
              </p>
              <div className="instrument-features">
                <span className="feature-tag">24 Frets</span>
                <span className="feature-tag">Scale Boxes</span>
                <span className="feature-tag">Chord Shapes</span>
              </div>
            </div>
            <div className="instrument-card">
              <div className="instrument-icon-wrapper">
                <GiGuitarBassHead className="instrument-icon" />
                <div className="icon-glow"></div>
              </div>
              <h3 className="instrument-name">Bass</h3>
              <p className="instrument-description">
                4-string electric bass optimized for low-end practice. Full fretboard with bass-specific chord voicings.
              </p>
              <div className="instrument-features">
                <span className="feature-tag">4 Strings</span>
                <span className="feature-tag">Low-End Focus</span>
                <span className="feature-tag">Power Chords</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="features-section">
        <div className="features-container">
          <div className="section-header">
            <h2 className="section-title">Everything You Need to Learn</h2>
            <p className="section-subtitle">Powerful features designed for real progress</p>
          </div>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <FaMusic className="feature-icon" />
              </div>
              <h3 className="feature-title">11 Scales & 12 Chords</h3>
              <p className="feature-description">
                Major, minor, pentatonic, blues, modes, and more. Apply multiple scales and chords simultaneously with visual highlighting.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <IoMusicalNotes className="feature-icon" />
              </div>
              <h3 className="feature-title">Smart Melody Generation</h3>
              <p className="feature-description">
                Arpeggiator and progression modes. Generate 1-100 beat sequences from your selected notes, scales, or chords.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <FaRecordVinyl className="feature-icon" />
              </div>
              <h3 className="feature-title">Audio Recording</h3>
              <p className="feature-description">
                Auto-record every melody. Professional playback controls with download capability for tracking your progress.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <div className="cta-container">
          <div className="cta-content">
            <h2 className="cta-title">Ready to Train Your Ear?</h2>
            <p className="cta-description">
              Jump into Sandbox Mode and start experimenting with three professional instruments,
              comprehensive music theory, and intelligent melody generation.
            </p>
            <div className="cta-actions">
              <button className="cta-button-large primary" onClick={onNavigateToSandbox}>
                <FaPlay className="button-icon" />
                Launch Sandbox Now
              </button>
            </div>
            <div className="cta-features-list">
              <div className="cta-feature">
                <IoMusicalNotes className="cta-feature-icon" />
                <span>11+ Scales & 12+ Chords</span>
              </div>
              <div className="cta-feature">
                <FaRecordVinyl className="cta-feature-icon" />
                <span>Auto-Recording</span>
              </div>
              <div className="cta-feature">
                <GiPianoKeys className="cta-feature-icon" />
                <span>3 Instruments</span>
              </div>
            </div>
          </div>
          <div className="cta-visual">
            <div className="cta-card">
              <div className="card-glow"></div>
              <div className="musical-notes">
                <IoMusicalNotes className="note-icon note-float-1" />
                <IoMusicalNotes className="note-icon note-float-2" />
                <IoMusicalNotes className="note-icon note-float-3" />
                <IoMusicalNotes className="note-icon note-float-4" />
                <IoMusicalNotes className="note-icon note-float-5" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Home
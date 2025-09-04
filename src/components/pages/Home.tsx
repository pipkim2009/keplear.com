import '../../styles/Home.css'

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
            Unlock Your Potential With
            <span className="hero-title-accent"> Hands-On Ear Training</span>
          </h1>
          <p className="hero-description">
            The world's first hands on ear training tool for learning music by ear.
          </p>
          <div className="hero-actions">
            <button 
              className="cta-button primary"
              onClick={onNavigateToSandbox}
            >
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
        <div className="hero-visual">
          <div className="visual-element">
            <div className="floating-note note-1">♪</div>
            <div className="floating-note note-2">♫</div>
            <div className="floating-note note-3">♪</div>
            <div className="floating-note note-4">♬</div>
          </div>
        </div>
      </section>

      <section className="features-section">
        <div className="features-container">
          <h2 className="features-title">Your Ear Training Toolbox</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🎵</div>
              <h3 className="feature-title">Melody Generation</h3>
              <p className="feature-description">
                Create custom melodies based on your skill level, develop your melody 
                recognition abilities.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🎯</div>
              <h3 className="feature-title">Structured Practice</h3>
              <p className="feature-description">
                Follow personalised exercises to build your ear training skills from 
                beginner to pro.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3 className="feature-title">Track Progress</h3>
              <p className="feature-description">
                Track your progress over time with personalised analytics and 
                recommendations.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="modes-section">
        <div className="modes-container">
          <h2 className="modes-title">Choose Your Learning Path</h2>
          <div className="modes-grid">
            <div className="mode-card" onClick={onNavigateToSandbox}>
              <div className="mode-header">
                <h3 className="mode-title">Sandbox Mode</h3>
              </div>
              <p className="mode-description">
                Experiment freely with instruments and melodies. Perfect for exploration 
                and casual practice without structured exercises.
              </p>
            </div>
            <div className="mode-card practice-mode" onClick={onNavigateToPractice}>
              <div className="coming-soon-badge">Coming Soon</div>
              <div className="mode-header">
                <h3 className="mode-title">Practice Mode</h3>
              </div>
              <p className="mode-description">
                Structured exercises and challenges designed to systematically improve 
                your ear training abilities with measurable progress.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Home
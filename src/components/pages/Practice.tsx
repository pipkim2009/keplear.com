import styles from '../../styles/Practice.module.css'

interface PracticeProps {
  onNavigateToSandbox: () => void
}

interface Lesson {
  id: string
  icon: string
  title: string
  description: string
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced'
  duration: string
  topics: string[]
}

const lessons: Lesson[] = [
  {
    id: 'simple-melody',
    icon: '🎵',
    title: 'Simple Melody Recognition',
    description: 'Build your foundation by recognizing and playing back simple melodies. Perfect for beginners starting their ear training journey.',
    difficulty: 'Beginner',
    duration: '10-15 min',
    topics: ['Basic Melodies', 'Step-wise Motion', 'Simple Patterns']
  },
  {
    id: 'scale-recognition',
    icon: '🎹',
    title: 'Scale Recognition',
    description: 'Train your ear to identify different scale types. Learn to recognize major, minor, and modal scale patterns by ear.',
    difficulty: 'Beginner',
    duration: '15-20 min',
    topics: ['Major Scales', 'Minor Scales', 'Modal Scales']
  },
  {
    id: 'chord-progression-recognition',
    icon: '🎸',
    title: 'Chord Progression Recognition',
    description: 'Develop your ability to hear and identify common chord progressions. Recognize the harmonic patterns that drive music.',
    difficulty: 'Intermediate',
    duration: '20-25 min',
    topics: ['I-IV-V Progressions', 'ii-V-I Patterns', 'Common Sequences']
  },
  {
    id: 'chord-arpeggio-recognition',
    icon: '🎼',
    title: 'Chord Arpeggio Recognition',
    description: 'Master the art of hearing arpeggiated chords. Learn to identify chord qualities through their broken chord patterns.',
    difficulty: 'Intermediate',
    duration: '15-20 min',
    topics: ['Major Arpeggios', 'Minor Arpeggios', 'Extended Chords']
  },
  {
    id: 'mixed-melody-recognition',
    icon: '⚡',
    title: 'Mixed Melody Recognition',
    description: 'Challenge yourself with complex melodies combining scales, arpeggios, and progressions. The ultimate ear training test.',
    difficulty: 'Advanced',
    duration: '20-30 min',
    topics: ['Complex Melodies', 'Mixed Patterns', 'Advanced Recognition']
  }
]

function Practice({ onNavigateToSandbox }: PracticeProps) {
  const handleStartLesson = (lessonId: string) => {
    // TODO: Navigate to specific lesson when functionality is implemented
    console.log(`Starting lesson: ${lessonId}`)
    onNavigateToSandbox()
  }

  return (
    <div className={styles.practiceContainer}>
      {/* Header Section */}
      <section className={styles.headerSection}>
        <h1 className={styles.pageTitle}>Practice Lessons</h1>
        <p className={styles.pageSubtitle}>
          Structured exercises designed to improve your ear training and musical skills
        </p>
      </section>

      {/* Lessons Grid */}
      <section className={styles.lessonsSection}>
        <div className={styles.lessonsGrid}>
          {/* Reorder lessons: Featured ones first (1 & 5), then regular ones (2, 3, 4) */}
          {[lessons[0], lessons[4], lessons[1], lessons[2], lessons[3]].map((lesson, index) => {
            const isFeatured = index === 0 || index === 1
            return (
              <div key={lesson.id} className={isFeatured ? styles.featuredLessonCard : styles.lessonCard}>
                <div className={styles.lessonHeader}>
                  <div className={styles.lessonIcon}>{lesson.icon}</div>
                  <div className={styles.lessonMeta}>
                    <span className={styles.durationBadge}>{lesson.duration}</span>
                  </div>
                </div>

                <div className={styles.lessonContent}>
                  <h3 className={styles.lessonTitle}>{lesson.title}</h3>
                  <p className={styles.lessonDescription}>{lesson.description}</p>

                  <div className={styles.topicsContainer}>
                    <p className={styles.topicsLabel}>You'll learn:</p>
                    <ul className={styles.topicsList}>
                      {lesson.topics.map((topic, topicIndex) => (
                        <li key={topicIndex} className={styles.topicItem}>
                          {topic}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <button
                  className={styles.startButton}
                  onClick={() => handleStartLesson(lesson.id)}
                  aria-label={`Start ${lesson.title} lesson`}
                >
                  Start Lesson
                </button>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}

export default Practice

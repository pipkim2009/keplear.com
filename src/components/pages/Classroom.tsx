/**
 * Classroom Page - Structured learning environment
 */

import styles from '../../styles/Practice.module.css'

function Classroom() {
  return (
    <div className={styles.practiceContainer}>
      <section className={styles.headerSection}>
        <h1 className={styles.pageTitle}>Classroom</h1>
        <p className={styles.pageSubtitle}>
          Structured lessons and courses for learning music theory
        </p>
      </section>
    </div>
  )
}

export default Classroom

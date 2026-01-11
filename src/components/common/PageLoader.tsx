import React from 'react'
import styles from './PageLoader.module.css'

/**
 * Loading fallback for lazy-loaded pages
 * Displays a subtle loading indicator while page chunks are being loaded
 */
const PageLoader: React.FC = () => {
  return (
    <div className={styles.loaderContainer} role="status" aria-label="Loading page">
      <div className={styles.loader}>
        <div className={styles.spinnerRing}>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
        </div>
        <span className={styles.loadingText}>Loading...</span>
      </div>
    </div>
  )
}

export default PageLoader

import React from 'react'
import { useTranslation } from '../../contexts/TranslationContext'
import styles from './PageLoader.module.css'

/**
 * Loading fallback for lazy-loaded pages
 * Displays a subtle loading indicator while page chunks are being loaded
 */
const PageLoader: React.FC = () => {
  const { t } = useTranslation()
  return (
    <div className={styles.loaderContainer} role="status" aria-label={t('aria.loadingPage')}>
      <div className={styles.loader}>
        <div className={styles.spinnerRing}>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
        </div>
        <span className={styles.loadingText}>{t('common.loading')}</span>
      </div>
    </div>
  )
}

export default PageLoader

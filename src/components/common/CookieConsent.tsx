import { useState, useEffect } from 'react'
import { Link } from 'react-router'
import styles from '../../styles/CookieConsent.module.css'

const CONSENT_KEY = 'keplear_cookie_consent'

/**
 * Cookie consent banner — shown until the user accepts or declines.
 * Consent choice is stored in localStorage.
 */
export default function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY)
    if (!stored) setVisible(true)
  }, [])

  const handleAccept = () => {
    localStorage.setItem(CONSENT_KEY, 'accepted')
    setVisible(false)
  }

  const handleDecline = () => {
    localStorage.setItem(CONSENT_KEY, 'declined')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div role="dialog" aria-label="Cookie consent" className={styles.banner}>
      <p className={styles.message}>
        We use essential cookies to keep you signed in and remember your preferences.{' '}
        <Link to="/cookies" className={styles.link}>
          Cookie Policy
        </Link>{' '}
        &middot;{' '}
        <Link to="/privacy" className={styles.link}>
          Privacy Policy
        </Link>
      </p>
      <div className={styles.buttons}>
        <button onClick={handleDecline} className={styles.declineButton}>
          Decline
        </button>
        <button onClick={handleAccept} className={styles.acceptButton}>
          Accept
        </button>
      </div>
    </div>
  )
}

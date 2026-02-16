import { useState, useEffect } from 'react'
import { Link } from 'react-router'

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
    <div
      role="dialog"
      aria-label="Cookie consent"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 10000,
        background: 'rgba(18, 18, 18, 0.97)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        flexWrap: 'wrap',
        fontFamily: 'inherit',
        fontSize: '0.875rem',
        color: '#ccc',
      }}
    >
      <p style={{ margin: 0, maxWidth: 600 }}>
        We use essential cookies to keep you signed in and remember your preferences.{' '}
        <Link to="/cookies" style={{ color: '#a78bfa', textDecoration: 'underline' }}>
          Cookie Policy
        </Link>{' '}
        &middot;{' '}
        <Link to="/privacy" style={{ color: '#a78bfa', textDecoration: 'underline' }}>
          Privacy Policy
        </Link>
      </p>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={handleDecline}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.2)',
            background: 'transparent',
            color: '#ccc',
            cursor: 'pointer',
            fontSize: '0.875rem',
          }}
        >
          Decline
        </button>
        <button
          onClick={handleAccept}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            background: '#7c3aed',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: 600,
          }}
        >
          Accept
        </button>
      </div>
    </div>
  )
}

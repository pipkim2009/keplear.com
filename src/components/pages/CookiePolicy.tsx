import { useTranslation } from '../../contexts/TranslationContext'
import SEOHead from '../common/SEOHead'

function CookiePolicy() {
  const { t } = useTranslation()

  return (
    <div
      style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '40px 20px',
        color: 'var(--gray-100)',
      }}
    >
      <SEOHead
        title="Cookie Policy"
        description="Information about cookies used on Keplear."
        path="/cookies"
      />
      <h1>{t('legal.cookiePolicy')}</h1>
      <p style={{ color: 'var(--gray-400)', marginBottom: '2rem' }}>Last updated: February 2026</p>

      <section style={{ marginBottom: '2rem' }}>
        <h2>1. What Are Cookies</h2>
        <p>
          Cookies are small text files stored on your device when you visit a website. They help the
          site remember your preferences and activity.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2>2. Cookies We Use</h2>
        <h3>Essential Cookies</h3>
        <p>
          These cookies are required for authentication and keeping you logged in. They cannot be
          disabled.
        </p>
        <ul style={{ paddingLeft: '1.5rem', lineHeight: '1.8' }}>
          <li>
            <strong>sb-access-token</strong> — Supabase authentication session
          </li>
          <li>
            <strong>sb-refresh-token</strong> — Session refresh token
          </li>
        </ul>

        <h3 style={{ marginTop: '1rem' }}>Preference Cookies</h3>
        <p>These cookies store your preferences like theme (dark/light mode).</p>
        <ul style={{ paddingLeft: '1.5rem', lineHeight: '1.8' }}>
          <li>
            <strong>keplear-theme</strong> — Your theme preference (localStorage)
          </li>
        </ul>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2>3. Third-Party Cookies</h2>
        <p>Keplear does not use any third-party tracking cookies or analytics cookies.</p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2>4. Managing Cookies</h2>
        <p>
          You can manage cookies through your browser settings. Note that disabling essential
          cookies will prevent you from logging in.
        </p>
      </section>
    </div>
  )
}

export default CookiePolicy

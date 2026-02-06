import { Link } from 'react-router'
import { useTranslation } from '../../contexts/TranslationContext'
import SEOHead from '../common/SEOHead'

function PrivacyPolicy() {
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
        title="Privacy Policy"
        description="How Keplear collects, uses, and protects your data."
        path="/privacy"
      />
      <h1>{t('legal.privacyPolicy')}</h1>
      <p style={{ color: 'var(--gray-400)', marginBottom: '2rem' }}>Last updated: February 2026</p>

      <section style={{ marginBottom: '2rem' }}>
        <h2>1. Information We Collect</h2>
        <p>
          When you create an account, we collect your username and email address. We also collect
          usage data such as practice sessions and classroom activity to provide our services.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2>2. How We Use Your Information</h2>
        <p>
          We use your information to provide and improve Keplear's ear training services, manage
          your account, track your progress, and enable classroom features.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2>3. Data Storage</h2>
        <p>
          Your data is stored securely using Supabase (PostgreSQL) with row-level security policies.
          We do not sell your data to third parties.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2>4. Cookies</h2>
        <p>
          We use essential cookies for authentication. See our{' '}
          <Link to="/cookies" style={{ color: 'var(--green-500)' }}>
            Cookie Policy
          </Link>{' '}
          for details.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2>5. Your Rights</h2>
        <p>
          You can delete your account at any time from your profile settings. This will permanently
          remove all your data.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2>6. Contact</h2>
        <p>
          For privacy-related questions, contact us at{' '}
          <a href="mailto:e4ellis09@gmail.com" style={{ color: 'var(--green-500)' }}>
            e4ellis09@gmail.com
          </a>
          .
        </p>
      </section>
    </div>
  )
}

export default PrivacyPolicy

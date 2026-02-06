import { useTranslation } from '../../contexts/TranslationContext'
import SEOHead from '../common/SEOHead'

function TermsOfService() {
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
        title="Terms of Service"
        description="Terms and conditions for using Keplear music ear training platform."
        path="/terms"
      />
      <h1>{t('legal.termsOfService')}</h1>
      <p style={{ color: 'var(--gray-400)', marginBottom: '2rem' }}>Last updated: February 2026</p>

      <section style={{ marginBottom: '2rem' }}>
        <h2>1. Acceptance of Terms</h2>
        <p>
          By using Keplear, you agree to these Terms of Service. If you do not agree, please do not
          use the service.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2>2. Description of Service</h2>
        <p>
          Keplear is a free, interactive music ear training web application supporting keyboard,
          guitar, and bass instruments. The service includes practice tools, classrooms, and
          progress tracking.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2>3. User Accounts</h2>
        <p>
          You are responsible for maintaining the security of your account. You must not share your
          credentials or use another person's account.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2>4. Acceptable Use</h2>
        <p>
          You agree not to misuse the service, including but not limited to: submitting malicious
          content, attempting to access unauthorized data, or disrupting the service for other
          users.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2>5. Classroom Content</h2>
        <p>
          Teachers are responsible for the content they create in classrooms. Keplear is not
          responsible for user-generated content.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2>6. Limitation of Liability</h2>
        <p>
          Keplear is provided "as is" without warranties of any kind. We are not liable for any
          damages arising from your use of the service.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2>7. Changes to Terms</h2>
        <p>
          We may update these terms at any time. Continued use of the service after changes
          constitutes acceptance of the new terms.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2>8. Contact</h2>
        <p>
          For questions about these terms, contact us at{' '}
          <a href="mailto:e4ellis09@gmail.com" style={{ color: 'var(--green-500)' }}>
            e4ellis09@gmail.com
          </a>
          .
        </p>
      </section>
    </div>
  )
}

export default TermsOfService

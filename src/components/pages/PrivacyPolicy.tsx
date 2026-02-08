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
        <h3>Account Data</h3>
        <p>
          When you create an account, we collect your username and a hashed password. We generate a
          placeholder email address from your username for authentication purposes. We do not
          collect your real email address.
        </p>
        <h3>Usage Data</h3>
        <p>
          We collect practice session data (instrument, scale/chord, scores, timestamps) and
          classroom activity (assignments, completions) to provide our services and track your
          progress.
        </p>
        <h3>Microphone Data</h3>
        <p>
          If you grant microphone permission, Keplear uses your device microphone for real-time
          pitch detection during ear training exercises. Audio data is processed entirely on your
          device and is <strong>never recorded, stored, or transmitted</strong> to our servers. We
          do not retain any audio recordings.
        </p>
        <h3>Push Notification Tokens</h3>
        <p>
          If you use the Keplear mobile app and enable push notifications, we store your device push
          token (FCM for Android, APNs for iOS) alongside your user ID. This token is used solely to
          send you practice reminders and app updates. Tokens are deleted when you sign out or
          delete your account.
        </p>
        <h3>Device Information</h3>
        <p>
          On mobile, we may collect your device platform (iOS or Android) for push notification
          delivery and to tailor the app experience. We do not collect device identifiers unless you
          consent to ad tracking (see Section 7).
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2>2. How We Use Your Information</h2>
        <ul>
          <li>Provide and maintain Keplear&apos;s ear training services</li>
          <li>Manage your account and track your practice progress</li>
          <li>Enable classroom features (creating/joining classrooms, assignments)</li>
          <li>Send push notifications (practice reminders, assignment updates) if enabled</li>
          <li>Display advertisements to support the free service (see Section 7)</li>
          <li>Monitor and fix errors via crash reporting (see Section 6)</li>
          <li>Improve the app based on aggregated, anonymized usage patterns</li>
        </ul>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2>3. Data Storage and Security</h2>
        <p>
          Your data is stored securely using{' '}
          <a
            href="https://supabase.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--green-500)' }}
          >
            Supabase
          </a>{' '}
          (PostgreSQL) with row-level security policies, ensuring users can only access their own
          data. Data is encrypted in transit (TLS) and at rest. We do not sell your data to third
          parties.
        </p>
        <p>
          Practice session data and settings may also be stored locally on your device using browser
          storage (localStorage) or native device storage for offline access.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2>4. Third-Party Services</h2>
        <p>Keplear integrates with the following third-party services:</p>
        <ul>
          <li>
            <strong>Supabase</strong> &mdash; Authentication and database hosting. Subject to the{' '}
            <a
              href="https://supabase.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--green-500)' }}
            >
              Supabase Privacy Policy
            </a>
            .
          </li>
          <li>
            <strong>YouTube</strong> &mdash; The Songs feature allows searching and playing YouTube
            videos via the YouTube IFrame Player for educational ear training purposes. Video
            playback is subject to{' '}
            <a
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--green-500)' }}
            >
              Google&apos;s Privacy Policy
            </a>{' '}
            and{' '}
            <a
              href="https://www.youtube.com/t/terms"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--green-500)' }}
            >
              YouTube Terms of Service
            </a>
            . We use privacy-respecting proxy services to fetch search results and audio stream
            metadata. No YouTube account data is accessed.
          </li>
          <li>
            <strong>SoundCloud</strong> &mdash; Embedded SoundCloud players may be used for song
            playback. Subject to the{' '}
            <a
              href="https://soundcloud.com/pages/privacy"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--green-500)' }}
            >
              SoundCloud Privacy Policy
            </a>
            .
          </li>
          <li>
            <strong>Google Fonts</strong> &mdash; We load fonts from Google Fonts. Subject to{' '}
            <a
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--green-500)' }}
            >
              Google&apos;s Privacy Policy
            </a>
            .
          </li>
          <li>
            <strong>Instrument Samples</strong> &mdash; Piano, guitar, and bass audio samples are
            loaded from a public GitHub-hosted repository (nbrosowsky.github.io). No personal data
            is sent with these requests.
          </li>
        </ul>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2>5. Cookies and Local Storage</h2>
        <p>
          We use essential cookies and local storage for authentication session management. No
          tracking cookies are set by Keplear itself. Third-party services (ads, YouTube embeds) may
          set their own cookies. See our{' '}
          <Link to="/cookies" style={{ color: 'var(--green-500)' }}>
            Cookie Policy
          </Link>{' '}
          for details.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2>6. Error Reporting</h2>
        <p>
          We use{' '}
          <a
            href="https://sentry.io/privacy/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--green-500)' }}
          >
            Sentry
          </a>{' '}
          for error and crash reporting. When an error occurs, Sentry may collect technical
          information including browser type, operating system, error stack traces, and page URL.
          This data is used solely to identify and fix bugs. No personally identifiable information
          (username, password) is intentionally sent to Sentry.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2>7. Advertising</h2>
        <p>
          Keplear displays banner advertisements provided by Google AdMob (mobile app) and Google
          AdSense (web) to support the free service. These ad networks may collect and use data to
          show you personalized or contextual ads, including:
        </p>
        <ul>
          <li>Device advertising identifier (IDFA on iOS, Google Advertising ID on Android)</li>
          <li>Approximate location (IP-based)</li>
          <li>Device type and operating system</li>
          <li>Ad interaction data (impressions, clicks)</li>
        </ul>
        <p>
          On iOS, you will be asked for permission before any ad tracking occurs (via Apple&apos;s
          App Tracking Transparency framework). You can decline and still use Keplear &mdash; you
          will see non-personalized ads instead.
        </p>
        <p>
          On Android, you can opt out of personalized ads in your device settings under Google &gt;
          Ads.
        </p>
        <p>
          Ad data collection is subject to{' '}
          <a
            href="https://policies.google.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--green-500)' }}
          >
            Google&apos;s Privacy Policy
          </a>
          .
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2>8. Classroom Content</h2>
        <p>
          Teachers can create classrooms and assignments. Teachers are responsible for the content
          they create and share. Keplear does not monitor or moderate classroom content. If you
          encounter inappropriate content, please report it to our contact email below.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2>9. Children&apos;s Privacy</h2>
        <p>
          Keplear is intended for general audiences. We do not knowingly collect personal
          information from children under 13. If you believe a child under 13 has provided us with
          personal data, please contact us and we will delete it.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2>10. Your Rights</h2>
        <p>You have the right to:</p>
        <ul>
          <li>
            <strong>Delete your account</strong> at any time from your profile settings. This
            permanently removes all your data including practice history, classroom memberships, and
            push notification tokens.
          </li>
          <li>
            <strong>Deny microphone access</strong> &mdash; the app functions without it, you just
            won&apos;t be able to use pitch detection features.
          </li>
          <li>
            <strong>Disable push notifications</strong> in your device settings at any time.
          </li>
          <li>
            <strong>Opt out of ad tracking</strong> via iOS App Tracking Transparency or Android
            advertising settings.
          </li>
          <li>
            <strong>Request your data</strong> by contacting us at the email below.
          </li>
        </ul>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2>11. Changes to This Policy</h2>
        <p>
          We may update this privacy policy from time to time. We will notify users of significant
          changes via the app or website. Continued use of Keplear after changes constitutes
          acceptance of the updated policy.
        </p>
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2>12. Contact</h2>
        <p>
          For privacy-related questions, data requests, or to report concerns, contact us at{' '}
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

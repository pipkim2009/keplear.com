import { Link } from 'react-router'
import logo from '/Keplear-logo.webp'
import { useTranslation } from '../../contexts/TranslationContext'
import { FaInstagram, FaTiktok } from 'react-icons/fa'
import { FaXTwitter } from 'react-icons/fa6'
import '../../styles/Footer.css'

function Footer() {
  const { t } = useTranslation()
  const currentYear = new Date().getFullYear()

  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-main">
          <div className="footer-brand">
            <img src={logo} alt="Keplear" className="footer-logo" />
            <nav className="footer-nav">
              <Link to="/dashboard" className="footer-nav-link">
                {t('nav.dashboard')}
              </Link>
              <Link to="/generator" className="footer-nav-link">
                {t('nav.generator')}
              </Link>
              <Link to="/classroom" className="footer-nav-link">
                {t('nav.classroom')}
              </Link>
              <Link to="/sandbox" className="footer-nav-link">
                {t('nav.sandbox')}
              </Link>
              <Link to="/songs" className="footer-nav-link">
                {t('nav.songs')}
              </Link>
              <Link to="/instruments" className="footer-nav-link">
                {t('nav.instrument')}
              </Link>
              <Link to="/isolater" className="footer-nav-link">
                {t('nav.stems')}
              </Link>
              <Link to="/metronome" className="footer-nav-link">
                {t('nav.metronome')}
              </Link>
              <Link to="/tuner" className="footer-nav-link">
                {t('nav.tuner')}
              </Link>
            </nav>
          </div>

          <div className="footer-info">
            <div className="footer-legal">
              <Link to="/privacy" className="footer-legal-link">
                {t('legal.privacyPolicy')}
              </Link>
              <Link to="/terms" className="footer-legal-link">
                {t('legal.termsOfService')}
              </Link>
              <Link to="/cookies" className="footer-legal-link">
                {t('legal.cookiePolicy')}
              </Link>
            </div>

            <div className="footer-contact">
              <a href="mailto:e4ellis09@gmail.com" className="footer-email">
                e4ellis09@gmail.com
              </a>
            </div>

            <div className="footer-social">
              <a
                href="https://www.instagram.com/keplearofficial/"
                target="_blank"
                rel="noopener noreferrer"
                className="social-link"
              >
                <FaInstagram />
              </a>
              <a
                href="https://www.tiktok.com/@keplearofficial"
                target="_blank"
                rel="noopener noreferrer"
                className="social-link"
              >
                <FaTiktok />
              </a>
              <a
                href="https://x.com/keplearofficial"
                target="_blank"
                rel="noopener noreferrer"
                className="social-link"
              >
                <FaXTwitter />
              </a>
            </div>

            <div className="footer-copyright">
              <p>
                &copy; {currentYear} {t('footer.allRightsReserved')}
              </p>
              <p className="footer-author">Ellis Mark Hughes</p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer

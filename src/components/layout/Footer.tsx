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

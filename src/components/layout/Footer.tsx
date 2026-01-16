import logo from '/Keplear-logo.png'
import { useTranslation } from '../../contexts/TranslationContext'
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
            <div className="footer-contact">
              <a href="mailto:e4ellis09@gmail.com" className="footer-email">
                e4ellis09@gmail.com
              </a>
            </div>

            <div className="footer-copyright">
              <p>&copy; {currentYear} {t('footer.allRightsReserved')}</p>
              <p className="footer-author">Ellis Mark Hughes</p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
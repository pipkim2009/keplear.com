import React from 'react'
import { useTranslation } from '../../contexts/TranslationContext'

interface NotFoundProps {
  onNavigateToHome: () => void
}

const NotFound: React.FC<NotFoundProps> = ({ onNavigateToHome }) => {
  const { t } = useTranslation()
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      padding: '40px 20px',
      textAlign: 'center'
    }}>
      <div style={{
        background: 'linear-gradient(145deg, var(--gray-700), var(--gray-900))',
        border: '1px solid var(--white-alpha-10)',
        borderRadius: '16px',
        padding: '60px 40px',
        maxWidth: '600px',
        width: '100%',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
        color: 'var(--gray-100)'
      }}>
        <div style={{
          fontSize: '8rem',
          fontWeight: 'bold',
          background: 'linear-gradient(145deg, var(--green-500), var(--green-100))',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '1rem',
          lineHeight: '1'
        }}>
          404
        </div>

        <h1 style={{
          fontSize: '2.5rem',
          fontWeight: 'bold',
          marginBottom: '1rem',
          background: 'linear-gradient(145deg, var(--green-500), var(--green-100))',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          {t('notFound.title')}
        </h1>

        <p style={{
          fontSize: '1.2rem',
          marginBottom: '2rem',
          color: 'var(--gray-500)',
          lineHeight: '1.6'
        }}>
          {t('notFound.message')}
        </p>

        <div style={{
          display: 'flex',
          justifyContent: 'center'
        }}>
          <button
            onClick={onNavigateToHome}
            style={{
              padding: '15px 30px',
              background: 'linear-gradient(145deg, var(--green-500), var(--green-100))',
              color: 'var(--white)',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '16px',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 12px var(--green-alpha-30)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(34, 197, 94, 0.4)'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(34, 197, 94, 0.3)'
            }}
          >
            {t('notFound.goHome')}
          </button>
        </div>

        <div style={{
          marginTop: '3rem',
          padding: '20px',
          background: 'rgba(34, 197, 94, 0.1)',
          borderRadius: '12px',
          border: '1px solid rgba(34, 197, 94, 0.3)'
        }}>
          <p style={{
            fontSize: '0.9rem',
            color: 'var(--gray-500)',
            margin: 0
          }}>
            <strong>{t('notFound.tip')}:</strong> {t('notFound.tipMessage')}
          </p>
        </div>
      </div>
    </div>
  )
}

export default NotFound

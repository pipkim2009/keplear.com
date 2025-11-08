import React from 'react'

interface NotFoundProps {
  onNavigateToHome: () => void
}

const NotFound: React.FC<NotFoundProps> = ({ onNavigateToHome }) => {
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
        background: 'linear-gradient(145deg, #2d3748, #1a202c)',
        border: '2px solid #00b359',
        borderRadius: '20px',
        padding: '60px 40px',
        maxWidth: '600px',
        width: '100%',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
        color: '#e2e8f0'
      }}>
        <div style={{
          fontSize: '8rem',
          fontWeight: 'bold',
          background: 'linear-gradient(145deg, #00b359, #2ee88d)',
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
          background: 'linear-gradient(145deg, #00b359, #2ee88d)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          Page Not Found
        </h1>

        <p style={{
          fontSize: '1.2rem',
          marginBottom: '2rem',
          color: '#a0aec0',
          lineHeight: '1.6'
        }}>
          Looks like this page hit a wrong note! The page you're looking for doesn't exist or has been moved.
        </p>

        <div style={{
          display: 'flex',
          justifyContent: 'center'
        }}>
          <button
            onClick={onNavigateToHome}
            style={{
              padding: '15px 30px',
              background: 'linear-gradient(145deg, #00b359, #2ee88d)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '16px',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 12px rgba(107, 70, 193, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(107, 70, 193, 0.4)'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(107, 70, 193, 0.3)'
            }}
          >
            Go Home
          </button>
        </div>

        <div style={{
          marginTop: '3rem',
          padding: '20px',
          background: 'rgba(107, 70, 193, 0.1)',
          borderRadius: '12px',
          border: '1px solid rgba(107, 70, 193, 0.3)'
        }}>
          <p style={{
            fontSize: '0.9rem',
            color: '#a0aec0',
            margin: 0
          }}>
            💡 <strong>Tip:</strong> Use the navigation menu above to explore our pages!
          </p>
        </div>
      </div>
    </div>
  )
}

export default NotFound
import React, { useState } from 'react'

const ErrorTrigger: React.FC = () => {
  const [shouldError, setShouldError] = useState(false)

  if (shouldError) {
    throw new Error('Test ErrorBoundary - This is a simulated error for testing the styled error page')
  }

  return (
    <button
      className="nav-link"
      onClick={() => setShouldError(true)}
      style={{
        background: 'linear-gradient(145deg, #f59e0b, #d97706)',
        color: 'white',
        fontSize: '0.7rem',
        padding: '4px 6px'
      }}
      title="Test ErrorBoundary"
    >
      JS Error
    </button>
  )
}

export default ErrorTrigger
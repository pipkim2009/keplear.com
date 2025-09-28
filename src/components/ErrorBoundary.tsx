import React, { Component, type ReactNode } from 'react'
import { logErrorToService, type ErrorInfo } from '../utils/errorHandler'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  retryCount?: number
  showRetryButton?: boolean
}

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorId: string
  retryAttempts: number
}

/**
 * Enhanced error boundary component with retry mechanisms and better error reporting
 * Provides a fallback UI, logs error details, and allows recovery attempts
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeoutId: NodeJS.Timeout | null = null

  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      errorId: '',
      retryAttempts: 0
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    return {
      hasError: true,
      error,
      errorId
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const enhancedErrorInfo: ErrorInfo = {
      componentStack: errorInfo.componentStack,
      errorBoundary: errorInfo.errorBoundary,
      errorBoundaryStack: errorInfo.errorBoundaryStack
    }

    // Log error to console and external service
    console.error(`ErrorBoundary [${this.state.errorId}] caught an error:`, error, enhancedErrorInfo)
    logErrorToService(error, enhancedErrorInfo)

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, enhancedErrorInfo)
    }
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId)
    }
  }

  handleRetry = () => {
    const maxRetries = this.props.retryCount ?? 3
    if (this.state.retryAttempts < maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: undefined,
        retryAttempts: prevState.retryAttempts + 1
      }))

      // Auto-retry with exponential backoff if it fails again
      this.retryTimeoutId = setTimeout(() => {
        if (this.state.hasError) {
          console.warn(`Auto-retry attempt ${this.state.retryAttempts + 1}/${maxRetries}`)
        }
      }, Math.pow(2, this.state.retryAttempts) * 1000)
    }
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      // Render custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback
      }

      const maxRetries = this.props.retryCount ?? 3
      const canRetry = this.state.retryAttempts < maxRetries && (this.props.showRetryButton ?? true)

      // Always use dark mode for error boundary to ensure consistency
      const isDarkMode = true

      return (
        <div style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #0a0a0a 0%, #121212 25%, #1a0d2e 50%, #2d1b69 75%, #121212 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <div style={{
            padding: '40px 20px',
            border: '2px solid #6b46c1',
            borderRadius: '16px',
            background: 'linear-gradient(145deg, #2d3748, #1a202c)',
            color: '#e2e8f0',
            textAlign: 'center',
            maxWidth: '600px',
            width: '100%',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)'
          }}>
          <h2 style={{
            background: 'linear-gradient(145deg, #6b46c1, #8b5cf6)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontSize: '2rem',
            fontWeight: 'bold',
            marginBottom: '1rem'
          }}>
            🎵 Oops! Something went wrong
          </h2>
          <p style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>
            We're sorry, but something unexpected happened while making music.
          </p>

          {this.state.retryAttempts > 0 && (
            <p style={{
              fontStyle: 'italic',
              fontSize: '14px',
              color: '#a0aec0',
              marginBottom: '1rem'
            }}>
              Retry attempt {this.state.retryAttempts}/{maxRetries}
            </p>
          )}

          <details style={{
            marginTop: '20px',
            textAlign: 'left',
            background: 'rgba(74, 85, 104, 0.2)',
            padding: '15px',
            borderRadius: '8px',
            border: '1px solid #4a5568'
          }}>
            <summary style={{
              cursor: 'pointer',
              fontWeight: 'bold',
              color: '#e2e8f0'
            }}>
              Error Details (click to expand)
            </summary>
            <div style={{ marginTop: '15px' }}>
              <p><strong>Error ID:</strong> {this.state.errorId}</p>
              <p><strong>Timestamp:</strong> {new Date().toISOString()}</p>
              <pre style={{
                marginTop: '15px',
                padding: '15px',
                backgroundColor: '#1a202c',
                border: '1px solid #4a5568',
                borderRadius: '8px',
                fontSize: '12px',
                overflow: 'auto',
                color: '#e2e8f0'
              }}>
                {this.state.error?.toString()}
                {this.state.error?.stack && '\n\n' + this.state.error.stack}
              </pre>
            </div>
          </details>

          <div style={{
            marginTop: '30px',
            display: 'flex',
            justifyContent: 'center'
          }}>
            <button
              onClick={this.handleReload}
              style={{
                padding: '12px 24px',
                background: 'linear-gradient(145deg, #6b46c1, #8b5cf6)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px',
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 12px rgba(107, 70, 193, 0.3)'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)'
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(107, 70, 193, 0.4)'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(107, 70, 193, 0.3)'
              }}
            >
              Reload Page
            </button>
          </div>
        </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
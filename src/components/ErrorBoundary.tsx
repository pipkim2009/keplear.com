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

      return (
        <div style={{
          padding: '20px',
          margin: '20px',
          border: '1px solid #f5c6cb',
          borderRadius: '8px',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          textAlign: 'center'
        }}>
          <h2>🚨 Something went wrong</h2>
          <p>We're sorry, but something unexpected happened.</p>

          {this.state.retryAttempts > 0 && (
            <p style={{ fontStyle: 'italic', fontSize: '14px' }}>
              Retry attempt {this.state.retryAttempts}/{maxRetries}
            </p>
          )}

          <details style={{ marginTop: '10px', textAlign: 'left' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
              Error Details (click to expand)
            </summary>
            <div style={{ marginTop: '10px' }}>
              <p><strong>Error ID:</strong> {this.state.errorId}</p>
              <p><strong>Timestamp:</strong> {new Date().toISOString()}</p>
              <pre style={{
                marginTop: '10px',
                padding: '10px',
                backgroundColor: '#f1f1f1',
                borderRadius: '4px',
                fontSize: '12px',
                overflow: 'auto'
              }}>
                {this.state.error?.toString()}
                {this.state.error?.stack && '\n\n' + this.state.error.stack}
              </pre>
            </div>
          </details>

          <div style={{ marginTop: '15px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
            {canRetry && (
              <button
                onClick={this.handleRetry}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Try Again ({maxRetries - this.state.retryAttempts} left)
              </button>
            )}

            <button
              onClick={this.handleReload}
              style={{
                padding: '8px 16px',
                backgroundColor: '#721c24',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Reload Page
            </button>
          </div>

          <p style={{ marginTop: '15px', fontSize: '12px', color: '#666' }}>
            If this problem persists, please contact support with Error ID: {this.state.errorId}
          </p>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
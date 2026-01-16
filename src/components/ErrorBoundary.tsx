import React, { Component, type ReactNode } from 'react'
import { logErrorToService, type ErrorInfo } from '../utils/errorHandler'
import { getTranslation } from '../contexts/TranslationContext'
import { IoMusicalNotes } from 'react-icons/io5'
import styles from './ErrorBoundary.module.css'

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
 * Error boundary component that catches JavaScript errors in child components
 * and displays a fallback UI instead of crashing the whole app
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeoutId: ReturnType<typeof setTimeout> | null = null

  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      errorId: '',
      retryAttempts: 0
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
    return {
      hasError: true,
      error,
      errorId
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    const enhancedErrorInfo: ErrorInfo = {
      componentStack: errorInfo.componentStack,
      errorBoundary: errorInfo.errorBoundary,
      errorBoundaryStack: errorInfo.errorBoundaryStack
    }

    logErrorToService(error, enhancedErrorInfo)

    if (this.props.onError) {
      this.props.onError(error, enhancedErrorInfo)
    }
  }

  componentWillUnmount(): void {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId)
    }
  }

  handleRetry = (): void => {
    const maxRetries = this.props.retryCount ?? 3
    if (this.state.retryAttempts < maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: undefined,
        retryAttempts: prevState.retryAttempts + 1
      }))

      this.retryTimeoutId = setTimeout(() => {
        // Auto-retry timeout - state will be updated if error persists
      }, Math.pow(2, this.state.retryAttempts) * 1000)
    }
  }

  handleReload = (): void => {
    window.location.reload()
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      const maxRetries = this.props.retryCount ?? 3

      return (
        <div className={styles.container}>
          <div className={styles.card}>
            <h2 className={styles.title}>
              <span className={styles.titleIcon}>
                <IoMusicalNotes />
              </span>
              {getTranslation('errorBoundary.title')}
            </h2>
            <p className={styles.message}>
              {getTranslation('errorBoundary.message')}
            </p>

            {this.state.retryAttempts > 0 && (
              <p className={styles.retryInfo}>
                {getTranslation('errorBoundary.retryAttempt', { count: this.state.retryAttempts, max: maxRetries })}
              </p>
            )}

            <details className={styles.details}>
              <summary className={styles.detailsSummary}>
                {getTranslation('errorBoundary.errorDetails')}
              </summary>
              <div className={styles.detailsContent}>
                <p><strong>{getTranslation('errorBoundary.errorId')}:</strong> {this.state.errorId}</p>
                <p><strong>{getTranslation('errorBoundary.timestamp')}:</strong> {new Date().toISOString()}</p>
                <pre className={styles.errorStack}>
                  {this.state.error?.toString()}
                  {this.state.error?.stack && '\n\n' + this.state.error.stack}
                </pre>
              </div>
            </details>

            <div className={styles.buttonContainer}>
              <button
                onClick={this.handleReload}
                className={styles.reloadButton}
              >
                {getTranslation('errorBoundary.reloadPage')}
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

/**
 * Centralized logging utility
 * Provides consistent logging across the application with environment-aware behavior
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  component?: string
  action?: string
  [key: string]: string | number | boolean | undefined
}

class Logger {
  private isDevelopment = import.meta.env.DEV

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString()
    const contextStr = context ? ` | ${JSON.stringify(context)}` : ''
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`
  }

  /**
   * Debug logs - only shown in development
   */
  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.log(this.formatMessage('debug', message, context))
    }
  }

  /**
   * Info logs - shown in all environments
   */
  info(message: string, context?: LogContext): void {
    console.info(this.formatMessage('info', message, context))
  }

  /**
   * Warning logs - shown in all environments
   */
  warn(message: string, context?: LogContext): void {
    console.warn(this.formatMessage('warn', message, context))
  }

  /**
   * Error logs - shown in all environments and can be sent to monitoring service
   */
  error(message: string, error?: Error, context?: LogContext): void {
    const errorContext = {
      ...context,
      errorMessage: error?.message,
      errorStack: error?.stack
    }
    console.error(this.formatMessage('error', message, errorContext))

    // In production, send to monitoring service (e.g., Sentry, LogRocket)
    if (!this.isDevelopment && typeof window !== 'undefined') {
      // TODO: Integrate with error monitoring service
      // Example: Sentry.captureException(error, { extra: errorContext })
    }
  }

  /**
   * Performance measurement
   */
  startTimer(label: string): () => void {
    if (!this.isDevelopment) {
      return () => {
        // No-op in production
      }
    }

    const start = performance.now()
    return () => {
      const duration = performance.now() - start
      this.debug(`Timer: ${label}`, { durationMs: parseFloat(duration.toFixed(2)) })
    }
  }

  /**
   * Group related logs together
   */
  group(label: string, collapsed = false): void {
    if (this.isDevelopment) {
      collapsed ? console.groupCollapsed(label) : console.group(label)
    }
  }

  groupEnd(): void {
    if (this.isDevelopment) {
      console.groupEnd()
    }
  }
}

// Export singleton instance
export const logger = new Logger()

// Export type for use in components
export type { LogContext }
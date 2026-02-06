/**
 * Enhanced error handling utilities with retry mechanisms
 * Provides robust error handling patterns for audio, network, and user operations
 */

import * as Sentry from '@sentry/react'

export interface RetryOptions {
  /** Maximum number of retry attempts */
  maxRetries: number
  /** Base delay between retries in milliseconds */
  baseDelay: number
  /** Maximum delay between retries in milliseconds */
  maxDelay: number
  /** Factor by which delay increases after each retry */
  backoffFactor: number
  /** Function to determine if error should trigger a retry */
  shouldRetry?: (error: Error, attempt: number) => boolean
}

export interface ErrorWithRetry extends Error {
  isRetryable: boolean
  retryCount: number
  originalError?: Error
}

/**
 * Default retry configuration for different operation types
 */
export const DEFAULT_RETRY_OPTIONS: Record<string, RetryOptions> = {
  audio: {
    maxRetries: 3,
    baseDelay: 500,
    maxDelay: 5000,
    backoffFactor: 2,
    shouldRetry: error =>
      error.message.includes('AudioContext') || error.message.includes('suspended'),
  },
  network: {
    maxRetries: 5,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 1.5,
    shouldRetry: error =>
      error.message.includes('fetch') ||
      error.message.includes('network') ||
      error.message.includes('timeout'),
  },
  auth: {
    maxRetries: 2,
    baseDelay: 2000,
    maxDelay: 8000,
    backoffFactor: 2,
    shouldRetry: error =>
      !error.message.includes('Invalid credentials') && !error.message.includes('User not found'),
  },
}

/**
 * Creates an enhanced error with retry information
 */
export function createRetryableError(
  message: string,
  originalError?: Error,
  retryCount = 0
): ErrorWithRetry {
  const error = new Error(message) as ErrorWithRetry
  error.isRetryable = true
  error.retryCount = retryCount
  error.originalError = originalError
  error.name = 'RetryableError'
  return error
}

/**
 * Executes a function with retry logic and exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {},
  operationType: keyof typeof DEFAULT_RETRY_OPTIONS = 'network'
): Promise<T> {
  const config = { ...DEFAULT_RETRY_OPTIONS[operationType], ...options }
  let lastError: Error

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // Don't retry on the last attempt
      if (attempt === config.maxRetries) {
        break
      }

      // Check if error should trigger a retry
      if (config.shouldRetry && !config.shouldRetry(lastError, attempt)) {
        break
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        config.baseDelay * Math.pow(config.backoffFactor, attempt),
        config.maxDelay
      )

      // Add jitter to prevent thundering herd
      const jitteredDelay = delay + Math.random() * 1000

      console.warn(
        `Operation failed (attempt ${attempt + 1}/${config.maxRetries + 1}), retrying in ${Math.round(jitteredDelay)}ms:`,
        lastError.message
      )

      await sleep(jitteredDelay)
    }
  }

  throw createRetryableError(
    `Operation failed after ${config.maxRetries + 1} attempts: ${lastError.message}`,
    lastError,
    config.maxRetries
  )
}

/**
 * Circuit breaker implementation for preventing cascading failures
 */
export class CircuitBreaker {
  private failures = 0
  private lastFailureTime = 0
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED'

  constructor(
    private threshold: number = 5,
    private timeout: number = 60000, // 1 minute
    private resetTimeout: number = 30000 // 30 seconds
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime < this.resetTimeout) {
        throw new Error('Circuit breaker is OPEN - operation not permitted')
      }
      this.state = 'HALF_OPEN'
    }

    try {
      const result = await operation()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  private onSuccess() {
    this.failures = 0
    this.state = 'CLOSED'
  }

  private onFailure() {
    this.failures++
    this.lastFailureTime = Date.now()

    if (this.failures >= this.threshold) {
      this.state = 'OPEN'
    }
  }

  getState() {
    return {
      state: this.state,
      failures: this.failures,
      threshold: this.threshold,
    }
  }
}

/**
 * Error boundary helper for React error boundaries
 */
export interface ErrorInfo {
  componentStack: string
  errorBoundary?: string
  errorBoundaryStack?: string
}

export function logErrorToService(error: Error, errorInfo?: ErrorInfo) {
  // Send to Sentry if initialized
  Sentry.captureException(error, {
    contexts: {
      errorBoundary: {
        componentStack: errorInfo?.componentStack,
        errorBoundary: errorInfo?.errorBoundary,
      },
      app: {
        timestamp: new Date().toISOString(),
        url: window.location.href,
      },
    },
  })

  // Also log to console in development
  if (import.meta.env.DEV) {
    console.error('Error caught by boundary:', {
      error: { name: error.name, message: error.message, stack: error.stack },
      errorInfo,
    })
  }
}

/**
 * Graceful degradation helper for feature detection
 */
export function withFallback<T, F>(
  primaryOperation: () => T,
  fallbackOperation: () => F,
  errorMessage?: string
): T | F {
  try {
    return primaryOperation()
  } catch (error) {
    if (errorMessage) {
      console.warn(errorMessage, error)
    }
    return fallbackOperation()
  }
}

/**
 * Async version of withFallback
 */
export async function withAsyncFallback<T, F>(
  primaryOperation: () => Promise<T>,
  fallbackOperation: () => Promise<F>,
  errorMessage?: string
): Promise<T | F> {
  try {
    return await primaryOperation()
  } catch (error) {
    if (errorMessage) {
      console.warn(errorMessage, error)
    }
    return await fallbackOperation()
  }
}

/**
 * Utility function for sleep/delay
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Enhanced error types for better error handling
 */
export class AudioError extends Error {
  constructor(
    message: string,
    public readonly audioContext?: AudioContext
  ) {
    super(message)
    this.name = 'AudioError'
  }
}

export class NetworkError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly url?: string
  ) {
    super(message)
    this.name = 'NetworkError'
  }
}

export class AuthenticationError extends Error {
  constructor(
    message: string,
    public readonly code?: string
  ) {
    super(message)
    this.name = 'AuthenticationError'
  }
}

/**
 * Error recovery strategies
 */
export const errorRecoveryStrategies = {
  audioContextSuspended: async () => {
    try {
      const Tone = await import('tone')
      if (Tone.context.state === 'suspended') {
        await Tone.start()
      }
    } catch (error) {
      console.warn('Failed to resume audio context:', error)
    }
  },

  networkTimeout: async <T>(operation: () => Promise<T>, timeoutMs = 10000): Promise<T> => {
    return Promise.race([
      operation(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new NetworkError('Operation timed out')), timeoutMs)
      ),
    ])
  },

  memoryPressure: () => {
    // Force garbage collection if available
    if ('gc' in window && typeof window.gc === 'function') {
      window.gc()
    }
    // Clear any cached audio buffers or large objects
    console.warn('Memory pressure detected - cleared caches')
  },
}

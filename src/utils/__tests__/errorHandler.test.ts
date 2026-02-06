import { describe, it, expect, vi } from 'vitest'
import {
  withRetry,
  createRetryableError,
  CircuitBreaker,
  withFallback,
  withAsyncFallback,
  AudioError,
  NetworkError,
  AuthenticationError,
} from '../errorHandler'

describe('createRetryableError', () => {
  it('creates error with retry metadata', () => {
    const original = new Error('original')
    const error = createRetryableError('retried', original, 3)
    expect(error.message).toBe('retried')
    expect(error.isRetryable).toBe(true)
    expect(error.retryCount).toBe(3)
    expect(error.originalError).toBe(original)
    expect(error.name).toBe('RetryableError')
  })

  it('works without original error', () => {
    const error = createRetryableError('standalone')
    expect(error.retryCount).toBe(0)
    expect(error.originalError).toBeUndefined()
  })
})

describe('withRetry', () => {
  it('returns result on first success', async () => {
    const operation = vi.fn().mockResolvedValue('success')
    const result = await withRetry(operation, {
      maxRetries: 3,
      baseDelay: 10,
      maxDelay: 50,
      backoffFactor: 1,
    })
    expect(result).toBe('success')
    expect(operation).toHaveBeenCalledTimes(1)
  })

  it('retries on failure then succeeds', async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new Error('network fail'))
      .mockResolvedValue('recovered')

    const result = await withRetry(operation, {
      maxRetries: 2,
      baseDelay: 10,
      maxDelay: 50,
      backoffFactor: 1,
    })
    expect(result).toBe('recovered')
    expect(operation).toHaveBeenCalledTimes(2)
  })

  it('throws after max retries exceeded', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('network timeout'))

    await expect(
      withRetry(operation, { maxRetries: 1, baseDelay: 10, maxDelay: 50, backoffFactor: 1 })
    ).rejects.toThrow('Operation failed after 2 attempts')
    expect(operation).toHaveBeenCalledTimes(2)
  })

  it('stops retrying when shouldRetry returns false', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('Invalid credentials'))

    await expect(
      withRetry(operation, {
        maxRetries: 3,
        baseDelay: 10,
        maxDelay: 50,
        backoffFactor: 1,
        shouldRetry: error => !error.message.includes('Invalid credentials'),
      })
    ).rejects.toThrow('Operation failed after')
    expect(operation).toHaveBeenCalledTimes(1)
  })
})

describe('CircuitBreaker', () => {
  it('starts in CLOSED state', () => {
    const breaker = new CircuitBreaker()
    expect(breaker.getState().state).toBe('CLOSED')
  })

  it('allows operations when CLOSED', async () => {
    const breaker = new CircuitBreaker()
    const result = await breaker.execute(() => Promise.resolve('ok'))
    expect(result).toBe('ok')
  })

  it('opens after threshold failures', async () => {
    const breaker = new CircuitBreaker(3, 60000, 30000)

    for (let i = 0; i < 3; i++) {
      try {
        await breaker.execute(() => Promise.reject(new Error('fail')))
      } catch {
        /* expected */
      }
    }

    expect(breaker.getState().state).toBe('OPEN')
    expect(breaker.getState().failures).toBe(3)
  })

  it('rejects operations when OPEN', async () => {
    const breaker = new CircuitBreaker(1, 60000, 60000)

    try {
      await breaker.execute(() => Promise.reject(new Error('fail')))
    } catch {
      /* expected */
    }

    await expect(breaker.execute(() => Promise.resolve('ok'))).rejects.toThrow(
      'Circuit breaker is OPEN'
    )
  })

  it('resets to CLOSED after successful operation in HALF_OPEN', async () => {
    const breaker = new CircuitBreaker(1, 60000, 0) // 0ms reset timeout

    try {
      await breaker.execute(() => Promise.reject(new Error('fail')))
    } catch {
      /* expected */
    }

    expect(breaker.getState().state).toBe('OPEN')

    // After reset timeout (0ms), it should go to HALF_OPEN and allow attempt
    const result = await breaker.execute(() => Promise.resolve('recovered'))
    expect(result).toBe('recovered')
    expect(breaker.getState().state).toBe('CLOSED')
  })
})

describe('withFallback', () => {
  it('returns primary result on success', () => {
    const result = withFallback(
      () => 'primary',
      () => 'fallback'
    )
    expect(result).toBe('primary')
  })

  it('returns fallback on error', () => {
    const result = withFallback(
      () => {
        throw new Error('fail')
      },
      () => 'fallback'
    )
    expect(result).toBe('fallback')
  })
})

describe('withAsyncFallback', () => {
  it('returns primary result on success', async () => {
    const result = await withAsyncFallback(
      () => Promise.resolve('primary'),
      () => Promise.resolve('fallback')
    )
    expect(result).toBe('primary')
  })

  it('returns fallback on error', async () => {
    const result = await withAsyncFallback(
      () => Promise.reject(new Error('fail')),
      () => Promise.resolve('fallback')
    )
    expect(result).toBe('fallback')
  })
})

describe('Custom error types', () => {
  it('AudioError has correct name and properties', () => {
    const error = new AudioError('audio failed')
    expect(error.name).toBe('AudioError')
    expect(error.message).toBe('audio failed')
    expect(error instanceof Error).toBe(true)
  })

  it('NetworkError has status and url', () => {
    const error = new NetworkError('timeout', 504, '/api/test')
    expect(error.name).toBe('NetworkError')
    expect(error.status).toBe(504)
    expect(error.url).toBe('/api/test')
  })

  it('AuthenticationError has code', () => {
    const error = new AuthenticationError('unauthorized', 'AUTH_EXPIRED')
    expect(error.name).toBe('AuthenticationError')
    expect(error.code).toBe('AUTH_EXPIRED')
  })
})

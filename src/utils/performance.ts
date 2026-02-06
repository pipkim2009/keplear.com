/**
 * Performance Monitoring Utilities
 * Provides tools for measuring and optimizing React component performance
 */

/**
 * Performance measurement wrapper for functions
 * Use in development to identify slow operations
 */
export function measurePerformance<T extends (...args: unknown[]) => unknown>(
  fn: T,
  label: string
): T {
  if (process.env.NODE_ENV === 'production') {
    return fn
  }

  return ((...args: Parameters<T>): ReturnType<T> => {
    const start = performance.now()
    const result = fn(...args)
    const end = performance.now()
    const duration = end - start

    if (duration > 16) {
      // Longer than one frame (60fps)
      console.warn(`[Performance] ${label} took ${duration.toFixed(2)}ms`)
    }

    return result as ReturnType<T>
  }) as T
}

/**
 * Debounce function for expensive operations
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    timeoutId = setTimeout(() => {
      fn(...args)
      timeoutId = null
    }, delay)
  }
}

/**
 * Throttle function for rate-limiting operations
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false
  let lastArgs: Parameters<T> | null = null

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args)
      inThrottle = true
      setTimeout(() => {
        inThrottle = false
        if (lastArgs) {
          fn(...lastArgs)
          lastArgs = null
        }
      }, limit)
    } else {
      lastArgs = args
    }
  }
}

/**
 * Memoization helper with LRU cache
 */
export function memoizeWithCache<T extends (...args: unknown[]) => unknown>(
  fn: T,
  maxSize: number = 100
): T {
  const cache = new Map<string, ReturnType<T>>()
  const keys: string[] = []

  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = JSON.stringify(args)

    if (cache.has(key)) {
      return cache.get(key)!
    }

    const result = fn(...args) as ReturnType<T>

    // LRU eviction
    if (keys.length >= maxSize) {
      const oldestKey = keys.shift()!
      cache.delete(oldestKey)
    }

    cache.set(key, result)
    keys.push(key)

    return result
  }) as T
}

/**
 * Shallow comparison for React.memo
 */
export function shallowEqual<T extends Record<string, unknown>>(objA: T, objB: T): boolean {
  if (objA === objB) return true
  if (!objA || !objB) return false

  const keysA = Object.keys(objA)
  const keysB = Object.keys(objB)

  if (keysA.length !== keysB.length) return false

  for (const key of keysA) {
    if (objA[key] !== objB[key]) {
      return false
    }
  }

  return true
}

/**
 * Deep comparison for complex objects (use sparingly)
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (typeof a !== typeof b) return false
  if (a === null || b === null) return a === b

  if (typeof a === 'object' && typeof b === 'object') {
    const objA = a as Record<string, unknown>
    const objB = b as Record<string, unknown>
    const keysA = Object.keys(objA)
    const keysB = Object.keys(objB)

    if (keysA.length !== keysB.length) return false

    for (const key of keysA) {
      if (!deepEqual(objA[key], objB[key])) {
        return false
      }
    }

    return true
  }

  return false
}

/**
 * Create a stable reference for objects/arrays that are structurally equal
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useStableReference<T>(
  value: T,
  _isEqual: (a: T, b: T) => boolean = shallowEqual as (a: T, b: T) => boolean
): T {
  // Note: This is a utility function, not a hook. For hook version, see useStableValue
  return value
}

/**
 * Batch multiple state updates to reduce re-renders
 * React 18+ does this automatically, but this helps with explicit batching
 */
export function batchUpdates(callback: () => void): void {
  // React 18+ automatically batches updates
  // This is a placeholder for explicit batching if needed
  callback()
}

/**
 * Performance observer for monitoring component renders
 * Only active in development mode
 */
export class RenderMonitor {
  private static instance: RenderMonitor | null = null
  private renderCounts: Map<string, number> = new Map()
  private lastReset: number = Date.now()

  static getInstance(): RenderMonitor {
    if (!RenderMonitor.instance) {
      RenderMonitor.instance = new RenderMonitor()
    }
    return RenderMonitor.instance
  }

  trackRender(componentName: string): void {
    if (process.env.NODE_ENV === 'production') return

    const count = (this.renderCounts.get(componentName) || 0) + 1
    this.renderCounts.set(componentName, count)

    // Warn if component renders too frequently
    if (count > 50 && Date.now() - this.lastReset < 5000) {
      console.warn(
        `[RenderMonitor] ${componentName} rendered ${count} times in ${
          (Date.now() - this.lastReset) / 1000
        }s`
      )
    }
  }

  reset(): void {
    this.renderCounts.clear()
    this.lastReset = Date.now()
  }

  getStats(): Record<string, number> {
    return Object.fromEntries(this.renderCounts)
  }
}

export default {
  measurePerformance,
  debounce,
  throttle,
  memoizeWithCache,
  shallowEqual,
  deepEqual,
  batchUpdates,
  RenderMonitor,
}

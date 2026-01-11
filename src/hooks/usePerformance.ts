/**
 * Performance Optimization Hooks
 * Provides React hooks for debouncing, throttling, and stable references
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'

/**
 * Debounce a value - delays updating until value stops changing
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

/**
 * Debounce a callback function
 */
export function useDebouncedCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const callbackRef = useRef(callback)

  // Keep callback ref updated
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      callbackRef.current(...args)
    }, delay)
  }, [delay])
}

/**
 * Throttle a callback function - limits execution rate
 */
export function useThrottledCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  limit: number
): (...args: Parameters<T>) => void {
  const lastRanRef = useRef<number>(0)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const callbackRef = useRef(callback)

  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return useCallback((...args: Parameters<T>) => {
    const now = Date.now()

    if (now - lastRanRef.current >= limit) {
      callbackRef.current(...args)
      lastRanRef.current = now
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args)
        lastRanRef.current = Date.now()
      }, limit - (now - lastRanRef.current))
    }
  }, [limit])
}

/**
 * Returns a stable reference that only changes when the value is not deeply equal
 * Useful for preventing unnecessary re-renders with object/array props
 */
export function useStableValue<T>(value: T): T {
  const ref = useRef<T>(value)

  const isEqual = useMemo(() => {
    return JSON.stringify(ref.current) === JSON.stringify(value)
  }, [value])

  if (!isEqual) {
    ref.current = value
  }

  return ref.current
}

/**
 * Returns previous value of a variable
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>()

  useEffect(() => {
    ref.current = value
  }, [value])

  return ref.current
}

/**
 * Memoize expensive computation with custom comparison
 */
export function useDeepMemo<T>(
  factory: () => T,
  deps: unknown[]
): T {
  const ref = useRef<{ deps: unknown[]; value: T } | null>(null)

  const depsEqual = ref.current !== null &&
    deps.length === ref.current.deps.length &&
    deps.every((dep, i) => JSON.stringify(dep) === JSON.stringify(ref.current!.deps[i]))

  if (!depsEqual) {
    ref.current = {
      deps,
      value: factory()
    }
  }

  return ref.current!.value
}

/**
 * Track component render count (development only)
 */
export function useRenderCount(componentName: string): number {
  const countRef = useRef(0)
  countRef.current += 1

  if (process.env.NODE_ENV !== 'production') {
    // Log excessive renders
    if (countRef.current > 20) {
      console.debug(`[RenderCount] ${componentName}: ${countRef.current}`)
    }
  }

  return countRef.current
}

/**
 * Measure time for expensive operations
 */
export function usePerformanceMeasure(label: string): {
  start: () => void
  end: () => number
} {
  const startTimeRef = useRef<number>(0)

  const start = useCallback(() => {
    startTimeRef.current = performance.now()
  }, [])

  const end = useCallback(() => {
    const duration = performance.now() - startTimeRef.current

    if (process.env.NODE_ENV !== 'production' && duration > 16) {
      console.warn(`[Performance] ${label}: ${duration.toFixed(2)}ms`)
    }

    return duration
  }, [label])

  return { start, end }
}

/**
 * Lazy initialization for expensive objects
 */
export function useLazyRef<T>(initializer: () => T): React.MutableRefObject<T> {
  const ref = useRef<T | null>(null)

  if (ref.current === null) {
    ref.current = initializer()
  }

  return ref as React.MutableRefObject<T>
}

/**
 * Run effect only on updates, not on mount
 */
export function useUpdateEffect(
  effect: React.EffectCallback,
  deps: React.DependencyList
): void {
  const isFirstMount = useRef(true)

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false
      return
    }

    return effect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

export default {
  useDebounce,
  useDebouncedCallback,
  useThrottledCallback,
  useStableValue,
  usePrevious,
  useDeepMemo,
  useRenderCount,
  usePerformanceMeasure,
  useLazyRef,
  useUpdateEffect
}

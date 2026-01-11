/**
 * Query Cache System
 * Provides SWR-style caching for Supabase queries
 */

import { useCallback, useRef, useSyncExternalStore } from 'react'

export interface CacheEntry<T> {
  data: T
  timestamp: number
  error?: Error
  isValidating: boolean
}

export interface CacheOptions {
  /** Time in ms before cache is considered stale (default: 30s) */
  staleTime?: number
  /** Time in ms before cache entry is removed (default: 5min) */
  cacheTime?: number
  /** Whether to dedupe concurrent requests (default: true) */
  dedupe?: boolean
}

const DEFAULT_STALE_TIME = 30 * 1000 // 30 seconds
const DEFAULT_CACHE_TIME = 5 * 60 * 1000 // 5 minutes

// Global cache store
const cache = new Map<string, CacheEntry<unknown>>()
const subscribers = new Map<string, Set<() => void>>()
const pendingRequests = new Map<string, Promise<unknown>>()

/**
 * Notify all subscribers of a cache key that data has changed
 */
function notifySubscribers(key: string): void {
  const subs = subscribers.get(key)
  if (subs) {
    subs.forEach(callback => callback())
  }
}

/**
 * Subscribe to cache changes for a specific key
 */
function subscribe(key: string, callback: () => void): () => void {
  if (!subscribers.has(key)) {
    subscribers.set(key, new Set())
  }
  subscribers.get(key)!.add(callback)

  return () => {
    const subs = subscribers.get(key)
    if (subs) {
      subs.delete(callback)
      if (subs.size === 0) {
        subscribers.delete(key)
      }
    }
  }
}

/**
 * Get snapshot of cache entry
 */
function getSnapshot<T>(key: string): CacheEntry<T> | undefined {
  return cache.get(key) as CacheEntry<T> | undefined
}

/**
 * Set cache entry and notify subscribers
 */
export function setCache<T>(key: string, data: T, error?: Error): void {
  cache.set(key, {
    data,
    timestamp: Date.now(),
    error,
    isValidating: false
  })
  notifySubscribers(key)
}

/**
 * Set validating state for a cache entry
 */
function setValidating(key: string, isValidating: boolean): void {
  const entry = cache.get(key)
  if (entry) {
    cache.set(key, { ...entry, isValidating })
    notifySubscribers(key)
  }
}

/**
 * Check if cache entry is stale
 */
function isStale(entry: CacheEntry<unknown> | undefined, staleTime: number): boolean {
  if (!entry) return true
  return Date.now() - entry.timestamp > staleTime
}

/**
 * Invalidate cache entries matching a pattern
 */
export function invalidateCache(pattern: string | RegExp): void {
  const keysToInvalidate: string[] = []

  cache.forEach((_, key) => {
    if (typeof pattern === 'string') {
      if (key.includes(pattern)) {
        keysToInvalidate.push(key)
      }
    } else {
      if (pattern.test(key)) {
        keysToInvalidate.push(key)
      }
    }
  })

  keysToInvalidate.forEach(key => {
    cache.delete(key)
    notifySubscribers(key)
  })
}

/**
 * Clear all cache entries
 */
export function clearCache(): void {
  const keys = Array.from(cache.keys())
  cache.clear()
  keys.forEach(key => notifySubscribers(key))
}

/**
 * Hook to use cached data with SWR-style revalidation
 */
export function useQueryCache<T>(
  key: string | null,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
): {
  data: T | undefined
  error: Error | undefined
  isLoading: boolean
  isValidating: boolean
  mutate: (data?: T | ((current: T | undefined) => T)) => void
  refetch: () => Promise<T | undefined>
} {
  const {
    staleTime = DEFAULT_STALE_TIME,
    dedupe = true
  } = options

  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  // Subscribe to cache changes
  const entry = useSyncExternalStore(
    useCallback(
      (callback) => key ? subscribe(key, callback) : () => {},
      [key]
    ),
    useCallback(() => key ? getSnapshot<T>(key) : undefined, [key]),
    useCallback(() => key ? getSnapshot<T>(key) : undefined, [key])
  )

  // Fetch data with deduplication
  const fetchData = useCallback(async (): Promise<T | undefined> => {
    if (!key) return undefined

    // Check for pending request (dedupe)
    if (dedupe && pendingRequests.has(key)) {
      return pendingRequests.get(key) as Promise<T>
    }

    setValidating(key, true)

    const request = (async () => {
      try {
        const data = await fetcherRef.current()
        setCache(key, data)
        return data
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        const currentEntry = cache.get(key)
        cache.set(key, {
          data: currentEntry?.data,
          timestamp: Date.now(),
          error,
          isValidating: false
        })
        notifySubscribers(key)
        throw error
      } finally {
        pendingRequests.delete(key)
      }
    })()

    pendingRequests.set(key, request)
    return request
  }, [key, dedupe])

  // Initial fetch if no data or stale
  const hasTriggeredFetch = useRef(false)
  if (key && !hasTriggeredFetch.current && isStale(entry, staleTime)) {
    hasTriggeredFetch.current = true
    fetchData().catch(() => {})
  }

  // Reset fetch trigger when key changes
  const prevKeyRef = useRef(key)
  if (prevKeyRef.current !== key) {
    prevKeyRef.current = key
    hasTriggeredFetch.current = false
  }

  // Mutate function for optimistic updates
  const mutate = useCallback((data?: T | ((current: T | undefined) => T)) => {
    if (!key) return

    if (data === undefined) {
      // Revalidate
      fetchData().catch(() => {})
    } else {
      // Optimistic update
      const newData = typeof data === 'function'
        ? (data as (current: T | undefined) => T)(entry?.data)
        : data
      setCache(key, newData)
    }
  }, [key, entry?.data, fetchData])

  return {
    data: entry?.data,
    error: entry?.error,
    isLoading: !entry && !!key,
    isValidating: entry?.isValidating ?? false,
    mutate,
    refetch: fetchData
  }
}

export default useQueryCache

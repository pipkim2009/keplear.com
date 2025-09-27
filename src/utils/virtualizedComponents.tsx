/**
 * Advanced virtualized components for optimal performance with large datasets
 * Implements virtual scrolling and windowing for musical data
 */

import { memo, useMemo, useCallback, useState, useRef, useEffect } from 'react'
import type { Note } from './notes'

export interface VirtualizedListProps<T> {
  items: T[]
  itemHeight: number
  containerHeight: number
  renderItem: (item: T, index: number, style: React.CSSProperties) => React.ReactNode
  overscan?: number
  onItemClick?: (item: T, index: number) => void
}

/**
 * High-performance virtualized list component
 * Only renders visible items to maintain 60fps with thousands of items
 */
export const VirtualizedList = memo(function VirtualizedList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 5,
  onItemClick
}: VirtualizedListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  // Calculate visible range with overscan
  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    )
    return { startIndex, endIndex }
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan])

  // Generate visible items with positioning
  const visibleItems = useMemo(() => {
    const { startIndex, endIndex } = visibleRange
    return Array.from({ length: endIndex - startIndex + 1 }, (_, i) => {
      const index = startIndex + i
      const item = items[index]
      const style: React.CSSProperties = {
        position: 'absolute',
        top: index * itemHeight,
        left: 0,
        right: 0,
        height: itemHeight
      }
      return { item, index, style }
    })
  }, [visibleRange, items, itemHeight])

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, [])

  const handleItemClick = useCallback((item: T, index: number) => {
    onItemClick?.(item, index)
  }, [onItemClick])

  return (
    <div
      ref={containerRef}
      style={{
        height: containerHeight,
        overflow: 'auto',
        position: 'relative'
      }}
      onScroll={handleScroll}
    >
      <div style={{ height: items.length * itemHeight, position: 'relative' }}>
        {visibleItems.map(({ item, index, style }) => (
          <div
            key={index}
            style={style}
            onClick={() => handleItemClick(item, index)}
          >
            {renderItem(item, index, style)}
          </div>
        ))}
      </div>
    </div>
  )
})

/**
 * Virtualized melody list for handling thousands of melodies
 */
interface MelodyData {
  id: string
  name: string
  notes: Note[]
  duration: number
  bpm: number
}

interface VirtualizedMelodyListProps {
  melodies: MelodyData[]
  onMelodySelect: (melody: MelodyData) => void
  selectedMelodyId?: string
  searchTerm?: string
}

export const VirtualizedMelodyList = memo(function VirtualizedMelodyList({
  melodies,
  onMelodySelect,
  selectedMelodyId,
  searchTerm = ''
}: VirtualizedMelodyListProps) {
  // Filter melodies based on search term
  const filteredMelodies = useMemo(() => {
    if (!searchTerm) return melodies

    const term = searchTerm.toLowerCase()
    return melodies.filter(melody =>
      melody.name.toLowerCase().includes(term) ||
      melody.notes.some(note => note.name.toLowerCase().includes(term))
    )
  }, [melodies, searchTerm])

  // Render individual melody item
  const renderMelodyItem = useCallback((melody: MelodyData, index: number, style: React.CSSProperties) => {
    const isSelected = melody.id === selectedMelodyId

    return (
      <div
        style={{
          ...style,
          display: 'flex',
          alignItems: 'center',
          padding: '12px 16px',
          backgroundColor: isSelected ? 'var(--primary-purple-alpha-20)' : 'transparent',
          borderBottom: '1px solid var(--gray-200)',
          cursor: 'pointer'
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, marginBottom: '4px' }}>
            {melody.name}
          </div>
          <div style={{ fontSize: '14px', color: 'var(--gray-600)' }}>
            {melody.notes.length} notes • {melody.duration.toFixed(1)}s • {melody.bpm} BPM
          </div>
          <div style={{ fontSize: '12px', color: 'var(--gray-500)', marginTop: '2px' }}>
            {melody.notes.slice(0, 8).map(note => note.name).join(' → ')}
            {melody.notes.length > 8 && '...'}
          </div>
        </div>
      </div>
    )
  }, [selectedMelodyId])

  return (
    <VirtualizedList
      items={filteredMelodies}
      itemHeight={80}
      containerHeight={400}
      renderItem={renderMelodyItem}
      onItemClick={onMelodySelect}
      overscan={10}
    />
  )
})

/**
 * Advanced memoization hook for expensive computations
 */
export function useAdvancedMemo<T>(
  factory: () => T,
  deps: React.DependencyList,
  options?: {
    maxAge?: number // Cache timeout in milliseconds
    compare?: (prev: T, next: T) => boolean // Custom comparison
  }
): T {
  const { maxAge = 60000, compare } = options || {}

  const cacheRef = useRef<{
    value: T
    deps: React.DependencyList
    timestamp: number
  } | null>(null)

  return useMemo(() => {
    const now = Date.now()
    const cache = cacheRef.current

    // Check if cache is valid
    if (cache) {
      const isExpired = now - cache.timestamp > maxAge
      const depsChanged = cache.deps.length !== deps.length ||
        cache.deps.some((dep, i) => dep !== deps[i])

      if (!isExpired && !depsChanged) {
        return cache.value
      }
    }

    // Compute new value
    const newValue = factory()

    // Check if value actually changed (if custom compare provided)
    if (cache && compare && !compare(cache.value, newValue)) {
      return cache.value
    }

    // Update cache
    cacheRef.current = {
      value: newValue,
      deps: [...deps],
      timestamp: now
    }

    return newValue
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps
}

/**
 * Performance-optimized debounced callback
 */
export function useOptimizedDebounce<T extends (...args: unknown[]) => void>(
  callback: T,
  delay: number,
  options?: {
    leading?: boolean
    trailing?: boolean
    maxWait?: number
  }
): T {
  const { leading = false, trailing = true, maxWait } = options || {}

  const timeoutRef = useRef<NodeJS.Timeout>()
  const maxTimeoutRef = useRef<NodeJS.Timeout>()
  const lastCallTimeRef = useRef<number>(0)
  const lastInvokeTimeRef = useRef<number>(0)

  const debouncedCallback = useCallback((...args: Parameters<T>) => {
    const currentTime = Date.now()
    lastCallTimeRef.current = currentTime

    const shouldInvokeLeading = leading && !timeoutRef.current
    const shouldInvokeMaxWait = maxWait &&
      (currentTime - lastInvokeTimeRef.current) >= maxWait

    // Clear existing timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Invoke immediately if leading or max wait exceeded
    if (shouldInvokeLeading || shouldInvokeMaxWait) {
      lastInvokeTimeRef.current = currentTime
      callback(...args)

      if (shouldInvokeMaxWait) {
        if (maxTimeoutRef.current) {
          clearTimeout(maxTimeoutRef.current)
        }
      }
      return
    }

    // Set up trailing invocation
    if (trailing) {
      timeoutRef.current = setTimeout(() => {
        lastInvokeTimeRef.current = Date.now()
        callback(...args)
        timeoutRef.current = undefined
      }, delay)
    }

    // Set up max wait timeout
    if (maxWait && !maxTimeoutRef.current) {
      maxTimeoutRef.current = setTimeout(() => {
        lastInvokeTimeRef.current = Date.now()
        callback(...args)
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
          timeoutRef.current = undefined
        }
        maxTimeoutRef.current = undefined
      }, maxWait)
    }
  }, [callback, delay, leading, trailing, maxWait]) as T

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      if (maxTimeoutRef.current) {
        clearTimeout(maxTimeoutRef.current)
      }
    }
  }, [])

  return debouncedCallback
}

/**
 * Intersection Observer hook for lazy loading and performance
 */
export function useIntersectionObserver(
  options?: IntersectionObserverInit
): [React.RefCallback<Element>, boolean] {
  const [isIntersecting, setIsIntersecting] = useState(false)
  const [element, setElement] = useState<Element | null>(null)

  const ref = useCallback((node: Element | null) => {
    setElement(node)
  }, [])

  useEffect(() => {
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting)
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
        ...options
      }
    )

    observer.observe(element)

    return () => {
      observer.unobserve(element)
    }
  }, [element, options])

  return [ref, isIntersecting]
}

/**
 * Lazy-loaded component wrapper for performance
 */
interface LazyComponentProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  rootMargin?: string
  threshold?: number
}

export const LazyComponent = memo(function LazyComponent({
  children,
  fallback = <div style={{ height: '200px' }}>Loading...</div>,
  rootMargin = '100px',
  threshold = 0.1
}: LazyComponentProps) {
  const [ref, isIntersecting] = useIntersectionObserver({
    rootMargin,
    threshold
  })

  return (
    <div ref={ref}>
      {isIntersecting ? children : fallback}
    </div>
  )
})
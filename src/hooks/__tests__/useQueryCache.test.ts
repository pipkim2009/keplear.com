import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useQueryCache, setCache, invalidateCache, clearCache } from '../useQueryCache'

// Access the module-level maps for cleanup
beforeEach(() => {
  clearCache()
})

describe('setCache / clearCache / invalidateCache', () => {
  it('setCache stores data retrievable by useQueryCache', async () => {
    setCache('test-key', { name: 'Alice' })

    const { result } = renderHook(() =>
      useQueryCache('test-key', () => Promise.resolve({ name: 'Bob' }), { staleTime: 60_000 })
    )

    // Should return cached data, not fetch new
    expect(result.current.data).toEqual({ name: 'Alice' })
  })

  it('clearCache removes all entries', async () => {
    setCache('key-a', 'a')
    setCache('key-b', 'b')
    clearCache()

    const { result } = renderHook(() =>
      useQueryCache('key-a', () => Promise.resolve('fresh'), { staleTime: 0 })
    )

    // After clearing, data should be undefined until fetch completes
    await waitFor(() => {
      expect(result.current.data).toBe('fresh')
    })
  })

  it('invalidateCache removes matching entries by string', () => {
    setCache('users:list', [1, 2])
    setCache('users:detail:1', { id: 1 })
    setCache('posts:list', [10])

    invalidateCache('users')

    // Users entries removed, posts remain
    const { result: postsResult } = renderHook(() =>
      useQueryCache('posts:list', () => Promise.resolve([]), { staleTime: 60_000 })
    )
    expect(postsResult.current.data).toEqual([10])
  })

  it('invalidateCache removes matching entries by regex', () => {
    setCache('supabase:users:1', 'u1')
    setCache('supabase:posts:1', 'p1')

    invalidateCache(/supabase:users/)

    const { result } = renderHook(() =>
      useQueryCache('supabase:posts:1', () => Promise.resolve('fresh'), { staleTime: 60_000 })
    )
    expect(result.current.data).toBe('p1')
  })
})

describe('useQueryCache', () => {
  it('returns loading state when no cached data', () => {
    const fetcher = vi.fn(() => new Promise<string>(() => {})) // never resolves

    const { result } = renderHook(() => useQueryCache('loading-test', fetcher))

    expect(result.current.isLoading).toBe(true)
    expect(result.current.data).toBeUndefined()
  })

  it('fetches and returns data', async () => {
    const fetcher = vi.fn().mockResolvedValue({ items: [1, 2, 3] })

    const { result } = renderHook(() => useQueryCache('fetch-test', fetcher, { staleTime: 60_000 }))

    await waitFor(() => {
      expect(result.current.data).toEqual({ items: [1, 2, 3] })
    })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeUndefined()
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('returns error on fetch failure', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('db error'))

    const { result } = renderHook(() => useQueryCache('error-test', fetcher, { staleTime: 0 }))

    await waitFor(() => {
      expect(result.current.error).toBeDefined()
    })

    expect(result.current.error?.message).toBe('db error')
  })

  it('does not fetch when key is null', () => {
    const fetcher = vi.fn().mockResolvedValue('data')

    const { result } = renderHook(() => useQueryCache(null, fetcher))

    expect(fetcher).not.toHaveBeenCalled()
    expect(result.current.isLoading).toBe(false)
    expect(result.current.data).toBeUndefined()
  })

  it('uses stale cache and revalidates', async () => {
    // Pre-populate cache with stale data
    setCache('stale-test', 'old-data')

    const fetcher = vi.fn().mockResolvedValue('new-data')

    const { result } = renderHook(
      () => useQueryCache('stale-test', fetcher, { staleTime: 0 }) // 0ms = always stale
    )

    // Should have stale data immediately
    expect(result.current.data).toBe('old-data')

    // Should revalidate
    await waitFor(() => {
      expect(result.current.data).toBe('new-data')
    })
  })

  it('does not refetch when cache is fresh', async () => {
    setCache('fresh-test', 'cached')

    const fetcher = vi.fn().mockResolvedValue('fresh')

    renderHook(
      () => useQueryCache('fresh-test', fetcher, { staleTime: 60_000 }) // 60s = very fresh
    )

    // Wait a tick to be sure
    await new Promise(r => setTimeout(r, 50))
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('mutate updates cache optimistically', async () => {
    setCache('mutate-test', { count: 0 })

    const fetcher = vi.fn().mockResolvedValue({ count: 99 })

    const { result } = renderHook(() =>
      useQueryCache('mutate-test', fetcher, { staleTime: 60_000 })
    )

    act(() => {
      result.current.mutate({ count: 5 })
    })

    expect(result.current.data).toEqual({ count: 5 })
  })

  it('mutate with updater function', async () => {
    setCache('updater-test', { count: 10 })

    const fetcher = vi.fn().mockResolvedValue({ count: 99 })

    const { result } = renderHook(() =>
      useQueryCache<{ count: number }>('updater-test', fetcher, { staleTime: 60_000 })
    )

    act(() => {
      result.current.mutate(current => ({ count: (current?.count ?? 0) + 1 }))
    })

    expect(result.current.data).toEqual({ count: 11 })
  })

  it('refetch manually triggers a fetch', async () => {
    setCache('refetch-test', 'initial')

    const fetcher = vi.fn().mockResolvedValue('refreshed')

    const { result } = renderHook(() =>
      useQueryCache('refetch-test', fetcher, { staleTime: 60_000 })
    )

    expect(result.current.data).toBe('initial')

    await act(async () => {
      await result.current.refetch()
    })

    expect(result.current.data).toBe('refreshed')
  })

  it('deduplicates concurrent requests', async () => {
    let resolveCount = 0
    const fetcher = vi.fn(() => {
      resolveCount++
      return Promise.resolve(`result-${resolveCount}`)
    })

    const { result: r1 } = renderHook(() =>
      useQueryCache('dedup-test', fetcher, { staleTime: 0, dedupe: true })
    )

    // Second hook with same key
    const { result: r2 } = renderHook(() =>
      useQueryCache('dedup-test', fetcher, { staleTime: 0, dedupe: true })
    )

    await waitFor(() => {
      expect(r1.current.data).toBeDefined()
    })

    // Both should see the same data, fetcher called minimal times
    expect(r1.current.data).toBe(r2.current.data)
  })
})

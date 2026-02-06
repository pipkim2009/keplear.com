/**
 * Supabase Query Hook
 * Combines caching, pagination, and retry for robust data fetching
 */

import { useCallback, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useQueryCache, invalidateCache, setCache, type CacheOptions } from './useQueryCache'
import { withRetry, type RetryOptions } from '../utils/errorHandler'

export interface PaginationOptions {
  /** Page size (default: 20) */
  pageSize?: number
  /** Initial page (default: 0) */
  initialPage?: number
}

export interface QueryOptions<T> extends CacheOptions {
  /** Enable pagination */
  pagination?: PaginationOptions
  /** Retry options for failed requests */
  retry?: Partial<RetryOptions>
  /** Transform the response data */
  transform?: (data: unknown) => T
  /** Dependencies that should trigger a refetch */
  dependencies?: unknown[]
  /** Whether to fetch immediately (default: true) */
  enabled?: boolean
}

export interface PaginatedResult<T> {
  data: T[]
  page: number
  pageSize: number
  hasMore: boolean
  totalCount?: number
}

export interface UseSupabaseQueryResult<T> {
  data: T | undefined
  error: Error | undefined
  isLoading: boolean
  isValidating: boolean
  refetch: () => Promise<T | undefined>
  mutate: (data?: T | ((current: T | undefined) => T)) => void
}

export interface UsePaginatedQueryResult<T> extends UseSupabaseQueryResult<PaginatedResult<T>> {
  page: number
  setPage: (page: number) => void
  nextPage: () => void
  prevPage: () => void
  hasNextPage: boolean
  hasPrevPage: boolean
}

/**
 * Generate cache key from table name and query params
 */
function generateCacheKey(
  table: string,
  params: Record<string, unknown> = {},
  page?: number,
  pageSize?: number
): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${JSON.stringify(params[key])}`)
    .join('&')

  const pageStr = page !== undefined ? `_page=${page}_size=${pageSize}` : ''
  return `supabase:${table}:${sortedParams}${pageStr}`
}

/**
 * Hook for fetching data from Supabase with caching and retry
 */
export function useSupabaseQuery<T>(
  table: string,
  queryBuilder: (query: ReturnType<typeof supabase.from>) => ReturnType<typeof supabase.from>,
  options: QueryOptions<T> = {}
): UseSupabaseQueryResult<T> {
  const { retry, transform, dependencies = [], enabled = true, ...cacheOptions } = options

  // Generate cache key based on table and dependencies
  const cacheKey = enabled ? generateCacheKey(table, { deps: dependencies }) : null

  // Fetcher function with retry
  const fetcher = useCallback(async (): Promise<T> => {
    const fetchOperation = async () => {
      const query = queryBuilder(supabase.from(table))
      const { data, error } = await query

      if (error) throw error
      return transform ? transform(data) : (data as T)
    }

    if (retry) {
      return withRetry(fetchOperation, retry, 'network')
    }
    return fetchOperation()
  }, [table, queryBuilder, transform, retry])

  return useQueryCache<T>(cacheKey, fetcher, cacheOptions)
}

/**
 * Hook for paginated Supabase queries
 */
export function usePaginatedQuery<T>(
  table: string,
  queryBuilder: (query: ReturnType<typeof supabase.from>) => ReturnType<typeof supabase.from>,
  options: QueryOptions<T[]> & { pagination?: PaginationOptions } = {}
): UsePaginatedQueryResult<T> {
  const {
    pagination = {},
    retry,
    transform,
    dependencies = [],
    enabled = true,
    ...cacheOptions
  } = options

  const { pageSize = 20, initialPage = 0 } = pagination
  const [page, setPage] = useState(initialPage)

  // Generate cache key with pagination
  const cacheKey = enabled ? generateCacheKey(table, { deps: dependencies }, page, pageSize) : null

  // Fetcher with pagination
  const fetcher = useCallback(async (): Promise<PaginatedResult<T>> => {
    const fetchOperation = async () => {
      const from = page * pageSize
      const to = from + pageSize

      // First, get the count
      const countQuery = queryBuilder(supabase.from(table))
      const { count } = await countQuery.select('*', { count: 'exact', head: true })

      // Then get the paginated data
      const dataQuery = queryBuilder(supabase.from(table))
      const { data, error } = await dataQuery.range(from, to - 1)

      if (error) throw error

      const transformedData = transform ? transform(data) : (data as T[])

      return {
        data: transformedData,
        page,
        pageSize,
        hasMore: (count ?? 0) > to,
        totalCount: count ?? undefined,
      }
    }

    if (retry) {
      return withRetry(fetchOperation, retry, 'network')
    }
    return fetchOperation()
  }, [table, queryBuilder, transform, retry, page, pageSize])

  const result = useQueryCache<PaginatedResult<T>>(cacheKey, fetcher, cacheOptions)

  const nextPage = useCallback(() => {
    if (result.data?.hasMore) {
      setPage(p => p + 1)
    }
  }, [result.data?.hasMore])

  const prevPage = useCallback(() => {
    if (page > 0) {
      setPage(p => p - 1)
    }
  }, [page])

  return {
    ...result,
    page,
    setPage,
    nextPage,
    prevPage,
    hasNextPage: result.data?.hasMore ?? false,
    hasPrevPage: page > 0,
  }
}

/**
 * Invalidate queries for a specific table
 */
export function invalidateQueries(table: string): void {
  invalidateCache(`supabase:${table}`)
}

/**
 * Prefetch a query (useful for preloading data)
 */
export async function prefetchQuery(
  table: string,
  queryBuilder: (query: ReturnType<typeof supabase.from>) => ReturnType<typeof supabase.from>,
  dependencies: unknown[] = []
): Promise<void> {
  const cacheKey = generateCacheKey(table, { deps: dependencies })

  try {
    const query = queryBuilder(supabase.from(table))
    const { data, error } = await query

    if (error) throw error
    setCache(cacheKey, data)
  } catch (error) {
    console.warn('Prefetch failed:', error)
  }
}

export default useSupabaseQuery

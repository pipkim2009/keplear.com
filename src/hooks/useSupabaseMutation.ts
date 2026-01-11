/**
 * Supabase Mutation Hook
 * Provides optimistic updates and automatic cache invalidation
 */

import { useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { invalidateQueries } from './useSupabaseQuery'
import { withRetry, type RetryOptions } from '../utils/errorHandler'

export interface MutationOptions<TData, TVariables> {
  /** Called before mutation executes (for optimistic updates) */
  onMutate?: (variables: TVariables) => Promise<unknown> | unknown
  /** Called on successful mutation */
  onSuccess?: (data: TData, variables: TVariables) => void
  /** Called on mutation error */
  onError?: (error: Error, variables: TVariables, context: unknown) => void
  /** Called after mutation settles (success or error) */
  onSettled?: (data: TData | undefined, error: Error | null, variables: TVariables) => void
  /** Tables to invalidate on success */
  invalidateTables?: string[]
  /** Retry options for failed mutations */
  retry?: Partial<RetryOptions>
}

export interface MutationResult<TData, TVariables> {
  mutate: (variables: TVariables) => Promise<TData>
  mutateAsync: (variables: TVariables) => Promise<TData>
  data: TData | undefined
  error: Error | undefined
  isLoading: boolean
  isSuccess: boolean
  isError: boolean
  reset: () => void
}

type MutationStatus = 'idle' | 'loading' | 'success' | 'error'

/**
 * Generic mutation hook for Supabase operations
 */
export function useSupabaseMutation<TData = unknown, TVariables = unknown>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: MutationOptions<TData, TVariables> = {}
): MutationResult<TData, TVariables> {
  const {
    onMutate,
    onSuccess,
    onError,
    onSettled,
    invalidateTables = [],
    retry
  } = options

  const [status, setStatus] = useState<MutationStatus>('idle')
  const [data, setData] = useState<TData | undefined>(undefined)
  const [error, setError] = useState<Error | undefined>(undefined)

  // Store the rollback context for optimistic updates
  const rollbackContextRef = useRef<unknown>(null)

  const reset = useCallback(() => {
    setStatus('idle')
    setData(undefined)
    setError(undefined)
    rollbackContextRef.current = null
  }, [])

  const mutateAsync = useCallback(async (variables: TVariables): Promise<TData> => {
    setStatus('loading')
    setError(undefined)

    // Optimistic update
    let context: unknown
    if (onMutate) {
      try {
        context = await onMutate(variables)
        rollbackContextRef.current = context
      } catch (err) {
        console.warn('onMutate failed:', err)
      }
    }

    try {
      // Execute mutation with optional retry
      const mutationOperation = () => mutationFn(variables)
      const result = retry
        ? await withRetry(mutationOperation, retry, 'network')
        : await mutationOperation()

      setData(result)
      setStatus('success')

      // Invalidate related queries
      invalidateTables.forEach(table => {
        invalidateQueries(table)
      })

      // Success callback
      if (onSuccess) {
        onSuccess(result, variables)
      }

      // Settled callback
      if (onSettled) {
        onSettled(result, null, variables)
      }

      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      setError(error)
      setStatus('error')

      // Rollback optimistic update
      if (onError) {
        onError(error, variables, rollbackContextRef.current)
      }

      // Settled callback
      if (onSettled) {
        onSettled(undefined, error, variables)
      }

      throw error
    }
  }, [mutationFn, onMutate, onSuccess, onError, onSettled, invalidateTables, retry])

  const mutate = useCallback((variables: TVariables): Promise<TData> => {
    return mutateAsync(variables).catch(() => undefined as unknown as TData)
  }, [mutateAsync])

  return {
    mutate,
    mutateAsync,
    data,
    error,
    isLoading: status === 'loading',
    isSuccess: status === 'success',
    isError: status === 'error',
    reset
  }
}

/**
 * Convenience mutation for inserting records
 */
export function useInsertMutation<T extends Record<string, unknown>>(
  table: string,
  options: Omit<MutationOptions<T, Partial<T>>, 'invalidateTables'> & {
    invalidateTables?: string[]
  } = {}
) {
  return useSupabaseMutation<T, Partial<T>>(
    async (data) => {
      const { data: result, error } = await supabase
        .from(table)
        .insert(data)
        .select()
        .single()

      if (error) throw error
      return result as T
    },
    {
      ...options,
      invalidateTables: [table, ...(options.invalidateTables ?? [])]
    }
  )
}

/**
 * Convenience mutation for updating records
 */
export function useUpdateMutation<T extends Record<string, unknown>>(
  table: string,
  options: Omit<MutationOptions<T, { id: string; data: Partial<T> }>, 'invalidateTables'> & {
    invalidateTables?: string[]
  } = {}
) {
  return useSupabaseMutation<T, { id: string; data: Partial<T> }>(
    async ({ id, data }) => {
      const { data: result, error } = await supabase
        .from(table)
        .update(data)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return result as T
    },
    {
      ...options,
      invalidateTables: [table, ...(options.invalidateTables ?? [])]
    }
  )
}

/**
 * Convenience mutation for deleting records
 */
export function useDeleteMutation(
  table: string,
  options: Omit<MutationOptions<void, string>, 'invalidateTables'> & {
    invalidateTables?: string[]
  } = {}
) {
  return useSupabaseMutation<void, string>(
    async (id) => {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    {
      ...options,
      invalidateTables: [table, ...(options.invalidateTables ?? [])]
    }
  )
}

export default useSupabaseMutation

/**
 * Real-time Subscription Hook
 * Provides reactive data updates via Supabase Realtime
 */

import { useEffect, useRef, useCallback, useState } from 'react'
import { supabase } from '../lib/supabase'
import { invalidateQueries } from './useSupabaseQuery'
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'

export type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*'

export interface RealtimeOptions<T> {
  /** Events to subscribe to (default: '*' for all) */
  event?: RealtimeEvent
  /** Filter by column value */
  filter?: string
  /** Schema to listen to (default: 'public') */
  schema?: string
  /** Callback when INSERT event occurs */
  onInsert?: (payload: T) => void
  /** Callback when UPDATE event occurs */
  onUpdate?: (payload: { old: T; new: T }) => void
  /** Callback when DELETE event occurs */
  onDelete?: (payload: T) => void
  /** Callback for any change event */
  onChange?: (payload: RealtimePostgresChangesPayload<T>) => void
  /** Whether the subscription is enabled (default: true) */
  enabled?: boolean
  /** Automatically invalidate queries on changes (default: true) */
  autoInvalidate?: boolean
}

export interface UseRealtimeResult {
  /** Current connection status */
  status: 'connecting' | 'connected' | 'disconnected' | 'error'
  /** Any error that occurred */
  error: Error | undefined
  /** Manually unsubscribe */
  unsubscribe: () => void
  /** Manually resubscribe */
  resubscribe: () => void
}

/**
 * Hook to subscribe to real-time changes on a Supabase table
 */
export function useRealtimeSubscription<T extends Record<string, unknown>>(
  table: string,
  options: RealtimeOptions<T> = {}
): UseRealtimeResult {
  const {
    event = '*',
    filter,
    schema = 'public',
    onInsert,
    onUpdate,
    onDelete,
    onChange,
    enabled = true,
    autoInvalidate = true
  } = options

  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected')
  const [error, setError] = useState<Error | undefined>(undefined)
  const channelRef = useRef<RealtimeChannel | null>(null)

  // Store callbacks in refs to avoid re-subscription
  const callbacksRef = useRef({ onInsert, onUpdate, onDelete, onChange })
  callbacksRef.current = { onInsert, onUpdate, onDelete, onChange }

  const subscribe = useCallback(() => {
    if (!enabled) return

    setStatus('connecting')
    setError(undefined)

    // Create channel name
    const channelName = `${table}-${Date.now()}`

    // Build filter config
    const filterConfig: {
      event: RealtimeEvent
      schema: string
      table: string
      filter?: string
    } = {
      event,
      schema,
      table
    }

    if (filter) {
      filterConfig.filter = filter
    }

    // Create subscription
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        filterConfig,
        (payload: RealtimePostgresChangesPayload<T>) => {
          // Call general onChange handler
          if (callbacksRef.current.onChange) {
            callbacksRef.current.onChange(payload)
          }

          // Call specific event handlers
          switch (payload.eventType) {
            case 'INSERT':
              if (callbacksRef.current.onInsert) {
                callbacksRef.current.onInsert(payload.new as T)
              }
              break
            case 'UPDATE':
              if (callbacksRef.current.onUpdate) {
                callbacksRef.current.onUpdate({
                  old: payload.old as T,
                  new: payload.new as T
                })
              }
              break
            case 'DELETE':
              if (callbacksRef.current.onDelete) {
                callbacksRef.current.onDelete(payload.old as T)
              }
              break
          }

          // Auto-invalidate related queries
          if (autoInvalidate) {
            invalidateQueries(table)
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setStatus('connected')
        } else if (status === 'CLOSED') {
          setStatus('disconnected')
        } else if (status === 'CHANNEL_ERROR') {
          setStatus('error')
          setError(new Error('Failed to subscribe to channel'))
        }
      })

    channelRef.current = channel
  }, [table, event, filter, schema, enabled, autoInvalidate])

  const unsubscribe = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
      setStatus('disconnected')
    }
  }, [])

  const resubscribe = useCallback(() => {
    unsubscribe()
    subscribe()
  }, [unsubscribe, subscribe])

  // Subscribe on mount, unsubscribe on unmount
  useEffect(() => {
    subscribe()

    return () => {
      unsubscribe()
    }
  }, [subscribe, unsubscribe])

  return {
    status,
    error,
    unsubscribe,
    resubscribe
  }
}

/**
 * Hook to subscribe to multiple tables
 */
export function useMultiTableSubscription(
  tables: Array<{
    table: string
    options?: RealtimeOptions<Record<string, unknown>>
  }>
): Map<string, UseRealtimeResult> {
  const results = new Map<string, UseRealtimeResult>()

  // This is a simplified version - in practice, you'd want to manage
  // multiple subscriptions more efficiently
  tables.forEach(({ table, options = {} }) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const result = useRealtimeSubscription(table, options)
    results.set(table, result)
  })

  return results
}

/**
 * Hook specifically for classroom real-time updates
 */
export function useClassroomRealtime(
  classroomId: string | null,
  callbacks: {
    onAssignmentAdded?: (assignment: Record<string, unknown>) => void
    onAssignmentUpdated?: (assignment: Record<string, unknown>) => void
    onAssignmentDeleted?: (assignment: Record<string, unknown>) => void
    onStudentJoined?: (student: Record<string, unknown>) => void
    onStudentLeft?: (student: Record<string, unknown>) => void
  } = {}
): { assignmentsStatus: UseRealtimeResult; studentsStatus: UseRealtimeResult } {
  // Subscribe to assignments changes for this classroom
  const assignmentsResult = useRealtimeSubscription('assignments', {
    filter: classroomId ? `classroom_id=eq.${classroomId}` : undefined,
    enabled: !!classroomId,
    onInsert: callbacks.onAssignmentAdded,
    onUpdate: (payload) => callbacks.onAssignmentUpdated?.(payload.new),
    onDelete: callbacks.onAssignmentDeleted
  })

  // Subscribe to student changes for this classroom
  const studentsResult = useRealtimeSubscription('classroom_students', {
    filter: classroomId ? `classroom_id=eq.${classroomId}` : undefined,
    enabled: !!classroomId,
    onInsert: callbacks.onStudentJoined,
    onDelete: callbacks.onStudentLeft
  })

  return {
    assignmentsStatus: assignmentsResult,
    studentsStatus: studentsResult
  }
}

export default useRealtimeSubscription

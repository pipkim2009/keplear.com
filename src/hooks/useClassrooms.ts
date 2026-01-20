/**
 * Classroom Data Hooks
 * Provides complete data management for classrooms with caching,
 * pagination, real-time updates, and optimistic mutations
 */

import { useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { usePaginatedQuery, useSupabaseQuery, invalidateQueries } from './useSupabaseQuery'
import { useSupabaseMutation, useInsertMutation, useDeleteMutation } from './useSupabaseMutation'
import { useRealtimeSubscription, useClassroomRealtime } from './useRealtimeSubscription'
import { setCache } from './useQueryCache'

// Types
export interface ClassroomStudent {
  user_id: string
  profiles: {
    username: string | null
  } | null
}

export interface Assignment {
  id: string
  title: string
  lesson_type: string
  instrument: string
  bpm: number
  beats: number
  chord_count: number
  scales: string[]
  chords: string[]
  octave_low: number
  octave_high: number
  fret_low: number
  fret_high: number
  selection_data: Record<string, unknown> | null
  created_at: string
  created_by: string
  classroom_id: string
}

export interface Classroom {
  id: string
  title: string
  created_by: string | null
  created_at: string
  profiles: {
    username: string | null
  } | null
  classroom_students: ClassroomStudent[]
  assignments: Assignment[]
}

export interface CreateClassroomData {
  title: string
  created_by: string
}

export interface CreateAssignmentData {
  classroom_id: string
  title: string
  lesson_type: string
  instrument: string
  bpm: number
  beats: number
  chord_count: number
  scales: string[]
  chords: string[]
  octave_low: number
  octave_high: number
  fret_low: number
  fret_high: number
  selection_data?: Record<string, unknown> | null
  created_by: string
}

export interface AssignmentCompletion {
  id: string
  assignment_id: string
  user_id: string
  completed_at: string
  profiles?: {
    username: string | null
    avatar_url: string | null
  } | null
}

/**
 * Hook to fetch paginated list of classrooms
 */
export function useClassroomsList(options: {
  pageSize?: number
  enabled?: boolean
} = {}) {
  const { pageSize = 10, enabled = true } = options

  return usePaginatedQuery<Classroom>(
    'classrooms',
    (query) => query
      .select('*, profiles(username), classroom_students(user_id, profiles(username)), assignments(*)')
      .order('created_at', { ascending: false }),
    {
      pagination: { pageSize },
      enabled,
      staleTime: 30000, // 30 seconds
      retry: { maxRetries: 3, baseDelay: 1000, maxDelay: 5000, backoffFactor: 2 }
    }
  )
}

/**
 * Hook to fetch a single classroom by ID
 */
export function useClassroom(classroomId: string | null, options: {
  enabled?: boolean
  enableRealtime?: boolean
} = {}) {
  const { enabled = true, enableRealtime = true } = options

  const query = useSupabaseQuery<Classroom>(
    'classrooms',
    (q) => q
      .select('*, profiles(username), classroom_students(user_id, profiles(username)), assignments(*)')
      .eq('id', classroomId!)
      .single(),
    {
      enabled: enabled && !!classroomId,
      staleTime: 30000,
      dependencies: [classroomId],
      retry: { maxRetries: 3, baseDelay: 1000, maxDelay: 5000, backoffFactor: 2 }
    }
  )

  // Subscribe to real-time updates
  const { assignmentsStatus, studentsStatus } = useClassroomRealtime(
    enableRealtime ? classroomId : null,
    {
      onAssignmentAdded: () => query.refetch(),
      onAssignmentUpdated: () => query.refetch(),
      onAssignmentDeleted: () => query.refetch(),
      onStudentJoined: () => query.refetch(),
      onStudentLeft: () => query.refetch()
    }
  )

  return {
    ...query,
    realtimeStatus: {
      assignments: assignmentsStatus.status,
      students: studentsStatus.status
    }
  }
}

/**
 * Hook to create a new classroom
 */
export function useCreateClassroom() {
  return useInsertMutation<Classroom>('classrooms', {
    onSuccess: () => {
      // Invalidate the classrooms list
      invalidateQueries('classrooms')
    }
  })
}

/**
 * Hook to delete a classroom
 */
export function useDeleteClassroom() {
  return useDeleteMutation('classrooms', {
    invalidateTables: ['classrooms', 'assignments', 'classroom_students']
  })
}

/**
 * Hook to join a classroom
 */
export function useJoinClassroom() {
  return useSupabaseMutation<{ user_id: string; classroom_id: string }, { userId: string; classroomId: string }>(
    async ({ userId, classroomId }) => {
      const { data, error } = await supabase
        .from('classroom_students')
        .insert({ user_id: userId, classroom_id: classroomId })
        .select()
        .single()

      if (error) throw error
      return data
    },
    {
      invalidateTables: ['classrooms', 'classroom_students'],
      onSuccess: (_, { classroomId }) => {
        // Also invalidate the specific classroom
        invalidateQueries(`classrooms:${classroomId}`)
      }
    }
  )
}

/**
 * Hook to leave a classroom (remove student)
 */
export function useLeaveClassroom() {
  return useSupabaseMutation<void, { userId: string; classroomId: string }>(
    async ({ userId, classroomId }) => {
      const { error } = await supabase
        .from('classroom_students')
        .delete()
        .eq('user_id', userId)
        .eq('classroom_id', classroomId)

      if (error) throw error
    },
    {
      invalidateTables: ['classrooms', 'classroom_students']
    }
  )
}

/**
 * Hook to create an assignment
 */
export function useCreateAssignment() {
  return useSupabaseMutation<Assignment, CreateAssignmentData>(
    async (data) => {
      const { data: result, error } = await supabase
        .from('assignments')
        .insert(data)
        .select()
        .single()

      if (error) throw error
      return result as Assignment
    },
    {
      invalidateTables: ['classrooms', 'assignments'],
      retry: { maxRetries: 2, baseDelay: 1000, maxDelay: 3000, backoffFactor: 2 }
    }
  )
}

/**
 * Hook to delete an assignment
 */
export function useDeleteAssignment() {
  return useDeleteMutation('assignments', {
    invalidateTables: ['classrooms', 'assignments']
  })
}

/**
 * Hook to update an assignment
 */
export function useUpdateAssignment() {
  return useSupabaseMutation<Assignment, { id: string; data: Partial<Assignment> }>(
    async ({ id, data }) => {
      const { data: result, error } = await supabase
        .from('assignments')
        .update(data)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return result as Assignment
    },
    {
      invalidateTables: ['classrooms', 'assignments']
    }
  )
}

/**
 * Hook for classrooms with real-time updates
 */
export function useClassroomsWithRealtime(userId: string | null) {
  const classroomsList = useClassroomsList({ enabled: !!userId })

  // Subscribe to real-time changes on classrooms table
  const realtimeStatus = useRealtimeSubscription('classrooms', {
    enabled: !!userId,
    onChange: () => {
      // Refetch when any classroom changes
      classroomsList.refetch()
    }
  })

  return {
    ...classroomsList,
    realtimeStatus: realtimeStatus.status
  }
}

/**
 * Prefetch classroom data (useful for preloading)
 */
export async function prefetchClassroom(classroomId: string): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('classrooms')
      .select('*, profiles(username), classroom_students(user_id, profiles(username)), assignments(*)')
      .eq('id', classroomId)
      .single()

    if (error) throw error

    // Store in cache
    setCache(`supabase:classrooms:{"deps":["${classroomId}"]}`, data)
  } catch (error) {
    console.warn('Failed to prefetch classroom:', error)
  }
}

/**
 * Hook to record an assignment completion
 */
export function useRecordCompletion() {
  return useSupabaseMutation<AssignmentCompletion, { assignmentId: string; userId: string }>(
    async ({ assignmentId, userId }) => {
      const { data, error } = await supabase
        .from('assignment_completions')
        .upsert(
          { assignment_id: assignmentId, user_id: userId },
          { onConflict: 'assignment_id,user_id' }
        )
        .select()
        .single()

      if (error) throw error
      return data as AssignmentCompletion
    },
    {
      invalidateTables: ['assignment_completions']
    }
  )
}

/**
 * Hook to fetch all completed assignment IDs for a user
 */
export function useUserCompletions(userId: string | null, options: {
  enabled?: boolean
} = {}) {
  const { enabled = true } = options

  return useSupabaseQuery<AssignmentCompletion[]>(
    'assignment_completions',
    (q) => q
      .select('*')
      .eq('user_id', userId!),
    {
      enabled: enabled && !!userId,
      staleTime: 30000,
      dependencies: [userId]
    }
  )
}

/**
 * Hook to fetch all completions for a specific assignment (for classroom owners)
 */
export function useAssignmentCompletions(assignmentId: string | null, options: {
  enabled?: boolean
} = {}) {
  const { enabled = true } = options

  return useSupabaseQuery<AssignmentCompletion[]>(
    'assignment_completions',
    (q) => q
      .select('*, profiles(username, avatar_url)')
      .eq('assignment_id', assignmentId!),
    {
      enabled: enabled && !!assignmentId,
      staleTime: 30000,
      dependencies: [assignmentId]
    }
  )
}

export default {
  useClassroomsList,
  useClassroom,
  useCreateClassroom,
  useDeleteClassroom,
  useJoinClassroom,
  useLeaveClassroom,
  useCreateAssignment,
  useDeleteAssignment,
  useUpdateAssignment,
  useClassroomsWithRealtime,
  prefetchClassroom,
  useRecordCompletion,
  useUserCompletions,
  useAssignmentCompletions
}

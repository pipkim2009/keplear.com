/**
 * Dashboard Data Hook
 * Encapsulates all dashboard data fetching from Supabase
 */

import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import {
  fetchRecentPracticeSessions,
  fetchPracticeStats,
  type PracticeSession,
  type PracticeStats,
  type TimeRange,
} from './usePracticeSessions'

export interface ClassroomData {
  id: string
  title: string
  description?: string
  student_count: number
  assignment_count: number
  is_public?: boolean
  join_code?: string
  created_by?: string
  owner_username?: string
}

export interface PendingAssignment {
  id: string
  title: string
  classroom_title: string
  classroom_id: string
  instrument: string
  bpm: number
  beats: number
  lesson_type: string
}

export interface ActivityItem {
  id: string
  type: 'completion' | 'class_join' | 'generator'
  title: string
  subtitle: string
  timestamp: string
  count?: number
  instrument?: string
}

export interface DashboardData {
  username: string
  practiceStats: PracticeStats | null
  completedAssignmentsCount: number
  myClassrooms: ClassroomData[]
  pendingAssignments: PendingAssignment[]
  recentActivity: ActivityItem[]
}

export function useDashboardData(userId: string | undefined, timeRange: TimeRange) {
  const [data, setData] = useState<DashboardData>({
    username: '',
    practiceStats: null,
    completedAssignmentsCount: 0,
    myClassrooms: [],
    pendingAssignments: [],
    recentActivity: [],
  })
  const [isLoading, setIsLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!userId) return

    setIsLoading(true)

    try {
      // Get practice stats
      const stats = await fetchPracticeStats(userId, timeRange)

      // Fetch username from profiles
      const { data: profileData } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', userId)
        .single()

      // Fetch completed assignments with dates for time-range filtering
      const { data: completionsData } = await supabase
        .from('assignment_completions')
        .select('completed_at')
        .eq('user_id', userId)

      const startDate = stats.dateRange?.start || ''
      const endDate = stats.dateRange?.end || ''
      const filteredCompletions =
        completionsData?.filter((c: Record<string, unknown>) => {
          const completedDate = (c.completed_at as string)?.split('T')[0] || ''
          return completedDate >= startDate && completedDate <= endDate
        }) || []

      // Fetch classrooms (joined or owned)
      const [{ data: studentClassrooms }, { data: ownedClassrooms }] = await Promise.all([
        supabase
          .from('classroom_students')
          .select(
            `
            classroom_id,
            classrooms (
              id, title, description, is_public, created_by,
              profiles (username)
            )
          `
          )
          .eq('user_id', userId),
        supabase
          .from('classrooms')
          .select(
            `
            id, title, description, is_public, created_by,
            profiles (username)
          `
          )
          .eq('created_by', userId),
      ])

      // Combine and deduplicate classrooms
      const classroomMap = new Map<string, ClassroomData>()

      studentClassrooms?.forEach((sc: Record<string, Record<string, unknown>>) => {
        if (sc.classrooms) {
          const cls = sc.classrooms as Record<string, unknown>
          const profiles = cls.profiles as Record<string, unknown> | null
          classroomMap.set(cls.id as string, {
            id: cls.id as string,
            title: cls.title as string,
            description: (cls.description as string) || undefined,
            is_public: cls.is_public as boolean,
            created_by: cls.created_by as string,
            owner_username: (profiles?.username as string) || undefined,
            student_count: 0,
            assignment_count: 0,
          })
        }
      })

      ownedClassrooms?.forEach((c: Record<string, unknown>) => {
        const profiles = c.profiles as Record<string, unknown> | null
        classroomMap.set(c.id as string, {
          id: c.id as string,
          title: c.title as string,
          description: (c.description as string) || undefined,
          is_public: c.is_public as boolean,
          created_by: c.created_by as string,
          owner_username: (profiles?.username as string) || undefined,
          student_count: 0,
          assignment_count: 0,
        })
      })

      // Batch fetch counts — 2 queries instead of 2N
      const classroomIds = Array.from(classroomMap.keys())

      if (classroomIds.length > 0) {
        const [{ data: studentRows }, { data: assignmentRows }] = await Promise.all([
          supabase
            .from('classroom_students')
            .select('classroom_id')
            .in('classroom_id', classroomIds),
          supabase.from('assignments').select('classroom_id').in('classroom_id', classroomIds),
        ])

        const studentCounts = new Map<string, number>()
        studentRows?.forEach((row: Record<string, unknown>) => {
          const id = row.classroom_id as string
          studentCounts.set(id, (studentCounts.get(id) || 0) + 1)
        })

        const assignmentCounts = new Map<string, number>()
        assignmentRows?.forEach((row: Record<string, unknown>) => {
          const id = row.classroom_id as string
          assignmentCounts.set(id, (assignmentCounts.get(id) || 0) + 1)
        })

        for (const id of classroomIds) {
          const classroom = classroomMap.get(id)!
          classroom.student_count = studentCounts.get(id) || 0
          classroom.assignment_count = assignmentCounts.get(id) || 0
        }
      }

      // Fetch pending assignments
      let pending: PendingAssignment[] = []
      if (classroomIds.length > 0) {
        const [{ data: allAssignments }, { data: completions }] = await Promise.all([
          supabase
            .from('assignments')
            .select(
              `
              id, title, instrument, bpm, beats, lesson_type,
              classroom_id, classrooms (title)
            `
            )
            .in('classroom_id', classroomIds),
          supabase.from('assignment_completions').select('assignment_id').eq('user_id', userId),
        ])

        const completedIds = new Set(
          completions?.map((c: Record<string, unknown>) => c.assignment_id) || []
        )

        pending =
          allAssignments
            ?.filter((a: Record<string, unknown>) => !completedIds.has(a.id))
            .map((a: Record<string, unknown>) => ({
              id: a.id as string,
              title: a.title as string,
              classroom_title:
                ((a.classrooms as Record<string, unknown>)?.title as string) || 'Unknown',
              classroom_id: a.classroom_id as string,
              instrument: a.instrument as string,
              bpm: a.bpm as number,
              beats: a.beats as number,
              lesson_type: a.lesson_type as string,
            }))
            .slice(0, 5) || []
      }

      // Build recent activity from practice sessions
      const activities: ActivityItem[] = []
      const recentSessions = await fetchRecentPracticeSessions(userId, 50)
      const sessionsByKey = new Map<
        string,
        { count: number; timestamp: string; instrument: string; type: 'generator' | 'classroom' }
      >()

      recentSessions.forEach((session: PracticeSession) => {
        const day = session.created_at.split('T')[0]
        const key = `${day}-${session.instrument}-${session.type}`
        const existing = sessionsByKey.get(key)
        if (existing) {
          existing.count += session.melodies_completed
          if (session.created_at > existing.timestamp) {
            existing.timestamp = session.created_at
          }
        } else {
          sessionsByKey.set(key, {
            count: session.melodies_completed,
            timestamp: session.created_at,
            instrument: session.instrument,
            type: session.type,
          })
        }
      })

      sessionsByKey.forEach((sessionData, key) => {
        activities.push({
          id: `${sessionData.type}-${key}`,
          type: sessionData.type === 'generator' ? 'generator' : 'completion',
          title: `Completed ${sessionData.count} ${sessionData.count === 1 ? 'melody' : 'melodies'}`,
          subtitle: `${sessionData.instrument} in ${sessionData.type === 'generator' ? 'generator' : 'Classroom'}`,
          timestamp: sessionData.timestamp,
          count: sessionData.count,
          instrument: sessionData.instrument,
        })
      })

      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

      setData({
        username: profileData?.username || '',
        practiceStats: stats,
        completedAssignmentsCount: filteredCompletions.length,
        myClassrooms: Array.from(classroomMap.values()).slice(0, 6),
        pendingAssignments: pending,
        recentActivity: activities.slice(0, 8),
      })
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [userId, timeRange])

  return { ...data, isLoading, fetchData }
}

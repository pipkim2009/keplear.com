/**
 * Practice Sessions Hook
 * Handles saving and fetching practice sessions from Supabase
 */

import { useContext } from 'react'
import { supabase } from '../lib/supabase'
import { useSupabaseMutation } from './useSupabaseMutation'
import AuthContext from '../contexts/AuthContext'

export interface PracticeSession {
  id: string
  user_id: string
  type: 'sandbox' | 'classroom'
  instrument: string
  melodies_completed: number
  created_at: string
}

export interface RecordPracticeSessionParams {
  type: 'sandbox' | 'classroom'
  instrument: string
  melodiesCompleted: number
}

export type TimeRange = 'week' | 'month' | 'year' | 'all'

export interface PracticeStats {
  totalMelodies: number
  sandboxMelodies: number
  classroomMelodies: number
  byInstrument: {
    keyboard: number
    guitar: number
    bass: number
  }
  weeklyData: {
    date: string
    label: string
    keyboard: number
    guitar: number
    bass: number
    classroom: number
  }[]
  dateRange: {
    start: string
    end: string
  }
}

/**
 * Hook to record a practice session to Supabase
 */
export function useRecordPracticeSession() {
  const authContext = useContext(AuthContext)
  const user = authContext?.user ?? null

  return useSupabaseMutation<PracticeSession, RecordPracticeSessionParams>(
    async ({ type, instrument, melodiesCompleted }) => {
      if (!user?.id) {
        throw new Error('User must be logged in to record practice session')
      }

      const { data, error } = await supabase
        .from('practice_sessions')
        .insert({
          user_id: user.id,
          type,
          instrument,
          melodies_completed: melodiesCompleted
        })
        .select()
        .single()

      if (error) throw error
      return data as PracticeSession
    },
    {
      invalidateTables: ['practice_sessions']
    }
  )
}

/**
 * Fetch recent practice sessions for the current user
 */
export async function fetchRecentPracticeSessions(userId: string, limit: number = 10): Promise<PracticeSession[]> {
  const { data, error } = await supabase
    .from('practice_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching practice sessions:', error)
    return []
  }

  return data as PracticeSession[]
}

/**
 * Get practice statistics for the current user
 */
export async function fetchPracticeStats(userId: string, timeRange: TimeRange = 'week'): Promise<PracticeStats> {
  const { data: sessions, error } = await supabase
    .from('practice_sessions')
    .select('*')
    .eq('user_id', userId)

  // Generate time-based data structure
  const generateTimeData = (): { data: PracticeStats['weeklyData'], dateRange: { start: string, end: string } } => {
    const timeData: PracticeStats['weeklyData'] = []
    const today = new Date()
    let startDate: Date
    let endDate: Date = new Date(today)

    if (timeRange === 'week') {
      // Monday to Sunday of current week
      const dayOfWeek = today.getDay()
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
      startDate = new Date(today)
      startDate.setDate(today.getDate() + mondayOffset)

      for (let i = 0; i < 7; i++) {
        const date = new Date(startDate)
        date.setDate(startDate.getDate() + i)
        const dateStr = date.toISOString().split('T')[0]
        const label = date.toLocaleDateString('en', { weekday: 'short' })
        timeData.push({ date: dateStr, label, keyboard: 0, guitar: 0, bass: 0, classroom: 0 })
      }
      endDate = new Date(startDate)
      endDate.setDate(startDate.getDate() + 6)
    } else if (timeRange === 'month') {
      // Days of current month
      startDate = new Date(today.getFullYear(), today.getMonth(), 1)
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
      endDate = new Date(today.getFullYear(), today.getMonth(), lastDay)

      for (let i = 1; i <= lastDay; i++) {
        const date = new Date(today.getFullYear(), today.getMonth(), i)
        const dateStr = date.toISOString().split('T')[0]
        const label = i.toString()
        timeData.push({ date: dateStr, label, keyboard: 0, guitar: 0, bass: 0, classroom: 0 })
      }
    } else if (timeRange === 'year') {
      // Months of current year
      startDate = new Date(today.getFullYear(), 0, 1)
      endDate = new Date(today.getFullYear(), 11, 31)

      for (let i = 0; i < 12; i++) {
        const date = new Date(today.getFullYear(), i, 1)
        const dateStr = `${today.getFullYear()}-${String(i + 1).padStart(2, '0')}`
        const label = date.toLocaleDateString('en', { month: 'short' })
        timeData.push({ date: dateStr, label, keyboard: 0, guitar: 0, bass: 0, classroom: 0 })
      }
    } else {
      // All time - group by month, going back up to 12 months or to first session
      startDate = new Date(today)
      startDate.setMonth(today.getMonth() - 11)
      startDate.setDate(1)

      for (let i = 0; i < 12; i++) {
        const date = new Date(startDate)
        date.setMonth(startDate.getMonth() + i)
        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        const label = date.toLocaleDateString('en', { month: 'short', year: '2-digit' })
        timeData.push({ date: dateStr, label, keyboard: 0, guitar: 0, bass: 0, classroom: 0 })
      }
    }

    return {
      data: timeData,
      dateRange: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0]
      }
    }
  }

  const { data: timeData, dateRange } = generateTimeData()

  if (error) {
    console.error('Error fetching practice stats:', error)
    return {
      totalMelodies: 0,
      sandboxMelodies: 0,
      classroomMelodies: 0,
      byInstrument: { keyboard: 0, guitar: 0, bass: 0 },
      weeklyData: timeData,
      dateRange
    }
  }

  let sandboxMelodies = 0
  let classroomMelodies = 0
  const byInstrument = { keyboard: 0, guitar: 0, bass: 0 }

  sessions?.forEach((session: PracticeSession) => {
    if (session.type === 'sandbox') {
      sandboxMelodies += session.melodies_completed
    } else {
      classroomMelodies += session.melodies_completed
    }

    if (session.instrument in byInstrument) {
      byInstrument[session.instrument as keyof typeof byInstrument] += session.melodies_completed
    }

    // Add to time data
    const sessionDate = session.created_at.split('T')[0]

    if (timeRange === 'year' || timeRange === 'all') {
      // Group by month
      const monthKey = sessionDate.substring(0, 7) // YYYY-MM
      const dayData = timeData.find(d => d.date === monthKey)
      if (dayData) {
        if (session.type === 'classroom') {
          dayData.classroom += session.melodies_completed
        } else if (session.instrument === 'keyboard') {
          dayData.keyboard += session.melodies_completed
        } else if (session.instrument === 'guitar') {
          dayData.guitar += session.melodies_completed
        } else if (session.instrument === 'bass') {
          dayData.bass += session.melodies_completed
        }
      }
    } else {
      // Group by day
      const dayData = timeData.find(d => d.date === sessionDate)
      if (dayData) {
        if (session.type === 'classroom') {
          dayData.classroom += session.melodies_completed
        } else if (session.instrument === 'keyboard') {
          dayData.keyboard += session.melodies_completed
        } else if (session.instrument === 'guitar') {
          dayData.guitar += session.melodies_completed
        } else if (session.instrument === 'bass') {
          dayData.bass += session.melodies_completed
        }
      }
    }
  })

  return {
    totalMelodies: sandboxMelodies + classroomMelodies,
    sandboxMelodies,
    classroomMelodies,
    byInstrument,
    weeklyData: timeData,
    dateRange
  }
}

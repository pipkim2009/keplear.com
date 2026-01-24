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
    sandbox: number
    classroom: number
  }[]
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
export async function fetchPracticeStats(userId: string): Promise<PracticeStats> {
  const { data: sessions, error } = await supabase
    .from('practice_sessions')
    .select('*')
    .eq('user_id', userId)

  // Generate empty weekly data
  const generateWeeklyData = () => {
    const weeklyData: PracticeStats['weeklyData'] = []
    const today = new Date()
    const dayOfWeek = today.getDay()
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const monday = new Date(today)
    monday.setDate(today.getDate() + mondayOffset)

    for (let i = 0; i < 7; i++) {
      const date = new Date(monday)
      date.setDate(monday.getDate() + i)
      const dateStr = date.toISOString().split('T')[0]
      weeklyData.push({ date: dateStr, sandbox: 0, classroom: 0 })
    }
    return weeklyData
  }

  if (error) {
    console.error('Error fetching practice stats:', error)
    return {
      totalMelodies: 0,
      sandboxMelodies: 0,
      classroomMelodies: 0,
      byInstrument: { keyboard: 0, guitar: 0, bass: 0 },
      weeklyData: generateWeeklyData()
    }
  }

  let sandboxMelodies = 0
  let classroomMelodies = 0
  const byInstrument = { keyboard: 0, guitar: 0, bass: 0 }
  const weeklyData = generateWeeklyData()

  sessions?.forEach((session: PracticeSession) => {
    if (session.type === 'sandbox') {
      sandboxMelodies += session.melodies_completed
    } else {
      classroomMelodies += session.melodies_completed
    }

    if (session.instrument in byInstrument) {
      byInstrument[session.instrument as keyof typeof byInstrument] += session.melodies_completed
    }

    // Add to weekly data
    const sessionDate = session.created_at.split('T')[0]
    const dayData = weeklyData.find(d => d.date === sessionDate)
    if (dayData) {
      if (session.type === 'sandbox') {
        dayData.sandbox += session.melodies_completed
      } else {
        dayData.classroom += session.melodies_completed
      }
    }
  })

  return {
    totalMelodies: sandboxMelodies + classroomMelodies,
    sandboxMelodies,
    classroomMelodies,
    byInstrument,
    weeklyData
  }
}

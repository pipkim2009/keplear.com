/**
 * useExerciseLibrary - CRUD for saved exercise blocks and lesson templates
 * Lazy-loading: doesn't query until explicitly requested (tables may not exist yet)
 */

import { useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { ExerciseData } from '../types/exercise'

export interface SavedExercise {
  id: string
  user_id: string
  name: string
  instrument: string
  exercise_data: ExerciseData
  tags: string[]
  is_public: boolean
  created_at: string
}

export interface SavedTemplate {
  id: string
  user_id: string | null
  name: string
  instrument: string
  category: string
  exercises: ExerciseData[]
  is_system: boolean
  created_at: string
}

export function useExerciseLibrary(userId: string | undefined) {
  const [exercises, setExercises] = useState<SavedExercise[]>([])
  const [loading, setLoading] = useState(false)
  const hasFetched = useRef(false)

  const fetchExercises = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('exercise_library')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && data) {
        setExercises(data as SavedExercise[])
        hasFetched.current = true
      }
      // Silently handle 404 (table doesn't exist yet)
    } catch {
      // Table may not exist yet — silently ignore
    } finally {
      setLoading(false)
    }
  }, [userId])

  const saveExercise = useCallback(
    async (name: string, instrument: string, exerciseData: ExerciseData, tags: string[] = []) => {
      if (!userId) return null
      try {
        const { data, error } = await supabase
          .from('exercise_library')
          .insert({
            user_id: userId,
            name,
            instrument,
            exercise_data: exerciseData,
            tags,
            is_public: false,
          })
          .select()
          .single()

        if (error) {
          console.error('Error saving exercise:', error)
          return null
        }
        await fetchExercises()
        return data as SavedExercise
      } catch {
        console.error('Exercise library table may not exist yet')
        return null
      }
    },
    [userId, fetchExercises]
  )

  const deleteExercise = useCallback(
    async (exerciseId: string) => {
      if (!userId) return
      try {
        const { error } = await supabase
          .from('exercise_library')
          .delete()
          .eq('id', exerciseId)
          .eq('user_id', userId)

        if (error) {
          console.error('Error deleting exercise:', error)
          return
        }
        await fetchExercises()
      } catch {
        // Table may not exist yet
      }
    },
    [userId, fetchExercises]
  )

  return { exercises, loading, fetchExercises, saveExercise, deleteExercise }
}

export function useLessonTemplates(userId: string | undefined) {
  const [templates, setTemplates] = useState<SavedTemplate[]>([])
  const [loading, setLoading] = useState(false)
  const hasFetched = useRef(false)

  const fetchTemplates = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('lesson_templates')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && data) {
        setTemplates(data as SavedTemplate[])
        hasFetched.current = true
      }
      // Silently handle 404 (table doesn't exist yet)
    } catch {
      // Table may not exist yet — silently ignore
    } finally {
      setLoading(false)
    }
  }, [userId])

  const saveTemplate = useCallback(
    async (
      name: string,
      instrument: string,
      exercises: ExerciseData[],
      category: string = 'general'
    ) => {
      if (!userId) return null
      try {
        const { data, error } = await supabase
          .from('lesson_templates')
          .insert({
            user_id: userId,
            name,
            instrument,
            category,
            exercises,
            is_system: false,
          })
          .select()
          .single()

        if (error) {
          console.error('Error saving template:', error)
          return null
        }
        await fetchTemplates()
        return data as SavedTemplate
      } catch {
        console.error('Lesson templates table may not exist yet')
        return null
      }
    },
    [userId, fetchTemplates]
  )

  const deleteTemplate = useCallback(
    async (templateId: string) => {
      if (!userId) return
      try {
        const { error } = await supabase
          .from('lesson_templates')
          .delete()
          .eq('id', templateId)
          .eq('user_id', userId)

        if (error) {
          console.error('Error deleting template:', error)
          return
        }
        await fetchTemplates()
      } catch {
        // Table may not exist yet
      }
    },
    [userId, fetchTemplates]
  )

  return { templates, loading, fetchTemplates, saveTemplate, deleteTemplate }
}

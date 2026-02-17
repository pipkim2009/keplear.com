/**
 * Classroom Actions Hook
 * Encapsulates all Classroom CRUD Supabase operations
 */

import { supabase } from '../lib/supabase'

interface ClassroomInsert {
  title: string
  description: string | null
  created_by: string
  is_public: boolean
  join_code: string | null
}

interface AssignmentData {
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
  selection_data: Record<string, unknown>
  exercises?: Record<string, unknown>[]
  exercise_count?: number
  [key: string]: unknown
}

/**
 * Fetch all classrooms with related data
 */
export async function fetchClassroomList() {
  const { data, error } = await supabase
    .from('classrooms')
    .select(
      '*, profiles(username), classroom_students(user_id, profiles(username)), assignments(*)'
    )
    .order('created_at', { ascending: false })

  if (!error) {
    return data ?? []
  }

  console.error('Error fetching with profiles:', error)
  const fallback = await supabase
    .from('classrooms')
    .select('*')
    .order('created_at', { ascending: false })
  return (
    fallback.data?.map(c => ({ ...c, profiles: null, classroom_students: [], assignments: [] })) ??
    []
  )
}

/**
 * Delete a classroom (owner only)
 */
export async function deleteClassroom(classroomId: string, userId: string) {
  const { error } = await supabase
    .from('classrooms')
    .delete()
    .eq('id', classroomId)
    .eq('created_by', userId)
  if (error) throw error
}

/**
 * Update a classroom's title/description (owner only)
 */
export async function updateClassroom(
  classroomId: string,
  userId: string,
  data: { title: string; description: string | null }
) {
  const { error } = await supabase
    .from('classrooms')
    .update(data)
    .eq('id', classroomId)
    .eq('created_by', userId)
  if (error) throw error
}

/**
 * Delete an assignment (owner only)
 */
export async function deleteAssignment(assignmentId: string, userId: string) {
  const { error } = await supabase
    .from('assignments')
    .delete()
    .eq('id', assignmentId)
    .eq('created_by', userId)
  if (error) throw error
}

/**
 * Join a classroom as a student
 */
export async function joinClassroom(classroomId: string, userId: string) {
  const { error } = await supabase
    .from('classroom_students')
    .insert({ classroom_id: classroomId, user_id: userId })
  if (error) throw error
}

/**
 * Leave a classroom
 */
export async function leaveClassroom(classroomId: string, userId: string) {
  const { error } = await supabase
    .from('classroom_students')
    .delete()
    .eq('classroom_id', classroomId)
    .eq('user_id', userId)
  if (error) throw error
}

/**
 * Remove a student from a classroom
 */
export async function removeStudent(classroomId: string, studentId: string) {
  const { error } = await supabase
    .from('classroom_students')
    .delete()
    .eq('classroom_id', classroomId)
    .eq('user_id', studentId)
  if (error) throw error
}

/**
 * Create a new classroom
 */
export async function createClassroom(data: ClassroomInsert) {
  const { error } = await supabase.from('classrooms').insert(data)
  if (error) throw error
}

/**
 * Find a classroom by join code and join it
 */
export async function findAndJoinByCode(joinCode: string, userId: string) {
  // Find classroom
  const { data: classroom, error: findError } = await supabase
    .from('classrooms')
    .select('id, title')
    .eq('join_code', joinCode.trim().toUpperCase())
    .single()

  if (findError || !classroom) {
    return { error: 'notFound' as const }
  }

  // Check existing membership
  const { data: existing } = await supabase
    .from('classroom_students')
    .select('user_id')
    .eq('classroom_id', classroom.id)
    .eq('user_id', userId)
    .single()

  if (existing) {
    return { error: 'alreadyMember' as const }
  }

  // Join
  const { error: joinError } = await supabase
    .from('classroom_students')
    .insert({ classroom_id: classroom.id, user_id: userId })

  if (joinError) throw joinError

  return { error: null }
}

/**
 * Save (create or update) an assignment
 */
export async function saveAssignment(
  data: AssignmentData,
  editingId: string | null,
  userId: string
) {
  if (editingId) {
    const { error } = await supabase.from('assignments').update(data).eq('id', editingId)
    if (error) throw error
  } else {
    const { error } = await supabase.from('assignments').insert({ ...data, created_by: userId })
    if (error) throw error
  }
}

/**
 * Duplicate an existing assignment into the same or different classroom
 */
export async function duplicateAssignment(
  assignmentId: string,
  targetClassroomId: string,
  userId: string,
  newTitle?: string
) {
  // Fetch the original assignment
  const { data: original, error: fetchError } = await supabase
    .from('assignments')
    .select('*')
    .eq('id', assignmentId)
    .single()

  if (fetchError || !original) {
    throw fetchError || new Error('Assignment not found')
  }

  // Create a copy with new ID
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, created_at: _created_at, created_by: _created_by, ...rest } = original
  const { error: insertError } = await supabase.from('assignments').insert({
    ...rest,
    classroom_id: targetClassroomId,
    title: newTitle || `${original.title} (Copy)`,
    created_by: userId,
  })

  if (insertError) throw insertError
}

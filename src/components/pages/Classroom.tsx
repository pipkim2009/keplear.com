/**
 * Classroom Page - View and create classrooms
 */

import { useState, useEffect, useCallback, useContext } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../../lib/supabase'
import AuthContext from '../../contexts/AuthContext'
import { useInstrument } from '../../contexts/InstrumentContext'
import styles from '../../styles/Classroom.module.css'

interface StudentData {
  user_id: string
  profiles: {
    username: string | null
  } | null
}

interface SelectionData {
  selectedNoteIds: string[]
  appliedScales: Array<{
    root: string
    scaleName: string
    octave?: number
    displayName: string
  }>
  appliedChords: Array<{
    root: string
    chordName: string
    octave?: number
    fretZone?: number
    displayName: string
  }>
}

interface AssignmentData {
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
  selection_data: SelectionData | null
  created_at: string
  created_by: string
}

interface ClassroomData {
  id: string
  title: string
  created_by: string | null
  created_at: string
  profiles: {
    username: string | null
  } | null
  classroom_students: StudentData[]
  assignments: AssignmentData[]
}

function Classroom() {
  const authContext = useContext(AuthContext)
  const user = authContext?.user ?? null
  const { navigateToSandbox } = useInstrument()

  const [classrooms, setClassrooms] = useState<ClassroomData[]>([])
  const [selectedClassroom, setSelectedClassroom] = useState<ClassroomData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [joiningClassId, setJoiningClassId] = useState<string | null>(null)

  // Check for dark mode
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.body.classList.contains('dark'))
    }
    checkDarkMode()

    const observer = new MutationObserver(checkDarkMode)
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class']
    })

    return () => observer.disconnect()
  }, [])

  // Fetch classrooms
  const fetchClassrooms = useCallback(async () => {
    try {
      setLoading(true)

      // Try to fetch with profiles, students, and assignments join
      let { data, error: fetchError } = await supabase
        .from('classrooms')
        .select('*, profiles(username), classroom_students(user_id, profiles(username)), assignments(*)')
        .order('created_at', { ascending: false })

      // If join fails, fetch without profiles
      if (fetchError) {
        console.error('Error fetching with profiles:', fetchError)
        const fallback = await supabase
          .from('classrooms')
          .select('*')
          .order('created_at', { ascending: false })

        data = fallback.data?.map(c => ({ ...c, profiles: null, classroom_students: [], assignments: [] })) ?? []
      }

      setClassrooms(data ?? [])

      // Update selected classroom if it exists
      if (selectedClassroom) {
        const updated = data?.find(c => c.id === selectedClassroom.id)
        if (updated) {
          setSelectedClassroom(updated)
        }
      }
    } catch (err) {
      console.error('Error fetching classrooms:', err)
    } finally {
      setLoading(false)
    }
  }, [selectedClassroom])

  // Delete classroom
  const handleDeleteClassroom = async (classroomId: string) => {
    if (!user) return

    try {
      const { error: deleteError } = await supabase
        .from('classrooms')
        .delete()
        .eq('id', classroomId)
        .eq('created_by', user.id)

      if (deleteError) {
        console.error('Error deleting classroom:', deleteError)
        return
      }

      setSelectedClassroom(null)
      fetchClassrooms()
    } catch (err) {
      console.error('Error deleting classroom:', err)
    }
  }

  // Delete assignment
  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!user) return

    try {
      const { error: deleteError } = await supabase
        .from('assignments')
        .delete()
        .eq('id', assignmentId)
        .eq('created_by', user.id)

      if (deleteError) {
        console.error('Error deleting assignment:', deleteError)
        return
      }

      fetchClassrooms()
    } catch (err) {
      console.error('Error deleting assignment:', err)
    }
  }

  // Join classroom
  const handleJoinClassroom = async (classroomId: string) => {
    if (!user) {
      setError('Please log in to join a classroom')
      return
    }

    try {
      setJoiningClassId(classroomId)

      const { error: joinError } = await supabase
        .from('classroom_students')
        .insert({
          classroom_id: classroomId,
          user_id: user.id
        })

      if (joinError) {
        console.error('Error joining classroom:', joinError)
        return
      }

      fetchClassrooms()
    } catch (err) {
      console.error('Error joining classroom:', err)
    } finally {
      setJoiningClassId(null)
    }
  }

  // Leave classroom
  const handleLeaveClassroom = async (classroomId: string) => {
    if (!user) return

    try {
      setJoiningClassId(classroomId)

      const { error: leaveError } = await supabase
        .from('classroom_students')
        .delete()
        .eq('classroom_id', classroomId)
        .eq('user_id', user.id)

      if (leaveError) {
        console.error('Error leaving classroom:', leaveError)
        return
      }

      fetchClassrooms()
    } catch (err) {
      console.error('Error leaving classroom:', err)
    } finally {
      setJoiningClassId(null)
    }
  }

  // Remove student from classroom (owner only)
  const handleRemoveStudent = async (classroomId: string, studentId: string) => {
    if (!user) return

    try {
      const { error: removeError } = await supabase
        .from('classroom_students')
        .delete()
        .eq('classroom_id', classroomId)
        .eq('user_id', studentId)

      if (removeError) {
        console.error('Error removing student:', removeError)
        return
      }

      fetchClassrooms()
    } catch (err) {
      console.error('Error removing student:', err)
    }
  }

  // Check if user has joined a classroom
  const hasJoined = (classroom: ClassroomData) => {
    if (!user) return false
    return classroom.classroom_students?.some(s => s.user_id === user.id) ?? false
  }

  useEffect(() => {
    fetchClassrooms()
  }, [])

  // Create classroom
  const handleCreateClassroom = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newTitle.trim()) {
      setError('Please enter a title')
      return
    }

    if (!user) {
      setError('You must be logged in to create a classroom')
      return
    }

    try {
      setCreating(true)
      setError(null)

      const { error: insertError } = await supabase
        .from('classrooms')
        .insert({
          title: newTitle.trim(),
          created_by: user.id
        })

      if (insertError) {
        setError(insertError.message)
        return
      }

      setNewTitle('')
      setIsModalOpen(false)
      fetchClassrooms()
    } catch (err) {
      setError('An error occurred while creating the classroom')
      console.error('Error creating classroom:', err)
    } finally {
      setCreating(false)
    }
  }

  // Open Sandbox to create assignment
  const handleCreateAssignment = (classroomId: string) => {
    // Store classroom ID for Sandbox to pick up
    localStorage.setItem('assigningToClassroom', classroomId)
    navigateToSandbox()
  }

  const handleOpenModal = () => {
    if (!user) {
      setError('Please log in to create a classroom')
      return
    }
    setError(null)
    setNewTitle('')
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setNewTitle('')
    setError(null)
  }

  // Start assignment - store settings and navigate to Sandbox
  const handleStartAssignment = (assignment: AssignmentData) => {
    console.error('=== STARTING ASSIGNMENT ===')
    console.error('Assignment data:', assignment)
    console.error('selection_data:', assignment.selection_data)

    const assignmentSettings = {
      lessonType: assignment.lesson_type,
      instrument: assignment.instrument,
      bpm: assignment.bpm,
      beats: assignment.beats,
      chordCount: assignment.chord_count,
      scales: assignment.scales,
      chords: assignment.chords,
      octaveLow: assignment.octave_low,
      octaveHigh: assignment.octave_high,
      fretLow: assignment.fret_low,
      fretHigh: assignment.fret_high,
      selectionData: assignment.selection_data
    }
    console.log('Assignment settings to save:', assignmentSettings)

    // Store in localStorage for Sandbox to pick up
    localStorage.setItem('assignmentSettings', JSON.stringify(assignmentSettings))

    // Navigate to Sandbox
    navigateToSandbox()
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleCloseModal()
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  // Modal component
  const modal = isModalOpen && createPortal(
    <div
      className={`${styles.modalOverlay} ${isDarkMode ? 'dark' : ''}`}
      onClick={handleBackdropClick}
    >
      <div className={`${styles.modal} ${isDarkMode ? 'dark' : ''}`}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Create Classroom</h2>
          <button
            className={styles.closeButton}
            onClick={handleCloseModal}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <form className={styles.form} onSubmit={handleCreateClassroom}>
          {error && <div className={styles.errorMessage}>{error}</div>}

          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="classroomTitle">
              Title
            </label>
            <input
              id="classroomTitle"
              type="text"
              className={styles.formInput}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Enter classroom title"
              autoFocus
              disabled={creating}
            />
          </div>

          <button
            type="submit"
            className={styles.submitButton}
            disabled={creating || !newTitle.trim()}
          >
            {creating ? 'Creating...' : 'Create Classroom'}
          </button>
        </form>
      </div>
    </div>,
    document.body
  )

  // Full-page classroom view
  if (selectedClassroom) {
    const isOwner = user && user.id === selectedClassroom.created_by
    const joined = hasJoined(selectedClassroom)
    const studentCount = selectedClassroom.classroom_students?.length ?? 0
    const assignments = selectedClassroom.assignments ?? []

    return (
      <div className={styles.classroomContainer}>
        <div className={styles.fullPageView}>
          {/* Back button */}
          <button
            className={styles.backButtonCircle}
            onClick={() => setSelectedClassroom(null)}
            aria-label="Back to classes"
            title="Back to classes"
          >
            ←
          </button>

          {/* Header */}
          <div className={styles.fullPageHeader}>
            <div className={styles.fullPageTitleRow}>
              <h1 className={styles.fullPageTitle}>{selectedClassroom.title}</h1>
              {isOwner && (
                <button
                  className={styles.deleteButton}
                  onClick={() => handleDeleteClassroom(selectedClassroom.id)}
                  title="Delete classroom"
                >
                  ×
                </button>
              )}
            </div>
            <p className={styles.fullPageAuthor}>
              by {selectedClassroom.profiles?.username ?? 'Unknown'}
            </p>
            <p className={styles.fullPageMeta}>
              Created {formatDate(selectedClassroom.created_at)}
            </p>

            {/* Join/Leave button */}
            {user && !isOwner && (
              <button
                className={joined ? styles.leaveButton : styles.joinButton}
                onClick={() => joined
                  ? handleLeaveClassroom(selectedClassroom.id)
                  : handleJoinClassroom(selectedClassroom.id)
                }
                disabled={joiningClassId === selectedClassroom.id}
                style={{ marginTop: '1rem', width: 'auto' }}
              >
                {joiningClassId === selectedClassroom.id
                  ? 'Loading...'
                  : joined
                    ? 'Leave Class'
                    : 'Join Class'
                }
              </button>
            )}
          </div>

          {/* Two column layout */}
          <div className={styles.fullPageContent}>
            {/* Students column */}
            <div className={styles.fullPageColumn}>
              <div className={styles.fullPageSectionHeader}>
                <h2 className={styles.fullPageSectionTitle}>Students</h2>
                <span className={styles.fullPageCount}>{studentCount}</span>
              </div>
              {studentCount === 0 ? (
                <p className={styles.fullPageEmpty}>No students enrolled yet</p>
              ) : (
                <div className={styles.fullPageStudentsList}>
                  {selectedClassroom.classroom_students.map((student) => (
                    <div key={student.user_id} className={styles.fullPageStudentItem}>
                      <div className={styles.studentAvatar}>
                        {(student.profiles?.username ?? 'U')[0].toUpperCase()}
                      </div>
                      <span className={styles.studentName}>
                        {student.profiles?.username ?? 'Unknown'}
                      </span>
                      {isOwner && (
                        <button
                          className={styles.removeStudentButton}
                          onClick={() => handleRemoveStudent(selectedClassroom.id, student.user_id)}
                          aria-label="Remove student"
                          title="Remove student"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Assignments column */}
            <div className={styles.fullPageColumn}>
              <div className={styles.fullPageSectionHeader}>
                <h2 className={styles.fullPageSectionTitle}>Assignments</h2>
                {isOwner && (
                  <button
                    className={styles.addAssignmentButtonLarge}
                    onClick={() => handleCreateAssignment(selectedClassroom.id)}
                  >
                    + Add Assignment
                  </button>
                )}
              </div>
              {assignments.length === 0 ? (
                <p className={styles.fullPageEmpty}>No assignments yet</p>
              ) : (
                <div className={styles.fullPageAssignmentsList}>
                  {assignments.map((assignment) => (
                    <div key={assignment.id} className={styles.fullPageAssignmentItem}>
                      <div className={styles.fullPageAssignmentInfo}>
                        <h3 className={styles.fullPageAssignmentTitle}>{assignment.title}</h3>
                        <div className={styles.fullPageAssignmentDetails}>
                          <span className={styles.assignmentDetailTag}>{assignment.instrument}</span>
                          <span className={styles.assignmentDetailTag}>{assignment.lesson_type}</span>
                          <span className={styles.assignmentDetailTag}>{assignment.bpm} BPM</span>
                          <span className={styles.assignmentDetailTag}>{assignment.beats} beats</span>
                        </div>
                      </div>
                      <div className={styles.fullPageAssignmentActions}>
                        {user && (
                          <button
                            className={styles.startAssignmentButtonLarge}
                            onClick={() => handleStartAssignment(assignment)}
                          >
                            Start
                          </button>
                        )}
                        {isOwner && (
                          <button
                            className={styles.deleteAssignmentButton}
                            onClick={() => handleDeleteAssignment(assignment.id)}
                            title="Delete assignment"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Class list view
  return (
    <div className={styles.classroomContainer}>
      <section className={styles.headerSection}>
        <h1 className={styles.pageTitle}>Classroom</h1>
        <p className={styles.pageSubtitle}>
          Structured lessons and courses for learning music theory
        </p>
      </section>

      <section className={styles.classesSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Available Classes</h2>
          <button
            className={styles.addButton}
            onClick={handleOpenModal}
            aria-label="Create new classroom"
            title={user ? 'Create new classroom' : 'Log in to create a classroom'}
          >
            +
          </button>
        </div>

        {loading ? (
          <div className={styles.loadingState}>Loading classrooms...</div>
        ) : classrooms.length === 0 ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyStateText}>
              No classrooms yet. Be the first to create one!
            </p>
          </div>
        ) : (
          <div className={styles.classesGrid}>
            {classrooms.map((classroom) => {
              const studentCount = classroom.classroom_students?.length ?? 0
              const assignmentCount = classroom.assignments?.length ?? 0

              return (
                <div
                  key={classroom.id}
                  className={styles.classCardClickable}
                  onClick={() => setSelectedClassroom(classroom)}
                >
                  <h3 className={styles.classTitle}>{classroom.title}</h3>
                  <p className={styles.classAuthor}>
                    by {classroom.profiles?.username ?? 'Unknown'}
                  </p>
                  <p className={styles.classMeta}>
                    Created {formatDate(classroom.created_at)}
                  </p>
                  <div className={styles.classCardStats}>
                    <span className={styles.statItem}>
                      {studentCount} {studentCount === 1 ? 'student' : 'students'}
                    </span>
                    <span className={styles.statDivider}>•</span>
                    <span className={styles.statItem}>
                      {assignmentCount} {assignmentCount === 1 ? 'assignment' : 'assignments'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {!user && error && (
          <div className={styles.errorMessage}>{error}</div>
        )}
      </section>

      {modal}
    </div>
  )
}

export default Classroom

/**
 * Classroom Page - View and create classrooms
 */

import { useState, useEffect, useCallback, useContext } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../../lib/supabase'
import AuthContext from '../../contexts/AuthContext'
import styles from '../../styles/Classroom.module.css'

interface StudentData {
  user_id: string
  profiles: {
    username: string | null
  } | null
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
}

function Classroom() {
  const authContext = useContext(AuthContext)
  const user = authContext?.user ?? null

  const [classrooms, setClassrooms] = useState<ClassroomData[]>([])
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

      // Try to fetch with profiles and students join
      let { data, error: fetchError } = await supabase
        .from('classrooms')
        .select('*, profiles(username), classroom_students(user_id, profiles(username))')
        .order('created_at', { ascending: false })

      // If join fails, fetch without profiles
      if (fetchError) {
        console.error('Error fetching with profiles:', fetchError)
        const fallback = await supabase
          .from('classrooms')
          .select('*')
          .order('created_at', { ascending: false })

        data = fallback.data?.map(c => ({ ...c, profiles: null, classroom_students: [] })) ?? []
      }

      setClassrooms(data ?? [])
    } catch (err) {
      console.error('Error fetching classrooms:', err)
    } finally {
      setLoading(false)
    }
  }, [])

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

      fetchClassrooms()
    } catch (err) {
      console.error('Error deleting classroom:', err)
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

  // Check if user has joined a classroom
  const hasJoined = (classroom: ClassroomData) => {
    if (!user) return false
    return classroom.classroom_students?.some(s => s.user_id === user.id) ?? false
  }

  useEffect(() => {
    fetchClassrooms()
  }, [fetchClassrooms])

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
              const isOwner = user && user.id === classroom.created_by
              const joined = hasJoined(classroom)
              const studentCount = classroom.classroom_students?.length ?? 0

              return (
                <div key={classroom.id} className={styles.classCard}>
                  <div className={styles.classCardHeader}>
                    <h3 className={styles.classTitle}>{classroom.title}</h3>
                    {isOwner && (
                      <button
                        className={styles.deleteButton}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteClassroom(classroom.id)
                        }}
                        aria-label="Delete classroom"
                        title="Delete classroom"
                      >
                        ×
                      </button>
                    )}
                  </div>
                  <p className={styles.classAuthor}>
                    by {classroom.profiles?.username ?? 'Unknown'}
                  </p>
                  <p className={styles.classMeta}>
                    Created {formatDate(classroom.created_at)}
                  </p>

                  {/* Students section */}
                  <div className={styles.studentsSection}>
                    <p className={styles.studentCount}>
                      {studentCount} {studentCount === 1 ? 'student' : 'students'}
                    </p>
                    {studentCount > 0 && (
                      <div className={styles.studentsList}>
                        {classroom.classroom_students.map((student) => (
                          <span key={student.user_id} className={styles.studentTag}>
                            {student.profiles?.username ?? 'Unknown'}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Join/Leave button */}
                  {user && !isOwner && (
                    <button
                      className={joined ? styles.leaveButton : styles.joinButton}
                      onClick={() => joined
                        ? handleLeaveClassroom(classroom.id)
                        : handleJoinClassroom(classroom.id)
                      }
                      disabled={joiningClassId === classroom.id}
                    >
                      {joiningClassId === classroom.id
                        ? 'Loading...'
                        : joined
                          ? 'Leave'
                          : 'Join'
                      }
                    </button>
                  )}
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

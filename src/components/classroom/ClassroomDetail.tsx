/**
 * ClassroomDetail - Renders the detail view for a selected classroom
 * Shows students, assignments, edit form, join/leave actions
 * Extracted from Classroom.tsx for maintainability
 */

import { useState, memo, useMemo } from 'react'
import { useTranslation } from '../../contexts/TranslationContext'
import { useAssignmentCompletions } from '../../hooks/useClassrooms'
import {
  PiTrashFill,
  PiPencilSimpleFill,
  PiEyeFill,
  PiCheckCircleFill,
  PiXCircleFill,
} from 'react-icons/pi'
import styles from '../../styles/Classroom.module.css'

interface StudentData {
  user_id: string
  profiles: { username: string | null } | null
}

interface AssignmentData {
  id: string
  title: string
  instrument: string
  lesson_type: string
}

interface ClassroomData {
  id: string
  title: string
  description: string | null
  created_by: string | null
  created_at: string
  is_public: boolean
  join_code: string | null
  profiles: { username: string | null } | null
  classroom_students: StudentData[]
  assignments: AssignmentData[]
}

interface ClassroomDetailProps {
  readonly classroom: ClassroomData
  readonly userId: string | null
  readonly completedAssignmentIds: Set<string>
  readonly joiningClassId: string | null
  // Edit state
  readonly isEditing: boolean
  readonly editTitle: string
  readonly editDescription: string
  readonly isSavingEdit: boolean
  readonly onEditTitleChange: (title: string) => void
  readonly onEditDescriptionChange: (desc: string) => void
  readonly onStartEdit: () => void
  readonly onCancelEdit: () => void
  readonly onSaveEdit: () => void
  // Actions
  readonly onBack: () => void
  readonly onDelete: (classroomId: string) => void
  readonly onJoin: (classroomId: string) => void
  readonly onLeave: (classroomId: string) => void
  readonly onRemoveStudent: (classroomId: string, studentId: string) => void
  readonly onDeleteAssignment: (assignmentId: string) => void
  readonly onStartAssignment: (assignment: AssignmentData) => void
  readonly onEditAssignment: (assignment: AssignmentData, classroomId: string) => void
  readonly onCreateAssignment: (classroomId: string) => void
}

const ClassroomDetail = memo(function ClassroomDetail({
  classroom,
  userId,
  completedAssignmentIds,
  joiningClassId,
  isEditing,
  editTitle,
  editDescription,
  isSavingEdit,
  onEditTitleChange,
  onEditDescriptionChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onBack,
  onDelete,
  onJoin,
  onLeave,
  onRemoveStudent,
  onDeleteAssignment,
  onStartAssignment,
  onEditAssignment,
  onCreateAssignment,
}: ClassroomDetailProps) {
  const { t } = useTranslation()
  const [codeCopied, setCodeCopied] = useState(false)
  const [viewingCompletionsFor, setViewingCompletionsFor] = useState<string | null>(null)
  const assignmentCompletions = useAssignmentCompletions(viewingCompletionsFor)

  const isOwner = userId && userId === classroom.created_by
  const joined = userId ? classroom.classroom_students?.some(s => s.user_id === userId) : false
  const studentCount = classroom.classroom_students?.length ?? 0
  const assignments = classroom.assignments ?? []

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const classInstruments = useMemo(
    () => [...new Set(assignments.map(a => a.instrument).filter(Boolean))],
    [assignments]
  )

  return (
    <div className={styles.classroomContainer}>
      <div className={styles.fullPageView}>
        <button
          className={styles.backButtonCircle}
          onClick={onBack}
          aria-label="Back to classes"
          title="Back to classes"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        <div className={styles.fullPageHeader}>
          {isEditing ? (
            <>
              <div className={styles.editFormGroup}>
                <label className={styles.editLabel}>{t('classroom.className')}</label>
                <input
                  type="text"
                  className={styles.editInput}
                  value={editTitle}
                  onChange={e => onEditTitleChange(e.target.value)}
                  placeholder={t('classroom.enterClassName')}
                  autoFocus
                  disabled={isSavingEdit}
                />
              </div>
              <div className={styles.editFormGroup}>
                <label className={styles.editLabel}>{t('classroom.classDescription')}</label>
                <textarea
                  className={styles.editTextarea}
                  value={editDescription}
                  onChange={e => onEditDescriptionChange(e.target.value)}
                  placeholder={t('classroom.enterDescription')}
                  disabled={isSavingEdit}
                  rows={3}
                />
              </div>
              <div className={styles.editActions}>
                <button
                  className={styles.editCancelButton}
                  onClick={onCancelEdit}
                  disabled={isSavingEdit}
                >
                  {t('common.cancel')}
                </button>
                <button
                  className={styles.editSaveButton}
                  onClick={onSaveEdit}
                  disabled={isSavingEdit || !editTitle.trim()}
                >
                  {isSavingEdit ? t('sandbox.saving') : t('common.save')}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className={styles.fullPageTitleRow}>
                <h1 className={styles.fullPageTitle}>{classroom.title}</h1>
                {isOwner && (
                  <div className={styles.titleActions}>
                    <button
                      className={styles.editButton}
                      onClick={onStartEdit}
                      title="Edit classroom"
                    >
                      <PiPencilSimpleFill size={16} />
                    </button>
                    <button
                      className={styles.deleteButton}
                      onClick={() => onDelete(classroom.id)}
                      title="Delete classroom"
                    >
                      <PiTrashFill size={16} />
                    </button>
                  </div>
                )}
              </div>
              <p className={styles.fullPageAuthor}>
                {t('classroom.by')} {classroom.profiles?.username ?? t('classroom.unknown')}
              </p>
              {classroom.description && (
                <p className={styles.fullPageDescription}>{classroom.description}</p>
              )}
              {classInstruments.length > 0 && (
                <div className={styles.instrumentTags} style={{ marginTop: '0.75rem' }}>
                  {classInstruments.map(inst => (
                    <span
                      key={inst}
                      className={`${styles.instrumentTag} ${styles[`instrument${inst.charAt(0).toUpperCase() + inst.slice(1)}`]}`}
                    >
                      {inst}
                    </span>
                  ))}
                </div>
              )}
              <p className={styles.fullPageMeta}>
                {t('classroom.created')} {formatDate(classroom.created_at)}
              </p>
            </>
          )}

          {!isEditing && isOwner && !classroom.is_public && classroom.join_code && (
            <div className={styles.joinCodeDisplay}>
              <span className={styles.joinCodeLabel}>{t('classroom.classCode')}:</span>
              <span className={styles.joinCodeValue}>{classroom.join_code}</span>
              <button
                className={`${styles.copyCodeButton} ${codeCopied ? styles.copied : ''}`}
                onClick={() => {
                  navigator.clipboard.writeText(classroom.join_code!)
                  setCodeCopied(true)
                  setTimeout(() => setCodeCopied(false), 2000)
                }}
                title="Copy code"
              >
                {codeCopied ? (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                ) : (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                )}
              </button>
            </div>
          )}

          {userId && !isOwner && (
            <button
              className={joined ? styles.leaveButton : styles.joinButton}
              onClick={() => (joined ? onLeave(classroom.id) : onJoin(classroom.id))}
              disabled={joiningClassId === classroom.id}
              style={{ marginTop: '1rem', width: 'auto' }}
            >
              {joiningClassId === classroom.id
                ? t('common.loading')
                : joined
                  ? t('classroom.leaveClass')
                  : t('classroom.joinClass')}
            </button>
          )}
        </div>

        <div className={styles.fullPageContent}>
          {/* Students Column */}
          <div className={styles.fullPageColumn}>
            <div className={styles.fullPageSectionHeader}>
              <h2 className={styles.fullPageSectionTitle}>{t('classroom.students')}</h2>
              <span className={styles.fullPageCount}>{studentCount}</span>
            </div>
            {studentCount === 0 ? (
              <p className={styles.fullPageEmpty}>{t('classroom.noStudents')}</p>
            ) : (
              <div className={styles.fullPageStudentsList}>
                {classroom.classroom_students.map(student => (
                  <div key={student.user_id} className={styles.fullPageStudentItem}>
                    <div className={styles.studentAvatar}>
                      {(student.profiles?.username ?? 'U')[0].toUpperCase()}
                    </div>
                    <span className={styles.studentName}>
                      {student.profiles?.username ?? t('classroom.unknown')}
                    </span>
                    {isOwner && (
                      <button
                        className={styles.removeStudentButton}
                        onClick={() => onRemoveStudent(classroom.id, student.user_id)}
                        aria-label="Remove student"
                        title="Remove student"
                      >
                        <PiTrashFill size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Assignments Column */}
          <div className={styles.fullPageColumn}>
            <div className={styles.fullPageSectionHeader}>
              <h2 className={styles.fullPageSectionTitle}>{t('classroom.assignments')}</h2>
              {isOwner && (
                <button
                  className={styles.addAssignmentButtonLarge}
                  onClick={() => onCreateAssignment(classroom.id)}
                >
                  + {t('classroom.addAssignment')}
                </button>
              )}
            </div>
            {assignments.length === 0 ? (
              <p className={styles.fullPageEmpty}>{t('classroom.noAssignments')}</p>
            ) : (
              <div className={styles.fullPageAssignmentsList}>
                {assignments.map(assignment => (
                  <div key={assignment.id} className={styles.fullPageAssignmentItem}>
                    <div className={styles.fullPageAssignmentInfo}>
                      <h3 className={styles.fullPageAssignmentTitle}>
                        {assignment.title}
                        {completedAssignmentIds.has(assignment.id) && (
                          <PiCheckCircleFill className={styles.completedTick} size={18} />
                        )}
                      </h3>
                      {assignment.instrument && (
                        <span
                          className={`${styles.instrumentTag} ${styles[`instrument${assignment.instrument.charAt(0).toUpperCase() + assignment.instrument.slice(1)}`]}`}
                        >
                          {assignment.instrument}
                        </span>
                      )}
                    </div>
                    <div className={styles.fullPageAssignmentActions}>
                      {userId && (
                        <button
                          className={styles.startAssignmentButtonLarge}
                          onClick={() => onStartAssignment(assignment)}
                        >
                          {t('classroom.assignment.start')}
                        </button>
                      )}
                      {isOwner && (
                        <button
                          className={styles.viewCompletionsButton}
                          onClick={() =>
                            setViewingCompletionsFor(
                              viewingCompletionsFor === assignment.id ? null : assignment.id
                            )
                          }
                          title="View completions"
                        >
                          <PiEyeFill size={14} />
                        </button>
                      )}
                      {isOwner && (
                        <button
                          className={styles.editAssignmentButton}
                          onClick={() => onEditAssignment(assignment, classroom.id)}
                          title={t('classroom.assignment.update')}
                        >
                          <PiPencilSimpleFill size={14} />
                        </button>
                      )}
                      {isOwner && (
                        <button
                          className={styles.deleteAssignmentButton}
                          onClick={() => onDeleteAssignment(assignment.id)}
                          title="Delete assignment"
                        >
                          <PiTrashFill size={14} />
                        </button>
                      )}
                    </div>
                    {viewingCompletionsFor === assignment.id && (
                      <CompletionsPanel classroom={classroom} completions={assignmentCompletions} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
})

/** Sub-component for assignment completion tracking */
function CompletionsPanel({
  classroom,
  completions,
}: {
  readonly classroom: ClassroomData
  readonly completions: {
    data: Array<{ user_id: string; completed_at: string }> | null
    isLoading: boolean
  }
}) {
  const completionsMap = new Map((completions.data ?? []).map(c => [c.user_id, c]))

  const allMembers: Array<{
    user_id: string
    profiles: { username: string | null } | null
    isOwner?: boolean
    completion?: { user_id: string; completed_at: string }
  }> = []

  if (classroom.created_by) {
    allMembers.push({
      user_id: classroom.created_by,
      profiles: classroom.profiles,
      isOwner: true,
      completion: completionsMap.get(classroom.created_by),
    })
  }

  classroom.classroom_students.forEach(student => {
    allMembers.push({
      ...student,
      completion: completionsMap.get(student.user_id),
    })
  })

  const completedCount = allMembers.filter(s => s.completion).length

  return (
    <div className={styles.completionsList}>
      <h4 className={styles.completionsListTitle}>
        Progress ({completedCount}/{allMembers.length})
      </h4>
      {completions.isLoading ? (
        <p className={styles.completionsLoading}>Loading...</p>
      ) : allMembers.length > 0 ? (
        <ul className={styles.completionsListItems}>
          {allMembers.map(member => (
            <li key={member.user_id} className={styles.completionItem}>
              {member.completion ? (
                <PiCheckCircleFill className={styles.completedIcon} size={18} />
              ) : (
                <PiXCircleFill className={styles.notCompletedIcon} size={18} />
              )}
              <div className={styles.completionAvatar}>
                {(member.profiles?.username ?? 'U')[0].toUpperCase()}
              </div>
              <span className={styles.completionName}>
                {member.profiles?.username || 'Unknown user'}
                {member.isOwner && ' (Owner)'}
              </span>
              {member.completion && (
                <span className={styles.completionDate}>
                  {new Date(member.completion.completed_at).toLocaleDateString()}
                </span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.noCompletions}>No members in class</p>
      )}
    </div>
  )
}

export default ClassroomDetail

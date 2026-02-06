/**
 * ClassroomList - Renders the classroom list view (My Classes + Available Classes)
 * Extracted from Classroom.tsx for maintainability
 */

import { memo } from 'react'
import { useTranslation } from '../../contexts/TranslationContext'
import SEOHead from '../common/SEOHead'
import TutorialOverlay from '../onboarding/TutorialOverlay'
import styles from '../../styles/Classroom.module.css'

interface ClassroomData {
  id: string
  title: string
  description: string | null
  created_by: string | null
  is_public: boolean
  assignments: Array<{ instrument: string }>
  classroom_students: Array<{ user_id: string }>
  profiles: { username: string | null } | null
}

interface ClassroomListProps {
  readonly classrooms: ClassroomData[]
  readonly userId: string | null
  readonly loading: boolean
  readonly searchQuery: string
  readonly error: string | null
  readonly onSearchChange: (query: string) => void
  readonly onSelectClassroom: (classroom: ClassroomData) => void
  readonly onOpenCreateModal: () => void
  readonly onOpenJoinModal: () => void
  // Tutorial
  readonly isTutorialActive: boolean
  readonly tutorialStep: number
  readonly onTutorialNext: () => void
  readonly onTutorialPrev: () => void
  readonly onTutorialSkip: () => void
  readonly onTutorialComplete: () => void
  readonly shouldShowTutorial: boolean
  readonly onStartTutorial: () => void
}

function ClassCard({
  classroom,
  showOwnershipBadge,
  userId,
  onSelect,
}: {
  readonly classroom: ClassroomData
  readonly showOwnershipBadge: boolean
  readonly userId: string | null
  readonly onSelect: (classroom: ClassroomData) => void
}) {
  const { t } = useTranslation()
  const isOwner = userId && classroom.created_by === userId
  const isJoined = userId && classroom.classroom_students?.some(s => s.user_id === userId)
  const instruments = [
    ...new Set(classroom.assignments?.map(a => a.instrument).filter(Boolean) || []),
  ]

  return (
    <div className={styles.classCardClickable} onClick={() => onSelect(classroom)}>
      <div className={styles.classTitleRow}>
        <h3 className={styles.classTitle}>{classroom.title}</h3>
        <div className={styles.tagGroup}>
          {showOwnershipBadge && isOwner && (
            <span className={styles.ownerTag}>{t('classroom.owner')}</span>
          )}
          {showOwnershipBadge && !isOwner && isJoined && (
            <span className={styles.studentTag}>{t('classroom.student')}</span>
          )}
          {!classroom.is_public ? (
            <span className={styles.privateTag}>{t('classroom.private')}</span>
          ) : (
            <span className={styles.publicTag}>{t('classroom.public')}</span>
          )}
        </div>
      </div>
      <p className={styles.classAuthor}>
        {t('classroom.by')} {classroom.profiles?.username ?? t('classroom.unknown')}
      </p>
      {classroom.description && <p className={styles.classDescription}>{classroom.description}</p>}
      {instruments.length > 0 && (
        <div className={styles.instrumentTags}>
          {instruments.map(inst => (
            <span
              key={inst}
              className={`${styles.instrumentTag} ${styles[`instrument${inst.charAt(0).toUpperCase() + inst.slice(1)}`]}`}
            >
              {inst}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

const ClassroomList = memo(function ClassroomList({
  classrooms,
  userId,
  loading,
  searchQuery,
  error,
  onSearchChange,
  onSelectClassroom,
  onOpenCreateModal,
  onOpenJoinModal,
  isTutorialActive,
  tutorialStep,
  onTutorialNext,
  onTutorialPrev,
  onTutorialSkip,
  onTutorialComplete,
  shouldShowTutorial,
  onStartTutorial,
}: ClassroomListProps) {
  const { t } = useTranslation()

  const myClasses = classrooms.filter(classroom => {
    if (!userId) return false
    if (classroom.created_by === userId) return true
    if (classroom.classroom_students?.some(s => s.user_id === userId)) return true
    return false
  })

  const availableClasses = classrooms.filter(classroom => {
    if (!classroom.is_public) return false
    if (!userId) return true
    if (classroom.created_by === userId) return false
    if (classroom.classroom_students?.some(s => s.user_id === userId)) return false
    return true
  })

  const filteredClasses = availableClasses.filter(
    classroom =>
      classroom.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      classroom.profiles?.username?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className={styles.classroomContainer}>
      <SEOHead
        title="Classroom"
        description="Create and join music classrooms. Assign exercises, track student progress, and learn together."
        path="/classroom"
      />
      <section className={styles.headerSection}>
        <h1 className={styles.pageTitle}>{t('classroom.title')}</h1>
        <p className={styles.pageSubtitle}>{t('classroom.subtitle')}</p>
      </section>

      {/* My Classes Section */}
      {userId && (
        <section className={styles.classesSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>{t('classroom.myClasses')}</h2>
            <div className={styles.sectionButtons}>
              <button
                className={styles.createButton}
                onClick={onOpenCreateModal}
                aria-label={t('classroom.createClass')}
                title={t('classroom.createClass')}
              >
                {t('classroom.create')}
              </button>
            </div>
          </div>

          {loading ? (
            <div className={styles.loadingState}>{t('classroom.loadingClasses')}</div>
          ) : myClasses.length === 0 ? (
            <div className={styles.emptyState}>
              <p className={styles.emptyStateText}>{t('classroom.noClassesJoined')}</p>
            </div>
          ) : (
            <div className={styles.classesGrid}>
              {myClasses.map(classroom => (
                <ClassCard
                  key={classroom.id}
                  classroom={classroom}
                  showOwnershipBadge={true}
                  userId={userId}
                  onSelect={onSelectClassroom}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Available Classes Section */}
      <section className={styles.classesSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>{t('classroom.availableClasses')}</h2>
          <div className={styles.sectionButtons}>
            <button
              className={styles.joinClassButton}
              onClick={onOpenJoinModal}
              aria-label={t('classroom.joinPrivateClass')}
              title={userId ? t('classroom.joinPrivateClass') : t('classroom.loginToJoin')}
            >
              {t('classroom.joinPrivateClass')}
            </button>
            {!userId && (
              <button
                className={styles.createButton}
                onClick={onOpenCreateModal}
                aria-label={t('classroom.createClass')}
                title={t('classroom.loginToCreate')}
              >
                {t('classroom.create')}
              </button>
            )}
          </div>
        </div>

        <div className={styles.searchContainer}>
          <svg
            className={styles.searchIcon}
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <input
            type="text"
            className={styles.searchInput}
            placeholder={t('classroom.searchClasses')}
            aria-label={t('classroom.searchClasses')}
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
          />
          {searchQuery && (
            <button
              className={styles.searchClear}
              onClick={() => onSearchChange('')}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>

        {loading ? (
          <div className={styles.loadingState}>{t('classroom.loadingClasses')}</div>
        ) : availableClasses.length === 0 ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyStateText}>
              {userId ? t('classroom.noMoreClasses') : t('classroom.noPublicClasses')}
            </p>
          </div>
        ) : filteredClasses.length === 0 ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyStateText}>
              {t('classroom.noClassesFound', { query: searchQuery })}
            </p>
          </div>
        ) : (
          <div className={styles.classesGrid}>
            {filteredClasses.map(classroom => (
              <ClassCard
                key={classroom.id}
                classroom={classroom}
                showOwnershipBadge={false}
                userId={userId}
                onSelect={onSelectClassroom}
              />
            ))}
          </div>
        )}

        {!userId && error && <div className={styles.errorMessage}>{error}</div>}
      </section>

      <TutorialOverlay
        isActive={isTutorialActive}
        currentStep={tutorialStep}
        onNext={onTutorialNext}
        onPrev={onTutorialPrev}
        onSkip={onTutorialSkip}
        onComplete={onTutorialComplete}
        shouldShowWelcome={shouldShowTutorial}
        onStartTutorial={onStartTutorial}
      />
    </div>
  )
})

export default ClassroomList
export type { ClassroomData as ClassroomListData }

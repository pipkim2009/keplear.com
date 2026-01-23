/**
 * Dashboard Page - Personalized landing page for logged-in users
 * Shows quick stats, classrooms, pending assignments, and recent activity
 */

import { useState, useEffect, useContext, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import AuthContext from '../../contexts/AuthContext'
import { useTranslation } from '../../contexts/TranslationContext'
import { useNavigation } from '../../hooks/useInstrumentSelectors'
import { useInstrument } from '../../contexts/InstrumentContext'
import {
  PiPlayFill,
  PiMagnifyingGlassFill,
  PiCheckCircleFill,
  PiUsersFill,
  PiChartBarFill,
  PiTrophyFill,
  PiBookOpenFill,
  PiCrownFill,
  PiArrowRightBold,
  PiSparkle,
  PiMusicNotesFill,
  PiClockFill
} from 'react-icons/pi'
import styles from '../../styles/Dashboard.module.css'

interface ClassroomData {
  id: string
  title: string
  student_count: number
  assignment_count: number
}

interface PendingAssignment {
  id: string
  title: string
  classroom_title: string
  classroom_id: string
  instrument: string
  bpm: number
  beats: number
  lesson_type: string
}

interface ActivityItem {
  id: string
  type: 'completion' | 'class_join'
  title: string
  subtitle: string
  timestamp: string
}

function Dashboard() {
  const authContext = useContext(AuthContext)
  const user = authContext?.user
  const loading = authContext?.loading

  const { t } = useTranslation()
  const { navigateToSandbox, navigateToClassroom } = useNavigation()
  const { setInstrument, setBpm, setNumberOfBeats } = useInstrument()

  // State
  const [username, setUsername] = useState<string>('')
  const [completedCount, setCompletedCount] = useState<number>(0)
  const [classesJoinedCount, setClassesJoinedCount] = useState<number>(0)
  const [classesOwnedCount, setClassesOwnedCount] = useState<number>(0)
  const [myClassrooms, setMyClassrooms] = useState<ClassroomData[]>([])
  const [pendingAssignments, setPendingAssignments] = useState<PendingAssignment[]>([])
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    if (!user) return

    setIsLoading(true)

    try {
      // Fetch username from profiles
      const { data: profileData } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single()

      if (profileData?.username) {
        setUsername(profileData.username)
      }

      // Fetch completed assignments count
      const { count: completed } = await supabase
        .from('assignment_completions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

      setCompletedCount(completed || 0)

      // Fetch classes joined (as student)
      const { count: joined } = await supabase
        .from('classroom_students')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

      setClassesJoinedCount(joined || 0)

      // Fetch classes owned
      const { count: owned } = await supabase
        .from('classrooms')
        .select('*', { count: 'exact', head: true })
        .eq('created_by', user.id)

      setClassesOwnedCount(owned || 0)

      // Fetch my classrooms (joined or owned)
      const { data: studentClassrooms } = await supabase
        .from('classroom_students')
        .select(`
          classroom_id,
          classrooms (
            id,
            title
          )
        `)
        .eq('user_id', user.id)

      const { data: ownedClassrooms } = await supabase
        .from('classrooms')
        .select('id, title')
        .eq('created_by', user.id)

      // Combine and deduplicate classrooms
      const classroomMap = new Map<string, { id: string; title: string }>()

      studentClassrooms?.forEach((sc: any) => {
        if (sc.classrooms) {
          classroomMap.set(sc.classrooms.id, {
            id: sc.classrooms.id,
            title: sc.classrooms.title
          })
        }
      })

      ownedClassrooms?.forEach((c: any) => {
        classroomMap.set(c.id, { id: c.id, title: c.title })
      })

      // Fetch counts for each classroom
      const classroomIds = Array.from(classroomMap.keys())
      const classroomsWithCounts: ClassroomData[] = []

      for (const id of classroomIds) {
        const classroom = classroomMap.get(id)!

        const { count: studentCount } = await supabase
          .from('classroom_students')
          .select('*', { count: 'exact', head: true })
          .eq('classroom_id', id)

        const { count: assignmentCount } = await supabase
          .from('assignments')
          .select('*', { count: 'exact', head: true })
          .eq('classroom_id', id)

        classroomsWithCounts.push({
          ...classroom,
          student_count: studentCount || 0,
          assignment_count: assignmentCount || 0
        })
      }

      setMyClassrooms(classroomsWithCounts.slice(0, 6))

      // Fetch all assignments from joined classrooms
      const { data: allAssignments } = await supabase
        .from('assignments')
        .select(`
          id,
          title,
          instrument,
          bpm,
          beats,
          lesson_type,
          classroom_id,
          classrooms (
            title
          )
        `)
        .in('classroom_id', classroomIds)

      // Fetch user's completions
      const { data: completions } = await supabase
        .from('assignment_completions')
        .select('assignment_id')
        .eq('user_id', user.id)

      const completedIds = new Set(completions?.map((c: any) => c.assignment_id) || [])

      // Filter to get pending assignments
      const pending = allAssignments
        ?.filter((a: any) => !completedIds.has(a.id))
        .map((a: any) => ({
          id: a.id,
          title: a.title,
          classroom_title: a.classrooms?.title || 'Unknown',
          classroom_id: a.classroom_id,
          instrument: a.instrument,
          bpm: a.bpm,
          beats: a.beats,
          lesson_type: a.lesson_type
        }))
        .slice(0, 5) || []

      setPendingAssignments(pending)

      // Fetch recent activity (completions and class joins)
      const activities: ActivityItem[] = []

      // Recent completions
      const { data: recentCompletions } = await supabase
        .from('assignment_completions')
        .select(`
          id,
          completed_at,
          assignments (
            title,
            classrooms (
              title
            )
          )
        `)
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false })
        .limit(5)

      recentCompletions?.forEach((rc: any) => {
        if (rc.assignments) {
          activities.push({
            id: `completion-${rc.id}`,
            type: 'completion',
            title: rc.assignments.title,
            subtitle: rc.assignments.classrooms?.title || 'Unknown',
            timestamp: rc.completed_at
          })
        }
      })

      // Recent class joins
      const { data: recentJoins } = await supabase
        .from('classroom_students')
        .select(`
          id,
          joined_at,
          classrooms (
            title
          )
        `)
        .eq('user_id', user.id)
        .order('joined_at', { ascending: false })
        .limit(5)

      recentJoins?.forEach((rj: any) => {
        if (rj.classrooms) {
          activities.push({
            id: `join-${rj.id}`,
            type: 'class_join',
            title: rj.classrooms.title,
            subtitle: t('dashboard.joinedClass'),
            timestamp: rj.joined_at
          })
        }
      })

      // Sort by timestamp and limit
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      setRecentActivity(activities.slice(0, 5))

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [user, t])

  useEffect(() => {
    if (user && !loading) {
      fetchDashboardData()
    }
  }, [user, loading, fetchDashboardData])

  // Handle starting an assignment
  const handleStartAssignment = (assignment: PendingAssignment) => {
    // Set instrument and settings
    setInstrument(assignment.instrument as 'keyboard' | 'guitar' | 'bass')
    setBpm(assignment.bpm)
    setNumberOfBeats(assignment.beats)

    // Navigate to classroom (where assignment can be fully started)
    navigateToClassroom()
  }

  // Handle clicking a classroom card
  const handleClassroomClick = () => {
    navigateToClassroom()
  }

  // Format relative time
  const formatRelativeTime = (timestamp: string): string => {
    const now = new Date()
    const date = new Date(timestamp)
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  // Get instrument tag class
  const getInstrumentTagClass = (instrument: string): string => {
    switch (instrument) {
      case 'keyboard':
        return styles.instrumentKeyboard
      case 'guitar':
        return styles.instrumentGuitar
      case 'bass':
        return styles.instrumentBass
      default:
        return ''
    }
  }

  if (loading || isLoading) {
    return (
      <div className={styles.dashboardContainer}>
        <div className={styles.backgroundEffects}>
          <div className={styles.gradientOrb1} />
          <div className={styles.gradientOrb2} />
          <div className={styles.gradientOrb3} />
        </div>
        <div className={styles.loadingState}>
          <div className={styles.loadingSpinner} />
          {t('common.loading')}
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className={styles.dashboardContainer}>
        <div className={styles.backgroundEffects}>
          <div className={styles.gradientOrb1} />
          <div className={styles.gradientOrb2} />
          <div className={styles.gradientOrb3} />
        </div>
        <div className={styles.loadingState}>{t('profile.loginRequired')}</div>
      </div>
    )
  }

  return (
    <div className={styles.dashboardContainer}>
      {/* Animated Background */}
      <div className={styles.backgroundEffects}>
        <div className={styles.gradientOrb1} />
        <div className={styles.gradientOrb2} />
        <div className={styles.gradientOrb3} />
      </div>

      {/* Main Content */}
      <div className={styles.mainContent}>
        {/* Welcome Banner */}
        <section className={styles.welcomeBanner}>
          <div className={styles.welcomeContent}>
            <div className={styles.welcomeText}>
              <div className={styles.welcomeBadge}>
                <PiSparkle />
                {t('dashboard.title')}
              </div>
              <h1>{t('dashboard.welcome')}, {username || 'User'}!</h1>
              <p>Ready to continue your musical journey?</p>
            </div>
            <div className={styles.quickActions}>
              <button className={styles.actionButton} onClick={navigateToSandbox}>
                <PiPlayFill />
                {t('dashboard.goToSandbox')}
              </button>
              <button className={styles.actionButtonSecondary} onClick={navigateToClassroom}>
                <PiMagnifyingGlassFill />
                {t('dashboard.browseClasses')}
              </button>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className={styles.statsSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionIcon}><PiChartBarFill /></span>
              {t('dashboard.quickStats')}
            </h2>
          </div>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={`${styles.statCardIcon} ${styles.purple}`}>
                <PiTrophyFill />
              </div>
              <p className={styles.statValue}>{completedCount}</p>
              <p className={styles.statLabel}>{t('dashboard.assignmentsCompleted')}</p>
            </div>
            <div className={styles.statCard}>
              <div className={`${styles.statCardIcon} ${styles.blue}`}>
                <PiBookOpenFill />
              </div>
              <p className={styles.statValue}>{classesJoinedCount}</p>
              <p className={styles.statLabel}>{t('dashboard.classesJoined')}</p>
            </div>
            <div className={styles.statCard}>
              <div className={`${styles.statCardIcon} ${styles.green}`}>
                <PiCrownFill />
              </div>
              <p className={styles.statValue}>{classesOwnedCount}</p>
              <p className={styles.statLabel}>{t('dashboard.classesOwned')}</p>
            </div>
          </div>
        </section>

        {/* My Classrooms Section */}
        <section className={styles.classroomsSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionIcon}><PiBookOpenFill /></span>
              {t('dashboard.myClassrooms')}
            </h2>
            {myClassrooms.length > 0 && (
              <button className={styles.viewAllButton} onClick={navigateToClassroom}>
                {t('dashboard.viewAll')}
                <PiArrowRightBold />
              </button>
            )}
          </div>
          {myClassrooms.length > 0 ? (
            <div className={styles.classroomsGrid}>
              {myClassrooms.map((classroom) => (
                <div
                  key={classroom.id}
                  className={styles.classroomCard}
                  onClick={handleClassroomClick}
                >
                  <h3 className={styles.classroomTitle}>{classroom.title}</h3>
                  <div className={styles.classroomMeta}>
                    <span className={styles.metaItem}>
                      <PiUsersFill />
                      {classroom.student_count} {t('dashboard.students')}
                    </span>
                    <span className={styles.metaItem}>
                      <PiMusicNotesFill />
                      {classroom.assignment_count} {t('dashboard.assignments')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <div className={styles.emptyStateIcon}>
                <PiBookOpenFill />
              </div>
              <p className={styles.emptyText}>{t('dashboard.noClassrooms')}</p>
              <button className={styles.actionButtonSecondary} onClick={navigateToClassroom}>
                <PiMagnifyingGlassFill />
                {t('dashboard.browseClasses')}
              </button>
            </div>
          )}
        </section>

        {/* Two Column Layout for Assignments and Activity */}
        <div className={styles.twoColumnLayout}>
          {/* Pending Assignments Section */}
          <section className={styles.assignmentsSection}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>
                <span className={styles.sectionIcon}><PiClockFill /></span>
                {t('dashboard.pendingAssignments')}
              </h2>
            </div>
            {pendingAssignments.length > 0 ? (
              <div className={styles.assignmentsList}>
                {pendingAssignments.map((assignment) => (
                  <div key={assignment.id} className={styles.assignmentItem}>
                    <div className={styles.assignmentInfo}>
                      <p className={styles.assignmentTitle}>{assignment.title}</p>
                      <p className={styles.assignmentMeta}>
                        {assignment.classroom_title}
                        <span className={`${styles.instrumentTag} ${getInstrumentTagClass(assignment.instrument)}`}>
                          {assignment.instrument}
                        </span>
                      </p>
                    </div>
                    <button
                      className={styles.startButton}
                      onClick={() => handleStartAssignment(assignment)}
                    >
                      <PiPlayFill />
                      {t('dashboard.start')}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <div className={styles.emptyStateIcon}>
                  <PiCheckCircleFill />
                </div>
                <p className={styles.emptyText}>{t('dashboard.noPendingAssignments')}</p>
              </div>
            )}
          </section>

          {/* Recent Activity Section */}
          <section className={styles.activitySection}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>
                <span className={styles.sectionIcon}><PiClockFill /></span>
                {t('dashboard.recentActivity')}
              </h2>
            </div>
            {recentActivity.length > 0 ? (
              <div className={styles.activityList}>
                {recentActivity.map((activity) => (
                  <div key={activity.id} className={styles.activityItem}>
                    <div className={`${styles.activityIcon} ${activity.type === 'completion' ? styles.completion : styles.classJoin}`}>
                      {activity.type === 'completion' ? <PiCheckCircleFill /> : <PiUsersFill />}
                    </div>
                    <div className={styles.activityContent}>
                      <p className={styles.activityTitle}>
                        {activity.type === 'completion' ? t('dashboard.completedAssignment') : t('dashboard.joinedClass')}: {activity.title}
                      </p>
                      <p className={styles.activityMeta}>
                        {activity.type === 'completion' && `${activity.subtitle} · `}
                        {formatRelativeTime(activity.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <div className={styles.emptyStateIcon}>
                  <PiClockFill />
                </div>
                <p className={styles.emptyText}>{t('dashboard.noRecentActivity')}</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

export default Dashboard

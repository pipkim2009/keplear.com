/**
 * Dashboard Page - Personalized landing page for logged-in users
 * Shows practice stats, classrooms, pending assignments, and recent activity
 */

import { useState, useEffect, useContext, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import AuthContext from '../../contexts/AuthContext'
import { useTranslation } from '../../contexts/TranslationContext'
import { useNavigation } from '../../hooks/useInstrumentSelectors'
import { useInstrument } from '../../contexts/InstrumentContext'
import { getPracticeStats, getRecentSessions, setCurrentUserId, type PracticeSession, type PracticeStats } from '../../utils/practiceTracker'
import {
  PiPlayFill,
  PiCheckCircleFill,
  PiUsersFill,
  PiChartBarFill,
  PiBookOpenFill,
  PiArrowRightBold,
  PiSparkle,
  PiMusicNotesFill,
  PiMusicNoteFill,
  PiPianoKeysFill,
  PiGuitarFill,
  PiUserCircleFill
} from 'react-icons/pi'
import styles from '../../styles/Dashboard.module.css'
import classroomStyles from '../../styles/Classroom.module.css'

interface ClassroomData {
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
  type: 'completion' | 'class_join' | 'sandbox'
  title: string
  subtitle: string
  timestamp: string
  count?: number
  instrument?: string
}

function Dashboard() {
  const authContext = useContext(AuthContext)
  const user = authContext?.user
  const loading = authContext?.loading

  const { t } = useTranslation()
  const { navigateToSandbox, navigateToClassroom, navigateToProfile } = useNavigation()
  const { setInstrument, setBpm, setNumberOfBeats } = useInstrument()

  // State
  const [username, setUsername] = useState<string>('')
  const [practiceStats, setPracticeStats] = useState<PracticeStats | null>(null)
  const [completedAssignmentsCount, setCompletedAssignmentsCount] = useState<number>(0)
  const [myClassrooms, setMyClassrooms] = useState<ClassroomData[]>([])
  const [pendingAssignments, setPendingAssignments] = useState<PendingAssignment[]>([])
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    if (!user) return

    setIsLoading(true)

    try {
      // Set user ID for user-specific practice data
      setCurrentUserId(user.id)

      // Get practice stats from localStorage
      const stats = getPracticeStats()
      setPracticeStats(stats)

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
      const { count: completedCount } = await supabase
        .from('assignment_completions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

      setCompletedAssignmentsCount(completedCount || 0)

      // Fetch my classrooms (joined or owned)
      const { data: studentClassrooms } = await supabase
        .from('classroom_students')
        .select(`
          classroom_id,
          classrooms (
            id,
            title,
            description,
            is_public,
            created_by,
            profiles (username)
          )
        `)
        .eq('user_id', user.id)

      const { data: ownedClassrooms } = await supabase
        .from('classrooms')
        .select(`
          id,
          title,
          description,
          is_public,
          created_by,
          profiles (username)
        `)
        .eq('created_by', user.id)

      // Combine and deduplicate classrooms
      const classroomMap = new Map<string, ClassroomData>()

      studentClassrooms?.forEach((sc: any) => {
        if (sc.classrooms) {
          classroomMap.set(sc.classrooms.id, {
            id: sc.classrooms.id,
            title: sc.classrooms.title,
            description: sc.classrooms.description || undefined,
            is_public: sc.classrooms.is_public,
            created_by: sc.classrooms.created_by,
            owner_username: sc.classrooms.profiles?.username || undefined,
            student_count: 0,
            assignment_count: 0
          })
        }
      })

      ownedClassrooms?.forEach((c: any) => {
        classroomMap.set(c.id, {
          id: c.id,
          title: c.title,
          description: c.description || undefined,
          is_public: c.is_public,
          created_by: c.created_by,
          owner_username: c.profiles?.username || undefined,
          student_count: 0,
          assignment_count: 0
        })
      })

      // Fetch counts for each classroom
      const classroomIds = Array.from(classroomMap.keys())

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

        classroom.student_count = studentCount || 0
        classroom.assignment_count = assignmentCount || 0
      }

      setMyClassrooms(Array.from(classroomMap.values()).slice(0, 6))

      // Fetch pending assignments
      if (classroomIds.length > 0) {
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
            classrooms (title)
          `)
          .in('classroom_id', classroomIds)

        const { data: completions } = await supabase
          .from('assignment_completions')
          .select('assignment_id')
          .eq('user_id', user.id)

        const completedIds = new Set(completions?.map((c: any) => c.assignment_id) || [])

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
      }

      // Build recent activity from sandbox sessions and classroom completions
      const activities: ActivityItem[] = []

      // Get recent sandbox sessions
      const recentSessions = getRecentSessions(10)
      recentSessions.forEach((session: PracticeSession) => {
        activities.push({
          id: session.id,
          type: 'sandbox',
          title: `Completed ${session.melodiesCompleted} ${session.melodiesCompleted === 1 ? 'melody' : 'melodies'}`,
          subtitle: `${session.instrument} in Sandbox`,
          timestamp: session.timestamp,
          count: session.melodiesCompleted,
          instrument: session.instrument
        })
      })

      // Get recent classroom completions
      const { data: recentCompletions } = await supabase
        .from('assignment_completions')
        .select(`
          id,
          completed_at,
          assignments (
            title,
            instrument,
            classrooms (title)
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
            timestamp: rc.completed_at,
            instrument: rc.assignments.instrument
          })
        }
      })

      // Sort by timestamp and limit
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      setRecentActivity(activities.slice(0, 8))

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (user && !loading) {
      fetchDashboardData()
    }
  }, [user, loading, fetchDashboardData])

  // Handle starting an assignment
  const handleStartAssignment = (assignment: PendingAssignment) => {
    setInstrument(assignment.instrument as 'keyboard' | 'guitar' | 'bass')
    setBpm(assignment.bpm)
    setNumberOfBeats(assignment.beats)
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

  // Get instrument icon
  const getInstrumentIcon = (instrument: string) => {
    switch (instrument) {
      case 'keyboard':
        return <PiPianoKeysFill />
      case 'guitar':
      case 'bass':
        return <PiGuitarFill />
      default:
        return <PiMusicNoteFill />
    }
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

  // Get max value for chart scaling
  const getMaxChartValue = () => {
    if (!practiceStats) return 10
    const max = Math.max(
      ...practiceStats.weeklyData.map(d => d.sandbox + d.classroom),
      1
    )
    return Math.ceil(max / 5) * 5 || 10 // Round up to nearest 5
  }

  // Format day name
  const formatDayName = (dateStr: string): string => {
    const date = new Date(dateStr + 'T00:00:00') // Ensure consistent parsing
    return date.toLocaleDateString('en', { weekday: 'short' })
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

  const maxChartValue = getMaxChartValue()

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
              <button className={styles.profileLink} onClick={() => navigateToProfile()}>
                <PiUserCircleFill className={styles.profileIcon} />
                <span>{username || 'Profile'}</span>
              </button>
            </div>
            <div className={styles.quickActions}>
              <button className={styles.actionButton} onClick={navigateToSandbox}>
                <PiPlayFill />
                {t('dashboard.goToSandbox')}
              </button>
              <button className={styles.actionButtonSecondary} onClick={navigateToClassroom}>
                <PiBookOpenFill />
                Go to Classroom
              </button>
            </div>
          </div>
        </section>

        {/* Stats Chart Section */}
        <section className={styles.statsSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionIcon}><PiChartBarFill /></span>
              My Activity
            </h2>
          </div>

          {/* Summary Stats Row */}
          <div className={styles.statsSummaryTwo}>
            <div className={styles.summaryCard}>
              <div className={`${styles.summaryIcon} ${styles.purple}`}>
                <PiMusicNotesFill />
              </div>
              <div className={styles.summaryContent}>
                <span className={styles.summaryValue}>{practiceStats?.totalMelodies || 0}</span>
                <span className={styles.summaryLabel}>Total Melodies</span>
              </div>
            </div>
            <div className={styles.summaryCard}>
              <div className={`${styles.summaryIcon} ${styles.green}`}>
                <PiCheckCircleFill />
              </div>
              <div className={styles.summaryContent}>
                <span className={styles.summaryValue}>{completedAssignmentsCount}</span>
                <span className={styles.summaryLabel}>Completed Assignments</span>
              </div>
            </div>
          </div>

          {/* Chart and Activity Row */}
          <div className={styles.chartActivityRow}>
          {/* Line Chart */}
          <div className={styles.chartContainer}>
                        <div className={styles.chartInner}>
              <div className={styles.yAxisWrapper}>
                <span className={styles.yAxisLabel}>Melodies</span>
                <div className={styles.chartYAxis}>
                  <span>{maxChartValue}</span>
                  <span>{Math.round(maxChartValue / 2)}</span>
                  <span>0</span>
                </div>
              </div>
              <div className={styles.chartArea}>
                {/* Grid lines */}
                <div className={styles.chartGrid}>
                  <div className={styles.gridLine} />
                  <div className={styles.gridLine} />
                  <div className={styles.gridLine} />
                </div>

                {/* Bar Chart */}
                {practiceStats && practiceStats.weeklyData.length > 0 && (
                  <div className={styles.barChartContainer}>
                    {practiceStats.weeklyData.map((d, i) => {
                      const total = d.sandbox + d.classroom
                      const heightPercent = (total / maxChartValue) * 100
                      return (
                        <div key={i} className={styles.barWrapper}>
                          <div
                            className={styles.bar}
                            style={{ height: `${heightPercent}%` }}
                            title={`${total} melodies`}
                          />
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
            {/* X-axis labels */}
            <div className={styles.chartXAxis}>
              {practiceStats?.weeklyData.map((day) => (
                <span key={day.date} className={styles.chartLabel}>{formatDayName(day.date)}</span>
              ))}
            </div>
            <span className={styles.xAxisLabel}>Day</span>
          </div>

          {/* Recent Activity - beside chart */}
          <div className={styles.activitySide}>
            {recentActivity.length > 0 ? (
              <div className={styles.activityList}>
                {(() => {
                  const grouped: { [key: string]: typeof recentActivity } = {}
                  recentActivity.slice(0, 8).forEach((activity) => {
                    const dateKey = activity.timestamp.split('T')[0]
                    if (!grouped[dateKey]) grouped[dateKey] = []
                    grouped[dateKey].push(activity)
                  })

                  return Object.entries(grouped).map(([dateKey, activities]) => (
                    <div key={dateKey} className={styles.activityDayGroup}>
                      <span className={styles.activityDayHeader}>{formatDayName(dateKey)}</span>
                      {activities.map((activity) => (
                        <div key={activity.id} className={styles.activityItem}>
                          <div className={`${styles.activityIcon} ${activity.type === 'sandbox' ? styles.sandbox : activity.type === 'completion' ? styles.completion : styles.classJoin}`}>
                            {activity.type === 'sandbox' ? (
                              getInstrumentIcon(activity.instrument || 'keyboard')
                            ) : activity.type === 'completion' ? (
                              <PiCheckCircleFill />
                            ) : (
                              <PiUsersFill />
                            )}
                          </div>
                          <div className={styles.activityContent}>
                            <p className={styles.activityTitle}>{activity.title}</p>
                            <p className={styles.activityMeta}>{activity.subtitle}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))
                })()}
              </div>
            ) : (
              <p className={styles.emptyActivityText}>No recent activity</p>
            )}
          </div>
          </div>
        </section>

        {/* Classes Section */}
        <section className={styles.classesSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionIcon}><PiBookOpenFill /></span>
              Classroom
              <button className={styles.viewAllButtonInline} onClick={navigateToClassroom}>
                {t('dashboard.viewAll')}
                <PiArrowRightBold />
              </button>
            </h2>
          </div>

          {/* Classrooms with Pending Assignments */}
          <div className={styles.classroomsSection}>
            {myClassrooms.length > 0 ? (
              <div className={classroomStyles.classesGrid}>
                {myClassrooms.map((classroom) => {
                  const isOwner = user && classroom.created_by === user.id
                  const classroomPendingAssignments = pendingAssignments.filter(
                    a => a.classroom_id === classroom.id
                  )
                  return (
                    <div
                      key={classroom.id}
                      className={classroomStyles.classCardClickable}
                      onClick={handleClassroomClick}
                    >
                      <div className={classroomStyles.classTitleRow}>
                        <h3 className={classroomStyles.classTitle}>{classroom.title}</h3>
                        <div className={classroomStyles.tagGroup}>
                          {isOwner ? (
                            <span className={classroomStyles.ownerTag}>{t('classroom.owner')}</span>
                          ) : (
                            <span className={classroomStyles.studentTag}>{t('classroom.student')}</span>
                          )}
                          {classroom.is_public ? (
                            <span className={classroomStyles.publicTag}>{t('classroom.public')}</span>
                          ) : (
                            <span className={classroomStyles.privateTag}>{t('classroom.private')}</span>
                          )}
                        </div>
                      </div>
                      {classroom.owner_username && (
                        <p className={classroomStyles.classAuthor}>{t('classroom.by')} {classroom.owner_username}</p>
                      )}
                      {classroom.description && (
                        <p className={classroomStyles.classDescription}>{classroom.description}</p>
                      )}
                      {classroomPendingAssignments.length > 0 && (
                        <div className={styles.classroomAssignments}>
                          <span className={styles.pendingLabel}>
                            {classroomPendingAssignments.length} pending
                          </span>
                          <div className={styles.assignmentChips}>
                            {classroomPendingAssignments.slice(0, 2).map((assignment) => (
                              <button
                                key={assignment.id}
                                className={styles.assignmentChip}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleStartAssignment(assignment)
                                }}
                              >
                                <PiPlayFill />
                                {assignment.title}
                              </button>
                            ))}
                            {classroomPendingAssignments.length > 2 && (
                              <span className={styles.moreAssignments}>
                                +{classroomPendingAssignments.length - 2} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className={styles.noClassesMessage}>
                <p>You haven't joined any classes yet</p>
                <button className={styles.browseClassesButton} onClick={navigateToClassroom}>
                  <PiBookOpenFill />
                  Browse Classes
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

export default Dashboard

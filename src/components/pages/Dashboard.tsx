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
import { fetchRecentPracticeSessions, fetchPracticeStats, type PracticeSession, type PracticeStats, type TimeRange } from '../../hooks/usePracticeSessions'
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
  PiUserCircleFill
} from 'react-icons/pi'
import { GiGuitarHead, GiGuitarBassHead } from 'react-icons/gi'
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
  const [timeRange, setTimeRange] = useState<TimeRange>('week')
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
      // Get practice stats from Supabase
      const stats = await fetchPracticeStats(user.id, timeRange)
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

      // Get recent sandbox sessions from Supabase and merge by day + instrument
      const recentSessions = await fetchRecentPracticeSessions(user.id, 50)
      const sandboxByDayInstrument = new Map<string, { count: number, timestamp: string, instrument: string }>()

      recentSessions.forEach((session: PracticeSession) => {
        if (session.type === 'sandbox') {
          const day = session.created_at.split('T')[0]
          const key = `${day}-${session.instrument}`
          const existing = sandboxByDayInstrument.get(key)
          if (existing) {
            existing.count += session.melodies_completed
            // Keep the most recent timestamp
            if (session.created_at > existing.timestamp) {
              existing.timestamp = session.created_at
            }
          } else {
            sandboxByDayInstrument.set(key, {
              count: session.melodies_completed,
              timestamp: session.created_at,
              instrument: session.instrument
            })
          }
        }
      })

      // Convert merged sandbox sessions to activities
      sandboxByDayInstrument.forEach((data, key) => {
        activities.push({
          id: `sandbox-${key}`,
          type: 'sandbox',
          title: `Completed ${data.count} ${data.count === 1 ? 'melody' : 'melodies'}`,
          subtitle: `${data.instrument} in Sandbox`,
          timestamp: data.timestamp,
          count: data.count,
          instrument: data.instrument
        })
      })

      // Get recent classroom completions and merge by day + assignment
      const { data: recentCompletions } = await supabase
        .from('assignment_completions')
        .select(`
          id,
          completed_at,
          assignments (
            id,
            title,
            instrument,
            classrooms (title)
          )
        `)
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false })
        .limit(20)

      const classroomByDayAssignment = new Map<string, { count: number, timestamp: string, title: string, classroom: string, instrument: string }>()

      recentCompletions?.forEach((rc: any) => {
        if (rc.assignments) {
          const day = rc.completed_at.split('T')[0]
          const key = `${day}-${rc.assignments.id}`
          const existing = classroomByDayAssignment.get(key)
          if (existing) {
            existing.count += 1
            if (rc.completed_at > existing.timestamp) {
              existing.timestamp = rc.completed_at
            }
          } else {
            classroomByDayAssignment.set(key, {
              count: 1,
              timestamp: rc.completed_at,
              title: rc.assignments.title,
              classroom: rc.assignments.classrooms?.title || 'Unknown',
              instrument: rc.assignments.instrument
            })
          }
        }
      })

      // Convert merged classroom sessions to activities
      classroomByDayAssignment.forEach((data, key) => {
        activities.push({
          id: `completion-${key}`,
          type: 'completion',
          title: `Completed ${data.count} ${data.count === 1 ? 'melody' : 'melodies'} in ${data.title}`,
          subtitle: data.classroom,
          timestamp: data.timestamp,
          count: data.count,
          instrument: data.instrument
        })
      })

      // Sort by timestamp and limit
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      setRecentActivity(activities.slice(0, 8))

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [user, timeRange])

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
        return <GiGuitarHead />
      case 'bass':
        return <GiGuitarBassHead />
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
      ...practiceStats.weeklyData.map(d => d.keyboard + d.guitar + d.bass + d.classroom),
      1
    )
    // Round up to nearest even number for clean middle label
    const rounded = Math.ceil(max / 2) * 2
    return rounded || 10
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
            <div className={styles.chartHeader}>
              <select
                className={styles.timeRangeSelect}
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as TimeRange)}
              >
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="year">This Year</option>
                <option value="all">All Time</option>
              </select>
            </div>
            <div className={styles.chartInner}>
              <div className={styles.yAxisWrapper}>
                <span className={styles.yAxisLabel}>Melodies</span>
                <div className={styles.chartYAxis}>
                  <span>{maxChartValue}</span>
                  <span>{maxChartValue / 2}</span>
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
                  <div className={`${styles.barChartContainer} ${timeRange === 'month' ? styles.barChartMonth : ''}`}>
                    {practiceStats.weeklyData.map((d, i) => {
                      const total = d.keyboard + d.guitar + d.bass + d.classroom
                      const heightPercent = (total / maxChartValue) * 100
                      // Calculate individual segment heights as percentage of total bar
                      const keyboardPct = total > 0 ? (d.keyboard / total) * 100 : 0
                      const guitarPct = total > 0 ? (d.guitar / total) * 100 : 0
                      const bassPct = total > 0 ? (d.bass / total) * 100 : 0
                      const classroomPct = total > 0 ? (d.classroom / total) * 100 : 0
                      return (
                        <div key={i} className={styles.barWrapper}>
                          <div
                            className={styles.barStack}
                            style={{ height: `${heightPercent}%` }}
                            title={`${d.label}: ${total} melodies`}
                          >
                            {d.classroom > 0 && (
                              <div className={`${styles.barSegment} ${styles.barClassroom}`} style={{ height: `${classroomPct}%` }} />
                            )}
                            {d.bass > 0 && (
                              <div className={`${styles.barSegment} ${styles.barBass}`} style={{ height: `${bassPct}%` }} />
                            )}
                            {d.guitar > 0 && (
                              <div className={`${styles.barSegment} ${styles.barGuitar}`} style={{ height: `${guitarPct}%` }} />
                            )}
                            {d.keyboard > 0 && (
                              <div className={`${styles.barSegment} ${styles.barKeyboard}`} style={{ height: `${keyboardPct}%` }} />
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
            {/* X-axis labels */}
            <div className={`${styles.chartXAxis} ${timeRange === 'month' ? styles.chartXAxisMonth : ''}`}>
              {practiceStats?.weeklyData.map((day) => {
                const todayStr = new Date().toISOString().split('T')[0]
                const isCurrent = (timeRange === 'week' && day.date === todayStr) ||
                  (timeRange === 'month' && day.date === todayStr) ||
                  ((timeRange === 'year' || timeRange === 'all') && day.date === todayStr.substring(0, 7))
                return (
                  <div key={day.date} className={styles.chartLabelContainer}>
                    <span className={`${styles.chartLabel} ${isCurrent ? styles.chartLabelCurrent : ''}`}>{day.label}</span>
                  </div>
                )
              })}
            </div>
            <div className={styles.chartFooter}>
              <span className={styles.xAxisLabel}>
                {timeRange === 'week' ? 'Day' : timeRange === 'month' ? 'Date' : 'Month'}
              </span>
              <div className={styles.chartLegend}>
                <div className={styles.legendItem}>
                  <span className={`${styles.legendDot} ${styles.legendKeyboard}`} />
                  <span className={styles.legendLabel}>Keyboard</span>
                </div>
                <div className={styles.legendItem}>
                  <span className={`${styles.legendDot} ${styles.legendGuitar}`} />
                  <span className={styles.legendLabel}>Guitar</span>
                </div>
                <div className={styles.legendItem}>
                  <span className={`${styles.legendDot} ${styles.legendBass}`} />
                  <span className={styles.legendLabel}>Bass</span>
                </div>
                <div className={styles.legendItem}>
                  <span className={`${styles.legendDot} ${styles.legendClassroom}`} />
                  <span className={styles.legendLabel}>Classroom</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity - beside chart */}
          <div className={styles.activitySide}>
            {(() => {
              // Get the date range from the graph
              const startDate = practiceStats?.dateRange?.start || ''
              const endDate = practiceStats?.dateRange?.end || ''

              // Filter activities to only those within the graph's date range
              const filteredActivity = recentActivity.filter((activity) => {
                const dateKey = activity.timestamp.split('T')[0]
                return dateKey >= startDate && dateKey <= endDate
              })

              if (filteredActivity.length === 0) {
                const periodText = timeRange === 'week' ? 'this week' : timeRange === 'month' ? 'this month' : timeRange === 'year' ? 'this year' : 'yet'
                return <p className={styles.emptyActivityText}>No activity {periodText}</p>
              }

              const grouped: { [key: string]: typeof recentActivity } = {}
              filteredActivity.slice(0, 8).forEach((activity) => {
                const dateKey = activity.timestamp.split('T')[0]
                if (!grouped[dateKey]) grouped[dateKey] = []
                grouped[dateKey].push(activity)
              })

              const formatActivityDate = (dateStr: string) => {
                const date = new Date(dateStr + 'T00:00:00')
                if (timeRange === 'week') {
                  return date.toLocaleDateString('en', { weekday: 'short' })
                } else if (timeRange === 'month') {
                  return date.toLocaleDateString('en', { weekday: 'short', day: 'numeric' })
                } else {
                  return date.toLocaleDateString('en', { month: 'short', day: 'numeric' })
                }
              }

              return (
                <div className={styles.activityList}>
                  {Object.entries(grouped).map(([dateKey, activities]) => (
                    <div key={dateKey} className={styles.activityDayGroup}>
                      <span className={styles.activityDayHeader}>{formatActivityDate(dateKey)}</span>
                      {activities.map((activity) => (
                        <div key={activity.id} className={styles.activityItem}>
                          <div className={`${styles.activityIcon} ${activity.type === 'sandbox' ? getInstrumentTagClass(activity.instrument || 'keyboard') : activity.type === 'completion' ? styles.completion : styles.classJoin}`}>
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
                  ))}
                </div>
              )
            })()}
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

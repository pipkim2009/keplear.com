/**
 * Dashboard Page - Personalized landing page for logged-in users
 * Shows practice stats, classrooms, pending assignments, and recent activity
 */

import { useState, useEffect, useContext } from 'react'
import { AuthContext } from '../../contexts/AuthContext'
import { useTranslation } from '../../contexts/TranslationContext'
import { useNavigation } from '../../hooks/useInstrumentSelectors'
import SEOHead from '../common/SEOHead'
import { useInstrument } from '../../contexts/InstrumentContext'
import { useDashboardData, type PendingAssignment } from '../../hooks/useDashboardData'
import type { TimeRange } from '../../hooks/usePracticeSessions'
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
  PiUserCircleFill,
} from 'react-icons/pi'
import { GiGuitarHead, GiGuitarBassHead } from 'react-icons/gi'
import styles from '../../styles/Dashboard.module.css'
import classroomStyles from '../../styles/Classroom.module.css'
import TutorialOverlay from '../onboarding/TutorialOverlay'
import { useTutorial } from '../../hooks/useTutorial'

function Dashboard() {
  const authContext = useContext(AuthContext)
  const user = authContext?.user
  const loading = authContext?.loading

  const { t } = useTranslation()
  const { navigateToGenerator, navigateToClassroom, navigateToProfile } = useNavigation()
  const { setInstrument, setBpm, setNumberOfBeats } = useInstrument()

  // Tutorial
  const {
    isActive: isTutorialActive,
    currentStep: tutorialStep,
    nextStep: tutorialNextStep,
    prevStep: tutorialPrevStep,
    skipTutorial,
    completeTutorial,
    shouldShowTutorial,
    startTutorial,
  } = useTutorial()

  // State
  const [timeRange, setTimeRange] = useState<TimeRange>('week')

  // Fetch all dashboard data via custom hook
  const {
    username,
    practiceStats,
    completedAssignmentsCount,
    myClassrooms,
    pendingAssignments,
    recentActivity,
    isLoading,
    fetchData,
  } = useDashboardData(user?.id, timeRange)

  useEffect(() => {
    if (user && !loading) {
      fetchData()
    }
  }, [user, loading, fetchData])

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
    const max = Math.max(...practiceStats.weeklyData.map(d => d.keyboard + d.guitar + d.bass), 1)
    // Round up to nearest even number for clean middle label
    const rounded = Math.ceil(max / 2) * 2
    return rounded || 10
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
      <SEOHead
        title="Dashboard"
        description="Track your music practice progress, view assignments, and manage classrooms."
        path="/dashboard"
      />
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
              <h1>
                {t('dashboard.welcome')}, {username || 'User'}!
              </h1>
              <button className={styles.profileLink} onClick={() => navigateToProfile()}>
                <PiUserCircleFill className={styles.profileIcon} />
                <span>{username || 'Profile'}</span>
              </button>
            </div>
            <div className={styles.quickActions}>
              <button className={styles.actionButton} onClick={navigateToGenerator}>
                <PiPlayFill />
                {t('dashboard.goToGenerator')}
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
              <span className={styles.sectionIcon}>
                <PiChartBarFill />
              </span>
              My Activity
            </h2>
          </div>

          {/* Unified Activity Container */}
          <div className={styles.activityContainer}>
            {/* Stats Row at top */}
            <div className={styles.activityStatsRow}>
              <div className={styles.activityStat}>
                <div className={`${styles.activityStatIcon} ${styles.purple}`}>
                  <PiMusicNotesFill />
                </div>
                <span className={styles.activityStatValue}>
                  {practiceStats?.weeklyData.reduce(
                    (sum, d) => sum + d.keyboard + d.guitar + d.bass,
                    0
                  ) || 0}
                </span>
                <span className={styles.activityStatLabel}>Melodies</span>
              </div>
              <div className={styles.activityStat}>
                <div className={`${styles.activityStatIcon} ${styles.green}`}>
                  <PiCheckCircleFill />
                </div>
                <span className={styles.activityStatValue}>{completedAssignmentsCount}</span>
                <span className={styles.activityStatLabel}>Assignments</span>
              </div>
              <div className={styles.activityStatSpacer} />
              <select
                className={styles.timeRangeSelect}
                value={timeRange}
                onChange={e => setTimeRange(e.target.value as TimeRange)}
              >
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="year">This Year</option>
                <option value="all">All Time</option>
              </select>
            </div>

            {/* Chart and Activity Row */}
            <div className={styles.chartActivityRow}>
              {/* Chart */}
              <div className={styles.chartContainer}>
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
                      <div
                        className={`${styles.barChartContainer} ${timeRange === 'month' ? styles.barChartMonth : ''}`}
                      >
                        {practiceStats.weeklyData.map((d, i) => {
                          const total = d.keyboard + d.guitar + d.bass
                          const heightPercent = (total / maxChartValue) * 100
                          // Calculate individual segment heights as percentage of total bar
                          const keyboardPct = total > 0 ? (d.keyboard / total) * 100 : 0
                          const guitarPct = total > 0 ? (d.guitar / total) * 100 : 0
                          const bassPct = total > 0 ? (d.bass / total) * 100 : 0
                          return (
                            <div key={i} className={styles.barWrapper}>
                              <div
                                className={styles.barStack}
                                style={{ height: `${heightPercent}%` }}
                                title={`${d.label}: ${total} melodies`}
                              >
                                {d.bass > 0 && (
                                  <div
                                    className={`${styles.barSegment} ${styles.barBass}`}
                                    style={{ height: `${bassPct}%` }}
                                  />
                                )}
                                {d.guitar > 0 && (
                                  <div
                                    className={`${styles.barSegment} ${styles.barGuitar}`}
                                    style={{ height: `${guitarPct}%` }}
                                  />
                                )}
                                {d.keyboard > 0 && (
                                  <div
                                    className={`${styles.barSegment} ${styles.barKeyboard}`}
                                    style={{ height: `${keyboardPct}%` }}
                                  />
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
                <div
                  className={`${styles.chartXAxis} ${timeRange === 'month' ? styles.chartXAxisMonth : ''}`}
                >
                  {practiceStats?.weeklyData.map(day => {
                    const todayStr = new Date().toISOString().split('T')[0]
                    const isCurrent =
                      (timeRange === 'week' && day.date === todayStr) ||
                      (timeRange === 'month' && day.date === todayStr) ||
                      (timeRange === 'year' && day.date === todayStr.substring(0, 7)) ||
                      (timeRange === 'all' && day.date === todayStr.substring(0, 4))
                    return (
                      <div key={day.date} className={styles.chartLabelContainer}>
                        <span
                          className={`${styles.chartLabel} ${isCurrent ? styles.chartLabelCurrent : ''}`}
                        >
                          {day.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
                <div className={styles.chartFooter}>
                  <span className={styles.xAxisLabel}>
                    {timeRange === 'week'
                      ? 'Day'
                      : timeRange === 'month'
                        ? 'Date'
                        : timeRange === 'year'
                          ? 'Month'
                          : 'Year'}
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
                  const filteredActivity = recentActivity.filter(activity => {
                    const dateKey = activity.timestamp.split('T')[0]
                    return dateKey >= startDate && dateKey <= endDate
                  })

                  if (filteredActivity.length === 0) {
                    const periodText =
                      timeRange === 'week'
                        ? 'this week'
                        : timeRange === 'month'
                          ? 'this month'
                          : timeRange === 'year'
                            ? 'this year'
                            : 'yet'
                    return <p className={styles.emptyActivityText}>No activity {periodText}</p>
                  }

                  const grouped: { [key: string]: typeof recentActivity } = {}
                  filteredActivity.slice(0, 8).forEach(activity => {
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
                          <span className={styles.activityDayHeader}>
                            {formatActivityDate(dateKey)}
                          </span>
                          {activities.map(activity => (
                            <div key={activity.id} className={styles.activityItem}>
                              <div
                                className={`${styles.activityIcon} ${activity.type === 'generator' || activity.type === 'completion' ? getInstrumentTagClass(activity.instrument || 'keyboard') : styles.classJoin}`}
                              >
                                {activity.type === 'generator' || activity.type === 'completion' ? (
                                  getInstrumentIcon(activity.instrument || 'keyboard')
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
          </div>
        </section>

        {/* Classes Section */}
        <section className={styles.classesSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionIcon}>
                <PiBookOpenFill />
              </span>
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
                {myClassrooms.map(classroom => {
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
                            <span className={classroomStyles.studentTag}>
                              {t('classroom.student')}
                            </span>
                          )}
                          {classroom.is_public ? (
                            <span className={classroomStyles.publicTag}>
                              {t('classroom.public')}
                            </span>
                          ) : (
                            <span className={classroomStyles.privateTag}>
                              {t('classroom.private')}
                            </span>
                          )}
                        </div>
                      </div>
                      {classroom.owner_username && (
                        <p className={classroomStyles.classAuthor}>
                          {t('classroom.by')} {classroom.owner_username}
                        </p>
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
                            {classroomPendingAssignments.slice(0, 2).map(assignment => (
                              <button
                                key={assignment.id}
                                className={styles.assignmentChip}
                                onClick={e => {
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

      {/* Tutorial Overlay */}
      <TutorialOverlay
        isActive={isTutorialActive}
        currentStep={tutorialStep}
        onNext={tutorialNextStep}
        onPrev={tutorialPrevStep}
        onSkip={skipTutorial}
        onComplete={completeTutorial}
        shouldShowWelcome={shouldShowTutorial}
        onStartTutorial={startTutorial}
      />
    </div>
  )
}

export default Dashboard

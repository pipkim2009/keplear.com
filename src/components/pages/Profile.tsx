/**
 * Profile Page - View and edit user profiles
 * Supports viewing own profile, editing profile settings, and viewing public profiles of other users
 */

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useInstrument } from '../../contexts/InstrumentContext'
import { useTranslation } from '../../contexts/TranslationContext'
import { containsScriptInjection, sanitizeUsername } from '../../utils/security'
import SEOHead from '../common/SEOHead'
import {
  PiPencilSimpleFill,
  PiCheckCircleFill,
  PiUsersFill,
  PiCaretLeftBold,
  PiWarningCircleFill,
} from 'react-icons/pi'
import styles from '../../styles/Profile.module.css'

interface ProfileData {
  id: string
  username: string | null
  full_name: string | null
  avatar_url: string | null
  profile_color: string | null
  created_at: string
}

const PROFILE_COLORS = [
  {
    id: 'purple',
    label: 'Purple',
    gradient: 'linear-gradient(135deg, var(--primary-purple) 0%, var(--primary-purple-light) 100%)',
  },
  {
    id: 'blue',
    label: 'Blue',
    gradient: 'linear-gradient(135deg, var(--blue-500) 0%, var(--blue-700) 100%)',
  },
  {
    id: 'green',
    label: 'Green',
    gradient: 'linear-gradient(135deg, var(--green-500) 0%, var(--green-700) 100%)',
  },
  {
    id: 'red',
    label: 'Red',
    gradient: 'linear-gradient(135deg, var(--red-500) 0%, var(--red-700) 100%)',
  },
  {
    id: 'orange',
    label: 'Orange',
    gradient: 'linear-gradient(135deg, var(--orange-500) 0%, var(--orange-700) 100%)',
  },
]

interface ActivityItem {
  id: string
  type: 'completion' | 'class_join'
  title: string
  meta: string
  timestamp: string
}

const Profile = () => {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { profileUserId, navigateToHome, navigateToClassroom } = useInstrument()

  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isOwnProfile, setIsOwnProfile] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)

  // Stats
  const [assignmentsCompleted, setAssignmentsCompleted] = useState(0)
  const [classesJoined, setClassesJoined] = useState(0)
  const [classesOwned, setClassesOwned] = useState(0)

  // Activity
  const [activity, setActivity] = useState<ActivityItem[]>([])

  // Edit form state
  const [editUsername, setEditUsername] = useState('')
  const [editProfileColor, setEditProfileColor] = useState('purple')
  const [editError, setEditError] = useState('')
  const [saving, setSaving] = useState(false)

  // Determine which user's profile to load
  const targetUserId = profileUserId || user?.id

  // Fetch profile data
  const fetchProfile = useCallback(async () => {
    if (!targetUserId) {
      setLoading(false)
      return
    }

    setLoading(true)

    try {
      // Check if viewing own profile
      const viewingOwnProfile = user?.id === targetUserId
      setIsOwnProfile(viewingOwnProfile)

      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', targetUserId)
        .single()

      if (profileError) {
        // If profile not found, create from user metadata for own profile
        if (viewingOwnProfile && user) {
          setProfile({
            id: user.id,
            username: user.user_metadata?.username || null,
            full_name: user.user_metadata?.display_name || user.user_metadata?.full_name || null,
            avatar_url: user.user_metadata?.avatar_url || null,
            profile_color: null,
            created_at: user.created_at,
          })
        } else {
          setProfile(null)
        }
      } else {
        setProfile(profileData)
      }

      // Fetch stats for profile
      if (viewingOwnProfile || profileData) {
        // Assignments completed
        const { count: completedCount } = await supabase
          .from('assignment_completions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', targetUserId)
        setAssignmentsCompleted(completedCount || 0)

        // Classes joined (as student)
        const { count: joinedCount } = await supabase
          .from('classroom_students')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', targetUserId)
        setClassesJoined(joinedCount || 0)

        // Classes owned (as teacher)
        const { count: ownedCount } = await supabase
          .from('classrooms')
          .select('*', { count: 'exact', head: true })
          .eq('created_by', targetUserId)
        setClassesOwned(ownedCount || 0)

        // Fetch recent activity
        await fetchActivity(targetUserId)
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setLoading(false)
    }
  }, [targetUserId, user])

  // Fetch recent activity
  const fetchActivity = async (userId: string) => {
    const activityItems: ActivityItem[] = []

    try {
      // Recent completions
      const { data: completions } = await supabase
        .from('assignment_completions')
        .select(
          `
          id,
          completed_at,
          assignments (
            title,
            classrooms (
              title
            )
          )
        `
        )
        .eq('user_id', userId)
        .order('completed_at', { ascending: false })
        .limit(5)

      if (completions) {
        for (const completion of completions) {
          const assignment = completion.assignments as {
            title: string
            classrooms: { title: string } | null
          } | null
          if (assignment) {
            activityItems.push({
              id: `completion-${completion.id}`,
              type: 'completion',
              title: `Completed "${assignment.title}"`,
              meta: assignment.classrooms?.title || 'Unknown class',
              timestamp: completion.completed_at,
            })
          }
        }
      }

      // Recent class joins
      const { data: joins } = await supabase
        .from('classroom_students')
        .select(
          `
          id,
          joined_at,
          classrooms (
            title
          )
        `
        )
        .eq('user_id', userId)
        .order('joined_at', { ascending: false })
        .limit(5)

      if (joins) {
        for (const join of joins) {
          const classroom = join.classrooms as { title: string } | null
          if (classroom) {
            activityItems.push({
              id: `join-${join.id}`,
              type: 'class_join',
              title: `Joined "${classroom.title}"`,
              meta: 'Class',
              timestamp: join.joined_at,
            })
          }
        }
      }

      // Sort by timestamp
      activityItems.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
      setActivity(activityItems.slice(0, 10))
    } catch (error) {
      console.error('Error fetching activity:', error)
    }
  }

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  // Open edit modal with current values
  const openEditModal = () => {
    if (profile) {
      setEditUsername(profile.username || '')
      setEditProfileColor(profile.profile_color || 'purple')
      setEditError('')
    }
    setShowEditModal(true)
  }

  // Save profile changes
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setSaving(true)
    setEditError('')

    // Validate username
    if (editUsername) {
      if (containsScriptInjection(editUsername)) {
        setEditError('Username contains invalid characters')
        setSaving(false)
        return
      }
    }
    const cleanUsername = editUsername ? sanitizeUsername(editUsername) : null

    try {
      // Update profiles table
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: user.id,
        username: cleanUsername,
        profile_color: editProfileColor,
        email: user.email || '',
      })

      if (profileError) {
        throw profileError
      }

      // Update auth metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          username: cleanUsername,
        },
      })

      if (authError) {
        console.warn('Auth metadata update failed:', authError)
      }

      // Refresh profile data
      await fetchProfile()
      setShowEditModal(false)
    } catch (error: unknown) {
      console.error('Error saving profile:', error)
      if (error instanceof Error) {
        setEditError(error.message)
      } else {
        setEditError(t('errors.saveProfileFailed'))
      }
    } finally {
      setSaving(false)
    }
  }

  const getInitials = (name: string | null): string => {
    if (!name) return '?'
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getProfileGradient = (colorId: string | null): string => {
    const color = PROFILE_COLORS.find(c => c.id === colorId) || PROFILE_COLORS[0]
    return color.gradient
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    return formatDate(dateString)
  }

  // Loading state
  if (loading) {
    return (
      <div className={styles.profileContainer}>
        <div className={styles.loadingState}>{t('common.loading')}</div>
      </div>
    )
  }

  // Not logged in and no target user
  if (!targetUserId) {
    return (
      <div className={styles.profileContainer}>
        <button className={styles.backButton} onClick={navigateToHome}>
          <PiCaretLeftBold />
        </button>
        <div className={styles.messageBox}>
          <div className={styles.messageIcon}>
            <PiWarningCircleFill />
          </div>
          <h2 className={styles.messageTitle}>{t('profile.loginRequired')}</h2>
          <p className={styles.messageText}>{t('profile.loginToViewProfile')}</p>
        </div>
      </div>
    )
  }

  // Profile not found
  if (!profile) {
    return (
      <div className={styles.profileContainer}>
        <button className={styles.backButton} onClick={navigateToClassroom}>
          <PiCaretLeftBold />
        </button>
        <div className={styles.messageBox}>
          <div className={styles.messageIcon}>
            <PiWarningCircleFill />
          </div>
          <h2 className={styles.messageTitle}>{t('profile.notFound')}</h2>
          <p className={styles.messageText}>{t('profile.profileNotFoundMessage')}</p>
        </div>
      </div>
    )
  }

  // Edit modal
  const editModal = showEditModal ? (
    <div
      className={styles.modalOverlay}
      onClick={e => {
        if (e.target === e.currentTarget) {
          setShowEditModal(false)
        }
      }}
    >
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{t('profile.editProfile')}</h2>
          <button
            className={styles.closeButton}
            onClick={() => setShowEditModal(false)}
            aria-label={t('common.close')}
          >
            ×
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSaveProfile}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>{t('auth.username')}</label>
            <input
              type="text"
              className={styles.formInput}
              value={editUsername}
              onChange={e => setEditUsername(e.target.value)}
              placeholder={t('profile.enterUsername')}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Profile Color</label>
            <div className={styles.colorPicker}>
              {PROFILE_COLORS.map(color => (
                <div
                  key={color.id}
                  role="button"
                  tabIndex={0}
                  className={`${styles.colorOption} ${editProfileColor === color.id ? styles.colorOptionSelected : ''}`}
                  onClick={() => setEditProfileColor(color.id)}
                  onKeyDown={e => e.key === 'Enter' && setEditProfileColor(color.id)}
                  aria-label={color.label}
                  title={color.label}
                >
                  <span
                    className={styles.colorOptionInner}
                    style={{ background: color.gradient }}
                  />
                </div>
              ))}
            </div>
          </div>

          {editError && <div className={styles.errorMessage}>{editError}</div>}

          <button type="submit" className={styles.submitButton} disabled={saving}>
            {saving ? t('common.loading') : t('common.save')}
          </button>
        </form>
      </div>
    </div>
  ) : null

  return (
    <>
      {editModal && createPortal(editModal, document.body)}
      <SEOHead
        title="Profile"
        description="View your music practice profile, stats, and activity."
        path="/profile"
      />

      <div className={styles.profileContainer}>
        <button
          className={styles.backButton}
          onClick={isOwnProfile ? navigateToHome : navigateToClassroom}
        >
          <PiCaretLeftBold />
        </button>

        {/* Profile Header */}
        <div className={styles.profileHeader}>
          <div className={styles.avatar}>
            <div
              className={styles.avatarInitials}
              style={{ background: getProfileGradient(profile.profile_color) }}
            >
              {getInitials(profile.username)}
            </div>
          </div>

          <div className={styles.profileInfo}>
            <h1 className={styles.username}>{profile.username || t('profile.anonymous')}</h1>
            <p className={styles.joinDate}>
              {t('profile.memberSince')} {formatDate(profile.created_at)}
            </p>
          </div>

          {isOwnProfile && (
            <button className={styles.editButton} onClick={openEditModal}>
              <PiPencilSimpleFill size={16} />
              {t('profile.editProfile')}
            </button>
          )}
        </div>

        {/* Stats Section */}
        <div className={styles.statsSection}>
          <h2 className={styles.sectionTitle}>{t('profile.stats')}</h2>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <p className={styles.statValue}>{assignmentsCompleted}</p>
              <p className={styles.statLabel}>{t('profile.assignmentsCompleted')}</p>
            </div>
            <div className={styles.statCard}>
              <p className={styles.statValue}>{classesJoined}</p>
              <p className={styles.statLabel}>{t('profile.classesJoined')}</p>
            </div>
            <div className={styles.statCard}>
              <p className={styles.statValue}>{classesOwned}</p>
              <p className={styles.statLabel}>{t('profile.classesCreated')}</p>
            </div>
          </div>
        </div>

        {/* Activity Section */}
        <div className={styles.activitySection}>
          <h2 className={styles.sectionTitle}>{t('profile.recentActivity')}</h2>
          {activity.length > 0 ? (
            <div className={styles.activityList}>
              {activity.map(item => (
                <div key={item.id} className={styles.activityItem}>
                  <div
                    className={`${styles.activityIcon} ${item.type === 'completion' ? styles.completion : styles.classJoin}`}
                  >
                    {item.type === 'completion' ? (
                      <PiCheckCircleFill size={20} />
                    ) : (
                      <PiUsersFill size={20} />
                    )}
                  </div>
                  <div className={styles.activityContent}>
                    <p className={styles.activityTitle}>{item.title}</p>
                    <p className={styles.activityMeta}>
                      {item.meta} • {formatRelativeTime(item.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyActivity}>
              <p className={styles.emptyActivityText}>{t('profile.noActivity')}</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default Profile

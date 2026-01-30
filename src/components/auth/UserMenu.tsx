import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../../hooks/useAuth'
import { useTheme } from '../../hooks/useTheme'
import { useTranslation } from '../../contexts/TranslationContext'
import { PiCaretUpFill, PiSignOutFill, PiTrashFill, PiUserFill } from 'react-icons/pi'
import { useInstrument } from '../../contexts/InstrumentContext'
import { supabase } from '../../lib/supabase'
import logo from '/Keplear-logo.png'
import styles from './UserMenu.module.css'
import authStyles from './AuthForms.module.css'

interface UserProfile {
  username: string
  avatarUrl?: string
  profileColor?: string
}

const PROFILE_COLOR_GRADIENTS: Record<string, string> = {
  purple: 'linear-gradient(135deg, var(--primary-purple) 0%, var(--primary-purple-light) 100%)',
  blue: 'linear-gradient(135deg, var(--blue-500) 0%, var(--blue-700) 100%)',
  green: 'linear-gradient(135deg, var(--green-500) 0%, var(--green-700) 100%)',
  red: 'linear-gradient(135deg, var(--red-500) 0%, var(--red-700) 100%)',
  orange: 'linear-gradient(135deg, var(--orange-500) 0%, var(--orange-700) 100%)',
}

const UserMenu = () => {
  const { t } = useTranslation()
  const { user, signOut, deleteAccount } = useAuth()
  const { isDarkMode } = useTheme()
  const { navigateToProfile } = useInstrument()
  const [isOpen, setIsOpen] = useState(false)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  useEffect(() => {
    const fetchProfile = async () => {
      if (user) {
        // Set initial values from auth metadata
        setUserProfile({
          username: user.user_metadata?.username || user.user_metadata?.full_name || 'User',
          avatarUrl: user.user_metadata?.avatar_url,
          profileColor: 'purple'
        })

        // Fetch profile color from database
        const { data } = await supabase
          .from('profiles')
          .select('profile_color, username')
          .eq('id', user.id)
          .single()

        if (data) {
          setUserProfile(prev => prev ? {
            ...prev,
            username: data.username || prev.username,
            profileColor: data.profile_color || 'purple'
          } : null)
        }
      }
    }
    fetchProfile()
  }, [user])

  const handleSignOut = async () => {
    try {
      await signOut()
      setIsOpen(false)
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const handleViewProfile = () => {
    navigateToProfile()
    setIsOpen(false)
  }

  const handleDeleteAccount = () => {
    setShowDeleteConfirm(true)
    setIsOpen(false)
  }

  const confirmAccountDeletion = async () => {
    try {
      const { error } = await deleteAccount()
      if (error) {
        console.error('Error deleting account:', error)
        alert(t('errors.deleteAccountFailed'))
      }
      setShowDeleteConfirm(false)
    } catch (error) {
      console.error('Error deleting account:', error)
      alert(t('errors.deleteAccountFailed'))
    }
  }

  if (!user || !userProfile) {
    return null
  }

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const deleteConfirmModal = showDeleteConfirm ? (
    <div className={`${authStyles.authModalOverlay} ${isDarkMode ? 'dark' : ''}`} onClick={(e) => {
      if (e.target === e.currentTarget) {
        setShowDeleteConfirm(false)
      }
    }}>
      <div className={`${authStyles.authModal} ${isDarkMode ? 'dark' : ''}`}>
        <button
          className={authStyles.closeButton}
          onClick={() => setShowDeleteConfirm(false)}
          aria-label={t('common.close')}
        >
          ×
        </button>
        <div className={authStyles.authForm}>
          <div className={authStyles.authBrand}>
            <img src={logo} alt="Keplear" className={authStyles.authLogo} />
          </div>
          <h2 style={{ color: '#ef4444', marginBottom: '20px' }}>{t('auth.deleteAccountTitle')}</h2>
          <p className={authStyles.formDescription} style={{ marginBottom: '32px' }}>
            <strong>{t('auth.cannotBeUndone')}</strong> {t('auth.dataWillBeDeleted')}
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className={authStyles.authButton}
              style={{
                width: 'auto',
                minWidth: '120px',
                background: 'transparent',
                color: 'var(--gray-100)',
                border: '2px solid var(--gray-100)',
                marginTop: 0
              }}
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={confirmAccountDeletion}
              className={authStyles.authButton}
              style={{
                width: 'auto',
                minWidth: '120px',
                background: '#ef4444',
                border: '2px solid #ef4444',
                marginTop: 0
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = '#b91c1c'
                e.currentTarget.style.borderColor = '#b91c1c'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = '#ef4444'
                e.currentTarget.style.borderColor = '#ef4444'
              }}
            >
              {t('auth.deleteAccount')}
            </button>
          </div>
        </div>
      </div>
    </div>
  ) : null

  return (
    <>
      {deleteConfirmModal && createPortal(deleteConfirmModal, document.body)}
      
      <div className={styles.userMenu} ref={menuRef}>
        <button 
          className={styles.userMenuTrigger}
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-haspopup="true"
        >
        <div className={styles.userAvatar}>
          {userProfile.avatarUrl ? (
            <img
              src={userProfile.avatarUrl}
              alt={t('aria.userAvatar')}
              onError={(e) => {
                const img = e.target as HTMLImageElement
                img.style.display = 'none'
                const initials = img.nextSibling as HTMLElement
                if (initials) initials.style.display = 'flex'
              }}
            />
          ) : null}
          <div
            className={styles.avatarInitials}
            style={{
              display: userProfile.avatarUrl ? 'none' : 'flex',
              background: PROFILE_COLOR_GRADIENTS[userProfile.profileColor || 'purple']
            }}
          >
            {getInitials(userProfile.username)}
          </div>
        </div>
        <span className={styles.userName}>
          {userProfile.username}
        </span>
        <PiCaretUpFill
          className={`${styles.chevron} ${isOpen ? styles.open : ''}`}
          size={16}
        />
      </button>

      {isOpen && (
        <div className={styles.userMenuDropdown}>
          <div className={styles.userMenuHeader}>
            <div className={styles.userInfo}>
              <div className={styles.userNameLarge}>{userProfile.username}</div>
            </div>
          </div>

          <div className={styles.userMenuDivider}></div>

          <div className={styles.userMenuActions}>
            <button
              className={styles.menuItem}
              onClick={handleViewProfile}
            >
              <PiUserFill size={16} />
              {t('auth.profile')}
            </button>
            <button
              className={`${styles.menuItem} ${styles.danger}`}
              onClick={handleSignOut}
            >
              <PiSignOutFill size={16} />
              {t('auth.signOut')}
            </button>
            <button
              className={`${styles.menuItem} ${styles.danger}`}
              onClick={handleDeleteAccount}
            >
              <PiTrashFill size={16} />
              {t('auth.deleteAccount')}
            </button>
          </div>
        </div>
      )}
      </div>
    </>
  )
}

export default UserMenu
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../../hooks/useAuth'
import { useTheme } from '../../hooks/useTheme'
import { useTranslation } from '../../contexts/TranslationContext'
import { PiCaretUpFill, PiSignOutFill, PiTrashFill } from 'react-icons/pi'
import logo from '/Keplear-logo.png'
import styles from './UserMenu.module.css'
import authStyles from './AuthForms.module.css'

interface UserProfile {
  username: string
  avatarUrl?: string
}

const UserMenu = () => {
  const { t } = useTranslation()
  const { user, signOut, deleteAccount } = useAuth()
  const { isDarkMode } = useTheme()
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
    if (user) {
      setUserProfile({
        username: user.user_metadata?.username || user.user_metadata?.full_name || 'User',
        avatarUrl: user.user_metadata?.avatar_url
      })
    }
  }, [user])

  const handleSignOut = async () => {
    try {
      await signOut()
      setIsOpen(false)
    } catch (error) {
      console.error('Error signing out:', error)
    }
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
          <h2 style={{ color: '#dc2626', marginBottom: '20px' }}>{t('auth.deleteAccountTitle')}</h2>
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
                color: isDarkMode ? '#f8f9fa' : '#1b6940',
                border: `2px solid ${isDarkMode ? '#f8f9fa' : '#1b6940'}`,
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
                background: '#dc2626',
                border: '2px solid #dc2626',
                marginTop: 0
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = '#b91c1c'
                e.currentTarget.style.borderColor = '#b91c1c'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = '#dc2626'
                e.currentTarget.style.borderColor = '#dc2626'
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
              alt="User avatar"
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
            style={{ display: userProfile.avatarUrl ? 'none' : 'flex' }}
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
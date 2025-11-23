import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../../hooks/useAuth'
import { useTheme } from '../../hooks/useTheme'
import logo from '/Keplear-logo.png'
import styles from './UserMenu.module.css'
import authStyles from './AuthForms.module.css'

interface UserProfile {
  username: string
  avatarUrl?: string
}

const UserMenu = () => {
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
        alert('Failed to delete account. Please try again or contact support.')
      }
      setShowDeleteConfirm(false)
    } catch (error) {
      console.error('Error deleting account:', error)
      alert('Failed to delete account. Please try again or contact support.')
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
          aria-label="Close"
        >
          ×
        </button>
        <div className={authStyles.authForm}>
          <div className={authStyles.authBrand}>
            <img src={logo} alt="Keplear" className={authStyles.authLogo} />
            <p className={authStyles.authSlogan}>Learn music like the greats</p>
          </div>
          <h2 style={{ color: '#dc2626', marginBottom: '20px' }}>Delete Account</h2>
          <p className={authStyles.formDescription} style={{ marginBottom: '32px' }}>
            <strong>This action cannot be undone.</strong> All your data will be permanently deleted.
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
              Cancel
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
              Delete Account
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
        <svg
          className={`${styles.chevron} ${isOpen ? styles.open : ''}`}
          width="16"
          height="16"
          viewBox="0 0 16 16"
        >
          <path
            fill="currentColor"
            d="M4.427 9.573l3.396-3.396a.25.25 0 01.354 0l3.396 3.396a.25.25 0 01-.177.427H4.604a.25.25 0 01-.177-.427z"
          />
        </svg>
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
              <svg width="16" height="16" viewBox="0 0 16 16">
                <path
                  fill="currentColor"
                  d="M2 2a2 2 0 00-2 2v8a2 2 0 002 2h4.5a.5.5 0 000-1H2a1 1 0 01-1-1V4a1 1 0 011-1h4.5a.5.5 0 000-1H2z M10.146 4.146a.5.5 0 01.708 0l3 3a.5.5 0 010 .708l-3 3a.5.5 0 01-.708-.708L12.293 8.5H6.5a.5.5 0 010-1h5.793l-2.147-2.146a.5.5 0 010-.708z"
                />
              </svg>
              Sign Out
            </button>
            <button
              className={`${styles.menuItem} ${styles.danger}`}
              onClick={handleDeleteAccount}
            >
              <svg width="16" height="16" viewBox="0 0 16 16">
                <path
                  fill="currentColor"
                  d="M6.5 1h3a.5.5 0 0 1 .5.5v1H6v-1a.5.5 0 0 1 .5-.5ZM11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3A1.5 1.5 0 0 0 5 1.5v1H2.506a.58.58 0 0 0-.01 1.152l.557 6.977A2.5 2.5 0 0 0 5.53 13h4.94a2.5 2.5 0 0 0 2.477-2.371l.557-6.977a.58.58 0 0 0-.01-1.152H11ZM4.682 3.5h6.636l-.54 6.771A1.5 1.5 0 0 1 9.29 12H6.71a1.5 1.5 0 0 1-1.487-1.729L4.682 3.5Z"
                />
              </svg>
              Delete Account
            </button>
          </div>
        </div>
      )}
      </div>
    </>
  )
}

export default UserMenu
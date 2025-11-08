import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useTheme } from '../../hooks/useTheme'
import styles from './UserMenu.module.css'

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

  return (
    <>
      {showDeleteConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px',
          boxSizing: 'border-box'
        }}>
          <div style={{
            background: isDarkMode ? '#1b6940' : 'white',
            padding: '30px',
            borderRadius: '12px',
            maxWidth: '400px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            textAlign: 'center',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            color: isDarkMode ? '#d2f9d2' : '#1b6940',
            position: 'relative',
            margin: 'auto'
          }}>
            <h3 style={{ marginBottom: '20px', color: '#dc2626' }}>Delete Account</h3>
            <p style={{ marginBottom: '20px', lineHeight: '1.5' }}>
              Are you absolutely sure you want to delete your account?
              <br /><br />
              <strong>This action cannot be undone.</strong> All your data will be permanently deleted.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: `2px solid ${isDarkMode ? '#00d96f' : '#d1d5db'}`,
                  background: isDarkMode ? 'transparent' : 'white',
                  color: isDarkMode ? '#d2f9d2' : '#374151',
                  cursor: 'pointer',
                  fontWeight: '600',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = isDarkMode ? 'rgba(0, 217, 111, 0.1)' : '#f9fafb'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = isDarkMode ? 'transparent' : 'white'
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmAccountDeletion}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#dc2626',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: '600',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = '#b91c1c'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = '#dc2626'
                }}
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
      
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
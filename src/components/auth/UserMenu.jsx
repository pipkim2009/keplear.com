import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import './UserMenu.css'

const UserMenu = () => {
  const { user, signOut } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [userProfile, setUserProfile] = useState(null)
  const menuRef = useRef(null)

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
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

  // Get user profile data
  useEffect(() => {
    if (user) {
      setUserProfile({
        email: user.email,
        username: user.user_metadata?.full_name || 'User',
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

  if (!user || !userProfile) {
    return null
  }

  // Generate initials for avatar
  const getInitials = (name) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="user-menu" ref={menuRef}>
      <button 
        className="user-menu-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <div className="user-avatar">
          {userProfile.avatarUrl ? (
            <img 
              src={userProfile.avatarUrl} 
              alt="User avatar"
              onError={(e) => {
                e.target.style.display = 'none'
                e.target.nextSibling.style.display = 'flex'
              }}
            />
          ) : null}
          <div 
            className="avatar-initials"
            style={{ display: userProfile.avatarUrl ? 'none' : 'flex' }}
          >
            {getInitials(userProfile.username)}
          </div>
        </div>
        <span className="user-name">
          {userProfile.username}
        </span>
        <svg 
          className={`chevron ${isOpen ? 'open' : ''}`} 
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
        <div className="user-menu-dropdown">
          <div className="user-menu-header">
            <div className="user-info">
              <div className="user-name-large">{userProfile.username}</div>
              <div className="user-email">{userProfile.email}</div>
            </div>
          </div>
          
          <div className="user-menu-divider"></div>
          
          <div className="user-menu-actions">
            <button 
              className="menu-item"
              onClick={() => {
                // TODO: Navigate to profile page
                setIsOpen(false)
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16">
                <path 
                  fill="currentColor" 
                  d="M8 8a3 3 0 100-6 3 3 0 000 6zm2.735 2.015A4.001 4.001 0 0018 14v1H-2v-1a4.001 4.001 0 007.265-2.015z"
                />
              </svg>
              Profile Settings
            </button>
            
            <button 
              className="menu-item danger"
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
          </div>
        </div>
      )}
    </div>
  )
}

export default UserMenu
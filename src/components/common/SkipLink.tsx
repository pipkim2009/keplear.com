import React from 'react'
import styles from './SkipLink.module.css'

interface SkipLinkProps {
  /** Target element ID to skip to */
  targetId: string
  /** Link text (defaults to "Skip to main content") */
  children?: React.ReactNode
}

/**
 * Skip navigation link for keyboard users
 * Appears when focused and allows users to skip to main content
 * Implements WCAG 2.4.1 Bypass Blocks requirement
 */
const SkipLink: React.FC<SkipLinkProps> = ({
  targetId,
  children = 'Skip to main content'
}) => {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    const target = document.getElementById(targetId)
    if (target) {
      target.focus()
      target.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <a
      href={`#${targetId}`}
      className={styles.skipLink}
      onClick={handleClick}
    >
      {children}
    </a>
  )
}

export default SkipLink

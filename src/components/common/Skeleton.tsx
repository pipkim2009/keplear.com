import React from 'react'
import styles from './Skeleton.module.css'

interface SkeletonProps {
  /** Width of the skeleton (CSS value) */
  width?: string
  /** Height of the skeleton (CSS value) */
  height?: string
  /** Border radius (CSS value) */
  borderRadius?: string
  /** Additional CSS class name */
  className?: string
  /** Variant type for common patterns */
  variant?: 'text' | 'circular' | 'rectangular' | 'card'
  /** Number of lines for text variant */
  lines?: number
}

/**
 * Skeleton loading placeholder component
 * Provides visual feedback while content is loading
 */
const Skeleton: React.FC<SkeletonProps> = ({
  width,
  height,
  borderRadius,
  className = '',
  variant = 'rectangular',
  lines = 1
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'text':
        return { height: height || '1em', borderRadius: borderRadius || '4px' }
      case 'circular':
        return {
          width: width || '40px',
          height: height || '40px',
          borderRadius: '50%'
        }
      case 'card':
        return {
          width: width || '100%',
          height: height || '120px',
          borderRadius: borderRadius || '12px'
        }
      default:
        return { borderRadius: borderRadius || '8px' }
    }
  }

  const variantStyles = getVariantStyles()
  const style = {
    width: width || variantStyles.width || '100%',
    height: variantStyles.height || height || '20px',
    borderRadius: variantStyles.borderRadius
  }

  if (variant === 'text' && lines > 1) {
    return (
      <div className={styles.textContainer}>
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={`${styles.skeleton} ${className}`}
            style={{
              ...style,
              width: index === lines - 1 ? '70%' : '100%'
            }}
            aria-hidden="true"
          />
        ))}
      </div>
    )
  }

  return (
    <div
      className={`${styles.skeleton} ${className}`}
      style={style}
      aria-hidden="true"
    />
  )
}

/**
 * Skeleton wrapper for a list of items
 */
interface SkeletonListProps {
  count: number
  children: React.ReactNode
  className?: string
}

export const SkeletonList: React.FC<SkeletonListProps> = ({
  count,
  children,
  className = ''
}) => {
  return (
    <div className={className} role="status" aria-label="Loading content">
      {Array.from({ length: count }).map((_, index) => (
        <React.Fragment key={index}>{children}</React.Fragment>
      ))}
      <span className={styles.srOnly}>Loading...</span>
    </div>
  )
}

/**
 * Pre-built skeleton for classroom cards
 */
export const ClassroomCardSkeleton: React.FC = () => (
  <div className={styles.cardSkeleton}>
    <Skeleton variant="text" width="60%" height="24px" />
    <Skeleton variant="text" width="40%" height="16px" />
    <div className={styles.cardSkeletonFooter}>
      <Skeleton variant="circular" width="32px" height="32px" />
      <Skeleton variant="text" width="100px" height="14px" />
    </div>
  </div>
)

export default Skeleton

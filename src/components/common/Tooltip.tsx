import React, { ReactNode, useState, useRef, useEffect, useCallback } from 'react'
import '../../styles/Tooltip.css'

interface TooltipProps {
  title: string
  text: string
  children: ReactNode
}

/**
 * Accessible tooltip component with keyboard navigation
 * - Click or Enter/Space to toggle
 * - Escape to close
 * - Click outside to close
 */
const Tooltip: React.FC<TooltipProps> = ({ title, text, children }) => {
  const [isVisible, setIsVisible] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLDivElement>(null)
  const tooltipId = useRef(`tooltip-${Math.random().toString(36).substring(2, 9)}`).current

  const closeTooltip = useCallback(() => {
    setIsVisible(false)
  }, [])

  const toggleTooltip = useCallback(() => {
    setIsVisible(prev => !prev)
  }, [])

  // Handle click
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    toggleTooltip()
  }

  // Handle keyboard interaction
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault()
        e.stopPropagation()
        toggleTooltip()
        break
      case 'Escape':
        e.preventDefault()
        e.stopPropagation()
        closeTooltip()
        // Return focus to trigger
        triggerRef.current?.focus()
        break
    }
  }

  // Handle global escape key when tooltip is visible
  useEffect(() => {
    if (!isVisible) return

    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeTooltip()
        triggerRef.current?.focus()
      }
    }

    document.addEventListener('keydown', handleGlobalKeyDown)
    return () => document.removeEventListener('keydown', handleGlobalKeyDown)
  }, [isVisible, closeTooltip])

  // Handle click outside
  useEffect(() => {
    if (!isVisible) return

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        closeTooltip()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isVisible, closeTooltip])

  // Close this tooltip when another tooltip is hovered
  useEffect(() => {
    if (!isVisible) return

    const handleOtherTooltipHover = (event: Event) => {
      const customEvent = event as CustomEvent<string>
      if (customEvent.detail !== tooltipId) {
        closeTooltip()
      }
    }

    document.addEventListener('tooltip-hover', handleOtherTooltipHover)
    return () => document.removeEventListener('tooltip-hover', handleOtherTooltipHover)
  }, [isVisible, closeTooltip, tooltipId])

  // Dispatch event when hovering this tooltip
  const handleMouseEnter = useCallback(() => {
    document.dispatchEvent(new CustomEvent('tooltip-hover', { detail: tooltipId }))
  }, [tooltipId])

  return (
    <div className="tooltip-container" ref={containerRef} onMouseEnter={handleMouseEnter}>
      <div
        ref={triggerRef}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={isVisible ? 'active' : ''}
        role="button"
        tabIndex={0}
        aria-expanded={isVisible}
        aria-describedby={isVisible ? tooltipId : undefined}
        aria-haspopup="true"
      >
        {children}
      </div>
      <div
        id={tooltipId}
        className={`tooltip-box ${isVisible ? 'visible' : ''}`}
        role="tooltip"
        aria-hidden={!isVisible}
      >
        <div className="tooltip-title">{title}</div>
        <div className="tooltip-text">{text}</div>
      </div>
    </div>
  )
}

export default Tooltip

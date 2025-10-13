import React, { ReactNode, useState, useRef, useEffect } from 'react'
import '../../styles/Tooltip.css'

interface TooltipProps {
  title: string
  text: string
  children: ReactNode
}

const Tooltip: React.FC<TooltipProps> = ({ title, text, children }) => {
  const [isVisible, setIsVisible] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsVisible(!isVisible)
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsVisible(false)
      }
    }

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isVisible])

  return (
    <div className="tooltip-container" ref={containerRef}>
      <div onClick={handleClick} className={isVisible ? 'active' : ''}>
        {children}
      </div>
      <div className={`tooltip-box ${isVisible ? 'visible' : ''}`}>
        <div className="tooltip-title">{title}</div>
        <div className="tooltip-text">{text}</div>
      </div>
    </div>
  )
}

export default Tooltip

import { useState, useRef, useEffect, useCallback } from 'react'
import { PiPlus, PiX } from 'react-icons/pi'
import { useTranslation } from '../../contexts/TranslationContext'
import { useWindowManager, detectSnapZone, getSnapRect } from '../../hooks/useWindowManager'
import { type SnapZone, TOOL_CONFIGS } from '../sandbox/types'
import SandboxWindow from '../sandbox/SandboxWindow'
import styles from '../../styles/SandboxPage.module.css'

const MOBILE_BREAKPOINT = 768

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < MOBILE_BREAKPOINT : false
  )

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    setIsMobile(mq.matches)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return isMobile
}

function SandboxPage() {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [snapZone, setSnapZone] = useState<SnapZone>(null)
  const [activeTabId, setActiveTabId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const isMobile = useIsMobile()
  const { windows, addWindow, removeWindow, updateWindow, bringToFront, snapWindow } =
    useWindowManager()

  // Auto-select the latest window as active tab on mobile
  useEffect(() => {
    if (isMobile && windows.length > 0) {
      const lastWin = windows[windows.length - 1]
      if (!activeTabId || !windows.find(w => w.id === activeTabId)) {
        setActiveTabId(lastWin.id)
      }
    }
    if (windows.length === 0) {
      setActiveTabId(null)
    }
  }, [windows, isMobile, activeTabId])

  useEffect(() => {
    if (!isOpen) return
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen])

  const handleDragMove = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    setSnapZone(detectSnapZone(clientX, clientY, rect))
  }, [])

  const handleDragEnd = useCallback(
    (id: string, zone: SnapZone) => {
      const canvas = canvasRef.current
      if (!canvas || !zone) return
      snapWindow(id, zone, canvas.offsetWidth, canvas.offsetHeight)
      setSnapZone(null)
    },
    [snapWindow]
  )

  const handleAddWindow = useCallback(
    (toolKey: string) => {
      const canvas = canvasRef.current
      addWindow(toolKey, canvas?.offsetWidth, canvas?.offsetHeight)
      setIsOpen(false)
    },
    [addWindow]
  )

  const handleRemoveWindow = useCallback(
    (id: string) => {
      removeWindow(id)
      // Switch to another tab if the closed one was active
      if (activeTabId === id) {
        const remaining = windows.filter(w => w.id !== id)
        setActiveTabId(remaining.length > 0 ? remaining[remaining.length - 1].id : null)
      }
    },
    [removeWindow, activeTabId, windows]
  )

  const snapPreview =
    snapZone && canvasRef.current
      ? getSnapRect(snapZone, canvasRef.current.offsetWidth, canvasRef.current.offsetHeight)
      : null

  // On mobile, only show the active tab's window
  const visibleWindows = isMobile ? windows.filter(w => w.id === activeTabId) : windows

  return (
    <div className={styles.page}>
      <div className={styles.menuWrapper} ref={menuRef}>
        <button
          className={`${styles.addBtn} ${isOpen ? styles.addBtnOpen : ''}`}
          onClick={() => setIsOpen(prev => !prev)}
          aria-label={isOpen ? t('common.close') : t('common.add')}
        >
          {isOpen ? <PiX size={22} /> : <PiPlus size={22} />}
        </button>

        {isOpen && (
          <div className={styles.menu}>
            {TOOL_CONFIGS.map(tool => (
              <button
                key={tool.key}
                className={styles.menuItem}
                onClick={() => handleAddWindow(tool.key)}
              >
                {t(tool.labelKey)}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className={styles.canvas} ref={canvasRef}>
        {!isMobile && snapPreview && (
          <div
            className={styles.snapPreview}
            style={{
              left: snapPreview.x,
              top: snapPreview.y,
              width: snapPreview.width,
              height: snapPreview.height,
            }}
          />
        )}

        {visibleWindows.map(win => (
          <SandboxWindow
            key={win.id}
            window={win}
            onClose={handleRemoveWindow}
            onUpdate={updateWindow}
            onFocus={bringToFront}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}
            activeSnapZone={snapZone}
            isMobile={isMobile}
          />
        ))}
      </div>

      {/* Mobile tab bar */}
      {isMobile && windows.length > 1 && (
        <div className={styles.tabBar}>
          {windows.map(win => {
            const config = TOOL_CONFIGS.find(c => c.key === win.toolKey)
            return (
              <button
                key={win.id}
                className={`${styles.tab} ${win.id === activeTabId ? styles.tabActive : ''}`}
                onClick={() => setActiveTabId(win.id)}
              >
                {config ? t(config.labelKey) : win.toolKey}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default SandboxPage

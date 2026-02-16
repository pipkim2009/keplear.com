import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { PiPlus, PiX, PiTrash, PiSquaresFour } from 'react-icons/pi'
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
  const [layoutOpen, setLayoutOpen] = useState(false)
  const layoutRef = useRef<HTMLDivElement>(null)
  const {
    windows,
    addWindow,
    removeWindow,
    updateWindow,
    bringToFront,
    snapWindow,
    clearAll,
    applyLayout,
  } = useWindowManager()

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
    if (!isOpen && !layoutOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
        setLayoutOpen(false)
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, layoutOpen])

  // Close layout menu on outside click
  useEffect(() => {
    if (!layoutOpen) return
    const handleClick = (e: MouseEvent) => {
      if (layoutRef.current && !layoutRef.current.contains(e.target as Node)) {
        setLayoutOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [layoutOpen])

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

  const handleApplyLayout = useCallback(
    (layoutId: string) => {
      const canvas = canvasRef.current
      if (!canvas) return
      applyLayout(layoutId, canvas.offsetWidth, canvas.offsetHeight)
      setLayoutOpen(false)
    },
    [applyLayout]
  )

  const handleClearAll = useCallback(() => {
    clearAll()
    setActiveTabId(null)
  }, [clearAll])

  // Build available layouts based on window count
  const availableLayouts = useMemo(() => {
    const count = windows.length
    if (count === 0) return []

    const layouts: { id: string; label: string; icon: string }[] = []

    if (count === 1) {
      layouts.push({ id: 'full', label: 'Full Screen', icon: '[ ]' })
    }

    if (count >= 2) {
      layouts.push({ id: 'side-by-side', label: 'Side by Side', icon: '[ | ]' })
      layouts.push({ id: 'top-bottom', label: 'Top / Bottom', icon: '[-]' })
    }

    if (count >= 3) {
      layouts.push({ id: 'left-right-stack', label: '1 + Stack', icon: '[|=]' })
      layouts.push({ id: 'top-bottom-split', label: 'Top + Split', icon: '[_||]' })
      layouts.push({ id: 'three-col', label: '3 Columns', icon: '[|||]' })
    }

    if (count >= 4) {
      layouts.push({ id: 'grid', label: 'Grid', icon: '[##]' })
    }

    return layouts
  }, [windows.length])

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
      <div className={styles.toolbar}>
        {/* Add window button + menu */}
        <div className={styles.toolbarGroup} ref={menuRef}>
          <button
            className={`${styles.toolbarBtn} ${isOpen ? styles.toolbarBtnActive : ''}`}
            onClick={() => {
              setIsOpen(prev => !prev)
              setLayoutOpen(false)
            }}
            aria-label={isOpen ? t('common.close') : t('common.add')}
            title="Add window"
          >
            {isOpen ? <PiX size={18} /> : <PiPlus size={18} />}
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

        {/* Layout rearanger */}
        <div className={styles.toolbarGroup} ref={layoutRef}>
          <button
            className={`${styles.toolbarBtn} ${layoutOpen ? styles.toolbarBtnActive : ''}`}
            onClick={() => {
              setLayoutOpen(prev => !prev)
              setIsOpen(false)
            }}
            disabled={windows.length === 0}
            aria-label="Arrange windows"
            title="Arrange windows"
          >
            <PiSquaresFour size={18} />
          </button>

          {layoutOpen && availableLayouts.length > 0 && (
            <div className={styles.menu}>
              {availableLayouts.map(layout => (
                <button
                  key={layout.id}
                  className={styles.menuItem}
                  onClick={() => handleApplyLayout(layout.id)}
                >
                  <span className={styles.layoutIcon}>{layout.icon}</span>
                  {layout.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Clear all */}
        <button
          className={styles.toolbarBtn}
          onClick={handleClearAll}
          disabled={windows.length === 0}
          aria-label="Clear all windows"
          title="Clear all"
        >
          <PiTrash size={18} />
        </button>
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

import { useState, useRef, useEffect, useCallback } from 'react'
import { PiPlus, PiX } from 'react-icons/pi'
import { useTranslation } from '../../contexts/TranslationContext'
import { useWindowManager, detectSnapZone, getSnapRect } from '../../hooks/useWindowManager'
import { type SnapZone, TOOL_CONFIGS } from '../sandbox/types'
import SandboxWindow from '../sandbox/SandboxWindow'
import styles from '../../styles/SandboxPage.module.css'

function SandboxPage() {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [snapZone, setSnapZone] = useState<SnapZone>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const { windows, addWindow, removeWindow, updateWindow, bringToFront, snapWindow } =
    useWindowManager()

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

  const snapPreview =
    snapZone && canvasRef.current
      ? getSnapRect(snapZone, canvasRef.current.offsetWidth, canvasRef.current.offsetHeight)
      : null

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
                onClick={() => {
                  addWindow(tool.key)
                  setIsOpen(false)
                }}
              >
                {t(tool.labelKey)}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className={styles.canvas} ref={canvasRef}>
        {snapPreview && (
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

        {windows.map(win => (
          <SandboxWindow
            key={win.id}
            window={win}
            onClose={removeWindow}
            onUpdate={updateWindow}
            onFocus={bringToFront}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}
            activeSnapZone={snapZone}
          />
        ))}
      </div>
    </div>
  )
}

export default SandboxPage

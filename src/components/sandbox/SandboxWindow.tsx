import { Suspense, useCallback } from 'react'
import { Rnd } from 'react-rnd'
import { PiX } from 'react-icons/pi'
import { useTranslation } from '../../contexts/TranslationContext'
import { getClientCoords } from '../../hooks/useWindowManager'
import { usePinchScale } from '../../hooks/usePinchScale'
import SectionErrorBoundary from '../common/SectionErrorBoundary'
import { type SandboxWindowState, type SnapZone, TOOL_CONFIGS } from './types'
import styles from '../../styles/SandboxWindow.module.css'

interface SandboxWindowProps {
  window: SandboxWindowState
  onClose: (id: string) => void
  onUpdate: (id: string, partial: Partial<SandboxWindowState>) => void
  onFocus: (id: string) => void
  onDragMove: (clientX: number, clientY: number) => void
  onDragEnd: (id: string, snapZone: SnapZone) => void
  activeSnapZone: SnapZone
  isMobile?: boolean
}

const MIN_WIDTH = 300
const MIN_HEIGHT = 200

function ScaleIndicator({ scale, onReset }: { scale: number; onReset: () => void }) {
  if (Math.abs(scale - 1) < 0.01) return null
  return (
    <button
      className={styles.scaleBadge}
      onClick={e => {
        e.stopPropagation()
        onReset()
      }}
      title="Reset zoom"
    >
      {Math.round(scale * 100)}%
    </button>
  )
}

export default function SandboxWindow({
  window: win,
  onClose,
  onUpdate,
  onFocus,
  onDragMove,
  onDragEnd,
  activeSnapZone,
  isMobile,
}: SandboxWindowProps) {
  const { t } = useTranslation()
  const config = TOOL_CONFIGS.find(c => c.key === win.toolKey)

  const handleScale = useCallback((s: number) => onUpdate(win.id, { scale: s }), [onUpdate, win.id])

  const resetScale = useCallback(() => onUpdate(win.id, { scale: 1 }), [onUpdate, win.id])

  const pinchRef = usePinchScale(win.scale, handleScale)

  if (!config) return null

  const ToolComponent = config.component

  const scaledContent = (
    <div ref={pinchRef} className={styles.content}>
      <div
        className={styles.scaleWrapper}
        style={{
          transform: `scale(${win.scale})`,
          transformOrigin: 'top left',
          width: `${100 / win.scale}%`,
          height: `${100 / win.scale}%`,
        }}
      >
        <SectionErrorBoundary section={config.key}>
          <Suspense
            fallback={
              <div style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Loading...</div>
            }
          >
            <ToolComponent />
          </Suspense>
        </SectionErrorBoundary>
      </div>
    </div>
  )

  // On mobile, render a simple full-size panel (no Rnd)
  if (isMobile) {
    return (
      <div
        className={styles.window}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          zIndex: win.zIndex,
          borderRadius: 0,
        }}
      >
        <div className={styles.titleBar}>
          <span className={styles.titleText}>{t(config.labelKey)}</span>
          <div className={styles.titleActions}>
            <ScaleIndicator scale={win.scale} onReset={resetScale} />
            <button
              className={styles.closeBtn}
              onClick={e => {
                e.stopPropagation()
                onClose(win.id)
              }}
              aria-label={t('common.close')}
            >
              <PiX size={14} />
            </button>
          </div>
        </div>
        {scaledContent}
      </div>
    )
  }

  return (
    <Rnd
      position={{ x: win.x, y: win.y }}
      size={{ width: win.width, height: win.height }}
      minWidth={MIN_WIDTH}
      minHeight={MIN_HEIGHT}
      dragHandleClassName={styles.titleBar}
      style={{ zIndex: win.zIndex }}
      enableUserSelectHack={false}
      onDrag={e => {
        const coords = getClientCoords(e as MouseEvent | TouchEvent)
        if (coords) {
          onDragMove(coords.x, coords.y)
        }
      }}
      onDragStop={(_e, d) => {
        if (activeSnapZone) {
          onDragEnd(win.id, activeSnapZone)
        } else {
          onUpdate(win.id, { x: d.x, y: d.y })
        }
      }}
      onResizeStop={(_e, _dir, ref, _delta, position) => {
        onUpdate(win.id, {
          width: ref.offsetWidth,
          height: ref.offsetHeight,
          x: position.x,
          y: position.y,
        })
      }}
      onMouseDown={() => onFocus(win.id)}
      onTouchStart={() => onFocus(win.id)}
    >
      <div className={styles.window} style={{ width: '100%', height: '100%' }}>
        <div className={styles.titleBar}>
          <span className={styles.titleText}>{t(config.labelKey)}</span>
          <div className={styles.titleActions}>
            <ScaleIndicator scale={win.scale} onReset={resetScale} />
            <button
              className={styles.closeBtn}
              onClick={e => {
                e.stopPropagation()
                onClose(win.id)
              }}
              aria-label={t('common.close')}
            >
              <PiX size={14} />
            </button>
          </div>
        </div>
        {scaledContent}
      </div>
    </Rnd>
  )
}

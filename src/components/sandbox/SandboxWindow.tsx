import { Suspense } from 'react'
import { Rnd } from 'react-rnd'
import { PiX } from 'react-icons/pi'
import { useTranslation } from '../../contexts/TranslationContext'
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
}

const MIN_WIDTH = 300
const MIN_HEIGHT = 200

export default function SandboxWindow({
  window: win,
  onClose,
  onUpdate,
  onFocus,
  onDragMove,
  onDragEnd,
  activeSnapZone,
}: SandboxWindowProps) {
  const { t } = useTranslation()
  const config = TOOL_CONFIGS.find(c => c.key === win.toolKey)
  if (!config) return null

  const ToolComponent = config.component

  return (
    <Rnd
      position={{ x: win.x, y: win.y }}
      size={{ width: win.width, height: win.height }}
      minWidth={MIN_WIDTH}
      minHeight={MIN_HEIGHT}
      dragHandleClassName={styles.titleBar}
      style={{ zIndex: win.zIndex }}
      onDrag={e => {
        const evt = e as MouseEvent
        if (evt.clientX !== undefined) {
          onDragMove(evt.clientX, evt.clientY)
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
    >
      <div className={styles.window} style={{ width: '100%', height: '100%' }}>
        <div className={styles.titleBar}>
          <span className={styles.titleText}>{t(config.labelKey)}</span>
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
        <div className={styles.content}>
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
    </Rnd>
  )
}

import { useState, useCallback, useRef } from 'react'
import { type SandboxWindowState, type SnapZone, TOOL_CONFIGS } from '../components/sandbox/types'

const STAGGER_OFFSET = 30
const SNAP_THRESHOLD = 40

export function getClientCoords(
  e: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent
): { x: number; y: number } | null {
  if ('touches' in e) {
    const touch = e.touches[0] || (e as TouchEvent).changedTouches?.[0]
    if (touch) return { x: touch.clientX, y: touch.clientY }
    return null
  }
  const me = e as MouseEvent
  if (me.clientX !== undefined) return { x: me.clientX, y: me.clientY }
  return null
}

export function detectSnapZone(clientX: number, clientY: number, canvasRect: DOMRect): SnapZone {
  const relX = clientX - canvasRect.left
  const relY = clientY - canvasRect.top
  const nearLeft = relX < SNAP_THRESHOLD
  const nearRight = relX > canvasRect.width - SNAP_THRESHOLD
  const nearTop = relY < SNAP_THRESHOLD
  const nearBottom = relY > canvasRect.height - SNAP_THRESHOLD

  if (nearLeft && nearTop) return 'top-left'
  if (nearRight && nearTop) return 'top-right'
  if (nearLeft && nearBottom) return 'bottom-left'
  if (nearRight && nearBottom) return 'bottom-right'
  if (nearTop) return 'top'
  if (nearBottom) return 'bottom'
  if (nearLeft) return 'left'
  if (nearRight) return 'right'
  return null
}

export function getSnapRect(zone: SnapZone, canvasW: number, canvasH: number) {
  const half_w = Math.round(canvasW / 2)
  const half_h = Math.round(canvasH / 2)

  switch (zone) {
    case 'left':
      return { x: 0, y: 0, width: half_w, height: canvasH }
    case 'right':
      return { x: half_w, y: 0, width: canvasW - half_w, height: canvasH }
    case 'top':
      return { x: 0, y: 0, width: canvasW, height: half_h }
    case 'bottom':
      return { x: 0, y: half_h, width: canvasW, height: canvasH - half_h }
    case 'top-left':
      return { x: 0, y: 0, width: half_w, height: half_h }
    case 'top-right':
      return { x: half_w, y: 0, width: canvasW - half_w, height: half_h }
    case 'bottom-left':
      return { x: 0, y: half_h, width: half_w, height: canvasH - half_h }
    case 'bottom-right':
      return { x: half_w, y: half_h, width: canvasW - half_w, height: canvasH - half_h }
    case 'full':
      return { x: 0, y: 0, width: canvasW, height: canvasH }
    default:
      return null
  }
}

export function useWindowManager() {
  const [windows, setWindows] = useState<SandboxWindowState[]>([])
  const nextZIndexRef = useRef(1)
  const windowCountRef = useRef(0)

  const addWindow = useCallback((toolKey: string, canvasW?: number, canvasH?: number) => {
    const config = TOOL_CONFIGS.find(c => c.key === toolKey)
    if (!config) return

    const stagger = (windowCountRef.current % 10) * STAGGER_OFFSET
    windowCountRef.current++

    let width = config.defaultWidth
    let height = config.defaultHeight
    let x = 60 + stagger
    let y = 60 + stagger

    // Clamp to canvas dimensions if provided
    if (canvasW && canvasH) {
      width = Math.min(width, canvasW - 20)
      height = Math.min(height, canvasH - 20)
      x = Math.min(x, Math.max(0, canvasW - width))
      y = Math.min(y, Math.max(0, canvasH - height))
    }

    const newWindow: SandboxWindowState = {
      id: `${toolKey}-${Date.now()}`,
      toolKey,
      x,
      y,
      width,
      height,
      zIndex: nextZIndexRef.current++,
      scale: 1,
    }

    setWindows(prev => [...prev, newWindow])
  }, [])

  const removeWindow = useCallback((id: string) => {
    setWindows(prev => prev.filter(w => w.id !== id))
  }, [])

  const updateWindow = useCallback((id: string, partial: Partial<SandboxWindowState>) => {
    setWindows(prev => prev.map(w => (w.id === id ? { ...w, ...partial } : w)))
  }, [])

  const bringToFront = useCallback((id: string) => {
    const z = nextZIndexRef.current++
    setWindows(prev => prev.map(w => (w.id === id ? { ...w, zIndex: z } : w)))
  }, [])

  const snapWindow = useCallback((id: string, zone: SnapZone, canvasW: number, canvasH: number) => {
    const rect = getSnapRect(zone, canvasW, canvasH)
    if (!rect) return
    setWindows(prev => prev.map(w => (w.id === id ? { ...w, ...rect } : w)))
  }, [])

  const clearAll = useCallback(() => {
    setWindows([])
  }, [])

  const applyLayout = useCallback((layoutId: string, canvasW: number, canvasH: number) => {
    setWindows(prev => {
      if (prev.length === 0) return prev
      const gap = 6
      const halfW = Math.round((canvasW - gap) / 2)
      const halfH = Math.round((canvasH - gap) / 2)
      const thirdW = Math.round((canvasW - gap * 2) / 3)

      const layouts: Record<
        string,
        (i: number, total: number) => { x: number; y: number; width: number; height: number }
      > = {
        full: () => ({ x: 0, y: 0, width: canvasW, height: canvasH }),
        'side-by-side': (i, total) => {
          const w = Math.round((canvasW - gap * (total - 1)) / total)
          return { x: i * (w + gap), y: 0, width: w, height: canvasH }
        },
        'top-bottom': (i, total) => {
          const h = Math.round((canvasH - gap * (total - 1)) / total)
          return { x: 0, y: i * (h + gap), width: canvasW, height: h }
        },
        grid: (i, total) => {
          const cols = Math.ceil(Math.sqrt(total))
          const rows = Math.ceil(total / cols)
          const col = i % cols
          const row = Math.floor(i / cols)
          const w = Math.round((canvasW - gap * (cols - 1)) / cols)
          const h = Math.round((canvasH - gap * (rows - 1)) / rows)
          return { x: col * (w + gap), y: row * (h + gap), width: w, height: h }
        },
        'left-right-stack': i => {
          if (i === 0) return { x: 0, y: 0, width: halfW, height: canvasH }
          const rightCount = prev.length - 1
          const h = Math.round((canvasH - gap * (rightCount - 1)) / rightCount)
          return { x: halfW + gap, y: (i - 1) * (h + gap), width: canvasW - halfW - gap, height: h }
        },
        'top-bottom-split': i => {
          if (i === 0) return { x: 0, y: 0, width: canvasW, height: halfH }
          const bottomCount = prev.length - 1
          const w = Math.round((canvasW - gap * (bottomCount - 1)) / bottomCount)
          return { x: (i - 1) * (w + gap), y: halfH + gap, width: w, height: canvasH - halfH - gap }
        },
        'three-col': i => ({ x: i * (thirdW + gap), y: 0, width: thirdW, height: canvasH }),
      }

      const layoutFn = layouts[layoutId]
      if (!layoutFn) return prev

      return prev.map((w, i) => {
        const rect = layoutFn(i, prev.length)
        return { ...w, ...rect, zIndex: nextZIndexRef.current++ }
      })
    })
  }, [])

  return {
    windows,
    addWindow,
    removeWindow,
    updateWindow,
    bringToFront,
    snapWindow,
    clearAll,
    applyLayout,
  }
}

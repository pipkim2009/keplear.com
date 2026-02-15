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

  return { windows, addWindow, removeWindow, updateWindow, bringToFront, snapWindow }
}

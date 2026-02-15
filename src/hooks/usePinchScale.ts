import { useRef, useEffect, useCallback } from 'react'

const MIN_SCALE = 0.25
const MAX_SCALE = 3
const WHEEL_SENSITIVITY = 0.002

function getTouchDistance(t1: Touch, t2: Touch) {
  const dx = t1.clientX - t2.clientX
  const dy = t1.clientY - t2.clientY
  return Math.sqrt(dx * dx + dy * dy)
}

export function usePinchScale(scale: number, onScale: (scale: number) => void) {
  const containerRef = useRef<HTMLDivElement>(null)
  const pinchStartDistRef = useRef<number | null>(null)
  const pinchStartScaleRef = useRef(scale)

  // Keep the ref in sync so callbacks see latest value
  const scaleRef = useRef(scale)
  scaleRef.current = scale

  const clamp = useCallback((v: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, v)), [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    // ── Ctrl + scroll wheel (desktop) ──
    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      const delta = -e.deltaY * WHEEL_SENSITIVITY
      onScale(clamp(scaleRef.current + delta))
    }

    // ── Pinch (touch) ──
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        pinchStartDistRef.current = getTouchDistance(e.touches[0], e.touches[1])
        pinchStartScaleRef.current = scaleRef.current
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinchStartDistRef.current !== null) {
        e.preventDefault()
        const dist = getTouchDistance(e.touches[0], e.touches[1])
        const ratio = dist / pinchStartDistRef.current
        onScale(clamp(pinchStartScaleRef.current * ratio))
      }
    }

    const handleTouchEnd = () => {
      pinchStartDistRef.current = null
    }

    el.addEventListener('wheel', handleWheel, { passive: false })
    el.addEventListener('touchstart', handleTouchStart, { passive: true })
    el.addEventListener('touchmove', handleTouchMove, { passive: false })
    el.addEventListener('touchend', handleTouchEnd)
    el.addEventListener('touchcancel', handleTouchEnd)

    return () => {
      el.removeEventListener('wheel', handleWheel)
      el.removeEventListener('touchstart', handleTouchStart)
      el.removeEventListener('touchmove', handleTouchMove)
      el.removeEventListener('touchend', handleTouchEnd)
      el.removeEventListener('touchcancel', handleTouchEnd)
    }
  }, [onScale, clamp])

  return containerRef
}

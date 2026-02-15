import { useState, useCallback, useRef } from 'react'
import { type SandboxWindowState, TOOL_CONFIGS } from '../components/sandbox/types'

const STAGGER_OFFSET = 30

export function useWindowManager() {
  const [windows, setWindows] = useState<SandboxWindowState[]>([])
  const nextZIndexRef = useRef(1)
  const windowCountRef = useRef(0)

  const addWindow = useCallback((toolKey: string) => {
    const config = TOOL_CONFIGS.find(c => c.key === toolKey)
    if (!config) return

    const stagger = (windowCountRef.current % 10) * STAGGER_OFFSET
    windowCountRef.current++

    const newWindow: SandboxWindowState = {
      id: `${toolKey}-${Date.now()}`,
      toolKey,
      x: 60 + stagger,
      y: 60 + stagger,
      width: config.defaultWidth,
      height: config.defaultHeight,
      zIndex: nextZIndexRef.current++,
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

  return { windows, addWindow, removeWindow, updateWindow, bringToFront }
}

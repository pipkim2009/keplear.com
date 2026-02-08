import { useState, useEffect, useCallback } from 'react'
import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'

/**
 * Cross-platform app state hook.
 * Detects foreground/background transitions on native platforms.
 * Returns isActive and fires callbacks on state change.
 */
export function useAppState(onResume?: () => void) {
  const [isActive, setIsActive] = useState(true)

  const handleResume = useCallback(() => {
    setIsActive(true)
    onResume?.()
  }, [onResume])

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    const handler = App.addListener('appStateChange', ({ isActive: active }) => {
      setIsActive(active)
      if (active) {
        handleResume()
      }
    })

    return () => {
      handler.then(h => h.remove())
    }
  }, [handleResume])

  return { isActive }
}

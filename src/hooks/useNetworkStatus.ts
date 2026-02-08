import { useState, useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { Network } from '@capacitor/network'

/**
 * Cross-platform network status hook.
 * Uses @capacitor/network on native, navigator.onLine on web.
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      // Native: use Capacitor Network plugin
      Network.getStatus().then(status => setIsOnline(status.connected))

      const handler = Network.addListener('networkStatusChange', status => {
        setIsOnline(status.connected)
      })

      return () => {
        handler.then(h => h.remove())
      }
    } else {
      // Web: use navigator.onLine + events
      setIsOnline(navigator.onLine)

      const goOnline = () => setIsOnline(true)
      const goOffline = () => setIsOnline(false)

      window.addEventListener('online', goOnline)
      window.addEventListener('offline', goOffline)

      return () => {
        window.removeEventListener('online', goOnline)
        window.removeEventListener('offline', goOffline)
      }
    }
  }, [])

  return { isOnline }
}

import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'

/**
 * Set up Android hardware back button handling.
 * Uses browser history when available, exits app at root.
 */
export function initBackButton() {
  if (!Capacitor.isNativePlatform()) return

  App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) {
      window.history.back()
    } else {
      App.exitApp()
    }
  })
}

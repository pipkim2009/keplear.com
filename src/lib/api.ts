import { Capacitor } from '@capacitor/core'

/**
 * Resolve API paths for both web and native platforms.
 * On web, relative paths like `/api/piped` resolve normally.
 * On native (Capacitor), we need absolute URLs since the WebView
 * serves from a local origin.
 */
export const apiUrl = (path: string): string =>
  Capacitor.isNativePlatform() ? `https://keplear.com${path}` : path

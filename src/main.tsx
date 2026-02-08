// Keplear v1.0.3
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import { Capacitor } from '@capacitor/core'
import { assertEnv } from './lib/env'
import { initBackButton } from './lib/backButton'
import './index.css'
import App from './App.tsx'

assertEnv()

// Initialize Sentry if DSN is configured
const sentryDsn = import.meta.env.VITE_SENTRY_DSN
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.MODE,
    integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
  })
}

// Native platform initialization
if (Capacitor.isNativePlatform()) {
  // Android back button handling
  initBackButton()

  // Configure StatusBar for dark theme
  import('@capacitor/status-bar').then(({ StatusBar, Style }) => {
    StatusBar.setStyle({ style: Style.Dark })
    if (Capacitor.getPlatform() === 'android') {
      StatusBar.setBackgroundColor({ color: '#121212' })
    }
  })

  // iOS: Unlock audio on first user interaction
  // WebKit requires a user gesture to start AudioContext
  if (Capacitor.getPlatform() === 'ios') {
    const unlockAudio = () => {
      const ctx = new AudioContext()
      const buffer = ctx.createBuffer(1, 1, 22050)
      const source = ctx.createBufferSource()
      source.buffer = buffer
      source.connect(ctx.destination)
      source.start(0)
      ctx.close()
      document.removeEventListener('touchstart', unlockAudio)
    }
    document.addEventListener('touchstart', unlockAudio, { once: true })
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)

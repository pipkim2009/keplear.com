// Keplear v1.0.3
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import { assertEnv } from './lib/env'
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)

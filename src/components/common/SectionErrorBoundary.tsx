import { type ReactNode } from 'react'
import ErrorBoundary from '../ErrorBoundary'

interface SectionErrorBoundaryProps {
  children: ReactNode
  /** Section name for error logging */
  section: string
  /** If true, renders nothing on error instead of fallback UI */
  silent?: boolean
}

function SectionFallback({ section }: { section: string }) {
  return (
    <div
      style={{
        padding: '1rem',
        textAlign: 'center',
        color: 'var(--text-secondary, #999)',
        fontSize: '0.875rem',
      }}
    >
      Failed to load {section}. Try refreshing the page.
    </div>
  )
}

export default function SectionErrorBoundary({
  children,
  section,
  silent = false,
}: SectionErrorBoundaryProps) {
  return (
    <ErrorBoundary
      fallback={silent ? <></> : <SectionFallback section={section} />}
      onError={error => {
        console.error(`[${section}] Error:`, error.message)
      }}
      showRetryButton={false}
    >
      {children}
    </ErrorBoundary>
  )
}

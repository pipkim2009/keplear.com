import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import ErrorBoundary from './ErrorBoundary'

// Component that throws an error for testing
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error')
  }
  return <div>No error</div>
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // Suppress console.error for cleaner test output
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    )

    expect(screen.getByText('No error')).toBeInTheDocument()
  })

  it('renders error UI when there is an error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument()
    expect(
      screen.getByText("We're sorry, but something unexpected happened while making music.")
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reload page/i })).toBeInTheDocument()
  })

  it('renders custom fallback UI when provided', () => {
    const CustomFallback = <div>Custom error message</div>

    render(
      <ErrorBoundary fallback={CustomFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Custom error message')).toBeInTheDocument()
    expect(screen.queryByText('Oops! Something went wrong')).not.toBeInTheDocument()
  })

  it('shows error details when expanded', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    const detailsElement = screen.getByText('Error Details (click to expand)')
    expect(detailsElement).toBeInTheDocument()

    // Check that error details section exists
    const details = detailsElement.closest('details')
    expect(details).toBeInTheDocument()
  })
})

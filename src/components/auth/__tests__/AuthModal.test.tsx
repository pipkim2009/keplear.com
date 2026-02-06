import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import AuthModal from '../AuthModal'
import { TranslationProvider } from '../../../contexts/TranslationContext'

// Mock useAuth
vi.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({
    signIn: vi.fn().mockResolvedValue({ error: null }),
    signUp: vi.fn().mockResolvedValue({ error: null }),
    signOut: vi.fn(),
    user: null,
    session: null,
    loading: false,
  }),
}))

// Mock useFocusTrap
vi.mock('../../../hooks/useFocusTrap', () => ({
  useFocusTrap: () => ({ containerRef: { current: null } }),
  useBodyScrollLock: vi.fn(),
}))

function renderAuthModal(props: Partial<Parameters<typeof AuthModal>[0]> = {}) {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
  }
  return render(
    <TranslationProvider>
      <AuthModal {...defaultProps} {...props} />
    </TranslationProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('AuthModal', () => {
  it('renders nothing when not open', () => {
    const { container } = render(
      <TranslationProvider>
        <AuthModal isOpen={false} onClose={vi.fn()} />
      </TranslationProvider>
    )
    expect(container.innerHTML).toBe('')
  })

  it('renders login form by default', () => {
    renderAuthModal()
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
  })

  it('renders as dialog with aria attributes', () => {
    renderAuthModal()
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
  })

  it('shows close button when signup is not disabled', () => {
    renderAuthModal({ disableSignup: false })
    expect(screen.getByLabelText(/close/i)).toBeInTheDocument()
  })

  it('hides close button when signup is disabled (forced login)', () => {
    renderAuthModal({ disableSignup: true })
    expect(screen.queryByLabelText(/close/i)).not.toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn()
    renderAuthModal({ onClose })

    fireEvent.click(screen.getByLabelText(/close/i))
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn()
    renderAuthModal({ onClose })

    // The overlay is the dialog role element
    const overlay = screen.getByRole('dialog')
    fireEvent.click(overlay)
    expect(onClose).toHaveBeenCalled()
  })

  it('does not close on backdrop click when signup disabled', () => {
    const onClose = vi.fn()
    renderAuthModal({ onClose, disableSignup: true })

    const overlay = screen.getByRole('dialog')
    fireEvent.click(overlay)
    expect(onClose).not.toHaveBeenCalled()
  })

  it('renders signup form when initialForm is signup', () => {
    renderAuthModal({ initialForm: 'signup' })
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
  })
})

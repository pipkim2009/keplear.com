import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LoginForm from '../LoginForm'
import { TranslationProvider } from '../../../contexts/TranslationContext'

// Mock useAuth
const mockSignIn = vi.fn()
const mockSignOut = vi.fn()
vi.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({
    signIn: mockSignIn,
    signOut: mockSignOut,
    user: null,
    session: null,
    loading: false,
  }),
}))

function renderLoginForm(props: Partial<Parameters<typeof LoginForm>[0]> = {}) {
  const defaultProps = {
    onToggleForm: vi.fn(),
    onClose: vi.fn(),
    disableSignup: false,
    onAuthSuccess: undefined,
  }
  return render(
    <TranslationProvider>
      <LoginForm {...defaultProps} {...props} />
    </TranslationProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('LoginForm', () => {
  it('renders username and password fields', () => {
    renderLoginForm()
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
  })

  it('renders sign in button', () => {
    renderLoginForm()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('shows signup link when not disabled', () => {
    renderLoginForm({ disableSignup: false })
    expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument()
  })

  it('hides signup link when disabled', () => {
    renderLoginForm({ disableSignup: true })
    expect(screen.queryByRole('button', { name: /sign up/i })).not.toBeInTheDocument()
  })

  it('shows validation error for short username after blur', async () => {
    const user = userEvent.setup()
    renderLoginForm()

    const usernameInput = screen.getByLabelText(/username/i)
    await user.type(usernameInput, 'ab')
    fireEvent.blur(usernameInput)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
  })

  it('shows validation error for short password after blur', async () => {
    const user = userEvent.setup()
    renderLoginForm()

    const passwordInput = screen.getByLabelText(/password/i)
    await user.type(passwordInput, '12345')
    fireEvent.blur(passwordInput)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
  })

  it('calls signIn on valid form submission', async () => {
    mockSignIn.mockResolvedValue({ error: null })
    const onClose = vi.fn()
    const user = userEvent.setup()
    renderLoginForm({ onClose })

    await user.type(screen.getByLabelText(/username/i), 'testuser')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('testuser', 'password123')
    })
  })

  it('closes on successful login', async () => {
    mockSignIn.mockResolvedValue({ error: null })
    const onClose = vi.fn()
    const user = userEvent.setup()
    renderLoginForm({ onClose })

    await user.type(screen.getByLabelText(/username/i), 'testuser')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled()
    })
  })

  it('shows error on failed login', async () => {
    mockSignIn.mockResolvedValue({ error: { message: 'Invalid credentials' } })
    const user = userEvent.setup()
    renderLoginForm()

    await user.type(screen.getByLabelText(/username/i), 'testuser')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid credentials')
    })
  })

  it('calls onAuthSuccess for gate login mode', async () => {
    mockSignIn.mockResolvedValue({ error: null })
    mockSignOut.mockResolvedValue(undefined)
    const onAuthSuccess = vi.fn()
    const user = userEvent.setup()
    renderLoginForm({ onAuthSuccess })

    await user.type(screen.getByLabelText(/username/i), 'gateuser')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled()
      expect(onAuthSuccess).toHaveBeenCalled()
    })
  })

  it('calls onToggleForm when signup link is clicked', async () => {
    const onToggleForm = vi.fn()
    const user = userEvent.setup()
    renderLoginForm({ onToggleForm })

    await user.click(screen.getByRole('button', { name: /sign up/i }))
    expect(onToggleForm).toHaveBeenCalledWith('signup')
  })

  it('prevents submission with empty fields', async () => {
    const user = userEvent.setup()
    renderLoginForm()

    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(mockSignIn).not.toHaveBeenCalled()
  })

  it('rejects script injection in username', async () => {
    const user = userEvent.setup()
    renderLoginForm()

    const usernameInput = screen.getByLabelText(/username/i)
    await user.type(usernameInput, '<script>alert(1)</script>')
    fireEvent.blur(usernameInput)

    await waitFor(() => {
      const alerts = screen.getAllByRole('alert')
      expect(alerts.length).toBeGreaterThan(0)
    })
  })
})

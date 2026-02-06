import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SignupForm from '../SignupForm'
import { TranslationProvider } from '../../../contexts/TranslationContext'

// Mock useAuth
const mockSignUp = vi.fn()
const mockSignIn = vi.fn()
vi.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({
    signUp: mockSignUp,
    signIn: mockSignIn,
    user: null,
    session: null,
    loading: false,
  }),
}))

function renderSignupForm(props: Partial<Parameters<typeof SignupForm>[0]> = {}) {
  const defaultProps = {
    onToggleForm: vi.fn(),
    onClose: vi.fn(),
  }
  return render(
    <TranslationProvider>
      <SignupForm {...defaultProps} {...props} />
    </TranslationProvider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('SignupForm', () => {
  it('renders username, password, and confirm password fields', () => {
    renderSignupForm()
    expect(screen.getByLabelText(/^username$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
  })

  it('renders create account button', () => {
    renderSignupForm()
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
  })

  it('shows sign in link to toggle back', () => {
    renderSignupForm()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('validates username too short', async () => {
    const user = userEvent.setup()
    renderSignupForm()

    const usernameInput = screen.getByLabelText(/^username$/i)
    await user.type(usernameInput, 'ab')
    fireEvent.blur(usernameInput)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
  })

  it('validates username invalid characters', async () => {
    const user = userEvent.setup()
    renderSignupForm()

    const usernameInput = screen.getByLabelText(/^username$/i)
    await user.type(usernameInput, 'user@name!')
    fireEvent.blur(usernameInput)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
  })

  it('validates password mismatch', async () => {
    const user = userEvent.setup()
    renderSignupForm()

    await user.type(screen.getByLabelText(/^password$/i), 'Password123!')
    const confirmInput = screen.getByLabelText(/confirm password/i)
    await user.type(confirmInput, 'DifferentPassword!')
    fireEvent.blur(confirmInput)

    await waitFor(() => {
      const alerts = screen.getAllByRole('alert')
      expect(alerts.length).toBeGreaterThan(0)
    })
  })

  it('shows password strength indicator', async () => {
    const user = userEvent.setup()
    renderSignupForm()

    await user.type(screen.getByLabelText(/^password$/i), 'Password123!')

    // Should show strength indicator
    expect(screen.getByText(/weak|medium|strong/i)).toBeInTheDocument()
  })

  it('calls signUp then signIn on valid submission', async () => {
    mockSignUp.mockResolvedValue({ error: null })
    mockSignIn.mockResolvedValue({ error: null })
    const onClose = vi.fn()
    const user = userEvent.setup()
    renderSignupForm({ onClose })

    await user.type(screen.getByLabelText(/^username$/i), 'newuser')
    await user.type(screen.getByLabelText(/^password$/i), 'StrongPass123!')
    await user.type(screen.getByLabelText(/confirm password/i), 'StrongPass123!')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith('newuser', 'StrongPass123!', { full_name: 'newuser' })
    })

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('newuser', 'StrongPass123!')
    })
  })

  it('shows error on signup failure', async () => {
    mockSignUp.mockResolvedValue({ error: { message: 'User already exists' } })
    const user = userEvent.setup()
    renderSignupForm()

    await user.type(screen.getByLabelText(/^username$/i), 'existinguser')
    await user.type(screen.getByLabelText(/^password$/i), 'StrongPass123!')
    await user.type(screen.getByLabelText(/confirm password/i), 'StrongPass123!')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('User already exists')
    })
  })

  it('prevents submission with empty fields', async () => {
    const user = userEvent.setup()
    renderSignupForm()

    await user.click(screen.getByRole('button', { name: /create account/i }))

    expect(mockSignUp).not.toHaveBeenCalled()
  })

  it('calls onToggleForm when sign in link is clicked', async () => {
    const onToggleForm = vi.fn()
    const user = userEvent.setup()
    renderSignupForm({ onToggleForm })

    await user.click(screen.getByRole('button', { name: /sign in/i }))
    expect(onToggleForm).toHaveBeenCalledWith('login')
  })

  it('rejects script injection in username', async () => {
    const user = userEvent.setup()
    renderSignupForm()

    const usernameInput = screen.getByLabelText(/^username$/i)
    await user.type(usernameInput, '<script>alert(1)</script>')
    fireEvent.blur(usernameInput)

    await waitFor(() => {
      const alerts = screen.getAllByRole('alert')
      expect(alerts.length).toBeGreaterThan(0)
    })
  })
})

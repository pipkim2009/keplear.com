import { render, screen, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'
import Header from '../common/Header'

// Mock the auth context
const mockAuthContext = {
  user: null,
  loading: false,
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  updatePassword: vi.fn(),
  deleteAccount: vi.fn(),
}

vi.mock('../../contexts/AuthContext', () => ({
  default: {
    useContext: () => mockAuthContext,
  },
}))

describe('Header', () => {
  const defaultProps = {
    isDarkMode: false,
    onToggleTheme: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the logo and navigation', () => {
    render(<Header {...defaultProps} />)

    expect(screen.getByText('Keplear')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /toggle theme/i })).toBeInTheDocument()
  })

  it('calls onToggleTheme when theme button is clicked', () => {
    const mockToggleTheme = vi.fn()
    render(<Header {...defaultProps} onToggleTheme={mockToggleTheme} />)

    const themeButton = screen.getByRole('button', { name: /toggle theme/i })
    fireEvent.click(themeButton)

    expect(mockToggleTheme).toHaveBeenCalledTimes(1)
  })

  it('shows login button when user is not authenticated', () => {
    render(<Header {...defaultProps} />)

    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('shows user menu when user is authenticated', () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      user_metadata: { username: 'testuser' },
    }

    mockAuthContext.user = mockUser

    render(<Header {...defaultProps} />)

    expect(screen.getByText('testuser')).toBeInTheDocument()
  })

  it('applies correct theme classes', () => {
    const { rerender } = render(<Header {...defaultProps} />)

    // Test light mode
    expect(document.querySelector('.light')).toBeInTheDocument()

    // Test dark mode
    rerender(<Header {...defaultProps} isDarkMode={true} />)
    expect(document.querySelector('.dark')).toBeInTheDocument()
  })

  it('is accessible with proper ARIA labels', () => {
    render(<Header {...defaultProps} />)

    const nav = screen.getByRole('banner')
    expect(nav).toBeInTheDocument()

    const themeButton = screen.getByRole('button', { name: /toggle theme/i })
    expect(themeButton).toHaveAttribute('aria-label')
  })
})
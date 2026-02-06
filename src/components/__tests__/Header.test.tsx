import { render, screen, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router'
import Header from '../layout/Header'

// Mock hooks
vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: null,
    loading: false,
  })),
}))

vi.mock('../../contexts/InstrumentContext', () => ({
  useInstrument: () => ({
    navigateToSandbox: vi.fn(),
  }),
}))

vi.mock('../../contexts/TranslationContext', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'nav.home': 'Home',
        'nav.dashboard': 'Dashboard',
        'nav.sandbox': 'Sandbox',
        'nav.songs': 'Songs',
        'nav.classroom': 'Classroom',
        'auth.signIn': 'Sign In',
        'auth.signUp': 'Sign Up',
      }
      return translations[key] || key
    },
  }),
}))

vi.mock('../common/ThemeToggle', () => ({
  default: ({ onToggle }: { onToggle: () => void }) => (
    <button aria-label="Toggle theme" onClick={onToggle}>
      Toggle theme
    </button>
  ),
}))

vi.mock('../auth/AuthModal', () => ({
  default: () => null,
}))

vi.mock('../auth/UserMenu', () => ({
  default: () => <div data-testid="user-menu">User Menu</div>,
}))

import { useAuth } from '../../hooks/useAuth'

const mockUseAuth = vi.mocked(useAuth)

function renderHeader(props = {}) {
  const defaultProps = {
    isDarkMode: false,
    onToggleTheme: vi.fn(),
    ...props,
  }
  return render(
    <MemoryRouter>
      <Header {...defaultProps} />
    </MemoryRouter>
  )
}

describe('Header', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      isNewUser: false,
      clearNewUserFlag: vi.fn(),
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      updatePassword: vi.fn(),
      deleteAccount: vi.fn(),
    })
  })

  it('renders the logo and navigation', () => {
    renderHeader()

    expect(screen.getByAltText('Keplear')).toBeInTheDocument()
    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Sandbox')).toBeInTheDocument()
    expect(screen.getByText('Songs')).toBeInTheDocument()
    expect(screen.getByText('Classroom')).toBeInTheDocument()
  })

  it('calls onToggleTheme when theme button is clicked', () => {
    const mockToggleTheme = vi.fn()
    renderHeader({ onToggleTheme: mockToggleTheme })

    const themeButton = screen.getByRole('button', { name: /toggle theme/i })
    fireEvent.click(themeButton)

    expect(mockToggleTheme).toHaveBeenCalledTimes(1)
  })

  it('shows login button when user is not authenticated', () => {
    renderHeader()

    expect(screen.getByText('Sign In')).toBeInTheDocument()
    expect(screen.getByText('Sign Up')).toBeInTheDocument()
  })

  it('shows user menu when user is authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', email: 'test@example.com' } as ReturnType<typeof mockUseAuth>['user'],
      loading: false,
      isNewUser: false,
      clearNewUserFlag: vi.fn(),
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      updatePassword: vi.fn(),
      deleteAccount: vi.fn(),
    })

    renderHeader()

    expect(screen.getByTestId('user-menu')).toBeInTheDocument()
  })

  it('shows Dashboard link for logged-in users instead of Home', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', email: 'test@example.com' } as ReturnType<typeof mockUseAuth>['user'],
      loading: false,
      isNewUser: false,
      clearNewUserFlag: vi.fn(),
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      updatePassword: vi.fn(),
      deleteAccount: vi.fn(),
    })

    renderHeader()

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.queryByText('Home')).not.toBeInTheDocument()
  })

  it('renders banner element for accessibility', () => {
    renderHeader()
    expect(screen.getByRole('banner')).toBeInTheDocument()
  })
})

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { InstrumentProvider } from '../../contexts/InstrumentContext'
import { AuthProvider } from '../../contexts/AuthContext'
import App from '../../App'

// Mock Tone.js for integration tests
const mockTone = {
  start: vi.fn().mockResolvedValue(undefined),
  Sampler: vi.fn().mockImplementation(() => ({
    triggerAttackRelease: vi.fn(),
    toDestination: vi.fn().mockReturnThis(),
    dispose: vi.fn(),
    disconnect: vi.fn(),
    connect: vi.fn(),
  })),
  Recorder: vi.fn().mockImplementation(() => ({
    start: vi.fn(),
    stop: vi.fn().mockResolvedValue(new Blob()),
  })),
  Gain: vi.fn().mockImplementation(() => ({
    connect: vi.fn(),
  })),
  getDestination: vi.fn().mockReturnValue({}),
}

vi.mock('tone', () => mockTone)

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
  },
}))

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>
    <InstrumentProvider>
      {children}
    </InstrumentProvider>
  </AuthProvider>
)

describe('Audio Workflow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should complete full keyboard workflow', async () => {
    render(<App />, { wrapper: TestWrapper })

    // Wait for app to load
    await waitFor(() => {
      expect(screen.getByText('Keplear')).toBeInTheDocument()
    })

    // Check that keyboard is default instrument
    expect(screen.getByText('Keyboard')).toBeInTheDocument()

    // Select range for melody generation
    const keys = screen.getAllByRole('button', { name: /key/i })
    if (keys.length >= 2) {
      fireEvent.click(keys[0])
      fireEvent.click(keys[1])
    }

    // Generate melody
    const generateButton = screen.getByRole('button', { name: /generate/i })
    fireEvent.click(generateButton)

    // Play melody
    const playButton = screen.getByRole('button', { name: /play/i })
    fireEvent.click(playButton)

    // Verify audio system was called
    await waitFor(() => {
      expect(mockTone.start).toHaveBeenCalled()
    })
  })

  it('should handle instrument switching', async () => {
    render(<App />, { wrapper: TestWrapper })

    await waitFor(() => {
      expect(screen.getByText('Keplear')).toBeInTheDocument()
    })

    // Switch to guitar
    const instrumentSelector = screen.getByRole('combobox', { name: /instrument/i })
    fireEvent.change(instrumentSelector, { target: { value: 'guitar' } })

    await waitFor(() => {
      expect(screen.getByText('Guitar')).toBeInTheDocument()
    })

    // Switch to bass
    fireEvent.change(instrumentSelector, { target: { value: 'bass' } })

    await waitFor(() => {
      expect(screen.getByText('Bass')).toBeInTheDocument()
    })
  })

  it('should handle theme switching', async () => {
    render(<App />, { wrapper: TestWrapper })

    await waitFor(() => {
      expect(screen.getByText('Keplear')).toBeInTheDocument()
    })

    // Toggle theme
    const themeButton = screen.getByRole('button', { name: /toggle theme/i })
    fireEvent.click(themeButton)

    // Check that body class changed
    await waitFor(() => {
      expect(document.body.className).toContain('dark')
    })

    // Toggle back
    fireEvent.click(themeButton)

    await waitFor(() => {
      expect(document.body.className).toContain('light')
    })
  })

  it('should handle BPM and note count changes', async () => {
    render(<App />, { wrapper: TestWrapper })

    await waitFor(() => {
      expect(screen.getByText('Keplear')).toBeInTheDocument()
    })

    // Change BPM
    const bpmInput = screen.getByLabelText(/bpm/i)
    fireEvent.change(bpmInput, { target: { value: '140' } })

    expect(bpmInput).toHaveValue(140)

    // Change note count
    const noteCountInput = screen.getByLabelText(/notes/i)
    fireEvent.change(noteCountInput, { target: { value: '8' } })

    expect(noteCountInput).toHaveValue(8)
  })

  it('should handle error scenarios gracefully', async () => {
    // Mock audio error
    mockTone.start.mockRejectedValueOnce(new Error('Audio context error'))

    render(<App />, { wrapper: TestWrapper })

    await waitFor(() => {
      expect(screen.getByText('Keplear')).toBeInTheDocument()
    })

    // Try to play a note - should not crash
    const keys = screen.getAllByRole('button', { name: /key/i })
    if (keys.length > 0) {
      fireEvent.click(keys[0])
    }

    // App should still be functional
    expect(screen.getByText('Keplear')).toBeInTheDocument()
  })
})
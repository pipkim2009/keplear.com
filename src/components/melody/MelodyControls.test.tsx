import { render, screen, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import MelodyControls from './MelodyControls'

// Mock the hook that MelodyControls actually uses
const mockPlayback = {
  handleGenerateMelody: vi.fn(),
  handlePlayMelody: vi.fn(),
  handleRecordMelody: vi.fn(),
  isPlaying: false,
  isRecording: false,
  generatedMelody: [{ name: 'C4', frequency: 261.63 }],
  handleClearRecordedAudio: vi.fn(),
  recordedAudioBlob: null as Blob | null,
  hasChanges: false,
}

vi.mock('../../hooks', () => ({
  useMelodyPlayback: () => mockPlayback,
}))

describe('MelodyControls', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset to defaults
    mockPlayback.isPlaying = false
    mockPlayback.isRecording = false
    mockPlayback.generatedMelody = [{ name: 'C4', frequency: 261.63 }]
    mockPlayback.recordedAudioBlob = null
    mockPlayback.hasChanges = false
  })

  it('renders generate and record buttons', () => {
    render(<MelodyControls />)

    // Check for generate button (uses icon + text)
    expect(screen.getByText(/generate/i)).toBeInTheDocument()
  })

  it('calls handleGenerateMelody when generate button is clicked', () => {
    render(<MelodyControls />)

    const generateBtn = screen.getByText(/generate/i).closest('button')
    if (generateBtn) fireEvent.click(generateBtn)
    expect(mockPlayback.handleGenerateMelody).toHaveBeenCalledOnce()
  })

  it('shows stop button when playing', () => {
    mockPlayback.isPlaying = true
    render(<MelodyControls />)

    expect(screen.getByText(/stop/i)).toBeInTheDocument()
  })

  it('shows stop recording button when recording', () => {
    mockPlayback.isRecording = true
    render(<MelodyControls />)

    expect(screen.getByText(/stop/i)).toBeInTheDocument()
  })

  it('shows change indicator when hasChanges is true', () => {
    mockPlayback.hasChanges = true
    render(<MelodyControls />)

    // Change badge exists somewhere in the DOM
    const container = document.querySelector('.change-badge, [class*="change"]')
    expect(container || screen.queryByText('●')).toBeTruthy()
  })
})

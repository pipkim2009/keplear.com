import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import MelodyControls from './MelodyControls'
import * as InstrumentContext from '../../contexts/InstrumentContext'

// Mock the InstrumentContext
const mockInstrumentContext = {
  handleGenerateMelody: vi.fn(),
  handlePlayMelody: vi.fn(),
  handleRecordMelody: vi.fn(),
  isPlaying: false,
  isRecording: false,
  generatedMelody: [{ name: 'C4', frequency: 261.63 }],
  handleClearRecordedAudio: vi.fn(),
  recordedAudioBlob: null,
  hasChanges: false,
}

vi.mock('../../contexts/InstrumentContext', () => ({
  useInstrument: () => mockInstrumentContext
}))

describe('MelodyControls', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders all control buttons', () => {
    render(<MelodyControls />)

    expect(screen.getByText('🎵 Generate Melody')).toBeInTheDocument()
    expect(screen.getByText('▶️ Play')).toBeInTheDocument()
    expect(screen.getByText('🎤 Record')).toBeInTheDocument()
  })

  it('calls handleGenerateMelody when generate button is clicked', () => {
    render(<MelodyControls />)

    fireEvent.click(screen.getByText('🎵 Generate Melody'))
    expect(mockInstrumentContext.handleGenerateMelody).toHaveBeenCalledOnce()
  })

  it('calls handlePlayMelody when play button is clicked', () => {
    render(<MelodyControls />)

    fireEvent.click(screen.getByText('▶️ Play'))
    expect(mockInstrumentContext.handlePlayMelody).toHaveBeenCalledOnce()
  })

  it('shows stop button when playing', () => {
    mockInstrumentContext.isPlaying = true
    render(<MelodyControls />)

    expect(screen.getByText('⏸️ Stop')).toBeInTheDocument()
  })

  it('shows stop recording button when recording', () => {
    mockInstrumentContext.isRecording = true
    render(<MelodyControls />)

    expect(screen.getByText('⏹️ Stop Recording')).toBeInTheDocument()
  })

  it('disables play button when no melody is generated', () => {
    mockInstrumentContext.generatedMelody = []
    render(<MelodyControls />)

    const playButton = screen.getByText('▶️ Play')
    expect(playButton).toBeDisabled()
  })

  it('renders recorded audio player when recording exists', () => {
    mockInstrumentContext.recordedAudioBlob = new Blob(['audio'], { type: 'audio/wav' })
    render(<MelodyControls />)

    expect(screen.getByRole('button', { name: /clear recording/i })).toBeInTheDocument()
  })

  it('shows change badge when hasChanges is true', () => {
    mockInstrumentContext.hasChanges = true
    render(<MelodyControls />)

    expect(screen.getByText('●')).toBeInTheDocument()
  })

  it('does not show change badge when hasChanges is false', () => {
    mockInstrumentContext.hasChanges = false
    render(<MelodyControls />)

    expect(screen.queryByText('●')).not.toBeInTheDocument()
  })
})
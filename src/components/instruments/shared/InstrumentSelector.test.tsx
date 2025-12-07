import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import InstrumentSelector from './InstrumentSelector'

// Mock the InstrumentContext
const mockInstrumentContext = {
  instrument: 'keyboard',
  handleInstrumentChange: vi.fn(),
}

vi.mock('../../contexts/InstrumentContext', () => ({
  useInstrument: () => mockInstrumentContext
}))

describe('InstrumentSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders all instrument options', () => {
    render(<InstrumentSelector />)

    expect(screen.getByText('Choose Your Instrument')).toBeInTheDocument()
    expect(screen.getByText('Keyboard')).toBeInTheDocument()
    expect(screen.getByText('Guitar')).toBeInTheDocument()
    expect(screen.getByText('Bass')).toBeInTheDocument()
  })

  it('marks the current instrument as active', () => {
    render(<InstrumentSelector />)

    const keyboardButton = screen.getByText('Keyboard').closest('button')
    expect(keyboardButton).toHaveClass('active')
  })

  it('calls handleInstrumentChange when instrument is selected', () => {
    render(<InstrumentSelector />)

    const guitarButton = screen.getByText('Guitar').closest('button')
    fireEvent.click(guitarButton!)

    expect(mockInstrumentContext.handleInstrumentChange).toHaveBeenCalledWith('guitar')
  })

  it('highlights different instrument when selected', () => {
    mockInstrumentContext.instrument = 'bass'
    render(<InstrumentSelector />)

    const bassButton = screen.getByText('Bass').closest('button')
    expect(bassButton).toHaveClass('active')

    const keyboardButton = screen.getByText('Keyboard').closest('button')
    expect(keyboardButton).not.toHaveClass('active')
  })
})
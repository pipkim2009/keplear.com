import { screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import { render } from '../../../test/test-utils'
import InstrumentSelector from './InstrumentSelector'

// Mock the useInstrumentType hook (used by the component via ../../../hooks)
const mockInstrumentContext = {
  instrument: 'keyboard' as string,
  handleInstrumentChange: vi.fn(),
  setInstrument: vi.fn(),
}

vi.mock('../../../hooks', async importOriginal => {
  const actual = await importOriginal<Record<string, unknown>>()
  return {
    ...actual,
    useInstrumentType: () => mockInstrumentContext,
  }
})

describe('InstrumentSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInstrumentContext.instrument = 'keyboard'
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

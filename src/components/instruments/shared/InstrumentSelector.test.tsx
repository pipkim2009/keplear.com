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

    const names = screen.getAllByText('Keyboard')
    expect(names.length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Guitar').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Bass').length).toBeGreaterThanOrEqual(1)
  })

  it('marks the current instrument as active', () => {
    render(<InstrumentSelector />)

    const cards = document.querySelectorAll('.instrument-card')
    const keyboardCard = Array.from(cards).find(c => c.classList.contains('keyboard-theme'))
    expect(keyboardCard).toHaveClass('active')
  })

  it('calls handleInstrumentChange when instrument is selected', () => {
    render(<InstrumentSelector />)

    const cards = document.querySelectorAll('.instrument-card')
    const guitarCard = Array.from(cards).find(c => c.classList.contains('guitar-theme'))
    fireEvent.click(guitarCard!)

    expect(mockInstrumentContext.handleInstrumentChange).toHaveBeenCalledWith('guitar')
  })

  it('highlights different instrument when selected', () => {
    mockInstrumentContext.instrument = 'bass'
    render(<InstrumentSelector />)

    const cards = document.querySelectorAll('.instrument-card')
    const bassCard = Array.from(cards).find(c => c.classList.contains('bass-theme'))
    expect(bassCard).toHaveClass('active')

    const keyboardCard = Array.from(cards).find(c => c.classList.contains('keyboard-theme'))
    expect(keyboardCard).not.toHaveClass('active')
  })

  it('excludes instruments when exclude prop is provided', () => {
    render(<InstrumentSelector exclude={['keyboard']} />)

    const cards = document.querySelectorAll('.instrument-card')
    const keyboardCard = Array.from(cards).find(c => c.classList.contains('keyboard-theme'))
    expect(keyboardCard).toBeUndefined()
    expect(cards.length).toBe(2)
  })
})

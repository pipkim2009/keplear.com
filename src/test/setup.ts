import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock for CSS modules
const mockCSSModules = new Proxy(
  {},
  {
    get: () => 'mocked-css-class',
  }
)

// Mock CSS module imports
vi.mock('*.module.css', () => mockCSSModules)

// Mock matchMedia (needed for useTheme and other media query hooks)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock audio context for Tone.js
global.AudioContext = vi.fn().mockImplementation(() => ({
  createOscillator: vi.fn(),
  createGain: vi.fn().mockReturnValue({
    connect: vi.fn(),
    gain: { value: 1, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
  }),
  createMediaStreamDestination: vi.fn().mockReturnValue({ stream: new MediaStream() }),
  destination: {},
  currentTime: 0,
  sampleRate: 44100,
  state: 'running',
  suspend: vi.fn(),
  resume: vi.fn(),
  close: vi.fn(),
}))

// Mock Web Audio API
Object.defineProperty(window, 'AudioContext', {
  writable: true,
  value: global.AudioContext,
})

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn()

// Suppress console warnings during tests (keep errors visible)
const originalConsoleWarn = console.warn
beforeEach(() => {
  console.warn = vi.fn()
})

afterEach(() => {
  console.warn = originalConsoleWarn
})

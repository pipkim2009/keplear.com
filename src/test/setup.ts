import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock for CSS modules
const mockCSSModules = new Proxy({}, {
  get: () => 'mocked-css-class'
})

// Mock CSS module imports
vi.mock('*.module.css', () => mockCSSModules)

// Mock audio context for Tone.js
global.AudioContext = vi.fn().mockImplementation(() => ({
  createOscillator: vi.fn(),
  createGain: vi.fn(),
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

// Suppress console warnings during tests
const originalConsoleWarn = console.warn
beforeEach(() => {
  console.warn = vi.fn()
})

afterEach(() => {
  console.warn = originalConsoleWarn
})
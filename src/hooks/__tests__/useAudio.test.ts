import { renderHook, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { useAudio } from '../useAudio'

// Mock Tone.js
const mockTone = {
  start: vi.fn().mockResolvedValue(undefined),
  context: { state: 'running' },
  now: vi.fn().mockReturnValue(0),
  Sampler: vi.fn().mockImplementation(config => {
    // Call onload asynchronously to simulate successful loading
    if (config?.onload) {
      setTimeout(() => config.onload(), 0)
    }
    return {
      triggerAttackRelease: vi.fn(),
      toDestination: vi.fn().mockReturnThis(),
      dispose: vi.fn(),
      disconnect: vi.fn(),
      connect: vi.fn(),
    }
  }),
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

describe('useAudio', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize with correct default state', () => {
    const { result } = renderHook(() => useAudio())

    expect(result.current.isPlaying).toBe(false)
    expect(result.current.isRecording).toBe(false)
    expect(typeof result.current.playNote).toBe('function')
    expect(typeof result.current.playGuitarNote).toBe('function')
    expect(typeof result.current.playBassNote).toBe('function')
  })

  it('should handle note playing', async () => {
    const { result } = renderHook(() => useAudio())

    await act(async () => {
      await result.current.playNote('C4')
    })

    expect(mockTone.start).toHaveBeenCalled()
    expect(mockTone.Sampler).toHaveBeenCalled()
  })

  it('should handle melody playback', async () => {
    const { result } = renderHook(() => useAudio())
    const testMelody = [
      { name: 'C4', position: 0 },
      { name: 'D4', position: 1 },
    ]

    await act(async () => {
      await result.current.playMelody(testMelody, 120)
    })

    // After playback completes, isPlaying returns to false
    expect(result.current.isPlaying).toBe(false)
    // Verify audio system was initialized during playback
    expect(mockTone.start).toHaveBeenCalled()
    expect(mockTone.Sampler).toHaveBeenCalled()
  })

  it('should stop melody playback', async () => {
    const { result } = renderHook(() => useAudio())

    act(() => {
      result.current.stopMelody()
    })

    expect(result.current.isPlaying).toBe(false)
  })

  it('should handle recording', async () => {
    const { result } = renderHook(() => useAudio())
    const testMelody = [{ name: 'C4', position: 0 }]

    await act(async () => {
      const blob = await result.current.recordMelody(testMelody, 120, 'keyboard')
      expect(blob).toBeInstanceOf(Blob)
    })

    expect(mockTone.Recorder).toHaveBeenCalled()
  })

  it('should handle empty melody gracefully', async () => {
    const { result } = renderHook(() => useAudio())

    await act(async () => {
      await result.current.playMelody([], 120)
    })

    expect(result.current.isPlaying).toBe(false)
  })
})

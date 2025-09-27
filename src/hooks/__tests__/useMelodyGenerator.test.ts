import { renderHook, act } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { useMelodyGenerator } from '../useMelodyGenerator'
import type { Note } from '../../utils/notes'

const mockNotes: Note[] = [
  { name: 'C4', position: 0 },
  { name: 'D4', position: 1 },
  { name: 'E4', position: 2 },
  { name: 'F4', position: 3 },
  { name: 'G4', position: 4 },
]

describe('useMelodyGenerator', () => {
  it('should initialize with empty state', () => {
    const { result } = renderHook(() => useMelodyGenerator())

    expect(result.current.selectedNotes).toEqual([])
    expect(result.current.generatedMelody).toEqual([])
    expect(result.current.clearTrigger).toBe(0)
  })

  describe('range selection mode', () => {
    it('should select notes in range mode', () => {
      const { result } = renderHook(() => useMelodyGenerator())

      act(() => {
        result.current.selectNote(mockNotes[0], 'range')
      })

      expect(result.current.selectedNotes).toHaveLength(1)
      expect(result.current.selectedNotes[0]).toEqual(mockNotes[0])

      act(() => {
        result.current.selectNote(mockNotes[2], 'range')
      })

      expect(result.current.selectedNotes).toHaveLength(2)
    })

    it('should limit to 2 notes in range mode', () => {
      const { result } = renderHook(() => useMelodyGenerator())

      act(() => {
        result.current.selectNote(mockNotes[0], 'range')
        result.current.selectNote(mockNotes[1], 'range')
        result.current.selectNote(mockNotes[2], 'range')
      })

      expect(result.current.selectedNotes).toHaveLength(1)
      expect(result.current.selectedNotes[0]).toEqual(mockNotes[2])
    })

    it('should generate melody from range', () => {
      const { result } = renderHook(() => useMelodyGenerator())

      act(() => {
        result.current.selectNote(mockNotes[0], 'range')
        result.current.selectNote(mockNotes[2], 'range')
      })

      act(() => {
        result.current.generateMelody(mockNotes, 4, 'keyboard', 'range')
      })

      expect(result.current.generatedMelody).toHaveLength(4)
      result.current.generatedMelody.forEach(note => {
        expect(note.position).toBeGreaterThanOrEqual(0)
        expect(note.position).toBeLessThanOrEqual(2)
      })
    })
  })

  describe('multi selection mode', () => {
    it('should toggle notes in multi mode', () => {
      const { result } = renderHook(() => useMelodyGenerator())

      act(() => {
        result.current.selectNote(mockNotes[0], 'multi')
      })

      expect(result.current.selectedNotes).toHaveLength(1)

      act(() => {
        result.current.selectNote(mockNotes[0], 'multi')
      })

      expect(result.current.selectedNotes).toHaveLength(0)
    })

    it('should allow multiple notes in multi mode', () => {
      const { result } = renderHook(() => useMelodyGenerator())

      act(() => {
        result.current.selectNote(mockNotes[0], 'multi')
        result.current.selectNote(mockNotes[1], 'multi')
        result.current.selectNote(mockNotes[2], 'multi')
      })

      expect(result.current.selectedNotes).toHaveLength(3)
    })
  })

  describe('guitar mode', () => {
    it('should generate melody for guitar', () => {
      const { result } = renderHook(() => useMelodyGenerator())

      act(() => {
        result.current.setGuitarNotes([mockNotes[0], mockNotes[1]])
      })

      act(() => {
        result.current.generateMelody(mockNotes, 3, 'guitar')
      })

      expect(result.current.generatedMelody).toHaveLength(3)
    })
  })

  describe('utility functions', () => {
    it('should check if note is selected', () => {
      const { result } = renderHook(() => useMelodyGenerator())

      act(() => {
        result.current.selectNote(mockNotes[0], 'multi')
      })

      expect(result.current.isSelected(mockNotes[0])).toBe(true)
      expect(result.current.isSelected(mockNotes[1])).toBe(false)
    })

    it('should check if note is in melody', () => {
      const { result } = renderHook(() => useMelodyGenerator())

      act(() => {
        result.current.setGuitarNotes([mockNotes[0]])
        result.current.generateMelody(mockNotes, 1, 'guitar')
      })

      expect(result.current.isInMelody(mockNotes[0], true)).toBe(true)
      expect(result.current.isInMelody(mockNotes[0], false)).toBe(false)
    })

    it('should clear selection', () => {
      const { result } = renderHook(() => useMelodyGenerator())

      act(() => {
        result.current.selectNote(mockNotes[0], 'multi')
        result.current.generateMelody([mockNotes[0]], 1, 'guitar')
      })

      expect(result.current.selectedNotes).toHaveLength(1)
      expect(result.current.generatedMelody).toHaveLength(1)

      act(() => {
        result.current.clearSelection()
      })

      expect(result.current.selectedNotes).toHaveLength(0)
      expect(result.current.generatedMelody).toHaveLength(0)
      expect(result.current.clearTrigger).toBe(1)
    })
  })
})
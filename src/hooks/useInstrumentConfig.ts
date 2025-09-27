import { useReducer, useCallback } from 'react'
import {
  instrumentReducer,
  initialInstrumentState,
  type InstrumentType,
  type KeyboardSelectionMode,
  type InstrumentState,
  type InstrumentAction
} from '../reducers/instrumentReducer'

interface UseInstrumentConfigReturn {
  // State
  readonly instrument: InstrumentType
  readonly keyboardOctaves: { lower: number; higher: number }
  readonly keyboardSelectionMode: KeyboardSelectionMode
  readonly clearChordsAndScalesTrigger: number

  // Actions
  setInstrument: (instrument: InstrumentType) => void
  setKeyboardOctaves: (octaves: { lower: number; higher: number }) => void
  addLowerOctave: () => void
  removeLowerOctave: () => void
  addHigherOctave: () => void
  removeHigherOctave: () => void
  setKeyboardSelectionMode: (mode: KeyboardSelectionMode) => void
  triggerClearChordsAndScales: () => void
  resetOctaves: () => void

  // Derived state
  hasExtendedOctaves: boolean
}

/**
 * Custom hook for managing instrument configuration state
 * Encapsulates all instrument selection and configuration logic
 */
export const useInstrumentConfig = (): UseInstrumentConfigReturn => {
  const [state, dispatch] = useReducer(instrumentReducer, initialInstrumentState)

  // Action creators
  const setInstrument = useCallback((instrument: InstrumentType) => {
    dispatch({ type: 'SET_INSTRUMENT', payload: instrument })
  }, [])

  const setKeyboardOctaves = useCallback((octaves: { lower: number; higher: number }) => {
    dispatch({ type: 'SET_KEYBOARD_OCTAVES', payload: octaves })
  }, [])

  const addLowerOctave = useCallback(() => {
    dispatch({ type: 'UPDATE_LOWER_OCTAVES', payload: state.keyboardOctaves.lower + 1 })
  }, [state.keyboardOctaves.lower])

  const removeLowerOctave = useCallback(() => {
    dispatch({ type: 'UPDATE_LOWER_OCTAVES', payload: state.keyboardOctaves.lower - 1 })
  }, [state.keyboardOctaves.lower])

  const addHigherOctave = useCallback(() => {
    dispatch({ type: 'UPDATE_HIGHER_OCTAVES', payload: state.keyboardOctaves.higher + 1 })
  }, [state.keyboardOctaves.higher])

  const removeHigherOctave = useCallback(() => {
    dispatch({ type: 'UPDATE_HIGHER_OCTAVES', payload: state.keyboardOctaves.higher - 1 })
  }, [state.keyboardOctaves.higher])

  const setKeyboardSelectionMode = useCallback((mode: KeyboardSelectionMode) => {
    dispatch({ type: 'SET_KEYBOARD_SELECTION_MODE', payload: mode })
  }, [])

  const triggerClearChordsAndScales = useCallback(() => {
    dispatch({ type: 'TRIGGER_CLEAR_CHORDS_AND_SCALES' })
  }, [])

  const resetOctaves = useCallback(() => {
    dispatch({ type: 'RESET_OCTAVES' })
  }, [])

  // Derived state
  const hasExtendedOctaves = state.keyboardOctaves.lower !== 0 || state.keyboardOctaves.higher !== 0

  return {
    // State
    instrument: state.instrument,
    keyboardOctaves: state.keyboardOctaves,
    keyboardSelectionMode: state.keyboardSelectionMode,
    clearChordsAndScalesTrigger: state.clearChordsAndScalesTrigger,

    // Actions
    setInstrument,
    setKeyboardOctaves,
    addLowerOctave,
    removeLowerOctave,
    addHigherOctave,
    removeHigherOctave,
    setKeyboardSelectionMode,
    triggerClearChordsAndScales,
    resetOctaves,

    // Derived state
    hasExtendedOctaves
  }
}
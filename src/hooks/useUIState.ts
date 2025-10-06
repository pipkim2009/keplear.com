import { useReducer, useCallback, useEffect, useRef } from 'react'
import {
  uiReducer,
  initialUIState,
  type UIState,
  type UIAction,
  type PageType,
  type InputType,
  type ChordMode
} from '../reducers/uiReducer'

interface UseUIStateReturn {
  // State
  readonly currentPage: PageType
  readonly bpm: number
  readonly numberOfNotes: number
  readonly chordMode: ChordMode
  readonly flashingInputs: Record<InputType, boolean>
  readonly activeInputs: Record<InputType, boolean>

  // Navigation actions
  navigateToHome: () => void
  navigateToSandbox: () => void
  navigateToPractice: () => void
  setCurrentPage: (page: PageType) => void

  // Settings actions
  setBpm: (bpm: number) => void
  setNumberOfNotes: (count: number) => void
  setChordMode: (mode: ChordMode) => void

  // Input flash actions
  triggerInputFlash: (inputType: InputType) => void
  setInputActive: (inputType: InputType, active: boolean) => void
  clearAllFlashing: () => void
  clearAllActive: () => void

  // Utility actions
  resetSettings: () => void
}

/**
 * Custom hook for managing UI state and input interactions
 * Handles page navigation, settings, and input flashing logic
 */
export const useUIState = (): UseUIStateReturn => {
  const [state, dispatch] = useReducer(uiReducer, initialUIState)

  // Refs to track initial render for flash prevention
  const isInitialBpm = useRef(true)
  const isInitialNotes = useRef(true)
  const isInitialMode = useRef(true)

  // Navigation actions
  const navigateToHome = useCallback(() => {
    dispatch({ type: 'SET_CURRENT_PAGE', payload: 'home' })
  }, [])

  const navigateToSandbox = useCallback(() => {
    dispatch({ type: 'SET_CURRENT_PAGE', payload: 'sandbox' })
  }, [])

  const navigateToPractice = useCallback(() => {
    dispatch({ type: 'SET_CURRENT_PAGE', payload: 'practice' })
  }, [])

  const setCurrentPage = useCallback((page: PageType) => {
    dispatch({ type: 'SET_CURRENT_PAGE', payload: page })
  }, [])

  // Settings actions
  const setBpm = useCallback((bpm: number) => {
    dispatch({ type: 'SET_BPM', payload: bpm })
  }, [])

  const setNumberOfNotes = useCallback((count: number) => {
    dispatch({ type: 'SET_NUMBER_OF_NOTES', payload: count })
  }, [])

  const setChordMode = useCallback((mode: ChordMode) => {
    dispatch({ type: 'SET_CHORD_MODE', payload: mode })
  }, [])

  // Input flash actions
  const triggerInputFlash = useCallback((inputType: InputType) => {
    dispatch({ type: 'TRIGGER_INPUT_FLASH', payload: inputType })
    // Auto-clear flash after 1 second
    setTimeout(() => {
      dispatch({ type: 'CLEAR_INPUT_FLASH', payload: inputType })
    }, 1000)
  }, [])

  const setInputActive = useCallback((inputType: InputType, active: boolean) => {
    dispatch({ type: 'SET_INPUT_ACTIVE', payload: { inputType, active } })
  }, [])

  const clearAllFlashing = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL_FLASHING' })
  }, [])

  const clearAllActive = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL_ACTIVE' })
  }, [])

  const resetSettings = useCallback(() => {
    dispatch({ type: 'RESET_SETTINGS' })
  }, [])

  // Auto-flash effects for BPM changes (skip initial render and when actively changing)
  useEffect(() => {
    if (isInitialBpm.current) {
      isInitialBpm.current = false
    } else if (!state.activeInputs.bpm) {
      // Only trigger if not currently in active state (being held down)
      triggerInputFlash('bpm')
    }
  }, [state.bpm, triggerInputFlash, state.activeInputs.bpm])

  // Auto-flash effects for number of notes changes (skip initial render and when actively changing)
  useEffect(() => {
    if (isInitialNotes.current) {
      isInitialNotes.current = false
    } else if (!state.activeInputs.notes) {
      // Only trigger if not currently in active state (being held down)
      triggerInputFlash('notes')
    }
  }, [state.numberOfNotes, triggerInputFlash, state.activeInputs.notes])

  return {
    // State
    currentPage: state.currentPage,
    bpm: state.bpm,
    numberOfNotes: state.numberOfNotes,
    chordMode: state.chordMode,
    flashingInputs: state.flashingInputs,
    activeInputs: state.activeInputs,

    // Navigation actions
    navigateToHome,
    navigateToSandbox,
    navigateToPractice,
    setCurrentPage,

    // Settings actions
    setBpm,
    setNumberOfNotes,
    setChordMode,

    // Input flash actions
    triggerInputFlash,
    setInputActive,
    clearAllFlashing,
    clearAllActive,

    // Utility actions
    resetSettings
  }
}
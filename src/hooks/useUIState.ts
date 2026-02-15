import { useReducer, useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import {
  uiReducer,
  initialUIState,
  type PageType,
  type InputType,
  type ChordMode,
} from '../reducers/uiReducer'

interface UseUIStateReturn {
  // State
  readonly currentPage: PageType
  readonly bpm: number
  readonly numberOfBeats: number
  readonly chordMode: ChordMode
  readonly flashingInputs: Record<InputType, boolean>
  readonly activeInputs: Record<InputType, boolean>

  // Navigation actions
  navigateToHome: () => void
  navigateToGenerator: () => void
  navigateToSongs: () => void
  navigateToClassroom: () => void
  navigateToProfile: (userId?: string) => void
  navigateToDashboard: () => void
  setCurrentPage: (page: PageType) => void
  profileUserId: string | null

  // Settings actions
  setBpm: (bpm: number) => void
  setNumberOfBeats: (count: number) => void
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
  const [profileUserId, setProfileUserId] = useState<string | null>(null)
  const navigate = useNavigate()

  // Refs to track initial render for flash prevention
  const isInitialBpm = useRef(true)
  const isInitialNotes = useRef(true)

  // Page-to-path mapping
  const pageToPath = useCallback((page: PageType): string => {
    switch (page) {
      case 'home':
        return '/'
      case 'generator':
        return '/generator'
      case 'songs':
        return '/songs'
      case 'classroom':
        return '/classroom'
      case 'profile':
        return '/profile'
      case 'dashboard':
        return '/dashboard'
      default:
        return '/'
    }
  }, [])

  // Navigate using React Router and sync internal state
  const navigateWithUrl = useCallback(
    (page: PageType, path?: string) => {
      dispatch({ type: 'SET_CURRENT_PAGE', payload: page })
      const url = path || pageToPath(page)
      navigate(url)
    },
    [pageToPath, navigate]
  )

  // Navigation actions
  const navigateToHome = useCallback(() => {
    navigateWithUrl('home')
  }, [navigateWithUrl])

  const navigateToGenerator = useCallback(() => {
    navigateWithUrl('generator')
  }, [navigateWithUrl])

  const navigateToSongs = useCallback(() => {
    navigateWithUrl('songs')
  }, [navigateWithUrl])

  const navigateToClassroom = useCallback(() => {
    navigateWithUrl('classroom')
  }, [navigateWithUrl])

  const navigateToProfile = useCallback(
    (userId?: string) => {
      setProfileUserId(userId || null)
      const path = userId ? `/profile/${userId}` : '/profile'
      navigateWithUrl('profile', path)
    },
    [navigateWithUrl]
  )

  const navigateToDashboard = useCallback(() => {
    navigateWithUrl('dashboard')
  }, [navigateWithUrl])

  const setCurrentPage = useCallback(
    (page: PageType) => {
      navigateWithUrl(page)
    },
    [navigateWithUrl]
  )

  // Settings actions
  const setBpm = useCallback((bpm: number) => {
    dispatch({ type: 'SET_BPM', payload: bpm })
  }, [])

  const setNumberOfBeats = useCallback((count: number) => {
    dispatch({ type: 'SET_NUMBER_OF_BEATS', payload: count })
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

  // Auto-flash effects for number of beats changes (skip initial render and when actively changing)
  useEffect(() => {
    if (isInitialNotes.current) {
      isInitialNotes.current = false
    } else if (!state.activeInputs.beats) {
      // Only trigger if not currently in active state (being held down)
      triggerInputFlash('beats')
    }
  }, [state.numberOfBeats, triggerInputFlash, state.activeInputs.beats])

  return {
    // State
    currentPage: state.currentPage,
    bpm: state.bpm,
    numberOfBeats: state.numberOfBeats,
    chordMode: state.chordMode,
    flashingInputs: state.flashingInputs,
    activeInputs: state.activeInputs,

    // Navigation actions
    navigateToHome,
    navigateToGenerator,
    navigateToSongs,
    navigateToClassroom,
    navigateToProfile,
    navigateToDashboard,
    setCurrentPage,
    profileUserId,

    // Settings actions
    setBpm,
    setNumberOfBeats,
    setChordMode,

    // Input flash actions
    triggerInputFlash,
    setInputActive,
    clearAllFlashing,
    clearAllActive,

    // Utility actions
    resetSettings,
  }
}

import { createContext, useContext, ReactNode } from 'react'
import { useUIState } from '../hooks/useUIState'
import type { ChordMode } from '../reducers/uiReducer'

interface UIContextType {
  // Navigation
  currentPage: string
  navigateToHome: () => void
  navigateToSandbox: () => void
  navigateToPractice: () => void
  setCurrentPage: (page: string) => void

  // Controls State
  bpm: number
  setBpm: (bpm: number) => void
  numberOfNotes: number
  setNumberOfNotes: (notes: number) => void
  chordMode: ChordMode
  setChordMode: (mode: ChordMode) => void

  // UI Feedback
  flashingInputs: { bpm: boolean; notes: boolean; mode: boolean }
  activeInputs: { bpm: boolean; notes: boolean; mode: boolean }
  triggerInputFlash: (input: 'bpm' | 'notes' | 'mode') => void
  setInputActive: (input: 'bpm' | 'notes' | 'mode', active: boolean) => void
}

const UIContext = createContext<UIContextType | undefined>(undefined)

export const useUI = () => {
  const context = useContext(UIContext)
  if (context === undefined) {
    throw new Error('useUI must be used within a UIProvider')
  }
  return context
}

interface UIProviderProps {
  children: ReactNode
}

export const UIProvider: React.FC<UIProviderProps> = ({ children }) => {
  const uiState = useUIState()

  const value: UIContextType = {
    currentPage: uiState.currentPage,
    navigateToHome: uiState.navigateToHome,
    navigateToSandbox: uiState.navigateToSandbox,
    navigateToPractice: uiState.navigateToPractice,
    setCurrentPage: uiState.setCurrentPage,
    bpm: uiState.bpm,
    setBpm: uiState.setBpm,
    numberOfNotes: uiState.numberOfNotes,
    setNumberOfNotes: uiState.setNumberOfNotes,
    chordMode: uiState.chordMode,
    setChordMode: uiState.setChordMode,
    flashingInputs: uiState.flashingInputs,
    activeInputs: uiState.activeInputs,
    triggerInputFlash: uiState.triggerInputFlash,
    setInputActive: uiState.setInputActive
  }

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>
}
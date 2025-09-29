import { createContext, useContext, ReactNode } from 'react'
import { useInstrumentConfig } from '../hooks/useInstrumentConfig'
import type { InstrumentType } from '../types/instrument'

interface InstrumentConfigContextType {
  // Instrument Selection
  instrument: InstrumentType
  setInstrument: (instrument: InstrumentType) => void

  // Keyboard Octaves
  keyboardOctaves: { lower: number; higher: number }

  // Selection Mode
  keyboardSelectionMode: 'range' | 'multi'
  setKeyboardSelectionMode: (mode: 'range' | 'multi') => void

  // Scale/Chord Management
  clearChordsAndScalesTrigger: number
  triggerClearChordsAndScales: () => void
}

const InstrumentConfigContext = createContext<InstrumentConfigContextType | undefined>(undefined)

export const useInstrumentConfigContext = () => {
  const context = useContext(InstrumentConfigContext)
  if (context === undefined) {
    throw new Error('useInstrumentConfigContext must be used within an InstrumentConfigProvider')
  }
  return context
}

interface InstrumentConfigProviderProps {
  children: ReactNode
}

export const InstrumentConfigProvider: React.FC<InstrumentConfigProviderProps> = ({ children }) => {
  const config = useInstrumentConfig()

  const value: InstrumentConfigContextType = {
    instrument: config.instrument,
    setInstrument: config.setInstrument,
    keyboardOctaves: config.keyboardOctaves,
    keyboardSelectionMode: config.keyboardSelectionMode,
    setKeyboardSelectionMode: config.setKeyboardSelectionMode,
    clearChordsAndScalesTrigger: config.clearChordsAndScalesTrigger,
    triggerClearChordsAndScales: config.triggerClearChordsAndScales
  }

  return <InstrumentConfigContext.Provider value={value}>{children}</InstrumentConfigContext.Provider>
}
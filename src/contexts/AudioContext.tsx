import { createContext, useContext, ReactNode } from 'react'
import { useAudio } from '../hooks/useAudio'
import type { Note } from '../utils/notes'
import type { InstrumentType } from '../types/instrument'

interface AudioContextType {
  // Audio playback functions
  playNote: (note: string) => Promise<void>
  playGuitarNote: (note: string) => Promise<void>
  playBassNote: (note: string) => Promise<void>
  playMelody: (melody: readonly Note[], bpm: number) => Promise<void>
  playGuitarMelody: (melody: readonly Note[], bpm: number) => Promise<void>
  playBassMelody: (melody: readonly Note[], bpm: number) => Promise<void>
  stopMelody: () => void
  recordMelody: (notes: readonly Note[], bpm: number, instrument: InstrumentType) => Promise<Blob | null>
  isPlaying: boolean
  isRecording: boolean
}

const AudioContext = createContext<AudioContextType | undefined>(undefined)

export const useAudioContext = () => {
  const context = useContext(AudioContext)
  if (context === undefined) {
    throw new Error('useAudioContext must be used within an AudioProvider')
  }
  return context
}

interface AudioProviderProps {
  children: ReactNode
}

export const AudioProvider: React.FC<AudioProviderProps> = ({ children }) => {
  const audioHook = useAudio()

  const value: AudioContextType = {
    playNote: audioHook.playNote,
    playGuitarNote: audioHook.playGuitarNote,
    playBassNote: audioHook.playBassNote,
    playMelody: audioHook.playMelody,
    playGuitarMelody: audioHook.playGuitarMelody,
    playBassMelody: audioHook.playBassMelody,
    stopMelody: audioHook.stopMelody,
    recordMelody: audioHook.recordMelody,
    isPlaying: audioHook.isPlaying,
    isRecording: audioHook.isRecording
  }

  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>
}
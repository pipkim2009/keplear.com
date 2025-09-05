import { useState, useEffect, useCallback } from 'react'
import type { Note } from '../utils/notes'
import { SERVICE_URLS, AUDIO_CONFIG } from '../constants'

/**
 * Configuration for an instrument's audio samples
 */
interface InstrumentConfig {
  /** Mapping of note names to sample file names */
  readonly urls: Readonly<Record<string, string>>
  /** Release time in seconds */
  readonly release: number
  /** Base URL for sample files */
  readonly baseUrl: string
  /** Default duration for note playback */
  readonly defaultDuration: string
}

/**
 * Supported instrument types
 */
type InstrumentType = 'keyboard' | 'guitar'

/**
 * Configuration for all supported instruments
 */
const INSTRUMENTS: Readonly<Record<InstrumentType, InstrumentConfig>> = Object.freeze({
  keyboard: {
    urls: Object.freeze({
      C4: "C4.mp3",
      "D#4": "Ds4.mp3",
      "F#4": "Fs4.mp3",
      A4: "A4.mp3",
      C5: "C5.mp3",
      "D#5": "Ds5.mp3",
      "F#5": "Fs5.mp3",
      A5: "A5.mp3",
    }),
    release: 1.5,
    baseUrl: SERVICE_URLS.keyboardSamples,
    defaultDuration: AUDIO_CONFIG.keyboardDuration
  },
  guitar: {
    urls: Object.freeze({
      A2: "A2.mp3",
      A3: "A3.mp3", 
      A4: "A4.mp3",
      C3: "C3.mp3",
      C4: "C4.mp3",
      C5: "C5.mp3",
      "D#4": "Ds4.mp3",
      "F#2": "Fs2.mp3",
      "F#3": "Fs3.mp3", 
      "F#4": "Fs4.mp3",
      G3: "G3.mp3",
    }),
    release: 1.0,
    baseUrl: SERVICE_URLS.guitarSamples,
    defaultDuration: AUDIO_CONFIG.guitarDuration
  }
})

/**
 * Type for Tone.js Sampler instance
 * Using unknown instead of any for better type safety
 */
type ToneSampler = unknown

/**
 * Audio hook return type
 */
interface UseAudioReturn {
  playNote: (noteName: string, duration?: string) => Promise<void>
  playGuitarNote: (noteName: string, duration?: string) => Promise<void>
  playMelody: (melody: Note[], bpm: number) => Promise<void>
  playGuitarMelody: (melody: Note[], bpm: number) => Promise<void>
  stopMelody: () => void
  readonly isPlaying: boolean
}

/**
 * Custom hook for audio management and playback
 * Handles initialization, playing notes, and melody playback for keyboard and guitar instruments
 */
export const useAudio = (): UseAudioReturn => {
  const [samplers, setSamplers] = useState<Record<InstrumentType, ToneSampler | null>>({
    keyboard: null,
    guitar: null
  })
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [isInitialized, setIsInitialized] = useState<boolean>(false)
  const [shouldStop, setShouldStop] = useState<boolean>(false)
  const [currentTimeoutId, setCurrentTimeoutId] = useState<NodeJS.Timeout | null>(null)

  /**
   * Initializes the audio system by loading Tone.js and creating samplers
   * @returns Promise that resolves to the initialized samplers
   */
  const initializeAudio = useCallback(async (): Promise<Record<InstrumentType, ToneSampler | null>> => {
    if (isInitialized) return samplers

    try {
      // Dynamically import Tone.js only when needed to reduce bundle size
      const Tone = await import('tone')
      
      // Start audio context (required for Web Audio API)
      await Tone.start()
      
      const newSamplers: Record<InstrumentType, ToneSampler | null> = {
        keyboard: null,
        guitar: null
      }
      
      // Create samplers for each instrument and wait for them to load
      const samplerPromises = (Object.entries(INSTRUMENTS) as Array<[InstrumentType, InstrumentConfig]>)
        .map(([instrumentType, config]) => {
          return new Promise<void>((resolve) => {
            const sampler = new Tone.Sampler({
              urls: config.urls,
              release: config.release,
              baseUrl: config.baseUrl,
              onload: () => {
                newSamplers[instrumentType] = (sampler as ToneSampler & { toDestination: () => ToneSampler }).toDestination()
                resolve()
              }
            })
          })
        })

      // Wait for all samplers to load before proceeding
      await Promise.all(samplerPromises)

      setSamplers(newSamplers)
      setIsInitialized(true)
      return newSamplers
    } catch (error) {
      // Handle expected AudioContext errors (before user interaction)
      if (error instanceof Error && error.message.includes('AudioContext')) {
        return { keyboard: null, guitar: null }
      }
      console.warn('Audio initialization failed:', error)
      return { keyboard: null, guitar: null }
    }
  }, [isInitialized, samplers])

  useEffect(() => {
    return () => {
      Object.values(samplers).forEach(sampler => {
        if (sampler && typeof sampler === 'object' && 'dispose' in sampler) {
          (sampler as { dispose: () => void }).dispose()
        }
      })
    }
  }, [samplers])

  const playNote = useCallback(async (noteName: string, duration?: string): Promise<void> => {
    const currentSamplers = await initializeAudio()
    const sampler = currentSamplers.keyboard
    if (!sampler || typeof sampler !== 'object' || !('triggerAttackRelease' in sampler)) return
    
    ;(sampler as { triggerAttackRelease: (note: string, duration: string) => void })
      .triggerAttackRelease(noteName, duration || INSTRUMENTS.keyboard.defaultDuration)
  }, [initializeAudio])

  const playGuitarNote = useCallback(async (noteName: string, duration?: string): Promise<void> => {
    const currentSamplers = await initializeAudio()
    const sampler = currentSamplers.guitar
    if (!sampler || typeof sampler !== 'object' || !('triggerAttackRelease' in sampler)) return
    
    ;(sampler as { triggerAttackRelease: (note: string, duration: string) => void })
      .triggerAttackRelease(noteName, duration || INSTRUMENTS.guitar.defaultDuration)
  }, [initializeAudio])

  const playMelodyGeneric = useCallback(async (
    melody: Note[], 
    bpm: number, 
    instrument: 'keyboard' | 'guitar'
  ) => {
    if (melody.length === 0 || isPlaying) return
    
    const currentSamplers = await initializeAudio()
    const sampler = currentSamplers[instrument]
    if (!sampler || typeof sampler !== 'object' || !('triggerAttackRelease' in sampler)) return
    
    setIsPlaying(true)
    setShouldStop(false)
    setCurrentTimeoutId(null) // Reset any lingering timeout ID
    
    const noteDuration = (60 / bpm) * 800
    const playDuration = instrument === 'guitar' ? "0.6" : "0.5"
    
    const samplerWithMethod = sampler as { triggerAttackRelease: (note: string, duration: string) => void }
    
    try {
      for (let i = 0; i < melody.length; i++) {
        if (shouldStop) {
          break
        }
        samplerWithMethod.triggerAttackRelease(melody[i].name, playDuration)
        if (i < melody.length - 1) {
          await new Promise(resolve => {
            const timeoutId = setTimeout(resolve, noteDuration)
            setCurrentTimeoutId(timeoutId)
          })
          if (shouldStop) {
            break
          }
        }
      }
      
      // Add delay for the last note to finish playing (only if not stopped manually)
      if (!shouldStop) {
        await new Promise(resolve => {
          const timeoutId = setTimeout(resolve, noteDuration)
          setCurrentTimeoutId(timeoutId)
        })
      }
    } finally {
      setIsPlaying(false)
      setShouldStop(false)
      setCurrentTimeoutId(null)
    }
  }, [initializeAudio, isPlaying, shouldStop])

  const playMelody = useCallback((melody: Note[], bpm: number) => {
    return playMelodyGeneric(melody, bpm, 'keyboard')
  }, [playMelodyGeneric])

  const playGuitarMelody = useCallback((melody: Note[], bpm: number) => {
    return playMelodyGeneric(melody, bpm, 'guitar')
  }, [playMelodyGeneric])

  const stopMelody = useCallback(() => {
    setShouldStop(true)
    if (currentTimeoutId) {
      clearTimeout(currentTimeoutId)
      setCurrentTimeoutId(null)
    }
    // Immediately set playing to false when manually stopped
    setIsPlaying(false)
    
    // Reset shouldStop after a brief delay to ensure the playback loop sees it
    setTimeout(() => {
      setShouldStop(false)
    }, 10)
  }, [currentTimeoutId])

  return {
    playNote,
    playGuitarNote,
    playMelody,
    playGuitarMelody,
    stopMelody,
    isPlaying
  }
}
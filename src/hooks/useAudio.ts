import { useState, useEffect, useCallback } from 'react'

type Note = { name: string }

interface InstrumentConfig {
  urls: Record<string, string>
  release: number
  baseUrl: string
  defaultDuration: string
}

const INSTRUMENTS: Record<'keyboard' | 'guitar', InstrumentConfig> = {
  keyboard: {
    urls: {
      C4: "C4.mp3",
      "D#4": "Ds4.mp3",
      "F#4": "Fs4.mp3",
      A4: "A4.mp3",
      C5: "C5.mp3",
      "D#5": "Ds5.mp3",
      "F#5": "Fs5.mp3",
      A5: "A5.mp3",
    },
    release: 1.5,
    baseUrl: "https://tonejs.github.io/audio/salamander/",
    defaultDuration: "0.3"
  },
  guitar: {
    urls: {
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
    },
    release: 1.0,
    baseUrl: "https://nbrosowsky.github.io/tonejs-instruments/samples/guitar-acoustic/",
    defaultDuration: "0.5"
  }
}

export const useAudio = () => {
  const [samplers, setSamplers] = useState<Record<string, any>>({})
  const [isPlaying, setIsPlaying] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [shouldStop, setShouldStop] = useState(false)
  const [currentTimeoutId, setCurrentTimeoutId] = useState<NodeJS.Timeout | null>(null)

  const initializeAudio = useCallback(async () => {
    if (isInitialized) return samplers

    try {
      // Dynamically import Tone.js only when needed
      const Tone = await import('tone')
      
      // Start audio context (this will create it if needed)
      await Tone.start()
      
      const newSamplers: Record<string, any> = {}
      
      // Create samplers and wait for them to load
      const samplerPromises = Object.entries(INSTRUMENTS).map(([key, config]) => {
        return new Promise<void>((resolve) => {
          const sampler = new Tone.Sampler({
            urls: config.urls,
            release: config.release,
            baseUrl: config.baseUrl,
            onload: () => {
              newSamplers[key] = sampler.toDestination()
              resolve()
            }
          })
        })
      })

      // Wait for all samplers to load
      await Promise.all(samplerPromises)

      setSamplers(newSamplers)
      setIsInitialized(true)
      return newSamplers
    } catch (error) {
      // Silently fail if audio initialization fails (expected before user interaction)
      if (error instanceof Error && error.message.includes('AudioContext')) {
        // Expected error before user interaction - don't log
        return {}
      }
      console.warn('Audio initialization failed:', error)
      return {}
    }
  }, [isInitialized, samplers])

  useEffect(() => {
    return () => {
      Object.values(samplers).forEach(sampler => sampler.dispose())
    }
  }, [samplers])

  const playNote = useCallback(async (noteName: string, duration?: string) => {
    const currentSamplers = await initializeAudio()
    const sampler = currentSamplers.keyboard
    if (!sampler) return
    
    sampler.triggerAttackRelease(noteName, duration || INSTRUMENTS.keyboard.defaultDuration)
  }, [initializeAudio])

  const playGuitarNote = useCallback(async (noteName: string, duration?: string) => {
    const currentSamplers = await initializeAudio()
    const sampler = currentSamplers.guitar
    if (!sampler) return
    
    sampler.triggerAttackRelease(noteName, duration || INSTRUMENTS.guitar.defaultDuration)
  }, [initializeAudio])

  const playMelodyGeneric = useCallback(async (
    melody: Note[], 
    bpm: number, 
    instrument: 'keyboard' | 'guitar'
  ) => {
    if (melody.length === 0 || isPlaying) return
    
    const currentSamplers = await initializeAudio()
    const sampler = currentSamplers[instrument]
    if (!sampler) return
    
    setIsPlaying(true)
    setShouldStop(false)
    setCurrentTimeoutId(null) // Reset any lingering timeout ID
    
    const noteDuration = (60 / bpm) * 800
    const playDuration = instrument === 'guitar' ? "0.6" : "0.5"
    
    try {
      for (let i = 0; i < melody.length; i++) {
        if (shouldStop) {
          break
        }
        sampler.triggerAttackRelease(melody[i].name, playDuration)
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
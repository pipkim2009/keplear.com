import { useState, useEffect, useCallback } from 'react'
import type { Note } from '../utils/notes'
import { SERVICE_URLS, AUDIO_CONFIG } from '../constants'
import { withRetry, AudioError, CircuitBreaker, errorRecoveryStrategies } from '../utils/errorHandler'

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
type InstrumentType = 'keyboard' | 'guitar' | 'bass'

/**
 * Configuration for all supported instruments
 */
const INSTRUMENTS: Readonly<Record<InstrumentType, InstrumentConfig>> = Object.freeze({
  keyboard: {
    urls: Object.freeze({
      A1: "A1.mp3",
      A2: "A2.mp3",
      A3: "A3.mp3",
      A4: "A4.mp3",
      A5: "A5.mp3",
      A6: "A6.mp3",
      A7: "A7.mp3",
      C1: "C1.mp3",
      C2: "C2.mp3",
      C3: "C3.mp3",
      C4: "C4.mp3",
      C5: "C5.mp3",
      C6: "C6.mp3",
      C7: "C7.mp3",
      "D#1": "Ds1.mp3",
      "D#2": "Ds2.mp3",
      "D#3": "Ds3.mp3",
      "D#4": "Ds4.mp3",
      "D#5": "Ds5.mp3",
      "D#6": "Ds6.mp3",
      "D#7": "Ds7.mp3",
      "F#1": "Fs1.mp3",
      "F#2": "Fs2.mp3",
      "F#3": "Fs3.mp3",
      "F#4": "Fs4.mp3",
      "F#5": "Fs5.mp3",
      "F#6": "Fs6.mp3",
      "F#7": "Fs7.mp3",
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
      "D#3": "Ds3.mp3",
      "D#4": "Ds4.mp3",
      F2: "F2.mp3",
      F3: "F3.mp3",
      F4: "F4.mp3",
      "F#2": "Fs2.mp3",
      "F#3": "Fs3.mp3",
      "F#4": "Fs4.mp3",
      G2: "G2.mp3",
      G3: "G3.mp3",
      G4: "G4.mp3",
    }),
    release: 1.0,
    baseUrl: SERVICE_URLS.guitarSamples,
    defaultDuration: AUDIO_CONFIG.guitarDuration
  },
  bass: {
    urls: Object.freeze({
      "A#1": "As1.mp3",
      "A#2": "As2.mp3",
      "A#3": "As3.mp3",
      "A#4": "As4.mp3",
      E1: "E1.mp3",
      E2: "E2.mp3",
      E3: "E3.mp3",
      E4: "E4.mp3",
    }),
    release: 1.5,
    baseUrl: SERVICE_URLS.bassSamples,
    defaultDuration: AUDIO_CONFIG.bassDuration
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
  playBassNote: (noteName: string, duration?: string) => Promise<void>
  playMelody: (melody: Note[], bpm: number, chordMode?: 'arpeggiator' | 'progression') => Promise<void>
  playGuitarMelody: (melody: Note[], bpm: number, chordMode?: 'arpeggiator' | 'progression') => Promise<void>
  playBassMelody: (melody: Note[], bpm: number, chordMode?: 'arpeggiator' | 'progression') => Promise<void>
  stopMelody: () => void
  recordMelody: (melody: Note[], bpm: number, instrument?: 'keyboard' | 'guitar' | 'bass', chordMode?: 'arpeggiator' | 'progression') => Promise<Blob | null>
  readonly isPlaying: boolean
  readonly isRecording: boolean
}

/**
 * Custom hook for audio management and playback
 * Handles initialization, playing notes, and melody playback for keyboard and guitar instruments
 */
export const useAudio = (): UseAudioReturn => {
  const [samplers, setSamplers] = useState<Record<InstrumentType, ToneSampler | null>>({
    keyboard: null,
    guitar: null,
    bass: null
  })
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [isRecording, setIsRecording] = useState<boolean>(false)
  const [isInitialized, setIsInitialized] = useState<boolean>(false)
  const [shouldStop, setShouldStop] = useState<boolean>(false)
  const [currentTimeoutId, setCurrentTimeoutId] = useState<NodeJS.Timeout | null>(null)
  const [circuitBreaker] = useState(() => new CircuitBreaker(3, 30000, 15000))

  /**
   * Initializes the audio system by loading Tone.js and creating samplers
   * @returns Promise that resolves to the initialized samplers
   */
  const initializeAudio = useCallback(async (): Promise<Record<InstrumentType, ToneSampler | null>> => {
    if (isInitialized) return samplers

    return withRetry(async () => {
      return circuitBreaker.execute(async () => {
        try {
          // Dynamically import Tone.js only when needed to reduce bundle size
          const Tone = await import('tone')

          // Check and resume audio context if suspended
          if (Tone.context.state === 'suspended') {
            await errorRecoveryStrategies.audioContextSuspended()
          }

          // Start audio context (required for Web Audio API)
          await Tone.start()

          const newSamplers: Record<InstrumentType, ToneSampler | null> = {
            keyboard: null,
            guitar: null,
            bass: null
          }

          // Create samplers for each instrument and wait for them to load
          const samplerPromises = (Object.entries(INSTRUMENTS) as Array<[InstrumentType, InstrumentConfig]>)
            .map(([instrumentType, config]) => {
              return new Promise<void>((resolve, reject) => {
                const timeoutId = setTimeout(() => {
                  reject(new AudioError(`Sampler loading timeout for ${instrumentType}`))
                }, 10000) // 10 second timeout

                const sampler = new Tone.Sampler({
                  urls: config.urls,
                  release: config.release,
                  baseUrl: config.baseUrl,
                  onload: () => {
                    clearTimeout(timeoutId)
                    newSamplers[instrumentType] = (sampler as ToneSampler & { toDestination: () => ToneSampler }).toDestination()
                    resolve()
                  },
                  onerror: (error) => {
                    clearTimeout(timeoutId)
                    reject(new AudioError(`Failed to load sampler for ${instrumentType}: ${error}`))
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
            throw new AudioError('AudioContext not available - user interaction required')
          }
          throw new AudioError(`Audio initialization failed: ${error instanceof Error ? error.message : String(error)}`)
        }
      })
    }, {}, 'audio')
  }, [isInitialized, samplers, circuitBreaker])

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

  const playBassNote = useCallback(async (noteName: string, duration?: string): Promise<void> => {
    const currentSamplers = await initializeAudio()
    const sampler = currentSamplers.bass
    if (!sampler || typeof sampler !== 'object' || !('triggerAttackRelease' in sampler)) return

    ;(sampler as { triggerAttackRelease: (note: string, duration: string) => void })
      .triggerAttackRelease(noteName, duration || INSTRUMENTS.bass.defaultDuration)
  }, [initializeAudio])

  /**
   * Calculate the final delay after the last note for both playback and recording
   * @param bpm - Beats per minute
   * @returns Delay in milliseconds
   */
  const calculateFinalDelay = useCallback((bpm: number, instrument: 'keyboard' | 'guitar' | 'bass'): number => {
    // Simply use each instrument's actual release time
    const instrumentDelays = {
      keyboard: 1500, // 1.5 seconds
      guitar: 1000,   // 1.0 seconds
      bass: 1500      // 1.5 seconds
    }
    return instrumentDelays[instrument]
  }, [])

  const playMelodyGeneric = useCallback(async (
    melody: Note[],
    bpm: number,
    instrument: 'keyboard' | 'guitar' | 'bass',
    chordMode: 'arpeggiator' | 'progression' = 'arpeggiator'
  ) => {
    if (melody.length === 0 || isPlaying) return

    const currentSamplers = await initializeAudio()
    const sampler = currentSamplers[instrument]
    if (!sampler || typeof sampler !== 'object' || !('triggerAttackRelease' in sampler)) return

    setIsPlaying(true)
    setShouldStop(false)
    setCurrentTimeoutId(null) // Reset any lingering timeout ID

    const noteDuration = (60 / bpm) * 1000
    const playDuration = instrument === 'guitar' ? "0.6" : instrument === 'bass' ? "0.8" : "0.5"

    const samplerWithMethod = sampler as { triggerAttackRelease: (note: string | string[], duration: string) => void }

    try {
      if (chordMode === 'progression') {
        // In progression mode, play the chord group for each note
        const chordDuration = (60 / bpm) * 1000

        for (let i = 0; i < melody.length; i++) {
          if (shouldStop) break

          const note = melody[i]

          // Check if note has chord group info
          if (note.chordGroup && note.chordGroup.allNotes && note.chordGroup.allNotes.length > 0) {
            // Validate all notes in the chord group
            const validNotes = note.chordGroup.allNotes.filter(noteName => noteName && typeof noteName === 'string')
            if (validNotes.length > 0) {
              // Play all notes in the chord group
              samplerWithMethod.triggerAttackRelease(validNotes, playDuration)
            } else {
              console.warn('No valid notes in chord group, skipping beat', i)
            }
          } else if (note.name) {
            // Fallback: just play the single note
            samplerWithMethod.triggerAttackRelease(note.name, playDuration)
          } else {
            console.warn('Invalid note at position', i, note)
          }

          if (i < melody.length - 1) {
            await new Promise(resolve => {
              const timeoutId = setTimeout(resolve, chordDuration)
              setCurrentTimeoutId(timeoutId)
            })
            if (shouldStop) break
          }
        }
      } else {
        // Arpeggiator mode - play notes one by one
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
      }

      // Add delay for the last note to finish playing (only if not stopped manually)
      if (!shouldStop) {
        const finalDelay = calculateFinalDelay(bpm, instrument)
        await new Promise(resolve => {
          const timeoutId = setTimeout(resolve, finalDelay)
          setCurrentTimeoutId(timeoutId)
        })
      }
    } finally {
      setIsPlaying(false)
      setShouldStop(false)
      setCurrentTimeoutId(null)
    }
  }, [initializeAudio, isPlaying, shouldStop, calculateFinalDelay])

  const playMelody = useCallback((melody: Note[], bpm: number, chordMode: 'arpeggiator' | 'progression' = 'arpeggiator') => {
    return playMelodyGeneric(melody, bpm, 'keyboard', chordMode)
  }, [playMelodyGeneric])

  const playGuitarMelody = useCallback((melody: Note[], bpm: number, chordMode: 'arpeggiator' | 'progression' = 'arpeggiator') => {
    return playMelodyGeneric(melody, bpm, 'guitar', chordMode)
  }, [playMelodyGeneric])

  const playBassMelody = useCallback((melody: Note[], bpm: number, chordMode: 'arpeggiator' | 'progression' = 'arpeggiator') => {
    return playMelodyGeneric(melody, bpm, 'bass', chordMode)
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

  const recordMelody = useCallback(async (
    melody: Note[],
    bpm: number,
    instrument: 'keyboard' | 'guitar' | 'bass' = 'keyboard',
    chordMode: 'arpeggiator' | 'progression' = 'arpeggiator'
  ): Promise<Blob | null> => {
    if (melody.length === 0 || isPlaying || isRecording) return null

    try {
      const Tone = await import('tone')
      const currentSamplers = await initializeAudio()
      const sampler = currentSamplers[instrument]

      if (!sampler || typeof sampler !== 'object' || !('triggerAttackRelease' in sampler)) {
        return null
      }
      setIsRecording(true)

      // Create recorder (let browser choose supported format)
      const recorder = new Tone.Recorder()

      // Create a gain node to control volume during recording
      const gainNode = new Tone.Gain(0) // 0 = silent, 1 = normal volume
      const destination = Tone.getDestination()

      // Connect: sampler -> gainNode -> destination (speakers)
      // Connect: sampler -> recorder (for recording)
      const samplerNode = sampler as any
      samplerNode.disconnect() // Disconnect from speakers
      samplerNode.connect(gainNode) // Connect to gain control
      samplerNode.connect(recorder) // Connect to recorder
      gainNode.connect(destination) // Gain to speakers (muted)

      // Start recording
      recorder.start()

      const noteDuration = (60 / bpm) * 1000
      const playDuration = instrument === 'guitar' ? "0.6" : instrument === 'bass' ? "0.8" : "0.5"
      const samplerWithMethod = sampler as { triggerAttackRelease: (note: string | string[], duration: string, time?: number) => void }

      // Use Web Audio API precise timing instead of setTimeout
      const startTimeAudio = Tone.now()

      if (chordMode === 'progression') {
        // Each melody position is one beat
        const chordDuration = (60 / bpm) * 1000

        // Schedule chord for each melody position
        for (let i = 0; i < melody.length; i++) {
          const note = melody[i]
          const noteTime = startTimeAudio + (i * (chordDuration / 1000))

          // Check if note has chord group info
          if (note.chordGroup && note.chordGroup.allNotes && note.chordGroup.allNotes.length > 0) {
            // Validate all notes in the chord group
            const validNotes = note.chordGroup.allNotes.filter(noteName => noteName && typeof noteName === 'string')
            if (validNotes.length > 0) {
              // Play all notes in the chord group
              samplerWithMethod.triggerAttackRelease(validNotes, playDuration, noteTime)
            } else {
              console.warn('No valid notes in chord group, skipping beat', i)
            }
          } else if (note.name) {
            // Fallback: just play the single note
            samplerWithMethod.triggerAttackRelease(note.name, playDuration, noteTime)
          } else {
            console.warn('Invalid note at position', i, note)
          }
        }

        // Calculate duration based on melody length
        const totalDurationMs = (melody.length - 1) * chordDuration + calculateFinalDelay(bpm, instrument)
        const totalDuration = totalDurationMs / 1000
        const endTimeAudio = startTimeAudio + totalDuration

        // Wait for the exact audio timeline to finish
        const waitTime = (endTimeAudio - Tone.now()) * 1000
        await new Promise(resolve => setTimeout(resolve, Math.max(0, waitTime)))
      } else {
        // Arpeggiator mode - schedule all notes individually
        melody.forEach((note, i) => {
          const noteTime = startTimeAudio + (i * (noteDuration / 1000))
          samplerWithMethod.triggerAttackRelease(note.name, playDuration, noteTime)
        })

        // Calculate exact duration to match useMelodyPlayer calculation
        const totalDurationMs = (melody.length - 1) * noteDuration + calculateFinalDelay(bpm, instrument)
        const totalDuration = totalDurationMs / 1000
        const endTimeAudio = startTimeAudio + totalDuration

        // Wait for the exact audio timeline to finish
        const waitTime = (endTimeAudio - Tone.now()) * 1000
        await new Promise(resolve => setTimeout(resolve, Math.max(0, waitTime)))
      }

      // Stop recording and get the audio blob
      const recording = await recorder.stop()

      // Restore normal audio routing
      samplerNode.disconnect()
      samplerNode.connect(destination)

      setIsRecording(false)
      return recording

    } catch (error) {
      console.error('Recording failed:', error)
      setIsRecording(false)
      return null
    }
  }, [initializeAudio, isPlaying, isRecording, calculateFinalDelay])

  return {
    playNote,
    playGuitarNote,
    playBassNote,
    playMelody,
    playGuitarMelody,
    playBassMelody,
    stopMelody,
    recordMelody,
    isPlaying,
    isRecording
  }
}
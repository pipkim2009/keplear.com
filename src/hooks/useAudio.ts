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
 * Interface for Tone.js Sampler instance
 * Provides type safety for sampler operations
 */
interface ToneSampler {
  triggerAttackRelease: (note: string | string[], duration: string, time?: number) => void
  dispose: () => void
  disconnect: () => void
  connect: (destination: unknown) => void
  toDestination: () => ToneSampler
}

/**
 * Chord mode for melody playback
 */
type ChordMode = 'arpeggiator' | 'progression'

/**
 * Audio hook return type
 */
interface UseAudioReturn {
  /** Play a note on any instrument */
  playNoteForInstrument: (instrument: InstrumentType, noteName: string, duration?: string) => Promise<void>
  /** Convenience method for keyboard */
  playNote: (noteName: string, duration?: string) => Promise<void>
  /** Convenience method for guitar */
  playGuitarNote: (noteName: string, duration?: string) => Promise<void>
  /** Convenience method for bass */
  playBassNote: (noteName: string, duration?: string) => Promise<void>
  /** Play a melody on any instrument */
  playMelodyForInstrument: (instrument: InstrumentType, melody: Note[], bpm: number, chordMode?: ChordMode) => Promise<void>
  /** Convenience method for keyboard melody */
  playMelody: (melody: Note[], bpm: number, chordMode?: ChordMode) => Promise<void>
  /** Convenience method for guitar melody */
  playGuitarMelody: (melody: Note[], bpm: number, chordMode?: ChordMode) => Promise<void>
  /** Convenience method for bass melody */
  playBassMelody: (melody: Note[], bpm: number, chordMode?: ChordMode) => Promise<void>
  stopMelody: () => void
  recordMelody: (melody: Note[], bpm: number, instrument?: InstrumentType, chordMode?: ChordMode) => Promise<Blob | null>
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
          const instrumentTypes: InstrumentType[] = ['keyboard', 'guitar', 'bass']
          const samplerPromises = instrumentTypes.map((instrumentType) => {
            const config = INSTRUMENTS[instrumentType]
            return new Promise<void>((resolve, reject) => {
              const timeoutId = setTimeout(() => {
                reject(new AudioError(`Sampler loading timeout for ${instrumentType}`))
              }, 10000)

              const sampler = new Tone.Sampler({
                urls: config.urls,
                release: config.release,
                baseUrl: config.baseUrl,
                onload: () => {
                  clearTimeout(timeoutId)
                  newSamplers[instrumentType] = sampler.toDestination() as unknown as ToneSampler
                  resolve()
                },
                onerror: (error: Error) => {
                  clearTimeout(timeoutId)
                  reject(new AudioError(`Failed to load sampler for ${instrumentType}: ${error.message}`))
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

  // Cleanup samplers on unmount
  useEffect(() => {
    return () => {
      Object.values(samplers).forEach(sampler => {
        if (sampler) {
          sampler.dispose()
        }
      })
    }
  }, [samplers])

  /**
   * Generic function to play a single note on any instrument
   * Eliminates code duplication across instrument-specific methods
   */
  const playNoteForInstrument = useCallback(async (
    instrument: InstrumentType,
    noteName: string,
    duration?: string
  ): Promise<void> => {
    const currentSamplers = await initializeAudio()
    const sampler = currentSamplers[instrument]
    if (!sampler) return

    sampler.triggerAttackRelease(noteName, duration ?? INSTRUMENTS[instrument].defaultDuration)
  }, [initializeAudio])

  // Convenience methods that delegate to the generic function
  const playNote = useCallback(
    (noteName: string, duration?: string) => playNoteForInstrument('keyboard', noteName, duration),
    [playNoteForInstrument]
  )

  const playGuitarNote = useCallback(
    (noteName: string, duration?: string) => playNoteForInstrument('guitar', noteName, duration),
    [playNoteForInstrument]
  )

  const playBassNote = useCallback(
    (noteName: string, duration?: string) => playNoteForInstrument('bass', noteName, duration),
    [playNoteForInstrument]
  )

  /**
   * Calculate the final delay after the last note for both playback and recording
   * Uses each instrument's release time for natural decay
   */
  const calculateFinalDelay = useCallback((instrument: InstrumentType): number => {
    const instrumentDelays: Record<InstrumentType, number> = {
      keyboard: 1500, // 1.5 seconds
      guitar: 1000,   // 1.0 seconds
      bass: 1500      // 1.5 seconds
    }
    return instrumentDelays[instrument]
  }, [])

  /**
   * Get the play duration for an instrument
   */
  const getPlayDuration = (instrument: InstrumentType): string => {
    const durations: Record<InstrumentType, string> = {
      keyboard: "0.5",
      guitar: "0.6",
      bass: "0.8"
    }
    return durations[instrument]
  }

  /**
   * Generic melody playback function for any instrument
   * Supports both arpeggiator and progression chord modes
   */
  const playMelodyGeneric = useCallback(async (
    melody: Note[],
    bpm: number,
    instrument: InstrumentType,
    chordMode: ChordMode = 'arpeggiator'
  ): Promise<void> => {
    if (melody.length === 0 || isPlaying) return

    const currentSamplers = await initializeAudio()
    const sampler = currentSamplers[instrument]
    if (!sampler) return

    setIsPlaying(true)
    setShouldStop(false)
    setCurrentTimeoutId(null)

    const noteDuration = (60 / bpm) * 1000
    const playDuration = getPlayDuration(instrument)

    try {
      if (chordMode === 'progression') {
        const beatDuration = (60 / bpm) * 1000

        for (let i = 0; i < melody.length; i++) {
          if (shouldStop) break

          const note = melody[i]

          if (note.chordGroup?.allNotes && note.chordGroup.allNotes.length > 0) {
            const validNotes = note.chordGroup.allNotes.filter(
              (n): n is string => typeof n === 'string' && n.length > 0
            )
            if (validNotes.length > 0) {
              sampler.triggerAttackRelease(validNotes, playDuration)
            }
          } else if (note.name) {
            sampler.triggerAttackRelease(note.name, playDuration)
          }

          if (i < melody.length - 1) {
            await new Promise<void>(resolve => {
              const timeoutId = setTimeout(resolve, beatDuration)
              setCurrentTimeoutId(timeoutId)
            })
            if (shouldStop) break
          }
        }
      } else {
        for (let i = 0; i < melody.length; i++) {
          if (shouldStop) break

          sampler.triggerAttackRelease(melody[i].name, playDuration)

          if (i < melody.length - 1) {
            await new Promise<void>(resolve => {
              const timeoutId = setTimeout(resolve, noteDuration)
              setCurrentTimeoutId(timeoutId)
            })
            if (shouldStop) break
          }
        }
      }

      if (!shouldStop) {
        const finalDelay = calculateFinalDelay(instrument)
        await new Promise<void>(resolve => {
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

  // Convenience methods for melody playback
  const playMelody = useCallback(
    (melody: Note[], bpm: number, chordMode: ChordMode = 'arpeggiator') =>
      playMelodyGeneric(melody, bpm, 'keyboard', chordMode),
    [playMelodyGeneric]
  )

  const playGuitarMelody = useCallback(
    (melody: Note[], bpm: number, chordMode: ChordMode = 'arpeggiator') =>
      playMelodyGeneric(melody, bpm, 'guitar', chordMode),
    [playMelodyGeneric]
  )

  const playBassMelody = useCallback(
    (melody: Note[], bpm: number, chordMode: ChordMode = 'arpeggiator') =>
      playMelodyGeneric(melody, bpm, 'bass', chordMode),
    [playMelodyGeneric]
  )

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

  /**
   * Record a melody to an audio blob
   * Uses Web Audio API precise timing for accurate recording
   */
  const recordMelody = useCallback(async (
    melody: Note[],
    bpm: number,
    instrument: InstrumentType = 'keyboard',
    chordMode: ChordMode = 'arpeggiator'
  ): Promise<Blob | null> => {
    if (melody.length === 0 || isPlaying || isRecording) return null

    try {
      const Tone = await import('tone')
      const currentSamplers = await initializeAudio()
      const sampler = currentSamplers[instrument]

      if (!sampler) return null

      setIsRecording(true)

      const recorder = new Tone.Recorder()
      const gainNode = new Tone.Gain(0)
      const destination = Tone.getDestination()

      // Route: sampler -> recorder (for recording) and sampler -> gainNode -> destination (muted speakers)
      sampler.disconnect()
      sampler.connect(gainNode as unknown as ToneSampler)
      sampler.connect(recorder as unknown as ToneSampler)
      gainNode.connect(destination)

      recorder.start()

      const noteDuration = (60 / bpm) * 1000
      const playDuration = getPlayDuration(instrument)
      const startTimeAudio = Tone.now()

      if (chordMode === 'progression') {
        const beatDuration = (60 / bpm) * 1000

        for (let i = 0; i < melody.length; i++) {
          const note = melody[i]
          const noteTime = startTimeAudio + (i * (beatDuration / 1000))

          if (note.chordGroup?.allNotes && note.chordGroup.allNotes.length > 0) {
            const validNotes = note.chordGroup.allNotes.filter(
              (n): n is string => typeof n === 'string' && n.length > 0
            )
            if (validNotes.length > 0) {
              sampler.triggerAttackRelease(validNotes, playDuration, noteTime)
            }
          } else if (note.name) {
            sampler.triggerAttackRelease(note.name, playDuration, noteTime)
          }
        }

        const totalDurationMs = (melody.length - 1) * beatDuration + calculateFinalDelay(instrument)
        const endTimeAudio = startTimeAudio + (totalDurationMs / 1000)
        const waitTime = (endTimeAudio - Tone.now()) * 1000
        await new Promise<void>(resolve => setTimeout(resolve, Math.max(0, waitTime)))
      } else {
        melody.forEach((note, i) => {
          const noteTime = startTimeAudio + (i * (noteDuration / 1000))
          sampler.triggerAttackRelease(note.name, playDuration, noteTime)
        })

        const totalDurationMs = (melody.length - 1) * noteDuration + calculateFinalDelay(instrument)
        const endTimeAudio = startTimeAudio + (totalDurationMs / 1000)
        const waitTime = (endTimeAudio - Tone.now()) * 1000
        await new Promise<void>(resolve => setTimeout(resolve, Math.max(0, waitTime)))
      }

      const recording = await recorder.stop()

      // Restore normal audio routing
      sampler.disconnect()
      sampler.connect(destination as unknown as ToneSampler)

      setIsRecording(false)
      return recording

    } catch (error) {
      console.error('Recording failed:', error)
      setIsRecording(false)
      return null
    }
  }, [initializeAudio, isPlaying, isRecording, calculateFinalDelay])

  return {
    // Generic functions for any instrument
    playNoteForInstrument,
    playMelodyForInstrument: playMelodyGeneric,
    // Convenience methods for specific instruments
    playNote,
    playGuitarNote,
    playBassNote,
    playMelody,
    playGuitarMelody,
    playBassMelody,
    // Control methods
    stopMelody,
    recordMelody,
    // State
    isPlaying,
    isRecording
  }
}
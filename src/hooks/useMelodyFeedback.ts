/**
 * useMelodyFeedback Hook
 *
 * Live instrument melody feedback system that:
 * - Captures audio from microphone
 * - Transcribes polyphonic audio in real-time
 * - Matches detected notes against target melody
 * - Provides instant visual feedback
 *
 * Key features per specification:
 * - Rhythm is IGNORED - notes can be played at any speed
 * - Extra detected notes do NOT penalize the user
 * - ≤500ms end-to-end latency
 * - Persistence filtering for noise rejection
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import {
  MagentaTranscriber,
  MelodyMatcher,
  midiToNoteName,
  type TranscriberConfig,
  type TranscriberStatus,
  type TranscribedNote,
  type MelodyNote,
  type MelodyMatchState,
  type MelodyMatcherConfig
} from '../services/transcription'
import type { Note } from '../utils/notes'

// ============================================================================
// TYPES
// ============================================================================

export interface MelodyFeedbackConfig {
  /** Window size in ms (300-500) */
  windowSizeMs: number
  /** Hop size in ms (75-125) */
  hopSizeMs: number
  /** Onset probability threshold */
  onsetThreshold: number
  /** Require exact octave match */
  strictOctave: boolean
  /** Pitch tolerance in semitones */
  pitchTolerance: number
  /** Instrument type */
  instrument: 'keyboard' | 'guitar' | 'bass'
}

export interface FeedbackNote {
  /** Note name (e.g., "C4") */
  name: string
  /** MIDI pitch number */
  pitch: number
  /** Whether this note has been played */
  isPlayed: boolean
  /** Whether this is the current/next note to play */
  isCurrent: boolean
  /** Index in the melody */
  index: number
}

export interface MelodyFeedbackState {
  /** Is the system currently active/listening */
  isActive: boolean
  /** All melody notes with feedback status */
  notes: FeedbackNote[]
  /** Current note index (next to play) */
  currentIndex: number
  /** Number of notes played correctly */
  playedCount: number
  /** Total notes in melody */
  totalNotes: number
  /** Progress percentage (0-100) */
  progress: number
  /** Whether melody is complete */
  isComplete: boolean
  /** Currently detected notes (for display) */
  detectedNotes: TranscribedNote[]
  /** Most recent detected note name */
  lastDetectedNote: string | null
  /** Volume level (0-1) */
  volumeLevel: number
}

export interface UseMelodyFeedbackReturn {
  /** Start listening and providing feedback */
  start: () => Promise<void>
  /** Stop listening */
  stop: () => void
  /** Reset to beginning of melody */
  reset: () => void
  /** Set the melody to practice */
  setMelody: (melody: Note[]) => void
  /** Current feedback state */
  state: MelodyFeedbackState
  /** Transcriber status */
  modelStatus: TranscriberStatus
  /** Microphone permission state */
  permission: 'prompt' | 'granted' | 'denied' | 'error'
  /** Error message if any */
  error: string | null
  /** Update configuration */
  updateConfig: (config: Partial<MelodyFeedbackConfig>) => void
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_CONFIG: MelodyFeedbackConfig = {
  sampleRate: 16000,
  windowSizeMs: 400,
  hopSizeMs: 100,
  onsetThreshold: 0.5,
  strictOctave: false,
  pitchTolerance: 0,
  instrument: 'keyboard'
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useMelodyFeedback(
  initialConfig: Partial<MelodyFeedbackConfig> = {}
): UseMelodyFeedbackReturn {
  // Configuration
  const [config, setConfig] = useState<MelodyFeedbackConfig>({
    ...DEFAULT_CONFIG,
    ...initialConfig
  })

  // State
  const [state, setState] = useState<MelodyFeedbackState>({
    isActive: false,
    notes: [],
    currentIndex: 0,
    playedCount: 0,
    totalNotes: 0,
    progress: 0,
    isComplete: false,
    detectedNotes: [],
    lastDetectedNote: null,
    volumeLevel: 0
  })

  const [modelStatus, setModelStatus] = useState<TranscriberStatus>('unloaded')
  const [permission, setPermission] = useState<'prompt' | 'granted' | 'denied' | 'error'>('prompt')
  const [error, setError] = useState<string | null>(null)

  // Refs for audio processing
  const transcriberRef = useRef<MagentaTranscriber | null>(null)
  const matcherRef = useRef<MelodyMatcher | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const isActiveRef = useRef(false)
  const melodyRef = useRef<Note[]>([])
  const volumeIntervalRef = useRef<number | null>(null)

  /**
   * Initialize the transcriber
   */
  const initTranscriber = useCallback(async () => {
    if (!transcriberRef.current) {
      transcriberRef.current = new MagentaTranscriber({
        sampleRate: config.sampleRate,
        windowSizeMs: config.windowSizeMs,
        hopSizeMs: config.hopSizeMs,
        onsetThreshold: config.onsetThreshold,
        instrument: config.instrument
      })

      transcriberRef.current.setOnStatusChange(setModelStatus)

      transcriberRef.current.setOnTranscription((result) => {
        if (!isActiveRef.current || !matcherRef.current) return

        // Process detected notes through melody matcher
        const matches = matcherRef.current.processDetectedNotes(result.newOnsets)
        const matchState = matcherRef.current.getState()

        // Update state with new detections
        setState(prev => {
          const notes = prev.notes.map((note, idx) => ({
            ...note,
            isPlayed: matchState.notes[idx]?.isPlayed ?? false,
            isCurrent: idx === matchState.currentIndex
          }))

          return {
            ...prev,
            notes,
            currentIndex: matchState.currentIndex,
            playedCount: matchState.playedCount,
            progress: matchState.progress,
            isComplete: matchState.isComplete,
            detectedNotes: result.newOnsets,
            lastDetectedNote: result.newOnsets.length > 0
              ? result.newOnsets[0].noteName
              : prev.lastDetectedNote
          }
        })
      })
    }

    await transcriberRef.current.load()
  }, [config])

  /**
   * Initialize the melody matcher
   */
  const initMatcher = useCallback(() => {
    if (!matcherRef.current) {
      matcherRef.current = new MelodyMatcher({
        strictOctave: config.strictOctave,
        pitchToleranceSemitones: config.pitchTolerance,
        lookAhead: 2
      })
    }

    // Set melody from current melody ref
    if (melodyRef.current.length > 0) {
      const midiNotes = melodyRef.current.map(note => note.name)
      matcherRef.current.setMelody(midiNotes)
    }
  }, [config.strictOctave, config.pitchTolerance])

  /**
   * Request microphone permission and start audio capture
   */
  const startAudioCapture = useCallback(async () => {
    try {
      // Request microphone - let browser use native settings for best quality
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      })

      setPermission('granted')
      mediaStreamRef.current = stream

      // Create audio context - use browser's default sample rate
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      audioContextRef.current = new AudioContextClass()

      // Tell transcriber the actual sample rate
      const actualSampleRate = audioContextRef.current.sampleRate
      console.log(`[useMelodyFeedback] AudioContext sample rate: ${actualSampleRate}Hz`)

      if (transcriberRef.current) {
        transcriberRef.current.setActualSampleRate(actualSampleRate)
      }

      const source = audioContextRef.current.createMediaStreamSource(stream)

      // Create analyser for volume level
      analyserRef.current = audioContextRef.current.createAnalyser()
      analyserRef.current.fftSize = 2048
      source.connect(analyserRef.current)

      // Create script processor for raw audio data
      // Note: ScriptProcessorNode is deprecated but widely supported
      // Buffer size of 4096 gives ~93ms at 44.1kHz
      const bufferSize = 4096
      scriptProcessorRef.current = audioContextRef.current.createScriptProcessor(
        bufferSize,
        1, // mono input
        1  // mono output
      )

      scriptProcessorRef.current.onaudioprocess = (event) => {
        if (!isActiveRef.current || !transcriberRef.current) return

        const inputData = event.inputBuffer.getChannelData(0)
        const samples = new Float32Array(inputData)

        // Send to transcriber
        transcriberRef.current.processAudio(samples)
      }

      source.connect(scriptProcessorRef.current)
      scriptProcessorRef.current.connect(audioContextRef.current.destination)

      // Start volume level monitoring
      volumeIntervalRef.current = window.setInterval(() => {
        if (!analyserRef.current || !isActiveRef.current) return

        const dataArray = new Float32Array(analyserRef.current.fftSize)
        analyserRef.current.getFloatTimeDomainData(dataArray)

        // Calculate RMS volume
        let sum = 0
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i] * dataArray[i]
        }
        const rms = Math.sqrt(sum / dataArray.length)
        const volumeLevel = Math.min(1, rms * 10) // Scale for display

        setState(prev => ({ ...prev, volumeLevel }))
      }, 50)

    } catch (err) {
      console.error('[useMelodyFeedback] Microphone error:', err)
      if ((err as DOMException).name === 'NotAllowedError') {
        setPermission('denied')
        setError('Microphone access denied. Please allow microphone access.')
      } else {
        setPermission('error')
        setError('Failed to access microphone.')
      }
      throw err
    }
  }, [])

  /**
   * Stop audio capture
   */
  const stopAudioCapture = useCallback(() => {
    // Stop volume monitoring
    if (volumeIntervalRef.current) {
      clearInterval(volumeIntervalRef.current)
      volumeIntervalRef.current = null
    }

    // Disconnect script processor
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect()
      scriptProcessorRef.current = null
    }

    // Stop media stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop())
      mediaStreamRef.current = null
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
  }, [])

  /**
   * Set the melody to practice
   */
  const setMelody = useCallback((melody: Note[]) => {
    melodyRef.current = melody

    // Initialize matcher if needed
    if (matcherRef.current) {
      const midiNotes = melody.map(note => note.name)
      matcherRef.current.setMelody(midiNotes)
    }

    // Update state with new melody
    const notes: FeedbackNote[] = melody.map((note, index) => ({
      name: note.name,
      pitch: Math.round(note.frequency ? 12 * Math.log2(note.frequency / 440) + 69 : 60),
      isPlayed: false,
      isCurrent: index === 0,
      index
    }))

    setState(prev => ({
      ...prev,
      notes,
      currentIndex: 0,
      playedCount: 0,
      totalNotes: melody.length,
      progress: 0,
      isComplete: false,
      detectedNotes: [],
      lastDetectedNote: null
    }))
  }, [])

  /**
   * Start the feedback system
   */
  const start = useCallback(async () => {
    if (state.isActive) return

    setError(null)

    try {
      // Initialize transcriber
      await initTranscriber()

      // Initialize matcher
      initMatcher()

      // Start audio capture
      await startAudioCapture()

      // Set active
      isActiveRef.current = true
      setState(prev => ({ ...prev, isActive: true }))

    } catch (err) {
      console.error('[useMelodyFeedback] Failed to start:', err)
      isActiveRef.current = false
      setState(prev => ({ ...prev, isActive: false }))
    }
  }, [state.isActive, initTranscriber, initMatcher, startAudioCapture])

  /**
   * Stop the feedback system
   */
  const stop = useCallback(() => {
    isActiveRef.current = false

    // Stop audio
    stopAudioCapture()

    // Reset transcriber
    if (transcriberRef.current) {
      transcriberRef.current.reset()
    }

    setState(prev => ({
      ...prev,
      isActive: false,
      volumeLevel: 0
    }))
  }, [stopAudioCapture])

  /**
   * Reset to beginning of melody
   */
  const reset = useCallback(() => {
    // Reset matcher
    if (matcherRef.current) {
      matcherRef.current.reset()
    }

    // Reset transcriber
    if (transcriberRef.current) {
      transcriberRef.current.reset()
    }

    // Reset state
    setState(prev => ({
      ...prev,
      notes: prev.notes.map((note, idx) => ({
        ...note,
        isPlayed: false,
        isCurrent: idx === 0
      })),
      currentIndex: 0,
      playedCount: 0,
      progress: 0,
      isComplete: false,
      detectedNotes: [],
      lastDetectedNote: null
    }))
  }, [])

  /**
   * Update configuration
   */
  const updateConfig = useCallback((newConfig: Partial<MelodyFeedbackConfig>) => {
    setConfig(prev => {
      const updated = { ...prev, ...newConfig }

      // Update transcriber config
      if (transcriberRef.current) {
        transcriberRef.current.updateConfig({
          sampleRate: updated.sampleRate,
          windowSizeMs: updated.windowSizeMs,
          hopSizeMs: updated.hopSizeMs,
          onsetThreshold: updated.onsetThreshold,
          instrument: updated.instrument
        })
      }

      // Update matcher config
      if (matcherRef.current) {
        matcherRef.current.updateConfig({
          strictOctave: updated.strictOctave,
          pitchToleranceSemitones: updated.pitchTolerance
        })
      }

      return updated
    })
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isActiveRef.current = false
      stopAudioCapture()
      if (transcriberRef.current) {
        transcriberRef.current.dispose()
      }
    }
  }, [stopAudioCapture])

  return {
    start,
    stop,
    reset,
    setMelody,
    state,
    modelStatus,
    permission,
    error,
    updateConfig
  }
}

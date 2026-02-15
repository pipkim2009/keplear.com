import { useState, useCallback, useRef, useEffect } from 'react'

/** Minimal Tone.js type interfaces for dynamic import */
interface ToneSynth {
  triggerAttackRelease: (note: string, duration: string, time?: number) => void
  dispose: () => void
}

interface ToneLoop {
  start: (time: number) => void
  stop: () => void
  dispose: () => void
}

interface ToneModule {
  context: { state: string }
  start: () => Promise<void>
  Transport: {
    bpm: { value: number }
    start: () => void
    stop: () => void
    cancel: () => void
  }
  Draw: {
    schedule: (callback: () => void, time: number) => void
  }
  Synth: new (options: Record<string, unknown>) => { toDestination: () => ToneSynth }
  Loop: new (callback: (time: number) => void, interval: number | string) => ToneLoop
}

interface UseMetronomeReturn {
  readonly isPlaying: boolean
  readonly bpm: number
  readonly beatsPerBar: number
  readonly beatValue: number
  readonly currentBeat: number
  start: () => Promise<void>
  stop: () => void
  setBpm: (bpm: number | ((prev: number) => number)) => void
  setBeatsPerBar: (beats: number) => void
  setBeatValue: (value: number) => void
  tapTempo: () => void
}

const PRESET_TIME_SIGNATURES = ['2/4', '3/4', '4/4', '5/4', '6/8', '7/8'] as const
type PresetTimeSignature = (typeof PRESET_TIME_SIGNATURES)[number]

const PRESET_BEATS: Record<PresetTimeSignature, { top: number; bottom: number }> = {
  '2/4': { top: 2, bottom: 4 },
  '3/4': { top: 3, bottom: 4 },
  '4/4': { top: 4, bottom: 4 },
  '5/4': { top: 5, bottom: 4 },
  '6/8': { top: 6, bottom: 8 },
  '7/8': { top: 7, bottom: 8 },
}

const MIN_BPM = 1
const MAX_BPM = 999
const MIN_BEATS = 1
const MAX_BEATS = 256
const MIN_BEAT_VALUE = 1
const MAX_BEAT_VALUE = 256
const TAP_HISTORY_SIZE = 6
const TAP_RESET_MS = 2000

/**
 * Compute the interval in seconds for one beat.
 * A quarter note at the given BPM = 60/bpm seconds.
 * Beat value N means 1/N of a whole note = (4/N) quarter notes.
 * So interval = (60/bpm) * (4/N) seconds.
 * This works for any value of N — rational or irrational-style (e.g. 5, 7, 3).
 */
function computeIntervalSeconds(bpm: number, beatValue: number): number {
  return (60 / bpm) * (4 / beatValue)
}

export const useMetronome = (): UseMetronomeReturn => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [bpm, setBpmState] = useState(120)
  const [beatsPerBar, setBeatsPerBarState] = useState(4)
  const [beatValue, setBeatValueState] = useState(4)
  const [currentBeat, setCurrentBeat] = useState(0)

  // Tone.js refs
  const toneRef = useRef<ToneModule | null>(null)
  const accentSynthRef = useRef<ToneSynth | null>(null)
  const normalSynthRef = useRef<ToneSynth | null>(null)
  const loopRef = useRef<ToneLoop | null>(null)
  const beatIndexRef = useRef(0)
  const isPlayingRef = useRef(false)

  // Keep refs in sync so the loop callback always reads the latest values
  const beatsPerBarRef = useRef(beatsPerBar)
  beatsPerBarRef.current = beatsPerBar
  const beatValueRef = useRef(beatValue)
  beatValueRef.current = beatValue
  const bpmRef = useRef(bpm)
  bpmRef.current = bpm

  // Tap tempo refs
  const tapTimesRef = useRef<number[]>([])

  const initTone = useCallback(async (): Promise<ToneModule> => {
    if (toneRef.current) return toneRef.current
    const Tone = (await import('tone')) as unknown as ToneModule
    toneRef.current = Tone

    if (Tone.context.state === 'suspended') {
      await Tone.start()
    }

    accentSynthRef.current = new Tone.Synth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.05 },
      volume: -6,
    }).toDestination()

    normalSynthRef.current = new Tone.Synth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.05 },
      volume: -12,
    }).toDestination()

    return Tone
  }, [])

  /** Create (or recreate) the loop with current interval */
  const createLoop = useCallback(() => {
    const Tone = toneRef.current
    if (!Tone) return

    // Dispose old loop
    if (loopRef.current) {
      loopRef.current.stop()
      loopRef.current.dispose()
      loopRef.current = null
    }

    const interval = computeIntervalSeconds(bpmRef.current, beatValueRef.current)

    loopRef.current = new Tone.Loop((time: number) => {
      const beat = beatIndexRef.current % beatsPerBarRef.current
      const isAccent = beat === 0

      if (isAccent) {
        accentSynthRef.current?.triggerAttackRelease('C6', '32n', time)
      } else {
        normalSynthRef.current?.triggerAttackRelease('G5', '32n', time)
      }

      Tone.Draw.schedule(() => {
        setCurrentBeat(beat)
      }, time)

      beatIndexRef.current++
    }, interval)

    if (isPlayingRef.current) {
      loopRef.current.start(0)
    }
  }, [])

  const stop = useCallback(() => {
    if (loopRef.current) {
      loopRef.current.stop()
      loopRef.current.dispose()
      loopRef.current = null
    }
    if (toneRef.current) {
      toneRef.current.Transport.stop()
      toneRef.current.Transport.cancel()
    }
    beatIndexRef.current = 0
    setCurrentBeat(0)
    setIsPlaying(false)
    isPlayingRef.current = false
  }, [])

  const start = useCallback(async () => {
    if (isPlaying) {
      stop()
      return
    }

    const Tone = await initTone()

    // Use a fixed transport BPM of 60 so that interval in seconds = interval in beats
    Tone.Transport.bpm.value = 60
    beatIndexRef.current = 0

    isPlayingRef.current = true
    createLoop()

    loopRef.current.start(0)
    Tone.Transport.start()
    setIsPlaying(true)
  }, [isPlaying, initTone, stop, createLoop])

  const setBpm = useCallback((value: number | ((prev: number) => number)) => {
    setBpmState(prev => {
      const raw = typeof value === 'function' ? value(prev) : value
      const clamped = Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(raw)))
      bpmRef.current = clamped
      return clamped
    })
  }, [])

  const setBeatsPerBar = useCallback((value: number) => {
    const clamped = Math.min(MAX_BEATS, Math.max(MIN_BEATS, Math.round(value)))
    setBeatsPerBarState(clamped)
  }, [])

  const setBeatValue = useCallback((value: number) => {
    const clamped = Math.min(MAX_BEAT_VALUE, Math.max(MIN_BEAT_VALUE, Math.round(value)))
    setBeatValueState(clamped)
  }, [])

  // Hot-swap loop when bpm or beatValue changes while playing
  useEffect(() => {
    if (!isPlayingRef.current || !toneRef.current) return
    createLoop()
  }, [bpm, beatValue, createLoop])

  const tapTempo = useCallback(() => {
    const now = performance.now()
    const taps = tapTimesRef.current

    if (taps.length > 0 && now - taps[taps.length - 1] > TAP_RESET_MS) {
      tapTimesRef.current = []
    }

    tapTimesRef.current.push(now)

    if (tapTimesRef.current.length > TAP_HISTORY_SIZE) {
      tapTimesRef.current = tapTimesRef.current.slice(-TAP_HISTORY_SIZE)
    }

    if (tapTimesRef.current.length >= 2) {
      const intervals: number[] = []
      for (let i = 1; i < tapTimesRef.current.length; i++) {
        intervals.push(tapTimesRef.current[i] - tapTimesRef.current[i - 1])
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length
      const tappedBpm = Math.round(60000 / avgInterval)
      setBpm(tappedBpm)
    }
  }, [setBpm])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (loopRef.current) {
        loopRef.current.stop()
        loopRef.current.dispose()
      }
      if (accentSynthRef.current) {
        accentSynthRef.current.dispose()
      }
      if (normalSynthRef.current) {
        normalSynthRef.current.dispose()
      }
      if (toneRef.current) {
        toneRef.current.Transport.stop()
        toneRef.current.Transport.cancel()
      }
    }
  }, [])

  return {
    isPlaying,
    bpm,
    beatsPerBar,
    beatValue,
    currentBeat,
    start,
    stop,
    setBpm,
    setBeatsPerBar,
    setBeatValue,
    tapTempo,
  }
}

export { PRESET_TIME_SIGNATURES, PRESET_BEATS }
export type { PresetTimeSignature }

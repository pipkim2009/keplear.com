/**
 * Magenta Onsets & Frames Transcription Service
 *
 * Real-time polyphonic music transcription using YIN pitch detection
 * (Magenta model integration can be added later)
 *
 * Key features:
 * - Sliding window inference (≤500ms buffer)
 * - Onset-based note detection
 * - Persistence filtering for noise rejection
 */

// ============================================================================
// TYPES
// ============================================================================

export interface TranscribedNote {
  /** MIDI pitch number (21-108 for piano) */
  pitch: number
  /** Note name with octave (e.g., "C4", "F#5") */
  noteName: string
  /** Onset probability (0-1) */
  onsetProbability: number
  /** Frame probability (0-1) */
  frameProbability: number
  /** Timestamp in milliseconds */
  timestamp: number
  /** Duration the note has been active (ms) */
  duration: number
}

export interface TranscriptionResult {
  /** Currently active notes */
  activeNotes: TranscribedNote[]
  /** New note onsets detected this frame */
  newOnsets: TranscribedNote[]
  /** Inference timestamp */
  timestamp: number
  /** Processing latency (ms) */
  latency: number
}

export interface TranscriberConfig {
  /** Target sample rate (actual rate determined by browser) */
  sampleRate: number
  /** Window size in ms (300-500) */
  windowSizeMs: number
  /** Hop size in ms (75-125) */
  hopSizeMs: number
  /** Onset probability threshold (0-1) */
  onsetThreshold: number
  /** Frame probability threshold (0-1) */
  frameThreshold: number
  /** Instrument type for filtering */
  instrument: 'keyboard' | 'guitar' | 'bass'
}

export type TranscriberStatus = 'unloaded' | 'loading' | 'ready' | 'error'

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_CONFIG: TranscriberConfig = {
  sampleRate: 44100, // Will be updated to actual browser rate
  windowSizeMs: 400,
  hopSizeMs: 100,
  onsetThreshold: 0.3, // Lowered for better detection
  frameThreshold: 0.2,
  instrument: 'keyboard'
}

// MIDI pitch to note name mapping
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

// Instrument frequency ranges (Hz)
const INSTRUMENT_FREQ_RANGES = {
  keyboard: { min: 27.5, max: 4186 },   // A0 to C8
  guitar: { min: 82, max: 1319 },       // E2 to E6
  bass: { min: 41, max: 392 }           // E1 to G4
} as const

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Convert MIDI pitch number to note name with octave
 */
export function midiToNoteName(pitch: number): string {
  const octave = Math.floor(pitch / 12) - 1
  const noteIndex = pitch % 12
  return `${NOTE_NAMES[noteIndex]}${octave}`
}

/**
 * Convert note name to MIDI pitch number
 */
export function noteNameToMidi(noteName: string): number {
  const match = noteName.match(/^([A-G]#?)(\d+)$/)
  if (!match) return -1

  const [, note, octaveStr] = match
  const octave = parseInt(octaveStr, 10)
  const noteIndex = NOTE_NAMES.indexOf(note)

  if (noteIndex === -1) return -1
  return (octave + 1) * 12 + noteIndex
}

/**
 * Convert frequency to MIDI pitch
 */
function frequencyToMidi(freq: number): number {
  return Math.round(12 * Math.log2(freq / 440) + 69)
}

// ============================================================================
// MAIN TRANSCRIBER CLASS
// ============================================================================

export class MagentaTranscriber {
  private config: TranscriberConfig
  private status: TranscriberStatus = 'unloaded'
  private actualSampleRate: number = 44100

  // Audio buffer management
  private audioBuffer: Float32Array
  private bufferWriteIndex: number = 0
  private lastInferenceTime: number = 0
  private samplesReceived: number = 0

  // Note tracking for persistence filtering
  private noteHistory: Map<number, { count: number; lastSeen: number; totalDuration: number }> = new Map()
  private lastDetectedPitch: number = -1
  private lastPitchTimestamp: number = 0
  private silenceFrameCount: number = 0
  private readonly PERSISTENCE_FRAMES = 1 // Reduced for faster response
  private readonly MIN_DURATION_MS = 30 // Reduced for faster detection
  private readonly SILENCE_FRAMES_FOR_RESET = 2 // Reset after 2 frames of silence (~200ms)

  // Amplitude envelope tracking for detecting note re-attacks
  private recentRmsValues: number[] = []
  private readonly RMS_HISTORY_SIZE = 5
  private peakRms: number = 0
  private inDip: boolean = false
  private readonly DIP_THRESHOLD = 0.4 // RMS must drop to 40% of peak to count as a dip
  private readonly RISE_THRESHOLD = 1.5 // RMS must rise 50% from dip to count as re-attack

  // Callbacks
  private onStatusChange?: (status: TranscriberStatus) => void
  private onTranscription?: (result: TranscriptionResult) => void

  constructor(config: Partial<TranscriberConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }

    // Initialize with default buffer size, will be resized when actual sample rate is known
    this.audioBuffer = new Float32Array(Math.ceil(0.5 * 44100)) // 500ms at 44.1kHz
  }

  /**
   * Set the actual sample rate from the AudioContext
   */
  setActualSampleRate(rate: number): void {
    this.actualSampleRate = rate
    // Resize buffer for actual sample rate
    const bufferSamples = Math.ceil((this.config.windowSizeMs / 1000) * rate)
    this.audioBuffer = new Float32Array(bufferSamples)
    this.bufferWriteIndex = 0
    console.log(`[MagentaTranscriber] Sample rate set to ${rate}Hz, buffer size: ${bufferSamples}`)
  }

  getStatus(): TranscriberStatus {
    return this.status
  }

  setOnStatusChange(callback: (status: TranscriberStatus) => void): void {
    this.onStatusChange = callback
  }

  setOnTranscription(callback: (result: TranscriptionResult) => void): void {
    this.onTranscription = callback
  }

  updateConfig(config: Partial<TranscriberConfig>): void {
    this.config = { ...this.config, ...config }
  }

  async load(): Promise<void> {
    if (this.status === 'loading' || this.status === 'ready') {
      return
    }

    this.setStatus('loading')

    try {
      // No model to load - using YIN pitch detection
      this.setStatus('ready')
      console.log('[MagentaTranscriber] Ready (using YIN pitch detection)')
    } catch (error) {
      console.error('[MagentaTranscriber] Failed to initialize:', error)
      this.setStatus('error')
      throw error
    }
  }

  /**
   * Process incoming audio samples
   */
  processAudio(samples: Float32Array): void {
    if (this.status !== 'ready') {
      return
    }

    // Add samples to circular buffer
    const bufferLength = this.audioBuffer.length
    for (let i = 0; i < samples.length; i++) {
      this.audioBuffer[this.bufferWriteIndex] = samples[i]
      this.bufferWriteIndex = (this.bufferWriteIndex + 1) % bufferLength
    }

    this.samplesReceived += samples.length

    // Check if it's time to run inference (based on hop size)
    const now = performance.now()
    const timeSinceLastInference = now - this.lastInferenceTime

    if (timeSinceLastInference >= this.config.hopSizeMs) {
      this.runInference()
      this.lastInferenceTime = now
    }
  }

  /**
   * Run pitch detection on current buffer
   */
  private runInference(): void {
    const startTime = performance.now()

    try {
      // Get ordered audio from circular buffer
      const bufferLength = this.audioBuffer.length
      const orderedAudio = new Float32Array(bufferLength)

      for (let i = 0; i < bufferLength; i++) {
        const readIndex = (this.bufferWriteIndex + i) % bufferLength
        orderedAudio[i] = this.audioBuffer[readIndex]
      }

      // Check if we have enough signal
      const rms = this.calculateRMS(orderedAudio)

      // Track RMS history for envelope detection
      this.recentRmsValues.push(rms)
      if (this.recentRmsValues.length > this.RMS_HISTORY_SIZE) {
        this.recentRmsValues.shift()
      }

      // Detect amplitude dips and rises for note re-attack detection
      let isNewAttack = false
      if (rms > this.peakRms) {
        this.peakRms = rms
      }

      if (rms < this.peakRms * this.DIP_THRESHOLD) {
        // We're in a dip - amplitude dropped significantly
        this.inDip = true
      } else if (this.inDip && this.recentRmsValues.length >= 2) {
        // Check if we're rising from a dip
        const prevRms = this.recentRmsValues[this.recentRmsValues.length - 2]
        if (rms > prevRms * this.RISE_THRESHOLD && rms > 0.02) {
          // Rising from dip - this is a new attack!
          isNewAttack = true
          this.inDip = false
          this.peakRms = rms // Reset peak for next note
        }
      }

      // Decay peak over time to adapt to volume changes
      this.peakRms *= 0.995

      if (rms < 0.01) {
        // Too quiet - increment silence counter
        this.silenceFrameCount++

        // After enough silence, reset note history so next same-pitch detection is a new onset
        if (this.silenceFrameCount >= this.SILENCE_FRAMES_FOR_RESET) {
          this.noteHistory.clear()
          this.lastDetectedPitch = -1
          this.peakRms = 0
          this.inDip = false
        }

        // Emit empty result
        if (this.onTranscription) {
          this.onTranscription({
            activeNotes: [],
            newOnsets: [],
            timestamp: startTime,
            latency: performance.now() - startTime
          })
        }
        return
      }

      // We have signal - reset silence counter
      this.silenceFrameCount = 0

      // Detect pitch using YIN
      const { frequency, confidence } = this.computePitchYIN(orderedAudio, this.actualSampleRate)

      const detectedNotes: TranscribedNote[] = []

      if (frequency > 0 && confidence >= this.config.onsetThreshold) {
        const range = INSTRUMENT_FREQ_RANGES[this.config.instrument]

        if (frequency >= range.min && frequency <= range.max) {
          const midiPitch = frequencyToMidi(frequency)

          // Check if pitch changed from last detection - this indicates a note boundary
          if (this.lastDetectedPitch !== -1 && this.lastDetectedPitch !== midiPitch) {
            // Different pitch detected - clear history for the old pitch
            // so if it's played again, it will be detected as a new onset
            this.noteHistory.delete(this.lastDetectedPitch)
          }

          // If we detected a new attack (amplitude dip then rise) on the same pitch,
          // clear the history so it's treated as a new note
          if (isNewAttack && this.lastDetectedPitch === midiPitch) {
            this.noteHistory.delete(midiPitch)
          }

          this.lastDetectedPitch = midiPitch
          this.lastPitchTimestamp = startTime

          detectedNotes.push({
            pitch: midiPitch,
            noteName: midiToNoteName(midiPitch),
            onsetProbability: confidence,
            frameProbability: confidence,
            timestamp: startTime,
            duration: 0
          })
        }
      }

      // Apply persistence filtering
      const filteredNotes = this.applyPersistenceFilter(detectedNotes, startTime)

      // Build result
      const result: TranscriptionResult = {
        activeNotes: filteredNotes,
        newOnsets: filteredNotes.filter(n => n.duration <= this.config.hopSizeMs * 2),
        timestamp: startTime,
        latency: performance.now() - startTime
      }

      // Emit result
      if (this.onTranscription) {
        this.onTranscription(result)
      }
    } catch (error) {
      console.error('[MagentaTranscriber] Inference error:', error)
    }
  }

  /**
   * Calculate RMS of audio buffer
   */
  private calculateRMS(audio: Float32Array): number {
    let sum = 0
    for (let i = 0; i < audio.length; i++) {
      sum += audio[i] * audio[i]
    }
    return Math.sqrt(sum / audio.length)
  }

  /**
   * YIN pitch detection algorithm
   */
  private computePitchYIN(audio: Float32Array, sampleRate: number): { frequency: number; confidence: number } {
    const bufferSize = audio.length

    // YIN needs at least 2 periods of the lowest frequency we want to detect
    // For 80Hz (low E on guitar), that's about 25ms or ~1100 samples at 44.1kHz
    const minFreq = INSTRUMENT_FREQ_RANGES[this.config.instrument].min
    const maxFreq = INSTRUMENT_FREQ_RANGES[this.config.instrument].max

    // tau range based on frequency range
    const minTau = Math.floor(sampleRate / maxFreq)
    const maxTau = Math.min(Math.floor(sampleRate / minFreq), Math.floor(bufferSize / 2))

    if (maxTau <= minTau) {
      return { frequency: 0, confidence: 0 }
    }

    // Step 1: Compute difference function
    const difference = new Float32Array(maxTau)
    for (let tau = minTau; tau < maxTau; tau++) {
      let sum = 0
      for (let i = 0; i < maxTau; i++) {
        const delta = audio[i] - audio[i + tau]
        sum += delta * delta
      }
      difference[tau] = sum
    }

    // Step 2: Cumulative mean normalized difference function
    const cmndf = new Float32Array(maxTau)
    cmndf[minTau] = 1
    let runningSum = difference[minTau]

    for (let tau = minTau + 1; tau < maxTau; tau++) {
      runningSum += difference[tau]
      cmndf[tau] = difference[tau] * (tau - minTau + 1) / runningSum
    }

    // Step 3: Find first minimum below threshold
    const threshold = 0.15 // YIN threshold
    let tauEstimate = -1

    for (let tau = minTau + 1; tau < maxTau - 1; tau++) {
      if (cmndf[tau] < threshold) {
        // Find local minimum
        while (tau + 1 < maxTau && cmndf[tau + 1] < cmndf[tau]) {
          tau++
        }
        tauEstimate = tau
        break
      }
    }

    // If no pitch found below threshold, find the global minimum
    if (tauEstimate === -1) {
      let minVal = Infinity
      for (let tau = minTau + 1; tau < maxTau - 1; tau++) {
        if (cmndf[tau] < minVal) {
          minVal = cmndf[tau]
          tauEstimate = tau
        }
      }
      // Only accept if reasonably confident
      if (minVal > 0.5) {
        return { frequency: 0, confidence: 0 }
      }
    }

    if (tauEstimate === -1 || tauEstimate <= minTau) {
      return { frequency: 0, confidence: 0 }
    }

    // Step 4: Parabolic interpolation for better accuracy
    let betterTau = tauEstimate
    if (tauEstimate > minTau && tauEstimate < maxTau - 1) {
      const s0 = cmndf[tauEstimate - 1]
      const s1 = cmndf[tauEstimate]
      const s2 = cmndf[tauEstimate + 1]
      const denom = 2 * (2 * s1 - s2 - s0)
      if (Math.abs(denom) > 0.0001) {
        betterTau = tauEstimate + (s2 - s0) / denom
      }
    }

    const frequency = sampleRate / betterTau
    const confidence = 1 - cmndf[tauEstimate]

    // Validate frequency is in reasonable range
    if (frequency < 20 || frequency > 5000 || !isFinite(frequency)) {
      return { frequency: 0, confidence: 0 }
    }

    return { frequency, confidence }
  }

  /**
   * Apply persistence filtering to remove noise
   */
  private applyPersistenceFilter(notes: TranscribedNote[], timestamp: number): TranscribedNote[] {
    const validNotes: TranscribedNote[] = []
    const currentPitches = new Set(notes.map(n => n.pitch))

    // Update history for detected notes
    for (const note of notes) {
      const history = this.noteHistory.get(note.pitch)

      if (history) {
        const timeSinceLast = timestamp - history.lastSeen
        if (timeSinceLast < this.config.hopSizeMs * 3) {
          // Consecutive or near-consecutive frame
          history.count++
          history.lastSeen = timestamp
          history.totalDuration += this.config.hopSizeMs
        } else {
          // Gap detected, reset
          this.noteHistory.set(note.pitch, {
            count: 1,
            lastSeen: timestamp,
            totalDuration: this.config.hopSizeMs
          })
        }
      } else {
        // New note
        this.noteHistory.set(note.pitch, {
          count: 1,
          lastSeen: timestamp,
          totalDuration: this.config.hopSizeMs
        })
      }
    }

    // Clean up old entries and check which notes pass filter
    for (const [pitch, history] of this.noteHistory.entries()) {
      if (!currentPitches.has(pitch)) {
        if (timestamp - history.lastSeen > this.config.hopSizeMs * 5) {
          this.noteHistory.delete(pitch)
        }
        continue
      }

      // Check persistence criteria - more lenient
      if (history.count >= this.PERSISTENCE_FRAMES || history.totalDuration >= this.MIN_DURATION_MS) {
        const note = notes.find(n => n.pitch === pitch)
        if (note) {
          validNotes.push({
            ...note,
            duration: history.totalDuration
          })
        }
      }
    }

    return validNotes
  }

  reset(): void {
    this.audioBuffer.fill(0)
    this.bufferWriteIndex = 0
    this.noteHistory.clear()
    this.lastInferenceTime = 0
    this.samplesReceived = 0
    this.lastDetectedPitch = -1
    this.lastPitchTimestamp = 0
    this.silenceFrameCount = 0
    this.recentRmsValues = []
    this.peakRms = 0
    this.inDip = false
  }

  dispose(): void {
    this.reset()
    this.status = 'unloaded'
  }

  private setStatus(status: TranscriberStatus): void {
    this.status = status
    if (this.onStatusChange) {
      this.onStatusChange(status)
    }
  }
}

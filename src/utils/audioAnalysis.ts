/**
 * Audio Analysis Utilities for Live Feedback
 * Provides pitch detection and note recognition for guitar input
 */

/**
 * Autocorrelation pitch detection algorithm
 * Works well for guitar and other harmonic instruments
 */
export function autoCorrelate(buffer: Float32Array, sampleRate: number): number {
  const SIZE = buffer.length
  const MAX_SAMPLES = Math.floor(SIZE / 2)

  // Calculate RMS (root mean square) for signal strength
  let rms = 0
  for (let i = 0; i < SIZE; i++) {
    rms += buffer[i] * buffer[i]
  }
  rms = Math.sqrt(rms / SIZE)

  // Not enough signal
  if (rms < 0.01) return -1

  // Trim silence from edges (threshold at 0.2)
  let r1 = 0
  let r2 = SIZE - 1
  const threshold = 0.2

  for (let i = 0; i < SIZE / 2; i++) {
    if (Math.abs(buffer[i]) < threshold) {
      r1 = i
      break
    }
  }

  for (let i = 1; i < SIZE / 2; i++) {
    if (Math.abs(buffer[SIZE - i]) < threshold) {
      r2 = SIZE - i
      break
    }
  }

  buffer = buffer.slice(r1, r2)
  const newSize = buffer.length

  // Autocorrelation - MULTIPLY samples (not subtract!)
  const correlations = new Array(MAX_SAMPLES)
  for (let i = 0; i < MAX_SAMPLES; i++) {
    let sum = 0
    for (let j = 0; j < newSize - i; j++) {
      sum += buffer[j] * buffer[j + i]
    }
    correlations[i] = sum
  }

  // Find first dip below zero (after initial peak)
  let d = 0
  while (correlations[d] > correlations[d + 1]) d++

  // Find peak after the dip
  let maxVal = -1
  let maxPos = -1
  for (let i = d; i < MAX_SAMPLES; i++) {
    if (correlations[i] > maxVal) {
      maxVal = correlations[i]
      maxPos = i
    }
  }

  // No peak found
  if (maxPos === -1) return -1

  // Parabolic interpolation for sub-sample accuracy
  let T0 = maxPos
  const y1 = correlations[T0 - 1]
  const y2 = correlations[T0]
  const y3 = correlations[T0 + 1]

  const a = (y1 + y3 - 2 * y2) / 2
  const b = (y3 - y1) / 2

  if (a) T0 = T0 - b / (2 * a)

  return sampleRate / T0
}

/**
 * Convert frequency (Hz) to note name
 * Ignores octave information (C4, C5 both return "C")
 */
export function frequencyToNoteName(frequency: number): string | null {
  if (frequency <= 0) return null

  // A4 = 440 Hz is our reference
  const A4 = 440
  const C0 = A4 * Math.pow(2, -4.75) // C0 frequency

  // Calculate semitones from C0
  const halfSteps = 12 * Math.log2(frequency / C0)
  const noteIndex = Math.round(halfSteps) % 12

  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

  return noteNames[noteIndex]
}

/**
 * Get octave number from frequency
 * Useful for debugging/display
 */
export function frequencyToOctave(frequency: number): number {
  if (frequency <= 0) return -1

  const A4 = 440
  const C0 = A4 * Math.pow(2, -4.75)

  const halfSteps = 12 * Math.log2(frequency / C0)
  const octave = Math.floor(halfSteps / 12)

  return octave
}

/**
 * Get full note with octave (e.g., "C4", "A#3")
 */
export function frequencyToNoteWithOctave(frequency: number): string | null {
  const noteName = frequencyToNoteName(frequency)
  if (!noteName) return null

  const octave = frequencyToOctave(frequency)
  return `${noteName}${octave}`
}

/**
 * Calculate cents difference between two frequencies
 * Returns positive if frequency is sharp, negative if flat
 */
export function getCentsOffset(frequency: number, targetFrequency: number): number {
  if (frequency <= 0 || targetFrequency <= 0) return 0
  return Math.round(1200 * Math.log2(frequency / targetFrequency))
}

/**
 * Get the frequency for a given note name (e.g., "C4" = 261.63 Hz)
 */
export function noteNameToFrequency(noteName: string): number {
  const notePattern = /^([A-G]#?)(\d)$/
  const match = noteName.match(notePattern)

  if (!match) return 0

  const [, note, octaveStr] = match
  const octave = parseInt(octaveStr)

  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  const noteIndex = noteNames.indexOf(note)

  if (noteIndex === -1) return 0

  // Calculate semitones from A4
  const A4 = 440
  const semitonesFromA4 = (octave - 4) * 12 + (noteIndex - 9) // A is at index 9

  return A4 * Math.pow(2, semitonesFromA4 / 12)
}

/**
 * Setup audio analysis for pitch detection
 * Returns cleanup function
 */
export function setupAudioAnalysis(
  stream: MediaStream,
  onPitchDetected: (frequency: number, noteName: string) => void
): () => void {
  const audioContext = new AudioContext()
  const source = audioContext.createMediaStreamSource(stream)
  const analyser = audioContext.createAnalyser()

  analyser.fftSize = 2048 // Standard size for pitch detection
  analyser.smoothingTimeConstant = 0.8 // Smoothing for stable detection

  source.connect(analyser)

  const bufferLength = analyser.fftSize
  const buffer = new Float32Array(bufferLength)

  let animationId: number
  let lastDetectedNote: string | null = null
  let lastDetectionTime = 0
  const DEBOUNCE_MS = 150 // Prevent rapid re-detection

  function detectPitch() {
    analyser.getFloatTimeDomainData(buffer)

    const frequency = autoCorrelate(buffer, audioContext.sampleRate)

    if (frequency > 0) {
      const noteName = frequencyToNoteName(frequency)
      const now = Date.now()

      if (noteName && (noteName !== lastDetectedNote || now - lastDetectionTime > DEBOUNCE_MS)) {
        onPitchDetected(frequency, noteName)
        lastDetectedNote = noteName
        lastDetectionTime = now
      }
    }

    animationId = requestAnimationFrame(detectPitch)
  }

  detectPitch()

  // Cleanup function
  return () => {
    cancelAnimationFrame(animationId)
    source.disconnect()
    analyser.disconnect()
    if (audioContext.state !== 'closed') {
      audioContext.close()
    }
  }
}

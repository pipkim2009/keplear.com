/**
 * Audio Analysis Utilities for Live Feedback
 * Provides pitch detection and note recognition for guitar input
 */

/**
 * Autocorrelation pitch detection algorithm
 * Works well for guitar and other harmonic instruments
 */
export function autoCorrelate(buffer: Float32Array, sampleRate: number): number {
  // Minimum frequency we care about (E2 = 82.41 Hz, lowest guitar string)
  const minFrequency = 80
  const maxFrequency = 1200 // Higher than highest guitar note we care about

  let size = buffer.length
  let maxSamples = Math.floor(sampleRate / minFrequency)

  // Find the buffer's amplitude range
  let sum = 0
  for (let i = 0; i < size; i++) {
    sum += Math.abs(buffer[i])
  }
  let average = sum / size

  // Not enough signal (increased threshold for guitar)
  if (average < 0.02) return -1

  // Calculate all correlations first
  let correlations = new Array(maxSamples)
  for (let offset = 0; offset < maxSamples; offset++) {
    let correlation = 0
    for (let i = 0; i < size - offset; i++) {
      correlation += Math.abs(buffer[i] - buffer[i + offset])
    }
    correlations[offset] = 1 - (correlation / size)
  }

  // Find best correlation with minimum threshold
  let bestOffset = -1
  let bestCorrelation = 0

  // Start from offset 1 to skip DC component
  // Look for the first strong peak (bias towards fundamental)
  for (let offset = Math.floor(sampleRate / maxFrequency); offset < maxSamples; offset++) {
    const correlation = correlations[offset]

    // Need strong correlation (>0.5 for guitar)
    if (correlation > 0.5 && correlation > bestCorrelation) {
      const frequency = sampleRate / offset

      // Check if this is in valid range
      if (frequency >= minFrequency && frequency <= maxFrequency) {
        bestCorrelation = correlation
        bestOffset = offset

        // If we found a very strong correlation, use it
        if (correlation > 0.9) {
          break
        }
      }
    }
  }

  if (bestOffset > 0) {
    return sampleRate / bestOffset
  }

  return -1
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

  analyser.fftSize = 8192 // Larger FFT for better low frequency resolution (guitar needs this)
  analyser.smoothingTimeConstant = 0.3 // Less smoothing for faster guitar response

  source.connect(analyser)

  const bufferLength = analyser.fftSize
  const buffer = new Float32Array(bufferLength)

  let animationId: number
  let lastDetectedNote: string | null = null
  let lastDetectionTime = 0
  const DEBOUNCE_MS = 100 // Faster response for guitar

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

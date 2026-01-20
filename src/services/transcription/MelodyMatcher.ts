/**
 * Melody Matching Engine
 *
 * Compares detected notes against a target melody.
 * Rhythm is completely ignored - notes can be played at any speed.
 *
 * Key rules:
 * - Sequential matching: notes must be played in order
 * - Extra notes are ignored (no penalty)
 * - Octave sensitivity is configurable
 * - No timing requirements
 */

import { midiToNoteName, noteNameToMidi, type TranscribedNote } from './MagentaTranscriber'

// ============================================================================
// TYPES
// ============================================================================

export interface MelodyNote {
  /** MIDI pitch number */
  pitch: number
  /** Note name with octave (e.g., "C4") */
  noteName: string
  /** Index in the melody */
  index: number
}

export interface NoteMatchStatus {
  /** The melody note */
  note: MelodyNote
  /** Whether this note has been played correctly */
  isPlayed: boolean
  /** When the note was matched (timestamp) */
  matchedAt?: number
  /** The detected note that matched (if any) */
  matchedWith?: TranscribedNote
}

export interface MelodyMatchState {
  /** All melody notes with their status */
  notes: NoteMatchStatus[]
  /** Index of the next note to be played */
  currentIndex: number
  /** Total notes in melody */
  totalNotes: number
  /** Notes successfully played */
  playedCount: number
  /** Progress percentage (0-100) */
  progress: number
  /** Whether the entire melody is complete */
  isComplete: boolean
}

export interface MelodyMatcherConfig {
  /** Whether to require exact octave match */
  strictOctave: boolean
  /** Pitch tolerance in semitones (for slight mistuning) */
  pitchToleranceSemitones: number
  /** Allow matching notes slightly ahead (look-ahead count) */
  lookAhead: number
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_CONFIG: MelodyMatcherConfig = {
  strictOctave: false, // Pitch class only by default
  pitchToleranceSemitones: 0, // Exact pitch match required
  lookAhead: 2 // Can match up to 2 notes ahead
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Extract pitch class (0-11) from MIDI pitch
 */
function getPitchClass(midiPitch: number): number {
  return ((midiPitch % 12) + 12) % 12
}

/**
 * Check if two pitches match according to config
 */
function pitchesMatch(
  detectedPitch: number,
  targetPitch: number,
  strictOctave: boolean,
  tolerance: number
): boolean {
  if (strictOctave) {
    // Exact pitch match with tolerance
    return Math.abs(detectedPitch - targetPitch) <= tolerance
  } else {
    // Pitch class match (ignores octave)
    const detectedClass = getPitchClass(detectedPitch)
    const targetClass = getPitchClass(targetPitch)

    // Check if pitch classes match within tolerance
    const classDiff = Math.abs(detectedClass - targetClass)
    return classDiff <= tolerance || classDiff >= 12 - tolerance
  }
}

/**
 * Parse a melody from various formats
 */
export function parseMelody(input: (number | string)[]): MelodyNote[] {
  return input.map((item, index) => {
    if (typeof item === 'number') {
      // MIDI pitch number
      return {
        pitch: item,
        noteName: midiToNoteName(item),
        index
      }
    } else {
      // Note name string
      const pitch = noteNameToMidi(item)
      return {
        pitch: pitch >= 0 ? pitch : 60, // Default to C4 if invalid
        noteName: item,
        index
      }
    }
  })
}

// ============================================================================
// MELODY MATCHER CLASS
// ============================================================================

export class MelodyMatcher {
  private config: MelodyMatcherConfig
  private melody: MelodyNote[] = []
  private state: MelodyMatchState
  private recentlyMatchedIndices: Set<number> = new Set() // Track matched melody indices instead of pitches
  private matchCooldownMs: number = 100 // Short cooldown - only prevents double-triggering same melody note

  // Callbacks
  private onNoteMatched?: (note: MelodyNote, detectedNote: TranscribedNote) => void
  private onMelodyComplete?: () => void
  private onStateChange?: (state: MelodyMatchState) => void

  constructor(config: Partial<MelodyMatcherConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.state = this.createEmptyState()
  }

  /**
   * Set the target melody
   */
  setMelody(melodyInput: (number | string)[]): void {
    this.melody = parseMelody(melodyInput)
    this.reset()
  }

  /**
   * Get the target melody
   */
  getMelody(): MelodyNote[] {
    return [...this.melody]
  }

  /**
   * Get current match state
   */
  getState(): MelodyMatchState {
    return { ...this.state }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<MelodyMatcherConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Set callback for when a note is matched
   */
  setOnNoteMatched(callback: (note: MelodyNote, detectedNote: TranscribedNote) => void): void {
    this.onNoteMatched = callback
  }

  /**
   * Set callback for when melody is complete
   */
  setOnMelodyComplete(callback: () => void): void {
    this.onMelodyComplete = callback
  }

  /**
   * Set callback for state changes
   */
  setOnStateChange(callback: (state: MelodyMatchState) => void): void {
    this.onStateChange = callback
  }

  /**
   * Process detected notes and check for matches
   * Returns list of newly matched notes
   */
  processDetectedNotes(detectedNotes: TranscribedNote[]): MelodyNote[] {
    if (this.state.isComplete || this.melody.length === 0) {
      return []
    }

    const newMatches: MelodyNote[] = []
    const now = performance.now()

    // Check each detected note
    for (const detected of detectedNotes) {
      // Try to match against current note and look-ahead notes
      const matchIndex = this.findMatch(detected)

      if (matchIndex >= 0) {
        // Skip if this melody index was just matched (prevent double-triggering)
        if (this.recentlyMatchedIndices.has(matchIndex)) {
          continue
        }

        const matchedNote = this.melody[matchIndex]

        // Mark all notes up to and including the match as played
        // (This handles skipped notes gracefully)
        for (let i = this.state.currentIndex; i <= matchIndex; i++) {
          if (!this.state.notes[i].isPlayed) {
            this.state.notes[i].isPlayed = true
            this.state.notes[i].matchedAt = now

            if (i === matchIndex) {
              this.state.notes[i].matchedWith = detected
            }

            this.state.playedCount++
          }
        }

        // Update current index to next unplayed note
        this.state.currentIndex = matchIndex + 1

        // Add melody index to cooldown (not the pitch!)
        // This allows the same pitch to match a different melody note
        this.recentlyMatchedIndices.add(matchIndex)
        setTimeout(() => {
          this.recentlyMatchedIndices.delete(matchIndex)
        }, this.matchCooldownMs)

        // Track the match
        newMatches.push(matchedNote)

        // Emit callback
        if (this.onNoteMatched) {
          this.onNoteMatched(matchedNote, detected)
        }

        // Check for completion
        if (this.state.currentIndex >= this.melody.length) {
          this.state.isComplete = true
          if (this.onMelodyComplete) {
            this.onMelodyComplete()
          }
        }
      }
    }

    // Update progress
    this.state.progress = this.melody.length > 0
      ? Math.round((this.state.playedCount / this.melody.length) * 100)
      : 0

    // Emit state change if there were matches
    if (newMatches.length > 0 && this.onStateChange) {
      this.onStateChange(this.getState())
    }

    return newMatches
  }

  /**
   * Find a matching melody note for a detected note
   * Returns the index of the matched note, or -1 if no match
   */
  private findMatch(detected: TranscribedNote): number {
    const { strictOctave, pitchToleranceSemitones, lookAhead } = this.config
    const startIndex = this.state.currentIndex
    const endIndex = Math.min(startIndex + lookAhead + 1, this.melody.length)

    // First, try exact match at current position
    for (let i = startIndex; i < endIndex; i++) {
      const target = this.melody[i]

      if (pitchesMatch(detected.pitch, target.pitch, strictOctave, pitchToleranceSemitones)) {
        return i
      }
    }

    return -1
  }

  /**
   * Reset matcher state
   */
  reset(): void {
    this.state = {
      notes: this.melody.map(note => ({
        note,
        isPlayed: false
      })),
      currentIndex: 0,
      totalNotes: this.melody.length,
      playedCount: 0,
      progress: 0,
      isComplete: false
    }

    this.recentlyMatchedIndices.clear()

    if (this.onStateChange) {
      this.onStateChange(this.getState())
    }
  }

  /**
   * Get notes that haven't been played yet
   */
  getRemainingNotes(): MelodyNote[] {
    return this.state.notes
      .filter(n => !n.isPlayed)
      .map(n => n.note)
  }

  /**
   * Get the current note to be played (or null if complete)
   */
  getCurrentNote(): MelodyNote | null {
    if (this.state.currentIndex >= this.melody.length) {
      return null
    }
    return this.melody[this.state.currentIndex]
  }

  /**
   * Get upcoming notes (including current)
   */
  getUpcomingNotes(count: number = 5): MelodyNote[] {
    const start = this.state.currentIndex
    const end = Math.min(start + count, this.melody.length)
    return this.melody.slice(start, end)
  }

  private createEmptyState(): MelodyMatchState {
    return {
      notes: [],
      currentIndex: 0,
      totalNotes: 0,
      playedCount: 0,
      progress: 0,
      isComplete: false
    }
  }
}

/**
 * Unicode musical note symbols for the live feedback UI.
 * Uses plain text characters (not emoji) so CSS color applies.
 */

const NOTE_SYMBOL = '\u266A' // ♪
const CHORD_SYMBOL = '\u266A\u266A\u266A' // ♪♪♪

/**
 * Get a note symbol for display in the feedback UI.
 * Single ♪ for individual notes, triple ♪♪♪ for chords.
 */
export function getNoteSymbol(isChord = false): string {
  return isChord ? CHORD_SYMBOL : NOTE_SYMBOL
}

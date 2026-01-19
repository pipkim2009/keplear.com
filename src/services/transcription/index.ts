/**
 * Transcription Services
 *
 * Live instrument melody feedback system using real-time polyphonic
 * music transcription.
 */

export { MagentaTranscriber, midiToNoteName, noteNameToMidi } from './MagentaTranscriber'
export type {
  TranscribedNote,
  TranscriptionResult,
  TranscriberConfig,
  TranscriberStatus
} from './MagentaTranscriber'

export { MelodyMatcher, parseMelody } from './MelodyMatcher'
export type {
  MelodyNote,
  NoteMatchStatus,
  MelodyMatchState,
  MelodyMatcherConfig
} from './MelodyMatcher'

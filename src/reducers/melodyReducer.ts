/**
 * Melody state management reducer
 * Consolidates all melody-related state into a single, predictable state machine
 */

export interface MelodyState {
  readonly playbackProgress: number
  readonly melodyDuration: number
  readonly hasRecordedAudio: boolean
  readonly recordedAudioBlob: Blob | null
  readonly isAutoRecording: boolean
  readonly showNotes: boolean
}

export type MelodyAction =
  | { type: 'SET_PLAYBACK_PROGRESS'; payload: number }
  | { type: 'SET_MELODY_DURATION'; payload: number }
  | { type: 'SET_HAS_RECORDED_AUDIO'; payload: boolean }
  | { type: 'SET_RECORDED_AUDIO_BLOB'; payload: Blob | null }
  | { type: 'SET_IS_AUTO_RECORDING'; payload: boolean }
  | { type: 'TOGGLE_SHOW_NOTES' }
  | { type: 'SET_SHOW_NOTES'; payload: boolean }
  | { type: 'RESET_PLAYBACK' }
  | { type: 'RESET_RECORDING' }
  | { type: 'CLEAR_ALL_AUDIO' }

export const initialMelodyState: MelodyState = {
  playbackProgress: 0,
  melodyDuration: 0,
  hasRecordedAudio: false,
  recordedAudioBlob: null,
  isAutoRecording: false,
  showNotes: (() => {
    // Force default to false (hidden) and clear any existing value
    try {
      localStorage.setItem('keplear-showNotes', 'false')
      return false
    } catch {
      return false
    }
  })()
}

export function melodyReducer(state: MelodyState, action: MelodyAction): MelodyState {
  switch (action.type) {
    case 'SET_PLAYBACK_PROGRESS':
      return {
        ...state,
        playbackProgress: Math.max(0, Math.min(action.payload, state.melodyDuration))
      }

    case 'SET_MELODY_DURATION':
      return {
        ...state,
        melodyDuration: Math.max(0, action.payload)
      }

    case 'SET_HAS_RECORDED_AUDIO':
      return {
        ...state,
        hasRecordedAudio: action.payload
      }

    case 'SET_RECORDED_AUDIO_BLOB':
      return {
        ...state,
        recordedAudioBlob: action.payload,
        hasRecordedAudio: action.payload !== null
      }

    case 'SET_IS_AUTO_RECORDING':
      return {
        ...state,
        isAutoRecording: action.payload
      }

    case 'TOGGLE_SHOW_NOTES':
      const newShowNotes = !state.showNotes
      // Persist to localStorage
      try {
        localStorage.setItem('keplear-showNotes', JSON.stringify(newShowNotes))
      } catch {
        // Handle localStorage errors gracefully
      }
      return {
        ...state,
        showNotes: newShowNotes
      }

    case 'SET_SHOW_NOTES':
      // Persist to localStorage
      try {
        localStorage.setItem('keplear-showNotes', JSON.stringify(action.payload))
      } catch {
        // Handle localStorage errors gracefully
      }
      return {
        ...state,
        showNotes: action.payload
      }

    case 'RESET_PLAYBACK':
      return {
        ...state,
        playbackProgress: 0
      }

    case 'RESET_RECORDING':
      // Also reset showNotes to false when clearing recording
      try {
        localStorage.setItem('keplear-showNotes', 'false')
      } catch {
        // Handle localStorage errors gracefully
      }
      return {
        ...state,
        hasRecordedAudio: false,
        recordedAudioBlob: null,
        isAutoRecording: false,
        showNotes: false
      }

    case 'CLEAR_ALL_AUDIO':
      return {
        ...state,
        playbackProgress: 0,
        melodyDuration: 0,
        hasRecordedAudio: false,
        recordedAudioBlob: null,
        isAutoRecording: false
      }

    default:
      return state
  }
}
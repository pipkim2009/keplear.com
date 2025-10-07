/**
 * UI state management reducer
 * Consolidates UI interaction state like page navigation, input flashing, and settings
 */

export type PageType = 'home' | 'sandbox' | 'practice'
export type InputType = 'bpm' | 'beats' | 'mode'
export type ChordMode = 'arpeggiator' | 'progression'

export interface UIState {
  readonly currentPage: PageType
  readonly bpm: number
  readonly numberOfBeats: number
  readonly chordMode: ChordMode
  readonly flashingInputs: Record<InputType, boolean>
  readonly activeInputs: Record<InputType, boolean>
}

export type UIAction =
  | { type: 'SET_CURRENT_PAGE'; payload: PageType }
  | { type: 'SET_BPM'; payload: number }
  | { type: 'SET_NUMBER_OF_BEATS'; payload: number }
  | { type: 'SET_CHORD_MODE'; payload: ChordMode }
  | { type: 'TRIGGER_INPUT_FLASH'; payload: InputType }
  | { type: 'CLEAR_INPUT_FLASH'; payload: InputType }
  | { type: 'SET_INPUT_ACTIVE'; payload: { inputType: InputType; active: boolean } }
  | { type: 'CLEAR_ALL_FLASHING' }
  | { type: 'CLEAR_ALL_ACTIVE' }
  | { type: 'RESET_SETTINGS' }

export const DEFAULT_SETTINGS = {
  bpm: 120,
  numberOfBeats: 5,
  chordMode: 'arpeggiator' as ChordMode
} as const

export const initialUIState: UIState = {
  currentPage: 'home',
  bpm: DEFAULT_SETTINGS.bpm,
  numberOfBeats: DEFAULT_SETTINGS.numberOfBeats,
  chordMode: DEFAULT_SETTINGS.chordMode,
  flashingInputs: {
    bpm: false,
    beats: false,
    mode: false
  },
  activeInputs: {
    bpm: false,
    beats: false,
    mode: false
  }
}

export function uiReducer(state: UIState, action: UIAction): UIState {
  switch (action.type) {
    case 'SET_CURRENT_PAGE':
      return {
        ...state,
        currentPage: action.payload
      }

    case 'SET_BPM':
      // Ensure we never store NaN values
      const bpmValue = isNaN(action.payload) ? state.bpm : action.payload
      return {
        ...state,
        bpm: Math.max(1, Math.min(999, bpmValue))
      }

    case 'SET_NUMBER_OF_BEATS':
      // Ensure we never store NaN values
      const beatsValue = isNaN(action.payload) ? state.numberOfBeats : action.payload
      return {
        ...state,
        numberOfBeats: Math.max(1, Math.min(100, beatsValue))
      }

    case 'SET_CHORD_MODE':
      return {
        ...state,
        chordMode: action.payload
      }

    case 'TRIGGER_INPUT_FLASH':
      return {
        ...state,
        flashingInputs: {
          ...state.flashingInputs,
          [action.payload]: true
        }
      }

    case 'CLEAR_INPUT_FLASH':
      return {
        ...state,
        flashingInputs: {
          ...state.flashingInputs,
          [action.payload]: false
        }
      }

    case 'SET_INPUT_ACTIVE':
      return {
        ...state,
        activeInputs: {
          ...state.activeInputs,
          [action.payload.inputType]: action.payload.active
        }
      }

    case 'CLEAR_ALL_FLASHING':
      return {
        ...state,
        flashingInputs: {
          bpm: false,
          beats: false,
          mode: false
        }
      }

    case 'CLEAR_ALL_ACTIVE':
      return {
        ...state,
        activeInputs: {
          bpm: false,
          beats: false,
          mode: false
        }
      }

    case 'RESET_SETTINGS':
      return {
        ...state,
        bpm: DEFAULT_SETTINGS.bpm,
        numberOfBeats: DEFAULT_SETTINGS.numberOfBeats,
        chordMode: DEFAULT_SETTINGS.chordMode,
        flashingInputs: {
          bpm: false,
          beats: false,
          mode: false
        },
        activeInputs: {
          bpm: false,
          beats: false,
          mode: false
        }
      }

    default:
      return state
  }
}
/**
 * UI state management reducer
 * Consolidates UI interaction state like page navigation, input flashing, and settings
 */

export type PageType = 'home' | 'sandbox' | 'practice'
export type InputType = 'bpm' | 'notes' | 'mode'

export interface UIState {
  readonly currentPage: PageType
  readonly bpm: number
  readonly numberOfNotes: number
  readonly flashingInputs: Record<InputType, boolean>
  readonly activeInputs: Record<InputType, boolean>
}

export type UIAction =
  | { type: 'SET_CURRENT_PAGE'; payload: PageType }
  | { type: 'SET_BPM'; payload: number }
  | { type: 'SET_NUMBER_OF_NOTES'; payload: number }
  | { type: 'TRIGGER_INPUT_FLASH'; payload: InputType }
  | { type: 'CLEAR_INPUT_FLASH'; payload: InputType }
  | { type: 'SET_INPUT_ACTIVE'; payload: { inputType: InputType; active: boolean } }
  | { type: 'CLEAR_ALL_FLASHING' }
  | { type: 'CLEAR_ALL_ACTIVE' }
  | { type: 'RESET_SETTINGS' }

export const DEFAULT_SETTINGS = {
  bpm: 120,
  numberOfNotes: 5
} as const

export const initialUIState: UIState = {
  currentPage: 'home',
  bpm: DEFAULT_SETTINGS.bpm,
  numberOfNotes: DEFAULT_SETTINGS.numberOfNotes,
  flashingInputs: {
    bpm: false,
    notes: false,
    mode: false
  },
  activeInputs: {
    bpm: false,
    notes: false,
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
        bpm: Math.max(60, Math.min(200, bpmValue))
      }

    case 'SET_NUMBER_OF_NOTES':
      // Ensure we never store NaN values
      const notesValue = isNaN(action.payload) ? state.numberOfNotes : action.payload
      return {
        ...state,
        numberOfNotes: Math.max(1, Math.min(16, notesValue))
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
          notes: false,
          mode: false
        }
      }

    case 'CLEAR_ALL_ACTIVE':
      return {
        ...state,
        activeInputs: {
          bpm: false,
          notes: false,
          mode: false
        }
      }

    case 'RESET_SETTINGS':
      return {
        ...state,
        bpm: DEFAULT_SETTINGS.bpm,
        numberOfNotes: DEFAULT_SETTINGS.numberOfNotes,
        flashingInputs: {
          bpm: false,
          notes: false,
          mode: false
        },
        activeInputs: {
          bpm: false,
          notes: false,
          mode: false
        }
      }

    default:
      return state
  }
}
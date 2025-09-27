/**
 * Instrument state management reducer
 * Consolidates instrument selection and configuration state
 */

export type InstrumentType = 'keyboard' | 'guitar' | 'bass'
export type KeyboardSelectionMode = 'range' | 'multi'

export interface InstrumentState {
  readonly instrument: InstrumentType
  readonly keyboardOctaves: { lower: number; higher: number }
  readonly keyboardSelectionMode: KeyboardSelectionMode
  readonly clearChordsAndScalesTrigger: number
}

export type InstrumentAction =
  | { type: 'SET_INSTRUMENT'; payload: InstrumentType }
  | { type: 'SET_KEYBOARD_OCTAVES'; payload: { lower: number; higher: number } }
  | { type: 'UPDATE_LOWER_OCTAVES'; payload: number }
  | { type: 'UPDATE_HIGHER_OCTAVES'; payload: number }
  | { type: 'SET_KEYBOARD_SELECTION_MODE'; payload: KeyboardSelectionMode }
  | { type: 'TRIGGER_CLEAR_CHORDS_AND_SCALES' }
  | { type: 'RESET_OCTAVES' }

export const initialInstrumentState: InstrumentState = {
  instrument: 'keyboard',
  keyboardOctaves: { lower: 0, higher: 0 },
  keyboardSelectionMode: 'range',
  clearChordsAndScalesTrigger: 0
}

export function instrumentReducer(state: InstrumentState, action: InstrumentAction): InstrumentState {
  switch (action.type) {
    case 'SET_INSTRUMENT':
      return {
        ...state,
        instrument: action.payload,
        // Trigger clear when instrument changes
        clearChordsAndScalesTrigger: state.clearChordsAndScalesTrigger + 1
      }

    case 'SET_KEYBOARD_OCTAVES':
      return {
        ...state,
        keyboardOctaves: {
          lower: Math.max(-4, Math.min(7, action.payload.lower)),
          higher: Math.max(-4, Math.min(7, action.payload.higher))
        }
      }

    case 'UPDATE_LOWER_OCTAVES':
      return {
        ...state,
        keyboardOctaves: {
          ...state.keyboardOctaves,
          lower: Math.max(-4, Math.min(7, action.payload))
        }
      }

    case 'UPDATE_HIGHER_OCTAVES':
      return {
        ...state,
        keyboardOctaves: {
          ...state.keyboardOctaves,
          higher: Math.max(-4, Math.min(7, action.payload))
        }
      }

    case 'SET_KEYBOARD_SELECTION_MODE':
      return {
        ...state,
        keyboardSelectionMode: action.payload
      }

    case 'TRIGGER_CLEAR_CHORDS_AND_SCALES':
      return {
        ...state,
        clearChordsAndScalesTrigger: state.clearChordsAndScalesTrigger + 1
      }

    case 'RESET_OCTAVES':
      return {
        ...state,
        keyboardOctaves: { lower: 0, higher: 0 }
      }

    default:
      return state
  }
}
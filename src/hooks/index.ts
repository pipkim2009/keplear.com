/**
 * Barrel export for all custom hooks
 */

export { useAudio } from './useAudio'
export { useAuth } from './useAuth'
export { useCustomDropdown } from './useCustomDropdown'
export { useHoldButton, useIncrementDecrement } from './useHoldButton'
export { useInstrumentConfig } from './useInstrumentConfig'
export { useInstrumentNotes } from './useInstrumentNotes'
export { useInstrumentState } from './useInstrumentState'
export { useKeyboardHighlighting } from './useKeyboardHighlighting'
export { useMelodyChanges } from './useMelodyChanges'
export { useMelodyGenerator } from './useMelodyGenerator'
export { useMelodyPlayer } from './useMelodyPlayer'
export { useScaleChordManagement } from './useScaleChordManagement'
export { useTheme } from './useTheme'
export { useUIState } from './useUIState'
export { useAudioInput } from './useAudioInput'
export type { AudioInputConfig, AudioInputState, UseAudioInputReturn } from './useAudioInput'

// Melody feedback system (rhythm-ignored, polyphonic transcription)
export { useMelodyFeedback } from './useMelodyFeedback'
export type { MelodyFeedbackConfig, FeedbackNote, MelodyFeedbackState, UseMelodyFeedbackReturn } from './useMelodyFeedback'

// Database hooks
export { useQueryCache, invalidateCache, clearCache, setCache } from './useQueryCache'
export type { CacheEntry, CacheOptions } from './useQueryCache'
export { useSupabaseQuery, usePaginatedQuery, invalidateQueries, prefetchQuery } from './useSupabaseQuery'
export type { QueryOptions, PaginatedResult, UseSupabaseQueryResult, UsePaginatedQueryResult } from './useSupabaseQuery'
export { useSupabaseMutation, useInsertMutation, useUpdateMutation, useDeleteMutation } from './useSupabaseMutation'
export type { MutationOptions, MutationResult } from './useSupabaseMutation'
export { useRealtimeSubscription, useClassroomRealtime } from './useRealtimeSubscription'
export type { RealtimeEvent, RealtimeOptions, UseRealtimeResult } from './useRealtimeSubscription'
export {
  useClassroomsList,
  useClassroom,
  useCreateClassroom,
  useDeleteClassroom,
  useJoinClassroom,
  useLeaveClassroom,
  useCreateAssignment,
  useDeleteAssignment,
  useUpdateAssignment,
  useClassroomsWithRealtime,
  prefetchClassroom
} from './useClassrooms'
export type { Classroom, Assignment, ClassroomStudent, CreateClassroomData, CreateAssignmentData } from './useClassrooms'

// Accessibility hooks
export { useFocusTrap, useBodyScrollLock } from './useFocusTrap'

// Performance hooks
export {
  useDebounce,
  useDebouncedCallback,
  useThrottledCallback,
  useStableValue,
  usePrevious,
  useDeepMemo,
  useRenderCount,
  usePerformanceMeasure,
  useLazyRef,
  useUpdateEffect
} from './usePerformance'

// Context selector hooks (focused state slices for better performance)
export {
  useNavigation,
  useInstrumentType,
  useMelodySettings,
  useMelodyPlayback,
  useNoteSelection,
  useAudioPlayback,
  useScaleChordState,
  useOctaveRange
} from './useInstrumentSelectors'
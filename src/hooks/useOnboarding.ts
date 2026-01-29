/**
 * Onboarding Hook
 * Manages onboarding state and completion for new users
 */

import { useState, useCallback, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { InstrumentType } from '../types/instrument'

export interface OnboardingState {
  onboardingCompleted: boolean
  preferredInstruments: InstrumentType[]
}

export interface UseOnboardingResult {
  /** Whether onboarding has been completed */
  onboardingCompleted: boolean | null
  /** User's preferred instruments */
  preferredInstruments: InstrumentType[]
  /** Loading state */
  isLoading: boolean
  /** Error state */
  error: Error | null
  /** Complete onboarding with selected instruments */
  completeOnboarding: (instruments: InstrumentType[]) => Promise<{ success: boolean; error?: Error }>
  /** Update preferred instruments */
  updatePreferredInstruments: (instruments: InstrumentType[]) => Promise<{ success: boolean; error?: Error }>
  /** Refetch onboarding state */
  refetch: () => Promise<void>
}

/**
 * Hook to manage onboarding state for the current user
 */
export function useOnboarding(userId: string | null): UseOnboardingResult {
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null)
  const [preferredInstruments, setPreferredInstruments] = useState<InstrumentType[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  /**
   * Fetch onboarding state from the database
   */
  const fetchOnboardingState = useCallback(async () => {
    if (!userId) {
      setIsLoading(false)
      setOnboardingCompleted(null)
      setPreferredInstruments([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('onboarding_completed, preferred_instruments')
        .eq('id', userId)
        .single()

      if (fetchError) {
        // If columns don't exist, treat as not completed
        if (fetchError.message.includes('column') || fetchError.code === 'PGRST116') {
          setOnboardingCompleted(false)
          setPreferredInstruments([])
          setIsLoading(false)
          return
        }
        throw new Error(fetchError.message)
      }

      // Handle case where columns might not exist in response
      setOnboardingCompleted(data?.onboarding_completed ?? false)
      setPreferredInstruments((data?.preferred_instruments as InstrumentType[]) ?? [])
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch onboarding state'))
      // Default to not completed on error so wizard shows
      setOnboardingCompleted(false)
      setPreferredInstruments([])
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  /**
   * Complete onboarding with selected instruments
   */
  const completeOnboarding = useCallback(async (
    instruments: InstrumentType[]
  ): Promise<{ success: boolean; error?: Error }> => {
    if (!userId) {
      return { success: false, error: new Error('User not authenticated') }
    }

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          onboarding_completed: true,
          preferred_instruments: instruments
        })
        .eq('id', userId)

      if (updateError) {
        throw new Error(updateError.message)
      }

      setOnboardingCompleted(true)
      setPreferredInstruments(instruments)
      return { success: true }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to complete onboarding')
      return { success: false, error }
    }
  }, [userId])

  /**
   * Update preferred instruments
   */
  const updatePreferredInstruments = useCallback(async (
    instruments: InstrumentType[]
  ): Promise<{ success: boolean; error?: Error }> => {
    if (!userId) {
      return { success: false, error: new Error('User not authenticated') }
    }

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          preferred_instruments: instruments
        })
        .eq('id', userId)

      if (updateError) {
        throw new Error(updateError.message)
      }

      setPreferredInstruments(instruments)
      return { success: true }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update instruments')
      return { success: false, error }
    }
  }, [userId])

  // Fetch on mount and when userId changes
  useEffect(() => {
    fetchOnboardingState()
  }, [fetchOnboardingState])

  return {
    onboardingCompleted,
    preferredInstruments,
    isLoading,
    error,
    completeOnboarding,
    updatePreferredInstruments,
    refetch: fetchOnboardingState
  }
}

export default useOnboarding

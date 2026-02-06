import { createContext, useEffect, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { User, AuthError } from '@supabase/supabase-js'
import { validatePassword, sanitizeUsername, authRateLimiter } from '../utils/security'

/**
 * Authentication result type for operations that return data
 */
interface AuthResult<T = unknown> {
  data: T | null
  error: AuthError | Error | null
}

/**
 * Authentication result type for operations that only return error status
 */
interface AuthErrorResult {
  error: AuthError | Error | null
}

/**
 * Context type for authentication state and methods
 */
interface AuthContextType {
  /** Current authenticated user, null if not authenticated */
  readonly user: User | null
  /** Loading state for authentication operations */
  readonly loading: boolean
  /** Flag indicating if the user just signed up (for onboarding) */
  readonly isNewUser: boolean
  /** Clear the isNewUser flag after onboarding completes */
  clearNewUserFlag: () => void
  /** Sign up a new user with username and password */
  signUp: (
    username: string,
    password: string,
    metadata?: Record<string, unknown>
  ) => Promise<AuthResult>
  /** Sign in an existing user */
  signIn: (username: string, password: string) => Promise<AuthResult>
  /** Sign out the current user */
  signOut: () => Promise<AuthErrorResult>
  /** Update the current user's password */
  updatePassword: (newPassword: string) => Promise<AuthErrorResult>
  /** Delete the current user's account */
  deleteAccount: () => Promise<AuthErrorResult>
}

/**
 * Authentication context - provides auth state and methods to child components
 * Exported directly to ensure proper module initialization
 */
// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextType | undefined>(undefined)

/**
 * Props for the AuthProvider component
 */
interface AuthProviderProps {
  children: ReactNode
}

/**
 * Validates username format
 * @param username - The username to validate
 * @returns True if valid, false otherwise
 */
const isValidUsername = (username: string): boolean => {
  return username.length >= 3 && /^[a-zA-Z0-9_]+$/.test(username)
}

/**
 * Validates password strength
 * Requires: 8+ chars, uppercase, lowercase, number
 * @param password - The password to validate
 * @returns True if valid, false otherwise
 */
const isValidPassword = (password: string): boolean => {
  return validatePassword(password).isValid
}

/**
 * Creates a placeholder email from username for Supabase compatibility
 * @param username - The username
 * @returns A placeholder email address
 */
const createPlaceholderEmail = (username: string): string => {
  return `${username.toLowerCase()}@placeholder.com`
}

/**
 * Authentication provider component
 * Manages user authentication state and provides auth methods
 */
const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [isNewUser, setIsNewUser] = useState<boolean>(false)

  useEffect(() => {
    const getSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      setLoading(false)
    }

    getSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  /**
   * Sign up a new user with username and password
   * @param username - The desired username (3+ chars, alphanumeric + underscore)
   * @param password - The password (6+ chars)
   * @param metadata - Additional user metadata
   * @returns Promise with auth result
   */
  const signUp = useCallback(
    async (
      username: string,
      password: string,
      metadata: Record<string, unknown> = {}
    ): Promise<AuthResult> => {
      try {
        // Validate inputs
        if (!isValidUsername(username)) {
          return {
            data: null,
            error: new Error(
              'Username must be at least 3 characters and contain only letters, numbers, and underscores'
            ),
          }
        }

        if (!isValidPassword(password)) {
          const validation = validatePassword(password)
          return {
            data: null,
            error: new Error(
              validation.message ||
                'Password must be at least 8 characters with uppercase, lowercase, and number'
            ),
          }
        }

        // Check rate limiting
        if (!authRateLimiter.isAllowed('signup')) {
          const resetTime = authRateLimiter.getResetTime('signup')
          return {
            data: null,
            error: new Error(`Too many attempts. Please try again in ${resetTime} seconds.`),
          }
        }
        authRateLimiter.recordAttempt('signup')

        // Generate placeholder email for Supabase compatibility
        // Sanitize username for email format
        const sanitizedUsername = sanitizeUsername(username)
        const placeholderEmail = createPlaceholderEmail(sanitizedUsername)

        const { data, error } = await supabase.auth.signUp({
          email: placeholderEmail,
          password,
          options: {
            data: { ...metadata, username, display_name: username },
          },
        })

        // Set isNewUser flag on successful signup
        if (!error && data?.user) {
          setIsNewUser(true)
        }

        return { data, error }
      } catch (error) {
        return {
          data: null,
          error: error instanceof Error ? error : new Error('Unknown sign up error'),
        }
      }
    },
    []
  )

  /**
   * Sign in an existing user with username and password
   * @param username - The username
   * @param password - The password
   * @returns Promise with auth result
   */
  const signIn = useCallback(async (username: string, password: string): Promise<AuthResult> => {
    try {
      // Validate inputs
      if (!isValidUsername(username)) {
        return {
          data: null,
          error: new Error('Invalid username format'),
        }
      }

      if (!isValidPassword(password)) {
        return {
          data: null,
          error: new Error('Invalid password format'),
        }
      }

      // Check rate limiting
      if (!authRateLimiter.isAllowed('signin')) {
        const resetTime = authRateLimiter.getResetTime('signin')
        return {
          data: null,
          error: new Error(`Too many login attempts. Please try again in ${resetTime} seconds.`),
        }
      }
      authRateLimiter.recordAttempt('signin')

      // Generate the same placeholder email format for sign in
      const sanitizedUsername = sanitizeUsername(username)
      const placeholderEmail = createPlaceholderEmail(sanitizedUsername)

      const { data, error } = await supabase.auth.signInWithPassword({
        email: placeholderEmail,
        password,
      })
      return { data, error }
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Unknown sign in error'),
      }
    }
  }, [])

  /**
   * Sign out the current user
   * @returns Promise with error result
   */
  const signOut = useCallback(async (): Promise<AuthErrorResult> => {
    try {
      const { error } = await supabase.auth.signOut()
      return { error }
    } catch (error) {
      return {
        error: error instanceof Error ? error : new Error('Unknown sign out error'),
      }
    }
  }, [])

  /**
   * Update the current user's password
   * @param newPassword - The new password
   * @returns Promise with error result
   */
  const updatePassword = useCallback(async (newPassword: string): Promise<AuthErrorResult> => {
    try {
      if (!isValidPassword(newPassword)) {
        const validation = validatePassword(newPassword)
        return {
          error: new Error(
            validation.message ||
              'Password must be at least 8 characters with uppercase, lowercase, and number'
          ),
        }
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })
      return { error }
    } catch (error) {
      return {
        error: error instanceof Error ? error : new Error('Unknown password update error'),
      }
    }
  }, [])

  /**
   * Delete the current user's account
   * @returns Promise with error result
   */
  const deleteAccount = useCallback(async (): Promise<AuthErrorResult> => {
    try {
      const { error } = await supabase.rpc('delete_user')
      if (!error) {
        // Sign out the user and clear the session
        await supabase.auth.signOut()
        setUser(null)
      }
      return { error }
    } catch (error) {
      return {
        error: error instanceof Error ? error : new Error('Unknown account deletion error'),
      }
    }
  }, [])

  /**
   * Clear the isNewUser flag after onboarding completes
   */
  const clearNewUserFlag = useCallback(() => {
    setIsNewUser(false)
  }, [])

  const value: AuthContextType = {
    user,
    loading,
    isNewUser,
    clearNewUserFlag,
    signUp,
    signIn,
    signOut,
    updatePassword,
    deleteAccount,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export { AuthProvider }

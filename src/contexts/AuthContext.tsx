import { createContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  loading: boolean
  signUp: (email: string, password: string, metadata?: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>
  signIn: (email: string, password: string) => Promise<{ data: unknown; error: unknown }>
  signOut: () => Promise<{ error: unknown }>
  resetPassword: (email: string) => Promise<{ error: unknown }>
  updatePassword: (newPassword: string) => Promise<{ error: unknown }>
  sendDeleteConfirmation: () => Promise<{ error: unknown }>
  confirmDeleteAccount: (token: string) => Promise<{ error: unknown }>
  deleteAccount: () => Promise<{ error: unknown }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)


interface AuthProviderProps {
  children: ReactNode
}

const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      setLoading(false)
    }

    getSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email: string, password: string, metadata: Record<string, unknown> = {}) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata
        }
      })
      return { data, error }
    } catch (error) {
      return { data: null, error }
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      return { data, error }
    } catch (error) {
      return { data: null, error }
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      return { error }
    } catch (error) {
      return { error }
    }
  }

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      })
      return { error }
    } catch (error) {
      return { error }
    }
  }

  const updatePassword = async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })
      return { error }
    } catch (error) {
      return { error }
    }
  }

  const sendDeleteConfirmation = async () => {
    try {
      // Generate a secure token for deletion confirmation
      const token = crypto.randomUUID()
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      
      // Store the deletion request in user metadata
      const { error: updateError } = await supabase.auth.updateUser({
        data: { 
          delete_token: token,
          delete_expires: expiresAt,
          delete_requested: true
        }
      })
      
      if (updateError) {
        return { error: updateError }
      }
      
      // Try to use a custom Edge Function for proper email
      try {
        const { error: emailError } = await supabase.functions.invoke('send-delete-confirmation', {
          body: {
            email: user?.email,
            token: token,
            confirmationUrl: `${window.location.origin}/#delete-confirm=${token}`,
            userName: user?.user_metadata?.full_name || 'User'
          }
        })
        
        // If Edge Function exists and works, return its result
        return { error: emailError }
      } catch (functionError) {
        // If Edge Function doesn't exist, fall back to a different approach
        console.log('Edge function not available, using alternative method')
        
        // For now, store the request and show instructions to user
        // In production, you'd set up proper email service (SendGrid, etc.)
        return { error: null }
      }
    } catch (error) {
      return { error }
    }
  }

  const confirmDeleteAccount = async (token: string) => {
    try {
      // Verify the token matches and hasn't expired
      if (!user?.user_metadata?.delete_token || 
          user.user_metadata.delete_token !== token ||
          !user.user_metadata.delete_expires ||
          new Date(user.user_metadata.delete_expires) < new Date()) {
        return { error: 'Invalid or expired deletion token' }
      }
      
      // Token is valid, proceed with deletion
      const { error } = await supabase.rpc('delete_user')
      if (!error) {
        // Sign out the user and clear the session
        await supabase.auth.signOut()
        setUser(null)
      }
      return { error }
    } catch (error) {
      return { error }
    }
  }

  const deleteAccount = async () => {
    try {
      const { error } = await supabase.rpc('delete_user')
      if (!error) {
        // Sign out the user and clear the session
        await supabase.auth.signOut()
        setUser(null)
      }
      return { error }
    } catch (error) {
      return { error }
    }
  }

  const value: AuthContextType = {
    user,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    sendDeleteConfirmation,
    confirmDeleteAccount,
    deleteAccount
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthContext
export { AuthProvider }
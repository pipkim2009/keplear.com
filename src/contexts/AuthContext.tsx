import { createContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  loading: boolean
  signUp: (username: string, password: string, metadata?: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>
  signIn: (username: string, password: string) => Promise<{ data: unknown; error: unknown }>
  signOut: () => Promise<{ error: unknown }>
  updatePassword: (newPassword: string) => Promise<{ error: unknown }>
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

  const signUp = async (username: string, password: string, metadata: Record<string, unknown> = {}) => {
    try {
      // Generate a fake email from username for Supabase (user never sees this)
      const fakeEmail = `${username}@placeholder.com`
      
      const { data, error } = await supabase.auth.signUp({
        email: fakeEmail,
        password,
        options: {
          data: { ...metadata, username, display_name: username }
        }
      })
      return { data, error }
    } catch (error) {
      return { data: null, error }
    }
  }

  const signIn = async (username: string, password: string) => {
    try {
      // Generate the same fake email format for sign in
      const fakeEmail = `${username}@placeholder.com`
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: fakeEmail,
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
    updatePassword,
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
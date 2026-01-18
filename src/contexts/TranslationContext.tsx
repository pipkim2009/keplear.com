import { createContext, useContext, useCallback, ReactNode } from 'react'

// Import English translations
import en from '../translations/en.json'

type TranslationKey = string

interface TranslationContextType {
  language: string
  t: (key: TranslationKey, params?: Record<string, string | number>) => string
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined)

interface TranslationProviderProps {
  children: ReactNode
}

export const TranslationProvider: React.FC<TranslationProviderProps> = ({ children }) => {
  const language = 'en'

  const t = useCallback((key: TranslationKey, params?: Record<string, string | number>): string => {
    const keys = key.split('.')
    let value: unknown = en

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = (value as Record<string, unknown>)[k]
      } else {
        return key // Return key if not found
      }
    }

    if (typeof value !== 'string') {
      return key
    }

    // Replace parameters like {name} with actual values
    if (params) {
      return value.replace(/\{(\w+)\}/g, (_, paramKey) => {
        return params[paramKey]?.toString() || `{${paramKey}}`
      })
    }

    return value
  }, [])

  return (
    <TranslationContext.Provider value={{ language, t }}>
      {children}
    </TranslationContext.Provider>
  )
}

export const useTranslation = (): TranslationContextType => {
  const context = useContext(TranslationContext)
  if (!context) {
    throw new Error('useTranslation must be used within a TranslationProvider')
  }
  return context
}

// Helper function for class components
export const getTranslation = (key: string, params?: Record<string, string | number>): string => {
  const keys = key.split('.')
  let value: unknown = en

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = (value as Record<string, unknown>)[k]
    } else {
      return key
    }
  }

  if (typeof value !== 'string') {
    return key
  }

  if (params) {
    return value.replace(/\{(\w+)\}/g, (_, paramKey) => {
      return params[paramKey]?.toString() || `{${paramKey}}`
    })
  }

  return value
}

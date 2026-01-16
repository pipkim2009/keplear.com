import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'

// Import all translation files
import en from '../translations/en.json'
import cy from '../translations/cy.json'
import es from '../translations/es.json'
import fr from '../translations/fr.json'
import de from '../translations/de.json'
import it from '../translations/it.json'
import pt from '../translations/pt.json'
import zh from '../translations/zh.json'
import ja from '../translations/ja.json'
import ko from '../translations/ko.json'

type TranslationKey = string
type Translations = Record<string, string | Record<string, string>>

const translations: Record<string, Translations> = {
  en,
  cy,
  es,
  fr,
  de,
  it,
  pt,
  zh,
  ja,
  ko,
}

interface TranslationContextType {
  language: string
  setLanguage: (lang: string) => void
  t: (key: TranslationKey, params?: Record<string, string | number>) => string
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined)

interface TranslationProviderProps {
  children: ReactNode
}

export const TranslationProvider: React.FC<TranslationProviderProps> = ({ children }) => {
  const [language, setLanguageState] = useState(() => {
    return localStorage.getItem('language') || 'en'
  })

  useEffect(() => {
    localStorage.setItem('language', language)
  }, [language])

  const setLanguage = useCallback((lang: string) => {
    setLanguageState(lang)
  }, [])

  const t = useCallback((key: TranslationKey, params?: Record<string, string | number>): string => {
    const keys = key.split('.')
    let value: unknown = translations[language] || translations.en

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = (value as Record<string, unknown>)[k]
      } else {
        // Fallback to English
        value = translations.en
        for (const fallbackKey of keys) {
          if (value && typeof value === 'object' && fallbackKey in value) {
            value = (value as Record<string, unknown>)[fallbackKey]
          } else {
            return key // Return key if not found
          }
        }
        break
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
  }, [language])

  return (
    <TranslationContext.Provider value={{ language, setLanguage, t }}>
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

// Helper function for class components - gets translation based on stored language
export const getTranslation = (key: string, params?: Record<string, string | number>): string => {
  const language = localStorage.getItem('language') || 'en'
  const keys = key.split('.')
  let value: unknown = translations[language] || translations.en

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = (value as Record<string, unknown>)[k]
    } else {
      // Fallback to English
      value = translations.en
      for (const fallbackKey of keys) {
        if (value && typeof value === 'object' && fallbackKey in value) {
          value = (value as Record<string, unknown>)[fallbackKey]
        } else {
          return key
        }
      }
      break
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

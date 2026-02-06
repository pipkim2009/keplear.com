import { ReactNode } from 'react'
import { AudioProvider } from './AudioContext'
import { UIProvider } from './UIContext'
import { InstrumentConfigProvider } from './InstrumentConfigContext'
import { MelodyProvider } from './MelodyContext'
import { InstrumentProvider } from './InstrumentContext'
import { TranslationProvider } from './TranslationContext'

/**
 * Unified provider component that wraps all context providers
 * Order matters: Inner contexts can consume outer contexts
 *
 * Architecture:
 * 1. AudioProvider - Base audio functionality (no dependencies)
 * 2. UIProvider - UI state and navigation (no dependencies)
 * 3. InstrumentConfigProvider - Instrument settings (no dependencies)
 * 4. MelodyProvider - Melody generation/playback (depends on Audio, UI, InstrumentConfig)
 * 5. InstrumentProvider - Legacy compatibility wrapper (being deprecated)
 */

interface AppProvidersProps {
  children: ReactNode
  /**
   * Use legacy single context for backward compatibility
   * Set to false to use new split context architecture
   */
  useLegacyContext?: boolean
}

export const AppProviders: React.FC<AppProvidersProps> = ({
  children,
  useLegacyContext = false,
}) => {
  if (useLegacyContext) {
    // Legacy single context (for gradual migration)
    return <InstrumentProvider>{children}</InstrumentProvider>
  }

  // New split context architecture
  return (
    <TranslationProvider>
      <AudioProvider>
        <UIProvider>
          <InstrumentConfigProvider>
            <MelodyProvider>{children}</MelodyProvider>
          </InstrumentConfigProvider>
        </UIProvider>
      </AudioProvider>
    </TranslationProvider>
  )
}

/**
 * Convenience hook that combines all contexts
 * Use this for components that need multiple contexts
 *
 * @deprecated Use specific context hooks instead (useAudioContext, useUI, etc.)
 * This is provided for backward compatibility only
 */
// eslint-disable-next-line react-refresh/only-export-components
export { useInstrument } from './InstrumentContext'

// Export new context hooks
// eslint-disable-next-line react-refresh/only-export-components
export { useAudioContext } from './AudioContext'
// eslint-disable-next-line react-refresh/only-export-components
export { useUI } from './UIContext'
// eslint-disable-next-line react-refresh/only-export-components
export { useInstrumentConfigContext } from './InstrumentConfigContext'
// eslint-disable-next-line react-refresh/only-export-components
export { useMelody } from './MelodyContext'

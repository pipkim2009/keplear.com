import { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { TranslationProvider } from '../contexts/TranslationContext'
import { HelmetProvider } from 'react-helmet-async'

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialRoute?: string
}

/**
 * Custom render with all providers
 * Use instead of @testing-library/react render for components that need contexts
 */
function customRender(ui: ReactElement, options: CustomRenderOptions = {}) {
  const { initialRoute = '/', ...renderOptions } = options

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <HelmetProvider>
        <MemoryRouter initialEntries={[initialRoute]}>
          <TranslationProvider>{children}</TranslationProvider>
        </MemoryRouter>
      </HelmetProvider>
    )
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions })
}

// Re-export everything from testing-library
// eslint-disable-next-line react-refresh/only-export-components
export * from '@testing-library/react'

// Override render with our custom version
export { customRender as render }

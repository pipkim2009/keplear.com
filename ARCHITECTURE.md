# 🏗️ Keplear Architecture Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture Principles](#architecture-principles)
3. [Directory Structure](#directory-structure)
4. [State Management](#state-management)
5. [Component Architecture](#component-architecture)
6. [Audio System](#audio-system)
7. [Performance Optimizations](#performance-optimizations)
8. [Error Handling](#error-handling)
9. [Testing Strategy](#testing-strategy)
10. [Development Workflow](#development-workflow)

## System Overview

Keplear is a professional-grade musical ear training platform built with modern React patterns and TypeScript. The application provides interactive musical instruments (keyboard, guitar, bass) for melody generation, playback, and practice.

### Core Technologies
- **Frontend**: React 19 + TypeScript 5.8
- **Build Tool**: Vite 7.1 with hot module replacement
- **Audio Engine**: Tone.js 15 with Web Audio API
- **Backend**: Supabase (PostgreSQL + Auth + Real-time)
- **Styling**: CSS Modules + Design Tokens
- **Testing**: Vitest + React Testing Library

### Key Features
- 🎹 Multi-instrument support (keyboard, guitar, bass)
- 🎵 Intelligent melody generation with range/multi-select modes
- 🎧 High-quality audio recording and playback
- 👤 Secure authentication with username-based system
- 🎨 Dark/light theme support with smooth transitions
- 📱 Responsive design for mobile and desktop

## Architecture Principles

### 1. **Separation of Concerns**
- **UI Components**: Pure presentation logic, minimal business logic
- **Custom Hooks**: Encapsulate stateful logic and side effects
- **Context Providers**: Manage global state and cross-cutting concerns
- **Utility Functions**: Pure functions for data manipulation and calculations

### 2. **Performance-First Design**
- React.memo for expensive components
- useCallback/useMemo for stable references
- Dynamic imports for code splitting
- Optimized bundle chunking

### 3. **Error Resilience**
- Comprehensive error boundaries with retry mechanisms
- Circuit breaker pattern for audio operations
- Graceful degradation for unsupported features
- Retry logic with exponential backoff

### 4. **Type Safety**
- Strict TypeScript configuration
- Comprehensive interface definitions
- Readonly types for immutable data
- Runtime type validation where needed

### 5. **Accessibility**
- Semantic HTML structure
- ARIA labels and descriptions
- Keyboard navigation support
- Screen reader compatibility

## Directory Structure

```
src/
├── components/          # React components organized by feature
│   ├── auth/           # Authentication components
│   ├── common/         # Shared UI components
│   ├── guitar/         # Guitar-specific components
│   ├── keyboard/       # Keyboard-specific components
│   └── pages/          # Page-level components
├── contexts/           # React Context providers
│   ├── AuthContext.tsx
│   └── InstrumentContext.tsx
├── hooks/              # Custom React hooks
│   ├── useAudio.ts
│   ├── useMelodyGenerator.ts
│   └── useUIState.ts
├── utils/              # Pure utility functions
│   ├── errorHandler.ts
│   ├── performance.ts
│   └── notes.ts
├── styles/             # CSS organization
│   ├── tokens/         # Design tokens (colors, spacing, etc.)
│   ├── components/     # Component-specific styles
│   └── shared/         # Shared style utilities
├── constants/          # Application constants
├── lib/               # External service integrations
└── types/             # TypeScript type definitions
```

### File Naming Conventions
- **Components**: PascalCase (e.g., `KeyboardKey.tsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `useAudio.ts`)
- **Utilities**: camelCase (e.g., `errorHandler.ts`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `AUDIO_CONFIG`)
- **CSS Modules**: Component name + `.module.css`

## State Management

### Context-Based Architecture
Keplear uses React Context for state management, eliminating prop drilling and providing clean separation of concerns.

#### InstrumentContext
The primary context that manages all instrument-related state:

```typescript
interface InstrumentContextType {
  // Audio functions
  playNote: (note: string) => Promise<void>
  playMelody: (melody: Note[], bpm: number) => Promise<void>

  // UI State
  currentPage: string
  bpm: number
  numberOfNotes: number

  // Instrument Config
  instrument: string
  keyboardSelectionMode: string

  // Melody Generation
  selectedNotes: Note[]
  generatedMelody: Note[]
}
```

**Key Benefits:**
- Eliminates 30+ props that were previously passed through components
- Centralizes instrument state management
- Provides consistent API across components
- Enables easy testing and debugging

#### AuthContext
Manages user authentication state and operations:

```typescript
interface AuthContextType {
  user: User | null
  loading: boolean
  signUp: (username: string, password: string) => Promise<AuthResult>
  signIn: (username: string, password: string) => Promise<AuthResult>
  signOut: () => Promise<AuthErrorResult>
}
```

### Custom Hooks Pattern
State logic is encapsulated in custom hooks for reusability and testing:

- **useAudio**: Audio system management with retry logic
- **useMelodyGenerator**: Note selection and melody generation
- **useUIState**: UI state management and navigation
- **useTheme**: Theme switching and persistence

## Component Architecture

### Component Hierarchy
```
App (Root)
├── ErrorBoundary
├── AuthProvider
├── InstrumentProvider
├── Header
│   ├── ThemeToggle
│   ├── AuthModal
│   └── UserMenu
├── Router
│   ├── HomePage
│   ├── SandboxPage
│   └── PracticePage
│       ├── InstrumentRenderer
│       ├── ParameterControls
│       └── MelodyControls
└── Footer
```

### Component Types

#### 1. **Container Components**
Components that manage state and business logic:
- Connect to Context providers
- Handle user interactions
- Manage side effects

```typescript
// Example: InstrumentRenderer
function InstrumentRenderer() {
  const { instrument, handleNoteClick } = useInstrument()

  return (
    <div>
      {instrument === 'keyboard' && <Keyboard onNoteClick={handleNoteClick} />}
      {instrument === 'guitar' && <Guitar onNoteClick={handleNoteClick} />}
    </div>
  )
}
```

#### 2. **Presentation Components**
Pure components focused on rendering:
- Receive data via props
- No business logic
- Highly reusable

```typescript
// Example: KeyboardKey
const KeyboardKey = memo(({ note, isSelected, onClick }) => (
  <button
    className={`key ${isSelected ? 'selected' : ''}`}
    onClick={() => onClick(note)}
    aria-label={`${note.name} key`}
  >
    {note.name}
  </button>
))
```

#### 3. **Layout Components**
Components that handle positioning and structure:
- Responsive design
- CSS Grid/Flexbox layouts
- No business logic

### Performance Optimizations

#### React.memo Usage
All components are wrapped with `React.memo` to prevent unnecessary re-renders:

```typescript
const Header = memo(function Header({ isDarkMode, onToggleTheme }) {
  // Component implementation
})
```

#### Callback Optimization
Event handlers are memoized to maintain referential equality:

```typescript
const handleNoteClick = useCallback(async (note: Note) => {
  await playNote(note.name)
  selectNote(note, keyboardSelectionMode)
}, [playNote, selectNote, keyboardSelectionMode])
```

#### Bundle Splitting
Strategic code splitting for optimal loading:

```typescript
// Dynamic import for Tone.js
const Tone = await import('tone')

// Vite configuration for chunk splitting
manualChunks: {
  vendor: ['react', 'react-dom'],
  audio: ['tone'],
  auth: ['@supabase/supabase-js']
}
```

## Audio System

### Architecture Overview
The audio system is built on Tone.js with comprehensive error handling and performance optimization.

#### Lazy Loading Strategy
Audio libraries are dynamically imported to reduce initial bundle size:

```typescript
const initializeAudio = useCallback(async () => {
  const Tone = await import('tone')
  await Tone.start()
  // Create samplers...
}, [])
```

#### Multi-Instrument Support
Each instrument has its own sampler configuration:

```typescript
const INSTRUMENTS = {
  keyboard: {
    urls: { C4: "C4.mp3", "D#4": "Ds4.mp3" },
    release: 1.5,
    baseUrl: SERVICE_URLS.keyboardSamples
  },
  guitar: {
    urls: { A2: "A2.mp3", C3: "C3.mp3" },
    release: 1.0,
    baseUrl: SERVICE_URLS.guitarSamples
  }
}
```

#### Error Recovery
Robust error handling with circuit breaker pattern:

```typescript
const playNote = async (noteName: string) => {
  return withRetry(async () => {
    return circuitBreaker.execute(async () => {
      const sampler = await initializeAudio()
      sampler.triggerAttackRelease(noteName, duration)
    })
  }, {}, 'audio')
}
```

### Recording System
High-quality audio recording with proper routing:

```typescript
const recordMelody = async (melody: Note[], bpm: number) => {
  const recorder = new Tone.Recorder()
  const gainNode = new Tone.Gain(0) // Silent monitoring

  // Route: sampler -> recorder (for recording)
  //        sampler -> gainNode -> destination (for monitoring)
  sampler.connect(recorder)
  sampler.connect(gainNode)
  gainNode.connect(destination)

  // Record and return blob
  return await recorder.stop()
}
```

## Error Handling

### Multi-Layer Error Strategy

#### 1. **Error Boundaries**
React error boundaries with retry mechanisms:

```typescript
class ErrorBoundary extends Component {
  handleRetry = () => {
    if (this.state.retryAttempts < maxRetries) {
      this.setState({ hasError: false, retryAttempts: retryAttempts + 1 })
    }
  }
}
```

#### 2. **Circuit Breaker Pattern**
Prevents cascading failures in audio operations:

```typescript
class CircuitBreaker {
  async execute(operation) {
    if (this.state === 'OPEN') {
      throw new Error('Circuit breaker is OPEN')
    }
    try {
      const result = await operation()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }
}
```

#### 3. **Retry Logic**
Exponential backoff for transient failures:

```typescript
async function withRetry(operation, options) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      const delay = Math.min(
        baseDelay * Math.pow(backoffFactor, attempt),
        maxDelay
      )
      await sleep(delay + Math.random() * 1000) // Jitter
    }
  }
}
```

#### 4. **Graceful Degradation**
Fallback mechanisms for unsupported features:

```typescript
const withFallback = (primaryOperation, fallbackOperation) => {
  try {
    return primaryOperation()
  } catch (error) {
    console.warn('Primary operation failed, using fallback:', error)
    return fallbackOperation()
  }
}
```

## Testing Strategy

### Test Pyramid Structure

#### 1. **Unit Tests** (70%)
- Custom hooks testing
- Utility function testing
- Component logic testing

```typescript
// Example: useAudio hook test
describe('useAudio', () => {
  it('should initialize with correct state', () => {
    const { result } = renderHook(() => useAudio())
    expect(result.current.isPlaying).toBe(false)
  })
})
```

#### 2. **Integration Tests** (20%)
- Context provider integration
- Component interaction testing
- Audio workflow testing

```typescript
// Example: Audio workflow test
describe('Audio Workflow', () => {
  it('should complete full keyboard workflow', async () => {
    render(<App />, { wrapper: TestWrapper })
    // Test complete user journey
  })
})
```

#### 3. **E2E Tests** (10%)
- Critical user paths
- Cross-browser compatibility
- Performance regression testing

### Test Configuration
- **Framework**: Vitest with jsdom environment
- **Utilities**: React Testing Library
- **Mocking**: Comprehensive audio and auth mocking
- **Coverage**: 90%+ target coverage

## Performance Monitoring

### Comprehensive Metrics Tracking

#### Web Vitals
- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- First Input Delay (FID)
- Cumulative Layout Shift (CLS)

#### Component Performance
- Render time tracking
- Re-render frequency monitoring
- Props change detection

#### Memory Management
- Heap usage monitoring
- Memory leak detection
- Garbage collection optimization

#### Bundle Analysis
- Chunk size monitoring
- Dependency analysis
- Tree shaking verification

### Performance Optimization Checklist

- [ ] React.memo implementation
- [ ] useCallback/useMemo optimization
- [ ] Bundle size analysis
- [ ] Image optimization
- [ ] CSS optimization
- [ ] Service worker caching
- [ ] CDN utilization

## Development Workflow

### Code Quality Gates

#### 1. **Pre-commit Hooks**
- TypeScript compilation
- ESLint validation
- Prettier formatting
- Test execution

#### 2. **Build Pipeline**
- Bundle size analysis
- Performance regression testing
- Security vulnerability scanning
- Accessibility auditing

#### 3. **Code Review Checklist**
- [ ] TypeScript types are comprehensive
- [ ] Components are properly memoized
- [ ] Error handling is implemented
- [ ] Tests cover new functionality
- [ ] Performance impact is considered

### Deployment Strategy

#### Development
- Feature branch workflow
- Automatic preview deployments
- Integration testing

#### Staging
- Pre-production validation
- Performance testing
- User acceptance testing

#### Production
- Blue-green deployment
- Rollback capability
- Performance monitoring
- Error tracking

## Future Architectural Considerations

### Scalability Improvements
1. **State Management**: Consider Zustand or Redux Toolkit for complex state
2. **Component Library**: Extract common components to a shared library
3. **Micro-frontends**: Split into domain-specific applications
4. **Server-Side Rendering**: Implement Next.js for better SEO
5. **Progressive Web App**: Add offline support and push notifications

### Performance Enhancements
1. **Virtual Scrolling**: For long lists of musical content
2. **Web Workers**: Move audio processing to background threads
3. **Service Workers**: Implement caching for audio samples
4. **WebAssembly**: Consider for computationally intensive audio operations

### Developer Experience
1. **Storybook**: Component documentation and testing
2. **Visual Regression Testing**: Automated UI testing
3. **Performance Budgets**: Automated performance monitoring
4. **Design System**: Comprehensive component design system

---

This architecture supports a professional-grade musical application with excellent performance, maintainability, and user experience. The patterns and practices established here provide a solid foundation for future growth and feature development.
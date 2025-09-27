# 📚 Keplear API Reference

## Table of Contents
1. [Contexts](#contexts)
2. [Custom Hooks](#custom-hooks)
3. [Utility Functions](#utility-functions)
4. [Components](#components)
5. [Types & Interfaces](#types--interfaces)
6. [Constants](#constants)

---

## Contexts

### InstrumentContext

Central context for managing all instrument-related state and operations.

#### Provider
```typescript
<InstrumentProvider>
  {children}
</InstrumentProvider>
```

#### Hook
```typescript
const instrumentContext = useInstrument()
```

#### Interface
```typescript
interface InstrumentContextType {
  // Audio Functions
  playNote: (note: string) => Promise<void>
  playGuitarNote: (note: string) => Promise<void>
  playBassNote: (note: string) => Promise<void>
  playMelody: (melody: readonly Note[], bpm: number) => Promise<void>
  playGuitarMelody: (melody: readonly Note[], bpm: number) => Promise<void>
  playBassMelody: (melody: readonly Note[], bpm: number) => Promise<void>
  stopMelody: () => void
  recordMelody: (notes: readonly Note[], bpm: number, instrument: any) => Promise<Blob | null>
  readonly isPlaying: boolean
  readonly isRecording: boolean

  // UI State
  currentPage: string
  bpm: number
  numberOfNotes: number
  flashingInputs: { bpm: boolean; notes: boolean; mode: boolean }
  activeInputs: { bpm: boolean; notes: boolean; mode: boolean }
  navigateToHome: () => void
  navigateToSandbox: () => void
  navigateToPractice: () => void
  setBpm: (bpm: number) => void
  setNumberOfNotes: (notes: number) => void
  triggerInputFlash: (input: 'bpm' | 'notes' | 'mode') => void
  setInputActive: (input: 'bpm' | 'notes' | 'mode', active: boolean) => void

  // Instrument Configuration
  instrument: string
  keyboardOctaves: { lower: number; higher: number }
  keyboardSelectionMode: string
  clearChordsAndScalesTrigger: number
  setInstrument: (instrument: string) => void
  setKeyboardSelectionMode: (mode: 'range' | 'multi') => void
  triggerClearChordsAndScales: () => void

  // Melody Generation
  selectedNotes: Note[]
  generatedMelody: Note[]
  selectNote: (note: Note, mode?: 'range' | 'multi') => void
  generateMelody: (notes: Note[], count: number, instrument: string, mode: string) => void
  setGuitarNotes: (notes: Note[]) => void
  isSelected: (note: Note) => boolean
  isInMelody: (note: Note, showNotes: boolean) => boolean
  clearSelection: () => void
  clearTrigger: number

  // Melody Player
  playbackProgress: number
  melodyDuration: number
  recordedAudioBlob: Blob | null
  showNotes: boolean
  setPlaybackProgress: (progress: number) => void
  setMelodyDuration: (duration: number) => void
  toggleShowNotes: () => void
  handleRecordMelody: () => Promise<Blob | null>
  handleClearRecordedAudio: () => void
  calculateMelodyDuration: (notes: number, bpm: number) => number

  // Event Handlers
  handleNoteClick: (note: Note) => Promise<void>
  handleGenerateMelody: () => void
  handlePlayMelody: () => void
  handleInstrumentChange: (newInstrument: string) => void
  handleOctaveRangeChange: (lowerOctaves: number, higherOctaves: number) => void
  handleKeyboardSelectionModeChange: (mode: 'range' | 'multi') => void
}
```

#### Usage Example
```typescript
function MyComponent() {
  const {
    playNote,
    selectedNotes,
    generateMelody,
    isPlaying
  } = useInstrument()

  const handleKeyPress = async (note: Note) => {
    await playNote(note.name)
  }

  return (
    <div>
      {/* Component implementation */}
    </div>
  )
}
```

### AuthContext

Manages user authentication state and operations.

#### Provider
```typescript
<AuthProvider>
  {children}
</AuthProvider>
```

#### Hook
```typescript
const authContext = useAuth()
```

#### Interface
```typescript
interface AuthContextType {
  readonly user: User | null
  readonly loading: boolean
  signUp: (username: string, password: string, metadata?: Record<string, unknown>) => Promise<AuthResult>
  signIn: (username: string, password: string) => Promise<AuthResult>
  signOut: () => Promise<AuthErrorResult>
  updatePassword: (newPassword: string) => Promise<AuthErrorResult>
  deleteAccount: () => Promise<AuthErrorResult>
}

interface AuthResult<T = unknown> {
  data: T | null
  error: AuthError | Error | null
}

interface AuthErrorResult {
  error: AuthError | Error | null
}
```

#### Usage Example
```typescript
function LoginForm() {
  const { signIn, loading, user } = useAuth()

  const handleSubmit = async (username: string, password: string) => {
    const { error } = await signIn(username, password)
    if (error) {
      console.error('Login failed:', error.message)
    }
  }

  if (user) {
    return <div>Welcome, {user.user_metadata.username}!</div>
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Form implementation */}
    </form>
  )
}
```

---

## Custom Hooks

### useAudio

Manages audio initialization, playback, and recording.

#### Signature
```typescript
function useAudio(): UseAudioReturn
```

#### Return Type
```typescript
interface UseAudioReturn {
  playNote: (noteName: string, duration?: string) => Promise<void>
  playGuitarNote: (noteName: string, duration?: string) => Promise<void>
  playBassNote: (noteName: string, duration?: string) => Promise<void>
  playMelody: (melody: Note[], bpm: number) => Promise<void>
  playGuitarMelody: (melody: Note[], bpm: number) => Promise<void>
  playBassMelody: (melody: Note[], bpm: number) => Promise<void>
  stopMelody: () => void
  recordMelody: (melody: Note[], bpm: number, instrument?: 'keyboard' | 'guitar' | 'bass') => Promise<Blob | null>
  readonly isPlaying: boolean
  readonly isRecording: boolean
}
```

#### Usage Example
```typescript
function AudioControls() {
  const { playNote, playMelody, isPlaying, stopMelody } = useAudio()

  const handlePlayNote = async () => {
    await playNote('C4')
  }

  const handlePlayMelody = async () => {
    const melody = [
      { name: 'C4', position: 0 },
      { name: 'D4', position: 1 },
      { name: 'E4', position: 2 }
    ]
    await playMelody(melody, 120)
  }

  return (
    <div>
      <button onClick={handlePlayNote}>Play C4</button>
      <button onClick={handlePlayMelody}>Play Melody</button>
      {isPlaying && <button onClick={stopMelody}>Stop</button>}
    </div>
  )
}
```

### useMelodyGenerator

Handles note selection and melody generation logic.

#### Signature
```typescript
function useMelodyGenerator(): UseMelodyGeneratorReturn
```

#### Return Type
```typescript
interface UseMelodyGeneratorReturn {
  readonly selectedNotes: readonly Note[]
  readonly generatedMelody: readonly Note[]
  readonly clearTrigger: number
  selectNote: (note: Note, selectionMode?: 'range' | 'multi') => void
  generateMelody: (notes: readonly Note[], numberOfNotes: number, instrument?: InstrumentType, selectionMode?: 'range' | 'multi') => void
  setGuitarNotes: (notes: Note[]) => void
  isSelected: (note: Note) => boolean
  isInMelody: (note: Note, showNotes: boolean) => boolean
  clearSelection: () => void
}
```

#### Usage Example
```typescript
function MelodyGenerator() {
  const {
    selectedNotes,
    generatedMelody,
    selectNote,
    generateMelody,
    isSelected,
    clearSelection
  } = useMelodyGenerator()

  const handleNoteClick = (note: Note) => {
    selectNote(note, 'multi')
  }

  const handleGenerate = () => {
    const allNotes = generateNotesRange()
    generateMelody(allNotes, 8, 'keyboard', 'range')
  }

  return (
    <div>
      <button onClick={handleGenerate}>Generate Melody</button>
      <button onClick={clearSelection}>Clear Selection</button>
      <div>Selected: {selectedNotes.length} notes</div>
      <div>Generated: {generatedMelody.length} notes</div>
    </div>
  )
}
```

### useTheme

Manages theme state and persistence.

#### Signature
```typescript
function useTheme(): UseThemeReturn
```

#### Return Type
```typescript
interface UseThemeReturn {
  isDarkMode: boolean
  toggleTheme: () => void
}
```

#### Usage Example
```typescript
function ThemeToggle() {
  const { isDarkMode, toggleTheme } = useTheme()

  return (
    <button onClick={toggleTheme}>
      {isDarkMode ? '🌙 Dark' : '☀️ Light'}
    </button>
  )
}
```

### usePerformanceTracking

Tracks component performance metrics.

#### Signature
```typescript
function usePerformanceTracking(componentName: string): PerformanceTrackingReturn
```

#### Return Type
```typescript
interface PerformanceTrackingReturn {
  trackRender: (renderTime: number, propsChanged?: boolean) => void
  trackInteraction: (interactionType: string, targetElement: string, duration: number, success?: boolean) => void
  measureAsync: <T>(operationName: string, operation: () => Promise<T>) => Promise<T>
}
```

#### Usage Example
```typescript
function PerformantComponent() {
  const { trackRender, trackInteraction, measureAsync } = usePerformanceTracking('PerformantComponent')

  useEffect(() => {
    const startTime = performance.now()
    return () => {
      const renderTime = performance.now() - startTime
      trackRender(renderTime)
    }
  })

  const handleClick = async () => {
    const startTime = performance.now()

    await measureAsync('expensive-operation', async () => {
      // Expensive operation
      await new Promise(resolve => setTimeout(resolve, 100))
    })

    const duration = performance.now() - startTime
    trackInteraction('click', 'button', duration, true)
  }

  return <button onClick={handleClick}>Tracked Button</button>
}
```

---

## Utility Functions

### Error Handling

#### withRetry
Executes a function with retry logic and exponential backoff.

```typescript
function withRetry<T>(
  operation: () => Promise<T>,
  options?: Partial<RetryOptions>,
  operationType?: 'audio' | 'network' | 'auth'
): Promise<T>

interface RetryOptions {
  maxRetries: number
  baseDelay: number
  maxDelay: number
  backoffFactor: number
  shouldRetry?: (error: Error, attempt: number) => boolean
}
```

#### Usage Example
```typescript
const result = await withRetry(
  async () => {
    const response = await fetch('/api/data')
    if (!response.ok) throw new Error('Network error')
    return response.json()
  },
  { maxRetries: 3, baseDelay: 1000 },
  'network'
)
```

#### withFallback
Provides graceful degradation with fallback operations.

```typescript
function withFallback<T, F>(
  primaryOperation: () => T,
  fallbackOperation: () => F,
  errorMessage?: string
): T | F

function withAsyncFallback<T, F>(
  primaryOperation: () => Promise<T>,
  fallbackOperation: () => Promise<F>,
  errorMessage?: string
): Promise<T | F>
```

#### Usage Example
```typescript
const audioContext = withFallback(
  () => new AudioContext(),
  () => console.warn('AudioContext not supported'),
  'Modern audio features unavailable'
)
```

### Performance Monitoring

#### PerformanceMonitor
Singleton class for comprehensive performance tracking.

```typescript
class PerformanceMonitor {
  static getInstance(): PerformanceMonitor
  trackComponentRender(componentName: string, renderTime: number, propsChanged?: boolean): void
  trackInteraction(interactionType: string, targetElement: string, duration: number, success?: boolean): void
  measureAsync<T>(operationName: string, operation: () => Promise<T>): Promise<T>
  getPerformanceReport(): PerformanceReport
  setEnabled(enabled: boolean): void
  clear(): void
}
```

#### Usage Example
```typescript
const monitor = PerformanceMonitor.getInstance()

// Track component render
monitor.trackComponentRender('MyComponent', 12.5, true)

// Track user interaction
monitor.trackInteraction('click', 'play-button', 150, true)

// Get performance report
const report = monitor.getPerformanceReport()
console.log('Performance metrics:', report)
```

### Audio Utilities

#### CircuitBreaker
Prevents cascading failures in audio operations.

```typescript
class CircuitBreaker {
  constructor(threshold?: number, timeout?: number, resetTimeout?: number)
  execute<T>(operation: () => Promise<T>): Promise<T>
  getState(): { state: string; failures: number; threshold: number }
}
```

#### Usage Example
```typescript
const breaker = new CircuitBreaker(5, 60000, 30000)

const result = await breaker.execute(async () => {
  return await someAudioOperation()
})
```

---

## Components

### KeyboardKey

Optimized keyboard key component with comprehensive state management.

#### Props
```typescript
interface KeyboardKeyProps {
  note: Note
  isSelected: boolean
  isInMelody: boolean
  onClick: (note: Note) => void
  className?: string
  style?: React.CSSProperties
  isInScale?: boolean
  isRoot?: boolean
  isInChord?: boolean
  isChordRoot?: boolean
}
```

#### Usage Example
```typescript
<KeyboardKey
  note={{ name: 'C4', position: 0, isBlack: false }}
  isSelected={isSelected}
  isInMelody={isInMelody}
  onClick={handleNoteClick}
  isInScale={true}
  isRoot={false}
/>
```

### ErrorBoundary

Enhanced error boundary with retry mechanisms.

#### Props
```typescript
interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  retryCount?: number
  showRetryButton?: boolean
}
```

#### Usage Example
```typescript
<ErrorBoundary
  retryCount={3}
  showRetryButton={true}
  onError={(error, errorInfo) => {
    console.error('Component error:', error, errorInfo)
  }}
>
  <AudioComponent />
</ErrorBoundary>
```

### ThemeToggle

Optimized theme switching component.

#### Props
```typescript
interface ThemeToggleProps {
  readonly isDarkMode: boolean
  readonly onToggle: () => void
}
```

#### Usage Example
```typescript
<ThemeToggle
  isDarkMode={isDarkMode}
  onToggle={toggleTheme}
/>
```

---

## Types & Interfaces

### Core Types

#### Note
Represents a musical note with position and metadata.

```typescript
interface Note {
  name: string           // Note name (e.g., 'C4', 'F#3')
  position: number       // Position in chromatic scale
  isBlack?: boolean     // Whether it's a black key (optional)
}
```

#### InstrumentType
Supported instrument types.

```typescript
type InstrumentType = 'keyboard' | 'guitar' | 'bass'
```

#### AuthResult
Result type for authentication operations.

```typescript
interface AuthResult<T = unknown> {
  data: T | null
  error: AuthError | Error | null
}

interface AuthErrorResult {
  error: AuthError | Error | null
}
```

### Error Types

#### Enhanced Error Classes
```typescript
class AudioError extends Error {
  constructor(message: string, audioContext?: AudioContext)
}

class NetworkError extends Error {
  constructor(message: string, status?: number, url?: string)
}

class AuthenticationError extends Error {
  constructor(message: string, code?: string)
}

interface ErrorWithRetry extends Error {
  isRetryable: boolean
  retryCount: number
  originalError?: Error
}
```

### Performance Types

#### Performance Metrics
```typescript
interface PerformanceMetrics {
  fcp?: number    // First Contentful Paint
  lcp?: number    // Largest Contentful Paint
  fid?: number    // First Input Delay
  cls?: number    // Cumulative Layout Shift
  tti?: number    // Time to Interactive
  tbt?: number    // Total Blocking Time
}

interface ComponentPerformanceData {
  componentName: string
  renderTime: number
  renderCount: number
  propsChangeCount: number
  lastRenderTimestamp: number
}
```

---

## Constants

### Audio Configuration

```typescript
const AUDIO_CONFIG = {
  keyboardDuration: '0.3',
  guitarDuration: '0.5',
  bassDuration: '0.8',
  minBpm: 60,
  maxBpm: 200,
  maxMelodyLength: 16
} as const
```

### Service URLs

```typescript
const SERVICE_URLS = {
  keyboardSamples: '/audio/keyboard/',
  guitarSamples: '/audio/guitar/',
  bassSamples: '/audio/bass/'
} as const
```

### Retry Options

```typescript
const DEFAULT_RETRY_OPTIONS = {
  audio: {
    maxRetries: 3,
    baseDelay: 500,
    maxDelay: 5000,
    backoffFactor: 2
  },
  network: {
    maxRetries: 5,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 1.5
  },
  auth: {
    maxRetries: 2,
    baseDelay: 2000,
    maxDelay: 8000,
    backoffFactor: 2
  }
} as const
```

---

## Best Practices

### Component Development

1. **Always use React.memo** for performance optimization
2. **Memoize callbacks** with useCallback for stable references
3. **Use TypeScript interfaces** for comprehensive type safety
4. **Implement error boundaries** for robust error handling
5. **Add performance tracking** for critical components

### State Management

1. **Keep state close to where it's used** when possible
2. **Use context sparingly** for truly global state
3. **Prefer composition over inheritance** for component design
4. **Implement proper cleanup** in useEffect hooks

### Error Handling

1. **Always handle async errors** with try-catch or error boundaries
2. **Implement retry logic** for transient failures
3. **Provide meaningful error messages** to users
4. **Log errors comprehensively** for debugging

### Performance

1. **Monitor bundle size** regularly
2. **Use dynamic imports** for code splitting
3. **Implement performance budgets** in CI/CD
4. **Track Core Web Vitals** in production

---

This API reference provides comprehensive documentation for all public interfaces and utilities in the Keplear application. For implementation details, refer to the source code and architecture documentation.
# 🎯 Component Usage Examples

This document provides practical examples for using Keplear components, hooks, and utilities in real-world scenarios.

## Table of Contents
1. [Context Usage Examples](#context-usage-examples)
2. [Hook Integration Examples](#hook-integration-examples)
3. [Component Composition Examples](#component-composition-examples)
4. [Error Handling Examples](#error-handling-examples)
5. [Performance Optimization Examples](#performance-optimization-examples)
6. [Testing Examples](#testing-examples)

---

## Context Usage Examples

### Basic InstrumentContext Usage

```typescript
import { useInstrument } from '@contexts/InstrumentContext'

function BasicMelodyPlayer() {
  const {
    generatedMelody,
    isPlaying,
    handlePlayMelody,
    handleGenerateMelody,
    bpm,
    numberOfNotes
  } = useInstrument()

  return (
    <div className="melody-player">
      <div className="controls">
        <button onClick={handleGenerateMelody}>
          Generate Melody ({numberOfNotes} notes at {bpm} BPM)
        </button>

        <button
          onClick={handlePlayMelody}
          disabled={generatedMelody.length === 0}
        >
          {isPlaying ? 'Stop' : 'Play'} Melody
        </button>
      </div>

      <div className="melody-display">
        {generatedMelody.map((note, index) => (
          <span key={index} className="note">
            {note.name}
          </span>
        ))}
      </div>
    </div>
  )
}
```

### Advanced Instrument Integration

```typescript
import { useInstrument } from '@contexts/InstrumentContext'
import { useCallback, useMemo } from 'react'

function AdvancedKeyboard() {
  const {
    selectedNotes,
    generatedMelody,
    handleNoteClick,
    isSelected,
    isInMelody,
    showNotes,
    keyboardSelectionMode,
    setKeyboardSelectionMode
  } = useInstrument()

  // Generate keyboard layout
  const keyboardKeys = useMemo(() => {
    return generateKeyboardLayout(4, 5) // C4 to B5
  }, [])

  // Handle key press with visual feedback
  const handleKeyPress = useCallback(async (note: Note) => {
    try {
      await handleNoteClick(note)
      // Add visual feedback
      const keyElement = document.querySelector(`[data-note="${note.name}"]`)
      keyElement?.classList.add('pressed')
      setTimeout(() => keyElement?.classList.remove('pressed'), 150)
    } catch (error) {
      console.error('Failed to play note:', error)
    }
  }, [handleNoteClick])

  return (
    <div className="advanced-keyboard">
      <div className="keyboard-controls">
        <label>
          Selection Mode:
          <select
            value={keyboardSelectionMode}
            onChange={(e) => setKeyboardSelectionMode(e.target.value as 'range' | 'multi')}
          >
            <option value="range">Range Selection</option>
            <option value="multi">Multi Selection</option>
          </select>
        </label>
      </div>

      <div className="keyboard-layout">
        {keyboardKeys.map((note) => (
          <KeyboardKey
            key={note.name}
            note={note}
            isSelected={isSelected(note)}
            isInMelody={isInMelody(note, showNotes)}
            onClick={handleKeyPress}
            data-note={note.name}
            className={`
              ${note.isBlack ? 'black-key' : 'white-key'}
              ${isSelected(note) ? 'selected' : ''}
              ${isInMelody(note, showNotes) ? 'in-melody' : ''}
            `}
          />
        ))}
      </div>

      <div className="selection-info">
        <p>Selected Notes: {selectedNotes.length}</p>
        <p>Generated Melody: {generatedMelody.length} notes</p>
      </div>
    </div>
  )
}
```

### Authentication Integration

```typescript
import { useAuth } from '@contexts/AuthContext'
import { useState } from 'react'

function AuthenticatedApp() {
  const { user, loading, signIn, signOut } = useAuth()
  const [credentials, setCredentials] = useState({ username: '', password: '' })
  const [error, setError] = useState<string | null>(null)

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const { error } = await signIn(credentials.username, credentials.password)
    if (error) {
      setError(error.message)
    }
  }

  const handleSignOut = async () => {
    const { error } = await signOut()
    if (error) {
      console.error('Sign out failed:', error)
    }
  }

  if (loading) {
    return <div className="loading-spinner">Loading...</div>
  }

  if (!user) {
    return (
      <form onSubmit={handleSignIn} className="auth-form">
        <h2>Sign In to Keplear</h2>

        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}

        <input
          type="text"
          placeholder="Username"
          value={credentials.username}
          onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={credentials.password}
          onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
          required
        />

        <button type="submit">Sign In</button>
      </form>
    )
  }

  return (
    <div className="authenticated-app">
      <header>
        <h1>Welcome, {user.user_metadata.username}!</h1>
        <button onClick={handleSignOut}>Sign Out</button>
      </header>

      <main>
        <InstrumentInterface />
      </main>
    </div>
  )
}
```

---

## Hook Integration Examples

### Custom Audio Hook with Error Handling

```typescript
import { useAudio } from '@hooks/useAudio'
import { useCallback, useState } from 'react'
import { withRetry } from '@utils/errorHandler'

function useRobustAudio() {
  const audio = useAudio()
  const [audioError, setAudioError] = useState<string | null>(null)

  const playNoteWithRetry = useCallback(async (noteName: string) => {
    setAudioError(null)

    try {
      await withRetry(
        () => audio.playNote(noteName),
        { maxRetries: 3, baseDelay: 500 },
        'audio'
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Audio playback failed'
      setAudioError(message)
      console.error('Failed to play note after retries:', error)
    }
  }, [audio])

  const playMelodyWithFallback = useCallback(async (melody: Note[], bpm: number) => {
    setAudioError(null)

    try {
      await audio.playMelody(melody, bpm)
    } catch (error) {
      // Fallback to individual note playback
      console.warn('Melody playback failed, trying individual notes:', error)

      try {
        for (const note of melody) {
          await playNoteWithRetry(note.name)
          await new Promise(resolve => setTimeout(resolve, (60 / bpm) * 1000))
        }
      } catch (fallbackError) {
        setAudioError('Complete audio system failure')
      }
    }
  }, [audio, playNoteWithRetry])

  return {
    ...audio,
    playNote: playNoteWithRetry,
    playMelody: playMelodyWithFallback,
    audioError,
    clearAudioError: () => setAudioError(null)
  }
}

// Usage in component
function AudioPlayer() {
  const { playNote, playMelody, isPlaying, audioError, clearAudioError } = useRobustAudio()

  const handlePlayNote = async () => {
    await playNote('C4')
  }

  return (
    <div>
      {audioError && (
        <div className="error-banner">
          <p>{audioError}</p>
          <button onClick={clearAudioError}>Dismiss</button>
        </div>
      )}

      <button onClick={handlePlayNote} disabled={isPlaying}>
        Play C4
      </button>
    </div>
  )
}
```

### Theme Hook with Persistence

```typescript
import { useTheme } from '@hooks/useTheme'
import { useEffect } from 'react'

function useAdvancedTheme() {
  const { isDarkMode, toggleTheme } = useTheme()

  // Auto-detect system theme preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const handleChange = (e: MediaQueryListEvent) => {
      const storedTheme = localStorage.getItem('keplear-theme')

      // Only auto-switch if user hasn't manually set a preference
      if (!storedTheme) {
        if (e.matches !== isDarkMode) {
          toggleTheme()
        }
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [isDarkMode, toggleTheme])

  // Theme-aware CSS custom properties
  useEffect(() => {
    const root = document.documentElement

    if (isDarkMode) {
      root.style.setProperty('--theme-bg', 'var(--dark-bg-primary)')
      root.style.setProperty('--theme-text', 'var(--dark-text-primary)')
    } else {
      root.style.setProperty('--theme-bg', 'var(--light-bg-primary)')
      root.style.setProperty('--theme-text', 'var(--light-text-primary)')
    }
  }, [isDarkMode])

  return {
    isDarkMode,
    toggleTheme,
    themeClass: isDarkMode ? 'dark-theme' : 'light-theme'
  }
}
```

### Performance Tracking Hook

```typescript
import { usePerformanceTracking } from '@utils/performance'
import { useEffect, useRef, useCallback } from 'react'

function useComponentPerformance(componentName: string) {
  const { trackRender, trackInteraction } = usePerformanceTracking(componentName)
  const renderStartTime = useRef<number>(0)
  const renderCount = useRef<number>(0)

  // Track render performance
  useEffect(() => {
    renderStartTime.current = performance.now()
    renderCount.current++

    return () => {
      const renderTime = performance.now() - renderStartTime.current
      trackRender(renderTime, renderCount.current > 1)
    }
  })

  // Create tracked interaction handler
  const createTrackedHandler = useCallback(
    <T extends any[]>(
      handler: (...args: T) => void | Promise<void>,
      interactionType: string,
      targetElement: string
    ) => {
      return async (...args: T) => {
        const startTime = performance.now()
        let success = true

        try {
          await handler(...args)
        } catch (error) {
          success = false
          throw error
        } finally {
          const duration = performance.now() - startTime
          trackInteraction(interactionType, targetElement, duration, success)
        }
      }
    },
    [trackInteraction]
  )

  return {
    renderCount: renderCount.current,
    createTrackedHandler
  }
}

// Usage in component
function PerformantMelodyPlayer() {
  const { createTrackedHandler } = useComponentPerformance('MelodyPlayer')
  const { playMelody, generateMelody } = useInstrument()

  const handlePlayMelody = createTrackedHandler(
    async () => {
      await playMelody()
    },
    'click',
    'play-melody-button'
  )

  const handleGenerateMelody = createTrackedHandler(
    () => {
      generateMelody()
    },
    'click',
    'generate-melody-button'
  )

  return (
    <div>
      <button onClick={handleGenerateMelody}>Generate Melody</button>
      <button onClick={handlePlayMelody}>Play Melody</button>
    </div>
  )
}
```

---

## Component Composition Examples

### Advanced Keyboard with Features

```typescript
import { memo, useMemo, useCallback } from 'react'
import { useInstrument } from '@contexts/InstrumentContext'
import KeyboardKey from '@components/keyboard/KeyboardKey'
import { generateKeyboardLayout } from '@utils/notes'

interface AdvancedKeyboardProps {
  octaveRange: [number, number]
  showLabels?: boolean
  enableChords?: boolean
  highlightScale?: string
  onChordDetected?: (chord: string[]) => void
}

const AdvancedKeyboard = memo(function AdvancedKeyboard({
  octaveRange,
  showLabels = true,
  enableChords = false,
  highlightScale,
  onChordDetected
}: AdvancedKeyboardProps) {
  const {
    selectedNotes,
    handleNoteClick,
    isSelected,
    isInMelody,
    showNotes
  } = useInstrument()

  // Generate keyboard layout
  const keyboardKeys = useMemo(() => {
    return generateKeyboardLayout(octaveRange[0], octaveRange[1])
  }, [octaveRange])

  // Detect chords from selected notes
  const detectedChord = useMemo(() => {
    if (!enableChords || selectedNotes.length < 3) return null

    const chord = detectChordFromNotes(selectedNotes)
    if (chord && onChordDetected) {
      onChordDetected(chord)
    }
    return chord
  }, [selectedNotes, enableChords, onChordDetected])

  // Check if note is in highlighted scale
  const isInScale = useCallback((note: Note) => {
    if (!highlightScale) return false
    const scaleNotes = getScaleNotes(highlightScale)
    return scaleNotes.includes(note.name.replace(/\d/, ''))
  }, [highlightScale])

  // Enhanced note click handler
  const handleEnhancedNoteClick = useCallback(async (note: Note) => {
    await handleNoteClick(note)

    // Add haptic feedback if available
    if ('vibrate' in navigator) {
      navigator.vibrate(50)
    }
  }, [handleNoteClick])

  return (
    <div className="advanced-keyboard">
      {detectedChord && (
        <div className="chord-display">
          Detected Chord: {detectedChord.join(' - ')}
        </div>
      )}

      <div className="keyboard-container">
        {keyboardKeys.map((note) => {
          const keyClassName = [
            note.isBlack ? 'black-key' : 'white-key',
            isSelected(note) ? 'selected' : '',
            isInMelody(note, showNotes) ? 'in-melody' : '',
            isInScale(note) ? 'in-scale' : '',
            detectedChord?.includes(note.name) ? 'in-chord' : ''
          ].filter(Boolean).join(' ')

          return (
            <KeyboardKey
              key={note.name}
              note={note}
              isSelected={isSelected(note)}
              isInMelody={isInMelody(note, showNotes)}
              onClick={handleEnhancedNoteClick}
              className={keyClassName}
              isInScale={isInScale(note)}
              isInChord={detectedChord?.includes(note.name)}
            >
              {showLabels && <span className="note-label">{note.name}</span>}
            </KeyboardKey>
          )
        })}
      </div>
    </div>
  )
})

export default AdvancedKeyboard
```

### Melody Visualizer Component

```typescript
import { memo, useMemo, useRef, useEffect } from 'react'
import { useInstrument } from '@contexts/InstrumentContext'

interface MelodyVisualizerProps {
  width?: number
  height?: number
  showWaveform?: boolean
  animated?: boolean
}

const MelodyVisualizer = memo(function MelodyVisualizer({
  width = 400,
  height = 200,
  showWaveform = false,
  animated = true
}: MelodyVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()

  const {
    generatedMelody,
    playbackProgress,
    isPlaying,
    melodyDuration
  } = useInstrument()

  // Convert notes to visualization data
  const visualizationData = useMemo(() => {
    return generatedMelody.map((note, index) => ({
      x: (index / Math.max(generatedMelody.length - 1, 1)) * width,
      y: height - (noteToFrequency(note.name) / 1000) * height,
      note: note.name,
      index
    }))
  }, [generatedMelody, width, height])

  // Draw visualization
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const draw = () => {
      // Clear canvas
      ctx.clearRect(0, 0, width, height)

      // Draw grid
      ctx.strokeStyle = '#e0e0e0'
      ctx.lineWidth = 1

      // Horizontal lines (octaves)
      for (let i = 0; i <= 8; i++) {
        const y = (i / 8) * height
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
        ctx.stroke()
      }

      // Vertical lines (beats)
      for (let i = 0; i <= generatedMelody.length; i++) {
        const x = (i / Math.max(generatedMelody.length, 1)) * width
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, height)
        ctx.stroke()
      }

      // Draw melody line
      if (visualizationData.length > 1) {
        ctx.strokeStyle = '#8000ff'
        ctx.lineWidth = 3
        ctx.beginPath()

        visualizationData.forEach((point, index) => {
          if (index === 0) {
            ctx.moveTo(point.x, point.y)
          } else {
            ctx.lineTo(point.x, point.y)
          }
        })

        ctx.stroke()
      }

      // Draw note points
      visualizationData.forEach((point, index) => {
        const isCurrentNote = isPlaying && index === Math.floor(playbackProgress * generatedMelody.length)

        ctx.fillStyle = isCurrentNote ? '#ff6b6b' : '#8000ff'
        ctx.beginPath()
        ctx.arc(point.x, point.y, isCurrentNote ? 8 : 5, 0, Math.PI * 2)
        ctx.fill()

        // Draw note labels
        ctx.fillStyle = '#333'
        ctx.font = '12px monospace'
        ctx.textAlign = 'center'
        ctx.fillText(point.note, point.x, point.y - 15)
      })

      // Draw playback progress
      if (isPlaying && animated) {
        const progressX = playbackProgress * width
        ctx.strokeStyle = '#ff6b6b'
        ctx.lineWidth = 2
        ctx.setLineDash([5, 5])
        ctx.beginPath()
        ctx.moveTo(progressX, 0)
        ctx.lineTo(progressX, height)
        ctx.stroke()
        ctx.setLineDash([])
      }
    }

    draw()

    // Animation loop
    if (animated && isPlaying) {
      const animate = () => {
        draw()
        animationRef.current = requestAnimationFrame(animate)
      }
      animationRef.current = requestAnimationFrame(animate)
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [visualizationData, playbackProgress, isPlaying, animated, width, height, generatedMelody.length])

  return (
    <div className="melody-visualizer">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ border: '1px solid #ccc', borderRadius: '4px' }}
      />

      <div className="visualizer-info">
        <span>Notes: {generatedMelody.length}</span>
        <span>Duration: {melodyDuration.toFixed(1)}s</span>
        {isPlaying && (
          <span>Progress: {(playbackProgress * 100).toFixed(0)}%</span>
        )}
      </div>
    </div>
  )
})

// Helper function
function noteToFrequency(note: string): number {
  const noteFrequencies: Record<string, number> = {
    'C': 261.63, 'C#': 277.18, 'D': 293.66, 'D#': 311.13,
    'E': 329.63, 'F': 349.23, 'F#': 369.99, 'G': 392.00,
    'G#': 415.30, 'A': 440.00, 'A#': 466.16, 'B': 493.88
  }

  const noteName = note.replace(/\d/, '')
  const octave = parseInt(note.slice(-1)) || 4

  return noteFrequencies[noteName] * Math.pow(2, octave - 4)
}

export default MelodyVisualizer
```

---

## Error Handling Examples

### Comprehensive Error Boundary Usage

```typescript
import ErrorBoundary from '@components/ErrorBoundary'
import { logErrorToService } from '@utils/errorHandler'

function AppWithErrorHandling() {
  const handleGlobalError = (error: Error, errorInfo: any) => {
    // Log to external service
    logErrorToService(error, errorInfo)

    // Show user notification
    showNotification('An unexpected error occurred. Our team has been notified.', 'error')
  }

  return (
    <ErrorBoundary
      onError={handleGlobalError}
      retryCount={3}
      showRetryButton={true}
    >
      <div className="app">
        {/* Critical audio component with custom fallback */}
        <ErrorBoundary
          fallback={
            <div className="audio-fallback">
              <h3>Audio System Unavailable</h3>
              <p>Please check your browser settings and refresh the page.</p>
              <button onClick={() => window.location.reload()}>
                Refresh Page
              </button>
            </div>
          }
          retryCount={5}
        >
          <AudioEngine />
        </ErrorBoundary>

        {/* Non-critical features with silent fallback */}
        <ErrorBoundary
          fallback={null}
          showRetryButton={false}
          onError={(error) => console.warn('Non-critical feature failed:', error)}
        >
          <MelodyVisualizer />
        </ErrorBoundary>

        {/* Main application content */}
        <ErrorBoundary>
          <MainContent />
        </ErrorBoundary>
      </div>
    </ErrorBoundary>
  )
}
```

### Async Error Handling Pattern

```typescript
import { withRetry, withAsyncFallback } from '@utils/errorHandler'
import { useState, useCallback } from 'react'

function useRobustDataFetcher() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchWithFallback = useCallback(async <T>(
    primary: () => Promise<T>,
    fallback: () => Promise<T>,
    operation: string
  ): Promise<T> => {
    setLoading(true)
    setError(null)

    try {
      return await withAsyncFallback(
        () => withRetry(primary, { maxRetries: 3 }, 'network'),
        fallback,
        `${operation} primary method failed, using fallback`
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return { fetchWithFallback, loading, error, clearError: () => setError(null) }
}

// Usage in component
function DataDrivenComponent() {
  const { fetchWithFallback, loading, error } = useRobustDataFetcher()

  const loadMelodyData = useCallback(async () => {
    try {
      const data = await fetchWithFallback(
        // Primary: API call
        async () => {
          const response = await fetch('/api/melodies')
          if (!response.ok) throw new Error('API failed')
          return response.json()
        },
        // Fallback: Local storage
        async () => {
          const cached = localStorage.getItem('cached-melodies')
          if (!cached) throw new Error('No cached data available')
          return JSON.parse(cached)
        },
        'Load melody data'
      )

      console.log('Loaded melody data:', data)
    } catch (err) {
      console.error('Failed to load melody data:', err)
    }
  }, [fetchWithFallback])

  return (
    <div>
      {error && (
        <div className="error-message">
          Error: {error}
        </div>
      )}

      <button onClick={loadMelodyData} disabled={loading}>
        {loading ? 'Loading...' : 'Load Melody Data'}
      </button>
    </div>
  )
}
```

---

## Performance Optimization Examples

### Virtual List for Large Datasets

```typescript
import { memo, useMemo, useCallback, useState } from 'react'
import { FixedSizeList as List } from 'react-window'

interface VirtualizedMelodyListProps {
  melodies: Array<{ id: string; name: string; notes: Note[]; duration: number }>
  onSelect: (melody: any) => void
  selectedId?: string
}

const VirtualizedMelodyList = memo(function VirtualizedMelodyList({
  melodies,
  onSelect,
  selectedId
}: VirtualizedMelodyListProps) {
  const [searchTerm, setSearchTerm] = useState('')

  // Filter melodies based on search
  const filteredMelodies = useMemo(() => {
    if (!searchTerm) return melodies

    return melodies.filter(melody =>
      melody.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      melody.notes.some(note => note.name.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  }, [melodies, searchTerm])

  // Memoized row renderer
  const MelodyRow = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const melody = filteredMelodies[index]
    const isSelected = melody.id === selectedId

    return (
      <div
        style={style}
        className={`melody-row ${isSelected ? 'selected' : ''}`}
        onClick={() => onSelect(melody)}
      >
        <div className="melody-name">{melody.name}</div>
        <div className="melody-info">
          {melody.notes.length} notes • {melody.duration.toFixed(1)}s
        </div>
        <div className="melody-preview">
          {melody.notes.slice(0, 8).map(note => note.name).join(' → ')}
          {melody.notes.length > 8 && '...'}
        </div>
      </div>
    )
  }, [filteredMelodies, selectedId, onSelect])

  return (
    <div className="virtualized-melody-list">
      <div className="search-input">
        <input
          type="text"
          placeholder="Search melodies..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <List
        height={400}
        itemCount={filteredMelodies.length}
        itemSize={80}
        width="100%"
      >
        {MelodyRow}
      </List>
    </div>
  )
})

export default VirtualizedMelodyList
```

### Optimized Audio Processor

```typescript
import { useMemo, useCallback, useRef } from 'react'
import { useAudio } from '@hooks/useAudio'
import { measurePerformance } from '@utils/performance'

class OptimizedAudioProcessor {
  private audioContext: AudioContext | null = null
  private workletNode: AudioWorkletNode | null = null
  private isInitialized = false

  @measurePerformance
  async initialize() {
    if (this.isInitialized) return

    try {
      // Use Web Audio API for real-time processing
      this.audioContext = new AudioContext()

      // Load audio worklet for background processing
      await this.audioContext.audioWorklet.addModule('/audio-processor-worklet.js')

      this.workletNode = new AudioWorkletNode(this.audioContext, 'audio-processor')
      this.workletNode.connect(this.audioContext.destination)

      this.isInitialized = true
    } catch (error) {
      console.warn('Failed to initialize optimized audio processor:', error)
    }
  }

  @measurePerformance
  processAudioData(audioData: Float32Array): Float32Array {
    if (!this.workletNode) {
      // Fallback to main thread processing
      return this.processOnMainThread(audioData)
    }

    // Send to audio worklet for background processing
    this.workletNode.port.postMessage({ audioData })
    return audioData // Processed asynchronously
  }

  private processOnMainThread(audioData: Float32Array): Float32Array {
    // Simple gain processing as fallback
    const processed = new Float32Array(audioData.length)
    for (let i = 0; i < audioData.length; i++) {
      processed[i] = audioData[i] * 0.8 // Reduce volume
    }
    return processed
  }

  dispose() {
    if (this.workletNode) {
      this.workletNode.disconnect()
      this.workletNode = null
    }

    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }

    this.isInitialized = false
  }
}

function useOptimizedAudio() {
  const audio = useAudio()
  const processorRef = useRef<OptimizedAudioProcessor>()

  // Initialize processor on first use
  const processor = useMemo(() => {
    if (!processorRef.current) {
      processorRef.current = new OptimizedAudioProcessor()
    }
    return processorRef.current
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      processorRef.current?.dispose()
    }
  }, [])

  const playOptimizedMelody = useCallback(async (melody: Note[], bpm: number) => {
    await processor.initialize()

    // Use optimized processing if available
    return audio.playMelody(melody, bpm)
  }, [audio, processor])

  return {
    ...audio,
    playMelody: playOptimizedMelody,
    processor
  }
}
```

---

## Testing Examples

### Component Testing with Context

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { InstrumentProvider } from '@contexts/InstrumentContext'
import { AuthProvider } from '@contexts/AuthContext'
import MelodyPlayer from '@components/MelodyPlayer'

// Test wrapper with all necessary providers
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>
    <InstrumentProvider>
      {children}
    </InstrumentProvider>
  </AuthProvider>
)

describe('MelodyPlayer Integration', () => {
  beforeEach(() => {
    // Mock audio APIs
    global.AudioContext = vi.fn().mockImplementation(() => ({
      createOscillator: vi.fn(),
      createGain: vi.fn(),
      destination: {},
      currentTime: 0,
      sampleRate: 44100,
      state: 'running'
    }))
  })

  it('should play melody when button is clicked', async () => {
    render(<MelodyPlayer />, { wrapper: TestWrapper })

    // Generate a melody first
    const generateButton = screen.getByText(/generate melody/i)
    fireEvent.click(generateButton)

    // Wait for melody to be generated
    await waitFor(() => {
      expect(screen.getByText(/play melody/i)).toBeEnabled()
    })

    // Play the melody
    const playButton = screen.getByText(/play melody/i)
    fireEvent.click(playButton)

    // Verify play state
    await waitFor(() => {
      expect(screen.getByText(/stop/i)).toBeInTheDocument()
    })
  })

  it('should handle audio errors gracefully', async () => {
    // Mock audio failure
    vi.spyOn(console, 'error').mockImplementation(() => {})
    global.AudioContext = vi.fn().mockImplementation(() => {
      throw new Error('AudioContext not supported')
    })

    render(<MelodyPlayer />, { wrapper: TestWrapper })

    const playButton = screen.getByText(/play melody/i)
    fireEvent.click(playButton)

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText(/audio not available/i)).toBeInTheDocument()
    })
  })

  it('should update melody visualization in real-time', async () => {
    render(<MelodyPlayer />, { wrapper: TestWrapper })

    // Generate melody
    fireEvent.click(screen.getByText(/generate melody/i))

    // Verify visualization updates
    await waitFor(() => {
      const canvas = screen.getByRole('img', { name: /melody visualization/i })
      expect(canvas).toBeInTheDocument()
    })
  })
})
```

### Hook Testing with Mocks

```typescript
import { renderHook, act } from '@testing-library/react'
import { vi } from 'vitest'
import { useRobustAudio } from '@hooks/useRobustAudio'

// Mock the base audio hook
vi.mock('@hooks/useAudio', () => ({
  useAudio: () => ({
    playNote: vi.fn(),
    playMelody: vi.fn(),
    isPlaying: false,
    isRecording: false
  })
}))

describe('useRobustAudio', () => {
  it('should retry failed operations', async () => {
    const mockPlayNote = vi.fn()
      .mockRejectedValueOnce(new Error('First attempt failed'))
      .mockRejectedValueOnce(new Error('Second attempt failed'))
      .mockResolvedValueOnce(undefined)

    vi.mocked(useAudio).mockReturnValue({
      playNote: mockPlayNote,
      playMelody: vi.fn(),
      isPlaying: false,
      isRecording: false
    })

    const { result } = renderHook(() => useRobustAudio())

    await act(async () => {
      await result.current.playNote('C4')
    })

    // Should have retried 3 times total
    expect(mockPlayNote).toHaveBeenCalledTimes(3)
    expect(result.current.audioError).toBeNull()
  })

  it('should set error after max retries', async () => {
    const mockPlayNote = vi.fn().mockRejectedValue(new Error('Persistent failure'))

    vi.mocked(useAudio).mockReturnValue({
      playNote: mockPlayNote,
      playMelody: vi.fn(),
      isPlaying: false,
      isRecording: false
    })

    const { result } = renderHook(() => useRobustAudio())

    await act(async () => {
      try {
        await result.current.playNote('C4')
      } catch (error) {
        // Expected to fail
      }
    })

    expect(result.current.audioError).toBeTruthy()
    expect(result.current.audioError).toContain('failed after')
  })
})
```

### E2E Testing Example

```typescript
import { test, expect } from '@playwright/test'

test.describe('Keplear E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')

    // Mock audio context to prevent browser audio issues
    await page.addInitScript(() => {
      window.AudioContext = class MockAudioContext {
        state = 'running'
        currentTime = 0
        sampleRate = 44100

        createOscillator() {
          return {
            connect: () => {},
            start: () => {},
            stop: () => {},
            frequency: { setValueAtTime: () => {} }
          }
        }

        createGain() {
          return {
            connect: () => {},
            gain: { setValueAtTime: () => {} }
          }
        }

        get destination() {
          return { connect: () => {} }
        }
      }
    })
  })

  test('complete melody generation and playback workflow', async ({ page }) => {
    // Navigate to the practice page
    await page.click('text=Practice')

    // Select keyboard instrument
    await page.selectOption('[data-testid="instrument-selector"]', 'keyboard')

    // Set BPM and note count
    await page.fill('[data-testid="bpm-input"]', '120')
    await page.fill('[data-testid="notes-input"]', '8')

    // Select note range by clicking two keys
    await page.click('[data-note="C4"]')
    await page.click('[data-note="G4"]')

    // Generate melody
    await page.click('[data-testid="generate-melody-button"]')

    // Verify melody was generated
    await expect(page.locator('[data-testid="generated-melody"]')).toContainText('8 notes')

    // Play melody
    await page.click('[data-testid="play-melody-button"]')

    // Verify play state
    await expect(page.locator('[data-testid="play-melody-button"]')).toContainText('Stop')

    // Wait for melody to finish
    await page.waitForTimeout(5000)

    // Verify stopped state
    await expect(page.locator('[data-testid="play-melody-button"]')).toContainText('Play')
  })

  test('theme switching persistence', async ({ page }) => {
    // Switch to dark mode
    await page.click('[data-testid="theme-toggle"]')

    // Verify dark mode is applied
    await expect(page.locator('body')).toHaveClass(/dark/)

    // Reload page
    await page.reload()

    // Verify dark mode persisted
    await expect(page.locator('body')).toHaveClass(/dark/)
  })

  test('error handling and recovery', async ({ page }) => {
    // Simulate network error
    await page.route('/api/**', route => route.abort())

    // Try to perform an action that requires network
    await page.click('[data-testid="load-presets-button"]')

    // Verify error message appears
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible()

    // Click retry button
    await page.click('[data-testid="retry-button"]')

    // Restore network
    await page.unroute('/api/**')

    // Verify recovery
    await expect(page.locator('[data-testid="error-message"]')).not.toBeVisible()
  })

  test('performance metrics tracking', async ({ page }) => {
    // Enable performance monitoring
    await page.evaluate(() => {
      window.performanceMonitor?.setEnabled(true)
    })

    // Perform various interactions
    await page.click('[data-testid="generate-melody-button"]')
    await page.click('[data-testid="play-melody-button"]')
    await page.click('[data-testid="theme-toggle"]')

    // Check performance metrics
    const metrics = await page.evaluate(() => {
      return window.performanceMonitor?.getPerformanceReport()
    })

    expect(metrics).toBeDefined()
    expect(metrics.interactions.total).toBeGreaterThan(0)
    expect(metrics.componentMetrics.total).toBeGreaterThan(0)
  })
})
```

---

These examples demonstrate real-world usage patterns for Keplear's components, hooks, and utilities. They show how to compose features, handle errors gracefully, optimize performance, and test comprehensively. Use these patterns as a foundation for building robust musical applications.
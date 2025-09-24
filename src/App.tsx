import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { AuthProvider } from './contexts/AuthContext'
import Header from './components/common/Header'
import Footer from './components/common/Footer'
import Home from './components/pages/Home'
import InstrumentDisplay from './components/keyboard/InstrumentDisplay'
import { useAudio } from './hooks/useAudio'
import { useMelodyGenerator } from './hooks/useMelodyGenerator'
import { useTheme } from './hooks/useTheme'
import { notes, generateNotesWithSeparateOctaves } from './utils/notes'
import type { Note } from './utils/notes'
import './styles/App.css'

/**
 * Supported page types in the application
 */
type PageType = 'home' | 'sandbox' | 'practice'

/**
 * Supported instrument types
 */
type InstrumentType = 'keyboard' | 'guitar' | 'bass'

/**
 * Default application settings
 */
const DEFAULT_SETTINGS = {
  bpm: 120,
  numberOfNotes: 5,
  instrument: 'keyboard' as InstrumentType
} as const

/**
 * Main application component
 * Manages routing, audio playback, melody generation, and theme state
 */
function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('home')
  const [bpm, setBpm] = useState<number>(DEFAULT_SETTINGS.bpm)
  const [numberOfNotes, setNumberOfNotes] = useState<number>(DEFAULT_SETTINGS.numberOfNotes)
  const [showNotes, setShowNotes] = useState<boolean>(false)
  const [instrument, setInstrument] = useState<InstrumentType>(DEFAULT_SETTINGS.instrument)
  const [keyboardOctaves, setKeyboardOctaves] = useState<{ lower: number; higher: number }>({ lower: 0, higher: 0 })
  const [keyboardSelectionMode, setKeyboardSelectionMode] = useState<'range' | 'multi'>('range')
  const [clearChordsAndScalesTrigger, setClearChordsAndScalesTrigger] = useState<number>(0)
  const [flashingInputs, setFlashingInputs] = useState<{ bpm: boolean; notes: boolean; mode: boolean }>({
    bpm: false,
    notes: false,
    mode: false
  })
  const [activeInputs, setActiveInputs] = useState<{ bpm: boolean; notes: boolean; mode: boolean }>({
    bpm: false,
    notes: false,
    mode: false
  })
  const [playbackProgress, setPlaybackProgress] = useState(0)
  const [melodyDuration, setMelodyDuration] = useState(0)
  const [hasRecordedAudio, setHasRecordedAudio] = useState(false)
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null)
  const [isAutoRecording, setIsAutoRecording] = useState(false)

  // Refs to track initial render
  const isInitialBpm = useRef(true)
  const isInitialNotes = useRef(true)
  const isInitialMode = useRef(true)

  const { isDarkMode, toggleTheme } = useTheme()
  const { playNote, playGuitarNote, playBassNote, playMelody, playGuitarMelody, playBassMelody, stopMelody, recordMelody, isPlaying, isRecording } = useAudio()

  // Apply theme class to document body for portaled modals and global styles
  useEffect(() => {
    document.body.className = isDarkMode ? 'dark' : 'light'
  }, [isDarkMode])

  // Function to trigger green border flash for specific input
  const triggerInputFlash = useCallback((inputType: 'bpm' | 'notes' | 'mode') => {
    setFlashingInputs(prev => ({ ...prev, [inputType]: true }))
    setTimeout(() => {
      setFlashingInputs(prev => ({ ...prev, [inputType]: false }))
    }, 1000)
  }, [])

  // Function to set input as actively changing (stays green)
  const setInputActive = useCallback((inputType: 'bpm' | 'notes' | 'mode', active: boolean) => {
    setActiveInputs(prev => ({ ...prev, [inputType]: active }))
  }, [])

  // Trigger flash when BPM changes (skip initial render and when actively changing)
  useEffect(() => {
    if (isInitialBpm.current) {
      isInitialBpm.current = false
    } else if (!activeInputs.bpm) {
      // Only trigger if not currently in active state (being held down)
      triggerInputFlash('bpm')
    }
  }, [bpm, triggerInputFlash, activeInputs.bpm])

  // Trigger flash when number of notes changes (skip initial render and when actively changing)
  useEffect(() => {
    if (isInitialNotes.current) {
      isInitialNotes.current = false
    } else if (!activeInputs.notes) {
      // Only trigger if not currently in active state (being held down)
      triggerInputFlash('notes')
    }
  }, [numberOfNotes, triggerInputFlash, activeInputs.notes])

  // Trigger flash when selection mode changes (skip initial render and when actively changing)
  useEffect(() => {
    if (isInitialMode.current) {
      isInitialMode.current = false
    } else if (!activeInputs.mode) {
      // Only trigger if not currently in active state
      triggerInputFlash('mode')
    }
  }, [keyboardSelectionMode, triggerInputFlash, activeInputs.mode])

  const { 
    selectedNotes, 
    generatedMelody, 
    selectNote, 
    generateMelody, 
    setGuitarNotes,
    isSelected, 
    isInMelody,
    clearSelection,
    clearTrigger 
  } = useMelodyGenerator()

  /**
   * Handles note clicks by playing the note and selecting it
   */
  const handleNoteClick = useCallback(async (note: Note): Promise<void> => {
    try {
      if (instrument === 'guitar') {
        await playGuitarNote(note.name)
      } else if (instrument === 'bass') {
        await playBassNote(note.name)
      } else {
        await playNote(note.name)
      }
      selectNote(note, keyboardSelectionMode)
    } catch (error) {
      console.warn('Failed to play note:', error)
    }
  }, [instrument, playGuitarNote, playBassNote, playNote, selectNote, keyboardSelectionMode])

  // Calculate melody duration in milliseconds
  const calculateMelodyDuration = useCallback((melodyLength: number, bpm: number) => {
    if (melodyLength === 0) return 0
    // Match the exact timing from useAudio.ts:
    // - Each note has a delay of (60 / bpm) * 800 milliseconds
    // - There are (numberOfNotes - 1) delays between notes
    // - Plus one final delay after the last note
    // Total: numberOfNotes * (60 / bpm) * 800
    const noteDuration = (60 / bpm) * 800
    return melodyLength * noteDuration
  }, [])

  /**
   * Records the current melody based on instrument type
   */
  const handleRecordMelody = useCallback(async (): Promise<Blob | null> => {
    if (generatedMelody.length === 0) {
      console.warn('No melody to record. Generate a melody first.')
      return null
    }

    const result = await recordMelody([...generatedMelody], bpm, instrument)
    if (result) {
      setHasRecordedAudio(true)
    }
    return result
  }, [recordMelody, generatedMelody, bpm, instrument])

  /**
   * Generates a new melody based on current settings
   */
  const handleGenerateMelody = useCallback((): void => {
    // For keyboard, use expanded octave range if specified, otherwise use default notes
    const melodyNotes = instrument === 'keyboard' && (keyboardOctaves.lower !== 0 || keyboardOctaves.higher !== 0)
      ? generateNotesWithSeparateOctaves(keyboardOctaves.lower, keyboardOctaves.higher)
      : notes

    generateMelody(melodyNotes, numberOfNotes, instrument, keyboardSelectionMode)

    // Calculate and set duration for the new melody
    const duration = calculateMelodyDuration(numberOfNotes, bpm)
    setMelodyDuration(duration)
    // Reset progress when new melody is generated
    setPlaybackProgress(0)
    // Clear recorded audio when generating new melody
    setHasRecordedAudio(false)
    setRecordedAudioBlob(null)
    setIsAutoRecording(false)
  }, [generateMelody, numberOfNotes, instrument, keyboardOctaves, keyboardSelectionMode, calculateMelodyDuration, bpm])

  // Auto-record melody when it changes
  useEffect(() => {
    if (generatedMelody.length > 0 && !isPlaying && !isRecording && !isAutoRecording && !hasRecordedAudio) {
      const autoRecord = async () => {
        try {
          setIsAutoRecording(true)

          // Ensure any previous playback is stopped
          stopMelody()

          // Wait a bit for stop to take effect
          await new Promise(resolve => setTimeout(resolve, 100))

          const result = await handleRecordMelody()
          if (result) {
            setHasRecordedAudio(true)
            setRecordedAudioBlob(result)
          }
        } catch (error) {
          console.warn('Auto-recording failed:', error)
        } finally {
          setIsAutoRecording(false)
        }
      }

      // Small delay to ensure melody is fully processed
      setTimeout(autoRecord, 500)
    }
  }, [generatedMelody.length, isPlaying, isRecording, isAutoRecording, hasRecordedAudio])

  /**
   * Plays or stops the current melody
   */
  // Progress tracking effect - only for ToneJS playback
  useEffect(() => {
    let progressInterval: NodeJS.Timeout | null = null

    if (isPlaying && melodyDuration > 0) {
      const startTime = Date.now()
      progressInterval = setInterval(() => {
        const elapsed = Date.now() - startTime
        if (elapsed >= melodyDuration) {
          setPlaybackProgress(melodyDuration)
          clearInterval(progressInterval!)
        } else {
          setPlaybackProgress(elapsed)
        }
      }, 50) // Update every 50ms for smooth progress
    } else if (!isPlaying && !hasRecordedAudio) {
      // Only reset progress if we don't have recorded audio loaded
      setPlaybackProgress(0)
    }

    return () => {
      if (progressInterval) {
        clearInterval(progressInterval)
      }
    }
  }, [isPlaying, hasRecordedAudio, melodyDuration])

  const handlePlayMelody = useCallback((): void => {
    if (isPlaying) {
      stopMelody()
      setPlaybackProgress(0)
    } else {
      if (generatedMelody.length === 0) {
        console.warn('No melody to play. Generate a melody first.')
        return
      }

      // Reset progress when starting playback
      setPlaybackProgress(0)

      if (instrument === 'guitar') {
        playGuitarMelody([...generatedMelody], bpm)
      } else if (instrument === 'bass') {
        playBassMelody([...generatedMelody], bpm)
      } else {
        playMelody([...generatedMelody], bpm)
      }
    }
  }, [isPlaying, stopMelody, generatedMelody, instrument, playGuitarMelody, playBassMelody, playMelody, bpm])

  /**
   * Clears recorded audio state
   */
  const handleClearRecordedAudio = useCallback((): void => {
    setHasRecordedAudio(false)
    setRecordedAudioBlob(null)
  }, [])

  /**
   * Handles instrument changes and clears selection
   */
  const handleInstrumentChange = useCallback((newInstrument: InstrumentType): void => {
    setInstrument(newInstrument)
    clearSelection() // Clear melody when instrument changes
    setHasRecordedAudio(false) // Clear recorded audio when changing instruments
    setRecordedAudioBlob(null)
    setClearChordsAndScalesTrigger(prev => prev + 1) // Clear all chords and scales when switching instruments
  }, [clearSelection])

  /**
   * Handles octave range changes from the keyboard
   */
  const handleOctaveRangeChange = useCallback((lowerOctaves: number, higherOctaves: number): void => {
    setKeyboardOctaves({ lower: lowerOctaves, higher: higherOctaves })
  }, [])

  /**
   * Handles keyboard selection mode changes
   */
  const handleKeyboardSelectionModeChange = useCallback((mode: 'range' | 'multi'): void => {
    setKeyboardSelectionMode(mode)
    // Clear current selections when switching modes
    clearSelection()
  }, [clearSelection])

  /**
   * Handles progress bar changes for scrubbing
   */
  const handleProgressChange = useCallback((newProgress: number): void => {
    setPlaybackProgress(newProgress)
  }, [])

  // Navigation handlers - memoized to prevent unnecessary re-renders
  const { navigateToHome, navigateToSandbox, navigateToPractice } = useMemo(() => ({
    navigateToHome: () => setCurrentPage('home'),
    navigateToSandbox: () => setCurrentPage('sandbox'),
    navigateToPractice: () => setCurrentPage('practice')
  }), [])

  return (
    <AuthProvider>
      <div className={`app-container ${isDarkMode ? 'dark' : 'light'}`}>

        <Header 
          isDarkMode={isDarkMode} 
          onToggleTheme={toggleTheme}
          currentPage={currentPage}
          onNavigateToHome={navigateToHome}
          onNavigateToSandbox={navigateToSandbox}
          onNavigateToPractice={navigateToPractice}
        />
        
        {currentPage === 'home' && (
          <Home 
            onNavigateToSandbox={navigateToSandbox}
            onNavigateToPractice={navigateToPractice}
          />
        )}

        {currentPage === 'sandbox' && (
          <>
            <InstrumentDisplay
              onNoteClick={handleNoteClick}
              isSelected={isSelected}
              isInMelody={isInMelody}
              showNotes={showNotes}
              bpm={bpm}
              setBpm={setBpm}
              numberOfNotes={numberOfNotes}
              setNumberOfNotes={setNumberOfNotes}
              instrument={instrument}
              setInstrument={(inst: string) => handleInstrumentChange(inst as InstrumentType)}
              setGuitarNotes={setGuitarNotes}
              clearSelection={clearSelection}
              clearTrigger={clearTrigger}
              selectedNotes={[...selectedNotes]}
              selectNote={selectNote}
              onOctaveRangeChange={handleOctaveRangeChange}
              keyboardSelectionMode={keyboardSelectionMode}
              onKeyboardSelectionModeChange={handleKeyboardSelectionModeChange}
              flashingInputs={{
                bpm: flashingInputs.bpm || activeInputs.bpm,
                notes: flashingInputs.notes || activeInputs.notes,
                mode: flashingInputs.mode || activeInputs.mode
              }}
              triggerInputFlash={triggerInputFlash}
              setInputActive={setInputActive}
              clearChordsAndScales={clearChordsAndScalesTrigger}
              onGenerateMelody={handleGenerateMelody}
              onPlayMelody={handlePlayMelody}
              onRecordMelody={handleRecordMelody}
              isPlaying={isPlaying}
              isRecording={isRecording}
              hasGeneratedMelody={generatedMelody.length > 0}
              onToggleNotes={() => setShowNotes(!showNotes)}
              playbackProgress={playbackProgress}
              melodyDuration={melodyDuration}
              onProgressChange={handleProgressChange}
              onClearRecordedAudio={handleClearRecordedAudio}
              recordedAudioBlob={recordedAudioBlob}
              generatedMelody={[...generatedMelody]}
            />
          </>
        )}

        {currentPage === 'practice' && (
          <div className="practice-page">
            <div className="coming-soon">
              <h2>Practice Mode</h2>
              <p>Coming soon! This will include structured exercises and progress tracking.</p>
              <button className="button" onClick={navigateToSandbox}>
                Try Sandbox Mode
              </button>
            </div>
          </div>
        )}
        
        <Footer />
      </div>
    </AuthProvider>
  )
}

export default App
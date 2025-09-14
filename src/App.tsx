import { useState, useEffect, useCallback, useMemo } from 'react'
import { AuthProvider } from './contexts/AuthContext'
import Header from './components/common/Header'
import Footer from './components/common/Footer'
import Home from './components/pages/Home'
import InstrumentDisplay from './components/keyboard/InstrumentDisplay'
import MelodyControls from './components/MelodyControls'
import MelodyDisplay from './components/MelodyDisplay'
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
type InstrumentType = 'keyboard' | 'guitar'

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
  
  const { isDarkMode, toggleTheme } = useTheme()
  const { playNote, playGuitarNote, playMelody, playGuitarMelody, stopMelody, isPlaying } = useAudio()

  // Apply theme class to document body for portaled modals and global styles
  useEffect(() => {
    document.body.className = isDarkMode ? 'dark' : 'light'
  }, [isDarkMode])

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
      } else {
        await playNote(note.name)
      }
      selectNote(note)
    } catch (error) {
      console.warn('Failed to play note:', error)
    }
  }, [instrument, playGuitarNote, playNote, selectNote])

  /**
   * Generates a new melody based on current settings
   */
  const handleGenerateMelody = useCallback((): void => {
    // For keyboard, use expanded octave range if specified, otherwise use default notes
    const melodyNotes = instrument === 'keyboard' && (keyboardOctaves.lower !== 0 || keyboardOctaves.higher !== 0)
      ? generateNotesWithSeparateOctaves(keyboardOctaves.lower, keyboardOctaves.higher)
      : notes

    generateMelody(melodyNotes, numberOfNotes, instrument)
  }, [generateMelody, numberOfNotes, instrument, keyboardOctaves])

  /**
   * Plays or stops the current melody
   */
  const handlePlayMelody = useCallback((): void => {
    if (isPlaying) {
      stopMelody()
    } else {
      if (generatedMelody.length === 0) {
        console.warn('No melody to play. Generate a melody first.')
        return
      }
      
      if (instrument === 'guitar') {
        playGuitarMelody([...generatedMelody], bpm)
      } else {
        playMelody([...generatedMelody], bpm)
      }
    }
  }, [isPlaying, stopMelody, generatedMelody, instrument, playGuitarMelody, playMelody, bpm])

  /**
   * Handles instrument changes and clears selection
   */
  const handleInstrumentChange = useCallback((newInstrument: InstrumentType): void => {
    setInstrument(newInstrument)
    clearSelection() // Clear melody when instrument changes
  }, [clearSelection])

  /**
   * Handles octave range changes from the keyboard
   */
  const handleOctaveRangeChange = useCallback((lowerOctaves: number, higherOctaves: number): void => {
    setKeyboardOctaves({ lower: lowerOctaves, higher: higherOctaves })
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
              onOctaveRangeChange={handleOctaveRangeChange}
            />

            <MelodyControls
              selectedNotes={[...selectedNotes]}
              onGenerateMelody={handleGenerateMelody}
              onPlayMelody={handlePlayMelody}
              isPlaying={isPlaying}
              generatedMelody={[...generatedMelody]}
              instrument={instrument}
              showNotes={showNotes}
              onToggleNotes={() => setShowNotes(!showNotes)}
            />

            <MelodyDisplay
              generatedMelody={[...generatedMelody]}
              showNotes={showNotes}
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
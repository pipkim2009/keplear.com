import { useEffect, useCallback } from 'react'
import { AuthProvider } from './contexts/AuthContext'
import Header from './components/common/Header'
import Footer from './components/common/Footer'
import Home from './components/pages/Home'
import InstrumentDisplay from './components/keyboard/InstrumentDisplay'
import { useAudio } from './hooks/useAudio'
import { useMelodyGenerator } from './hooks/useMelodyGenerator'
import { useTheme } from './hooks/useTheme'
import { useUIState } from './hooks/useUIState'
import { useInstrumentConfig } from './hooks/useInstrumentConfig'
import { useMelodyPlayer } from './hooks/useMelodyPlayer'
import { notes, generateNotesWithSeparateOctaves } from './utils/notes'
import type { Note } from './utils/notes'
import './styles/App.css'

/**
 * Main application component
 * Manages routing, audio playback, melody generation, and theme state
 * Now uses optimized state management with reducers and custom hooks
 */
function App() {
  // Custom hooks for state management
  const { isDarkMode, toggleTheme } = useTheme()
  const { playNote, playGuitarNote, playBassNote, playMelody, playGuitarMelody, playBassMelody, stopMelody, recordMelody, isPlaying, isRecording } = useAudio()

  // UI state management
  const {
    currentPage,
    bpm,
    numberOfNotes,
    flashingInputs,
    activeInputs,
    navigateToHome,
    navigateToSandbox,
    navigateToPractice,
    setBpm,
    setNumberOfNotes,
    triggerInputFlash,
    setInputActive
  } = useUIState()

  // Instrument configuration state
  const {
    instrument,
    keyboardOctaves,
    keyboardSelectionMode,
    clearChordsAndScalesTrigger,
    setInstrument,
    setKeyboardSelectionMode,
    triggerClearChordsAndScales
  } = useInstrumentConfig()

  // Melody generation state
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

  // Melody player state
  const {
    playbackProgress,
    melodyDuration,
    recordedAudioBlob,
    showNotes,
    setPlaybackProgress,
    setMelodyDuration,
    toggleShowNotes,
    handleRecordMelody,
    handleClearRecordedAudio,
    calculateMelodyDuration
  } = useMelodyPlayer({
    generatedMelody,
    bpm,
    isPlaying,
    isRecording,
    recordMelody,
    stopMelody,
    instrument
  })

  // Apply theme class to document body for portaled modals and global styles
  useEffect(() => {
    document.body.className = isDarkMode ? 'dark' : 'light'
  }, [isDarkMode])

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
    handleClearRecordedAudio()
  }, [generateMelody, numberOfNotes, instrument, keyboardOctaves, keyboardSelectionMode, calculateMelodyDuration, bpm, setMelodyDuration, setPlaybackProgress, handleClearRecordedAudio])

  /**
   * Plays or stops the current melody
   */

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
  }, [isPlaying, stopMelody, generatedMelody, instrument, playGuitarMelody, playBassMelody, playMelody, bpm, setPlaybackProgress])

  /**
   * Handles instrument changes and clears selection
   */
  const handleInstrumentChange = useCallback((newInstrument: string): void => {
    setInstrument(newInstrument as any)
    clearSelection() // Clear melody when instrument changes
    handleClearRecordedAudio() // Clear recorded audio when changing instruments
    triggerClearChordsAndScales() // Clear all chords and scales when switching instruments
  }, [setInstrument, clearSelection, handleClearRecordedAudio, triggerClearChordsAndScales])

  /**
   * Handles octave range changes from the keyboard
   */
  const handleOctaveRangeChange = useCallback((lowerOctaves: number, higherOctaves: number): void => {
    // This is handled by the useInstrumentConfig hook internally
  }, [])

  /**
   * Handles keyboard selection mode changes
   */
  const handleKeyboardSelectionModeChange = useCallback((mode: 'range' | 'multi'): void => {
    setKeyboardSelectionMode(mode as any)
    // Clear current selections when switching modes
    clearSelection()
  }, [setKeyboardSelectionMode, clearSelection])

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
              setInstrument={handleInstrumentChange}
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
              onToggleNotes={toggleShowNotes}
              playbackProgress={playbackProgress}
              melodyDuration={melodyDuration}
              onProgressChange={setPlaybackProgress}
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
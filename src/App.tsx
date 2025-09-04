import { useState, useEffect } from 'react'
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
import { notes, type Note } from './utils/notes'
import './styles/App.css'

function App() {
  const [currentPage, setCurrentPage] = useState('home')
  const [bpm, setBpm] = useState(120)
  const [numberOfNotes, setNumberOfNotes] = useState(5)
  const [showNotes, setShowNotes] = useState(false)
  const [instrument, setInstrument] = useState('keyboard')
  
  const { isDarkMode, toggleTheme } = useTheme()
  const { playNote, playGuitarNote, playMelody, playGuitarMelody, stopMelody, isPlaying } = useAudio()

  // Apply theme class to document body for portaled modals
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

  const handleNoteClick = async (note: Note) => {
    if (instrument === 'guitar') {
      await playGuitarNote(note.name)
    } else {
      await playNote(note.name)
    }
    selectNote(note)
  }

  const handleGenerateMelody = () => {
    generateMelody(notes, numberOfNotes, instrument)
  }

  const handlePlayMelody = () => {
    if (isPlaying) {
      stopMelody()
    } else {
      if (instrument === 'guitar') {
        playGuitarMelody(generatedMelody, bpm)
      } else {
        playMelody(generatedMelody, bpm)
      }
    }
  }

  const handleInstrumentChange = (newInstrument: string) => {
    setInstrument(newInstrument)
    clearSelection() // Clear melody when instrument changes
  }

  const navigateToHome = () => setCurrentPage('home')
  const navigateToSandbox = () => setCurrentPage('sandbox')
  const navigateToPractice = () => setCurrentPage('practice')

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
              selectedNotes={selectedNotes}
            />

            <MelodyControls
              selectedNotes={selectedNotes}
              onGenerateMelody={handleGenerateMelody}
              onPlayMelody={handlePlayMelody}
              isPlaying={isPlaying}
              generatedMelody={generatedMelody}
              instrument={instrument}
              showNotes={showNotes}
              onToggleNotes={() => setShowNotes(!showNotes)}
            />

            <MelodyDisplay
              generatedMelody={generatedMelody}
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
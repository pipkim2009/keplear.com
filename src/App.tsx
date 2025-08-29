import { useState } from 'react'
import Header from './components/common/Header'
import Footer from './components/common/Footer'
import InstrumentDisplay from './components/keyboard/InstrumentDisplay'
import MelodyControls from './components/MelodyControls'
import MelodyDisplay from './components/MelodyDisplay'
import { useAudio } from './hooks/useAudio'
import { useMelodyGenerator } from './hooks/useMelodyGenerator'
import { useTheme } from './hooks/useTheme'
import { notes, type Note } from './utils/notes'
import './styles/App.css'

function App() {
  const [bpm, setBpm] = useState(120)
  const [numberOfNotes, setNumberOfNotes] = useState(5)
  const [showNotes, setShowNotes] = useState(false)
  const [instrument, setInstrument] = useState('keyboard')
  
  const { isDarkMode, toggleTheme } = useTheme()
  const { playNote, playGuitarNote, playMelody, playGuitarMelody, isPlaying } = useAudio()
  const { 
    selectedNotes, 
    generatedMelody, 
    selectNote, 
    generateMelody, 
    setGuitarNotes,
    isSelected, 
    isInMelody,
    clearSelection 
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
    if (instrument === 'guitar') {
      playGuitarMelody(generatedMelody, bpm)
    } else {
      playMelody(generatedMelody, bpm)
    }
  }

  const handleInstrumentChange = (newInstrument: string) => {
    setInstrument(newInstrument)
    clearSelection() // Clear melody when instrument changes
  }

  return (
    <div className={`app-container ${isDarkMode ? 'dark' : 'light'}`}>
      <Header 
        isDarkMode={isDarkMode} 
        onToggleTheme={toggleTheme}
      />
      
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
      
      <Footer />
    </div>
  )
}

export default App
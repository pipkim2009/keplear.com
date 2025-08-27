import { useState } from 'react'
import ThemeToggle from './components/common/ThemeToggle'
import Piano from './components/piano/Piano'
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
  
  const { isDarkMode, toggleTheme } = useTheme()
  const { playNote, playMelody, isPlaying } = useAudio()
  const { 
    selectedNotes, 
    generatedMelody, 
    selectNote, 
    generateMelody, 
    isSelected, 
    isInMelody 
  } = useMelodyGenerator()

  const handleNoteClick = async (note: Note) => {
    await playNote(note.name)
    selectNote(note)
  }

  const handleGenerateMelody = () => {
    generateMelody(notes, numberOfNotes)
  }

  const handlePlayMelody = () => {
    playMelody(generatedMelody, bpm)
  }

  return (
    <div className={`app-container ${isDarkMode ? 'dark' : 'light'}`}>
      <ThemeToggle isDarkMode={isDarkMode} onToggle={toggleTheme} />
      
      <div className="app-header">
        <h1 className="app-title">Keplear</h1>
        <p className="app-description">
          Interactive piano for melody generation and practice
        </p>
      </div>

      <Piano
        onNoteClick={handleNoteClick}
        isSelected={isSelected}
        isInMelody={isInMelody}
        showNotes={showNotes}
        setShowNotes={setShowNotes}
        bpm={bpm}
        setBpm={setBpm}
        numberOfNotes={numberOfNotes}
        setNumberOfNotes={setNumberOfNotes}
      />

      <MelodyControls
        selectedNotes={selectedNotes}
        onGenerateMelody={handleGenerateMelody}
        onPlayMelody={handlePlayMelody}
        isPlaying={isPlaying}
        generatedMelody={generatedMelody}
      />

      <MelodyDisplay
        generatedMelody={generatedMelody}
        showNotes={showNotes}
      />
    </div>
  )
}

export default App
import NotesToggle from './common/NotesToggle'
import type { Note } from '../utils/notes'
import '../styles/MelodyControls.css'

interface MelodyControlsProps {
  selectedNotes: Note[]
  onGenerateMelody: () => void
  onPlayMelody: () => void
  isPlaying: boolean
  generatedMelody: Note[]
  instrument?: string
  showNotes: boolean
  onToggleNotes: () => void
}

const MelodyControls: React.FC<MelodyControlsProps> = ({
  selectedNotes,
  onGenerateMelody,
  onPlayMelody,
  isPlaying,
  generatedMelody,
  instrument = 'keyboard',
  showNotes,
  onToggleNotes
}) => {
  
  // Different enable conditions based on instrument
  const canGenerate = instrument === 'keyboard' 
    ? selectedNotes.length === 2  // Keyboard needs exactly 2 notes
    : selectedNotes.length > 0    // Guitar needs at least 1 note
  return (
    <div className="melody-controls">
      <div className="notes-toggle-container">
        <NotesToggle showNotes={showNotes} onToggle={onToggleNotes} />
      </div>
      
      <div className="selected-notes">
        Selected Notes: {selectedNotes.map(n => n.name).join(', ') || 'None'}
      </div>
      
      <div className="buttons">
        <button
          onClick={onGenerateMelody}
          disabled={!canGenerate}
          className="button"
        >
          Generate Melody
        </button>
        
        <button
          onClick={onPlayMelody}
          disabled={generatedMelody.length === 0}
          className={`button ${isPlaying ? 'button-stop' : ''}`}
        >
          {isPlaying ? 'Stop' : 'Play Melody'}
        </button>
      </div>
    </div>
  )
}

export default MelodyControls
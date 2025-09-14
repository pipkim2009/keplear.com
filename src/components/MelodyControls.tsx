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
  keyboardSelectionMode?: 'range' | 'multi'
}

const MelodyControls: React.FC<MelodyControlsProps> = ({
  selectedNotes,
  onGenerateMelody,
  onPlayMelody,
  isPlaying,
  generatedMelody,
  instrument = 'keyboard',
  showNotes,
  onToggleNotes,
  keyboardSelectionMode = 'range'
}) => {
  
  // Different enable conditions based on instrument and selection mode
  const canGenerate = instrument === 'keyboard'
    ? (keyboardSelectionMode === 'range'
        ? selectedNotes.length === 2  // Range mode needs exactly 2 notes
        : selectedNotes.length > 0)   // Multi mode needs at least 1 note
    : selectedNotes.length > 0        // Guitar needs at least 1 note
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
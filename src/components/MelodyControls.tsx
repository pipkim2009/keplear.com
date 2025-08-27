import React from 'react'
import type { Note } from '../utils/notes'
import '../styles/MelodyControls.css'

interface MelodyControlsProps {
  selectedNotes: Note[]
  onGenerateMelody: () => void
  onPlayMelody: () => void
  isPlaying: boolean
  generatedMelody: Note[]
}

const MelodyControls: React.FC<MelodyControlsProps> = ({
  selectedNotes,
  onGenerateMelody,
  onPlayMelody,
  isPlaying,
  generatedMelody
}) => {
  return (
    <div className="melody-controls">
      <div className="selected-notes">
        Selected Notes: {selectedNotes.map(n => n.name).join(', ') || 'None'}
      </div>
      
      <div className="buttons">
        <button
          onClick={onGenerateMelody}
          disabled={selectedNotes.length !== 2}
          className="button"
        >
          Generate Melody
        </button>
        
        <button
          onClick={onPlayMelody}
          disabled={generatedMelody.length === 0 || isPlaying}
          className="button"
        >
          {isPlaying ? 'Playing...' : 'Play Melody'}
        </button>
      </div>
    </div>
  )
}

export default MelodyControls
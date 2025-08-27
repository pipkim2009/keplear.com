import React from 'react'
import type { Note } from '../utils/notes'
import '../styles/MelodyDisplay.css'

interface MelodyDisplayProps {
  generatedMelody: Note[]
  showNotes: boolean
}

const MelodyDisplay: React.FC<MelodyDisplayProps> = ({ generatedMelody, showNotes }) => {
  if (generatedMelody.length === 0 || !showNotes) {
    return null
  }

  return (
    <div className="melody-display">
      <div className="melody-title">Generated Melody:</div>
      <div className="melody-notes">
        {generatedMelody.map((note, index) => (
          <span key={`${note.name}-${index}`} className="melody-note">
            {note.name}
          </span>
        ))}
      </div>
    </div>
  )
}

export default MelodyDisplay
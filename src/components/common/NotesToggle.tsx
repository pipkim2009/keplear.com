import React from 'react'
import { Eye, EyeOff } from 'lucide-react'
import '../../styles/NotesToggle.css'

interface NotesToggleProps {
  showNotes: boolean
  onToggle: () => void
}

const NotesToggle: React.FC<NotesToggleProps> = ({ showNotes, onToggle }) => {
  return (
    <button 
      className="notes-visibility-toggle"
      onClick={onToggle}
      title={showNotes ? 'Hide notes' : 'Show notes'}
    >
      {showNotes ? <Eye size={20} /> : <EyeOff size={20} />}
    </button>
  )
}

export default NotesToggle
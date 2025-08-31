import { Eye, EyeOff } from 'lucide-react'
import '../../styles/NotesToggle.css'

interface NotesToggleProps {
  showNotes: boolean
  onToggle: () => void
}

const NotesToggle: React.FC<NotesToggleProps> = ({ showNotes, onToggle }) => {
  return (
    <button 
      className="notes-toggle-switch"
      onClick={onToggle}
      title={showNotes ? 'Hide notes' : 'Show notes'}
      aria-label={showNotes ? 'Hide notes' : 'Show notes'}
    >
      <div className={`toggle-track ${showNotes ? 'show' : ''}`}>
        <div className={`toggle-thumb ${showNotes ? 'visible' : 'hidden'}`}>
          {showNotes ? <Eye size={12} /> : <EyeOff size={12} />}
        </div>
      </div>
      <span className="toggle-label">
        {showNotes ? 'Show' : 'Hide'}
      </span>
    </button>
  )
}

export default NotesToggle
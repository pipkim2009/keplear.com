import { Eye, EyeOff } from 'lucide-react'
import '../../styles/NotesToggle.css'

interface NotesToggleProps {
  showNotes: boolean
  onToggle: () => void
}

const NotesToggle: React.FC<NotesToggleProps> = ({ showNotes }) => {
  return (
    <div className="notes-toggle-content">
      {showNotes ? <EyeOff size={16} /> : <Eye size={16} />}
      <span className="toggle-label">
        {showNotes ? 'Hide' : 'Reveal'}
      </span>
    </div>
  )
}

export default NotesToggle
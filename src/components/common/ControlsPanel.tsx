import NotesToggle from './NotesToggle'
import '../../styles/ControlsPanel.css'

interface ControlsPanelProps {
  showNotes: boolean
  onToggleNotes: () => void
}

function ControlsPanel({ showNotes, onToggleNotes }: ControlsPanelProps) {
  return (
    <div className="controls-panel">
      <div className="controls-content">
        <div className="control-group">
          <label className="control-label">Note Visibility</label>
          <NotesToggle showNotes={showNotes} onToggle={onToggleNotes} />
        </div>
      </div>
    </div>
  )
}

export default ControlsPanel
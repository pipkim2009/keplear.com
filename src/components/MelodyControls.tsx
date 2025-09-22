import NotesToggle from './common/NotesToggle'
import type { Note } from '../utils/notes'
import { downloadAudioFile, generateMelodyFilename } from '../utils/audioExport'
import '../styles/MelodyControls.css'

interface MelodyControlsProps {
  selectedNotes: Note[]
  onGenerateMelody: () => void
  onPlayMelody: () => void
  onRecordMelody?: () => Promise<Blob | null>
  onPlayAudioFile?: (blob: Blob) => void
  isPlaying: boolean
  isRecording?: boolean
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
  onRecordMelody,
  onPlayAudioFile,
  isPlaying,
  isRecording = false,
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

  const handleRecordAndDownload = async () => {
    if (!onRecordMelody) return

    try {
      const audioBlob = await onRecordMelody()
      if (audioBlob) {
        const filename = generateMelodyFilename(instrument)
        downloadAudioFile(audioBlob, filename)
      }
    } catch (error) {
      console.error('Failed to record melody:', error)
    }
  }

  const handleRecordAndPlay = async () => {
    if (!onRecordMelody || !onPlayAudioFile) return

    try {
      const audioBlob = await onRecordMelody()
      if (audioBlob) {
        onPlayAudioFile(audioBlob)
      }
    } catch (error) {
      console.error('Failed to record melody:', error)
    }
  }
  return (
    <div className="melody-controls">
      <button
        className="notes-toggle-container"
        onClick={onToggleNotes}
        title={showNotes ? 'Hide notes' : 'Reveal notes'}
        aria-label={showNotes ? 'Hide notes' : 'Reveal notes'}
      >
        <NotesToggle showNotes={showNotes} onToggle={() => {}} />
      </button>
      
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
          disabled={generatedMelody.length === 0 || isRecording}
          className={`button ${isPlaying ? 'button-stop' : ''}`}
        >
          {isPlaying ? 'Stop' : 'Play Melody'}
        </button>

        {onRecordMelody && (
          <>
            <button
              onClick={handleRecordAndDownload}
              disabled={generatedMelody.length === 0 || isPlaying || isRecording}
              className="button"
              title="Record melody and download as WAV file"
            >
              {isRecording ? 'Recording...' : 'Export WAV'}
            </button>

            <button
              onClick={handleRecordAndPlay}
              disabled={generatedMelody.length === 0 || isPlaying || isRecording}
              className="button"
              title="Record melody and play as audio file"
            >
              {isRecording ? 'Recording...' : 'Record & Play'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default MelodyControls
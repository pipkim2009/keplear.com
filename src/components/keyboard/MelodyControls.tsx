import { memo } from 'react'
import { useInstrument } from '../../contexts/InstrumentContext'
import '../../styles/MelodyControls.css'

/**
 * Component responsible for melody generation and playback controls
 * Extracted from InstrumentControls for better separation of concerns
 * Optimized with React.memo
 */
const MelodyControls = memo(function MelodyControls() {
  const {
    handleGenerateMelody,
    handlePlayMelody,
    handleRecordMelody,
    isPlaying,
    isRecording,
    generatedMelody,
    handleClearRecordedAudio,
    recordedAudioBlob,
    hasChanges
  } = useInstrument()

  return (
    <div className="melody-controls">
      <div className="control-row">
        <button
          className={`button generate-button ${hasChanges ? 'has-changes' : ''}`}
          onClick={handleGenerateMelody}
          disabled={isPlaying || isRecording}
        >
          🎵 Generate Melody
          {hasChanges && <span className="change-badge">●</span>}
        </button>

        <button
          className={`button play-button ${isPlaying ? 'playing' : ''}`}
          onClick={handlePlayMelody}
          disabled={generatedMelody.length === 0 || isRecording}
        >
          {isPlaying ? '⏸️ Stop' : '▶️ Play'}
        </button>

        <button
          className={`button record-button ${isRecording ? 'recording' : ''}`}
          onClick={handleRecordMelody}
          disabled={generatedMelody.length === 0 || isPlaying}
        >
          {isRecording ? '⏹️ Stop Recording' : '🎤 Record'}
        </button>
      </div>

      {recordedAudioBlob && (
        <div className="recorded-audio-controls">
          <audio controls src={URL.createObjectURL(recordedAudioBlob)} />
          <button
            className="button clear-button"
            onClick={handleClearRecordedAudio}
          >
            🗑️ Clear Recording
          </button>
        </div>
      )}
    </div>
  )
})

export default MelodyControls
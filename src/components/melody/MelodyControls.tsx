import { memo } from 'react'
import { useInstrument } from '../../contexts/InstrumentContext'
import '../../styles/MelodyControls.css'
import { IoMusicalNotes } from 'react-icons/io5'
import { FaPlay, FaPause, FaStop } from 'react-icons/fa'
import { BsFillMicFill, BsTrashFill } from 'react-icons/bs'

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
          <IoMusicalNotes /> Generate
          {hasChanges && <span className="change-badge">●</span>}
        </button>

        <button
          className={`button play-button ${isPlaying ? 'playing' : ''}`}
          onClick={handlePlayMelody}
          disabled={generatedMelody.length === 0 || isRecording}
        >
          {isPlaying ? <><FaPause size={24} /> Stop</> : <><FaPlay size={24} /> Play</>}
        </button>

        <button
          className={`button record-button ${isRecording ? 'recording' : ''}`}
          onClick={handleRecordMelody}
          disabled={generatedMelody.length === 0 || isPlaying}
        >
          {isRecording ? <><FaStop /> Stop Recording</> : <><BsFillMicFill /> Record</>}
        </button>
      </div>

      {recordedAudioBlob && (
        <div className="recorded-audio-controls">
          <audio controls src={URL.createObjectURL(recordedAudioBlob)} />
          <button
            className="button clear-button"
            onClick={handleClearRecordedAudio}
          >
            <BsTrashFill /> Clear Recording
          </button>
        </div>
      )}
    </div>
  )
})

export default MelodyControls
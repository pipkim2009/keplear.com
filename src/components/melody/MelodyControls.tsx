import { memo, useMemo, useEffect, useRef } from 'react'
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

  // Store the current blob URL for cleanup
  const blobUrlRef = useRef<string | null>(null)

  // Create blob URL only when blob changes, and clean up old URLs
  const audioUrl = useMemo(() => {
    // Revoke previous URL to prevent memory leak
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current)
      blobUrlRef.current = null
    }

    if (recordedAudioBlob) {
      const url = URL.createObjectURL(recordedAudioBlob)
      blobUrlRef.current = url
      return url
    }

    return null
  }, [recordedAudioBlob])

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current)
        blobUrlRef.current = null
      }
    }
  }, [])

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

      {audioUrl && (
        <div className="recorded-audio-controls">
          <audio controls src={audioUrl} />
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
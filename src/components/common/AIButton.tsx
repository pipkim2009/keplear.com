import React, { useState, useRef, useEffect } from 'react'
import '../../styles/AIButton.css'

interface AIButtonProps {
  onTranscriptChange?: (transcript: string) => void
}

const AIButton: React.FC<AIButtonProps> = ({ onTranscriptChange }) => {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const recognitionRef = useRef<any>(null)
  const isListeningRef = useRef(false)
  const finalTranscriptRef = useRef('')

  useEffect(() => {
    // Check if browser supports Web Speech API
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = true
      recognitionRef.current.interimResults = true
      recognitionRef.current.lang = 'en-US'

      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = ''

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcriptSegment = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscriptRef.current += transcriptSegment + ' '
          } else {
            interimTranscript += transcriptSegment
          }
        }

        const newTranscript = finalTranscriptRef.current + interimTranscript
        setTranscript(newTranscript)
        if (onTranscriptChange) {
          onTranscriptChange(newTranscript)
        }
      }

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error)
        if (event.error === 'aborted') {
          setIsListening(false)
          isListeningRef.current = false
        }
      }

      recognitionRef.current.onend = () => {
        // Auto-restart if still supposed to be listening
        if (isListeningRef.current && recognitionRef.current) {
          recognitionRef.current.start()
        }
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [onTranscriptChange])

  const handleToggleListening = () => {
    if (isListening) {
      // Stop listening
      if (recognitionRef.current) {
        recognitionRef.current.stop()
        setIsListening(false)
        isListeningRef.current = false
      }
    } else {
      // Start listening
      if (recognitionRef.current) {
        setTranscript('')
        finalTranscriptRef.current = ''
        recognitionRef.current.start()
        setIsListening(true)
        isListeningRef.current = true
      }
    }
  }

  return (
    <div className="ai-inline-container">
      <button
        className={`ai-button ${isListening ? 'recording' : ''}`}
        onClick={handleToggleListening}
        title={isListening ? "Stop Recording" : "Start AI Assistant"}
        disabled={!recognitionRef.current}
      >
        <span className="ai-icon">{isListening ? '⏹' : '🤖'}</span>
      </button>

      {(isListening || transcript) && (
        <div className="ai-transcript-display">
          {transcript || 'Listening...'}
        </div>
      )}

      {!recognitionRef.current && (
        <div className="ai-error-inline">
          Speech recognition is not supported in your browser.
        </div>
      )}
    </div>
  )
}

export default AIButton

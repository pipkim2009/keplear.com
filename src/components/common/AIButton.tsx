import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import '../../styles/AIButton.css'

interface AIButtonProps {
  onTranscriptChange?: (transcript: string) => void
}

const AIButton: React.FC<AIButtonProps> = ({ onTranscriptChange }) => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const recognitionRef = useRef<any>(null)

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
        let finalTranscript = ''

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcriptSegment = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscript += transcriptSegment + ' '
          } else {
            interimTranscript += transcriptSegment
          }
        }

        const newTranscript = transcript + finalTranscript + interimTranscript
        setTranscript(newTranscript)
        if (onTranscriptChange) {
          onTranscriptChange(newTranscript)
        }
      }

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error)
        setIsListening(false)
      }

      recognitionRef.current.onend = () => {
        setIsListening(false)
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [transcript, onTranscriptChange])

  const handleAIButtonClick = () => {
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop()
      setIsListening(false)
    }
    setIsModalOpen(false)
  }

  const handleStartListening = () => {
    if (recognitionRef.current && !isListening) {
      setTranscript('')
      recognitionRef.current.start()
      setIsListening(true)
    }
  }

  const handleStopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    }
  }

  const handleClearTranscript = () => {
    setTranscript('')
    if (onTranscriptChange) {
      onTranscriptChange('')
    }
  }

  return (
    <>
      <button className="ai-button" onClick={handleAIButtonClick} title="AI Assistant">
        <span className="ai-icon">🤖</span>
      </button>

      {isModalOpen && createPortal(
        <div className="ai-modal-overlay" onClick={handleCloseModal}>
          <div className="ai-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ai-modal-header">
              <h3>AI Assistant</h3>
              <button className="ai-modal-close" onClick={handleCloseModal}>×</button>
            </div>

            <div className="ai-modal-content">
              <div className="ai-controls">
                <button
                  className={`ai-control-button ${isListening ? 'listening' : ''}`}
                  onClick={isListening ? handleStopListening : handleStartListening}
                  disabled={!recognitionRef.current}
                >
                  {isListening ? '⏹ Stop' : '🎤 Start Speaking'}
                </button>
                <button
                  className="ai-control-button clear"
                  onClick={handleClearTranscript}
                  disabled={!transcript}
                >
                  Clear
                </button>
              </div>

              <div className="ai-transcript-box">
                {transcript || (isListening ? 'Listening...' : 'Click "Start Speaking" to begin')}
              </div>

              {!recognitionRef.current && (
                <div className="ai-error">
                  Speech recognition is not supported in your browser.
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

export default AIButton

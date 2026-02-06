import { useState, useEffect, useRef } from 'react'
import styles from '../../styles/Practice.module.css'

interface WelcomeSubtitleProps {
  message: string
  onSpeechEnd?: () => void
  /** Hide timeout in ms (default: 5000) */
  hideDelay?: number
}

const WelcomeSubtitle: React.FC<WelcomeSubtitleProps> = ({
  message,
  onSpeechEnd,
  hideDelay = 5000,
}) => {
  const [isVisible, setIsVisible] = useState(true)
  const lastSpokenMessage = useRef<string>('')
  const onSpeechEndRef = useRef(onSpeechEnd)

  useEffect(() => {
    onSpeechEndRef.current = onSpeechEnd
  }, [onSpeechEnd])

  useEffect(() => {
    if (message && message !== lastSpokenMessage.current) {
      setIsVisible(true)
      lastSpokenMessage.current = message

      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel()

        const utterance = new SpeechSynthesisUtterance(message)
        utterance.rate = 0.9
        utterance.pitch = 1
        utterance.volume = 1

        utterance.onend = () => {
          if (onSpeechEndRef.current) onSpeechEndRef.current()
        }

        window.speechSynthesis.speak(utterance)
      } else {
        const timer = setTimeout(() => {
          setIsVisible(false)
          if (onSpeechEndRef.current) onSpeechEndRef.current()
        }, 3000)
        return () => clearTimeout(timer)
      }
    }

    const timer = setTimeout(() => {
      setIsVisible(false)
    }, hideDelay)

    return () => clearTimeout(timer)
  }, [message, hideDelay])

  if (!isVisible || !message) return null

  return <div className={styles.welcomeSubtitle}>{message}</div>
}

export default WelcomeSubtitle

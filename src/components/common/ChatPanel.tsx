import { useState, useRef, useEffect, memo } from 'react'
import { createPortal } from 'react-dom'
import { IoSend, IoChatbubbleEllipses, IoClose } from 'react-icons/io5'
import styles from '../../styles/ChatPanel.module.css'

interface Message {
  id: string
  text: string
  sender: 'user' | 'system'
  timestamp: Date
}

const ChatPanel = memo(function ChatPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Welcome to Keplear! How can we help you today?',
      sender: 'system',
      timestamp: new Date()
    }
  ])
  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const handleToggle = () => {
    setIsOpen(!isOpen)
  }

  const handleSendMessage = () => {
    if (!inputValue.trim()) return

    const newMessage: Message = {
      id: Date.now().toString(),
      text: inputValue.trim(),
      sender: 'user',
      timestamp: new Date()
    }

    setMessages(prev => [...prev, newMessage])
    setInputValue('')

    // Simulate a response (replace with actual chat logic later)
    setTimeout(() => {
      const response: Message = {
        id: (Date.now() + 1).toString(),
        text: "Thanks for your message! This chat feature is coming soon. For now, please email us at support@keplear.com for assistance.",
        sender: 'system',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, response])
    }, 1000)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return createPortal(
    <div className={styles.chatContainer}>
      {/* Chat Panel */}
      <div className={`${styles.chatPanel} ${isOpen ? styles.open : ''}`}>
        <div className={styles.chatHeader}>
          <div className={styles.chatHeaderInfo}>
            <IoChatbubbleEllipses className={styles.chatHeaderIcon} />
            <span className={styles.chatHeaderTitle}>Chat with us</span>
          </div>
          <button
            className={styles.closeButton}
            onClick={handleToggle}
            aria-label="Close chat"
          >
            <IoClose />
          </button>
        </div>

        <div className={styles.messagesContainer}>
          {messages.map((message) => (
            <div
              key={message.id}
              className={`${styles.message} ${message.sender === 'user' ? styles.userMessage : styles.systemMessage}`}
            >
              <div className={styles.messageContent}>
                <p className={styles.messageText}>{message.text}</p>
                <span className={styles.messageTime}>{formatTime(message.timestamp)}</span>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className={styles.inputContainer}>
          <input
            ref={inputRef}
            type="text"
            className={styles.chatInput}
            placeholder="Type a message..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            className={styles.sendButton}
            onClick={handleSendMessage}
            disabled={!inputValue.trim()}
            aria-label="Send message"
          >
            <IoSend />
          </button>
        </div>
      </div>

      {/* Floating Chat Button */}
      <button
        className={`${styles.chatButton} ${isOpen ? styles.hidden : ''}`}
        onClick={handleToggle}
        aria-label="Open chat"
      >
        <IoChatbubbleEllipses />
      </button>
    </div>,
    document.body
  )
})

export default ChatPanel

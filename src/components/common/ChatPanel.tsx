import { useState, useRef, useEffect, memo } from 'react'
import { createPortal } from 'react-dom'
import { IoSend, IoChatbubbleEllipses, IoClose, IoSparkles } from 'react-icons/io5'
import { generateResponse, getWelcomeMessage } from '../../utils/chatAI'
import styles from '../../styles/ChatPanel.module.css'

interface Message {
  id: string
  text: string
  sender: 'user' | 'assistant'
  timestamp: Date
}

const ChatPanel = memo(function ChatPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: getWelcomeMessage(),
      sender: 'assistant',
      timestamp: new Date()
    }
  ])
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
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
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [isOpen])

  const handleToggle = () => {
    setIsOpen(!isOpen)
  }

  const handleSendMessage = (text?: string) => {
    const messageText = text || inputValue.trim()
    if (!messageText) return

    const newMessage: Message = {
      id: Date.now().toString(),
      text: messageText,
      sender: 'user',
      timestamp: new Date()
    }

    setMessages(prev => [...prev, newMessage])
    setInputValue('')
    setIsTyping(true)

    // Simulate typing delay for more natural feel
    const typingDelay = Math.min(500 + messageText.length * 10, 1500)

    setTimeout(() => {
      const response = generateResponse(messageText)
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response,
        sender: 'assistant',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, assistantMessage])
      setIsTyping(false)
    }, typingDelay)
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

  // Simple markdown-like formatting
  const formatMessage = (text: string) => {
    return text
      .split('\n')
      .map((line, i) => {
        // Bold text
        let formatted = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        // Bullet points
        if (formatted.startsWith('• ')) {
          formatted = `<span class="${styles.bullet}">•</span> ${formatted.slice(2)}`
        }
        return <p key={i} dangerouslySetInnerHTML={{ __html: formatted }} />
      })
  }

  return createPortal(
    <div className={styles.chatContainer}>
      {/* Chat Panel */}
      <div className={`${styles.chatPanel} ${isOpen ? styles.open : ''}`}>
        <div className={styles.chatHeader}>
          <div className={styles.chatHeaderInfo}>
            <IoSparkles className={styles.chatHeaderIcon} />
            <span className={styles.chatHeaderTitle}>AI Assistant</span>
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
              className={`${styles.message} ${message.sender === 'user' ? styles.userMessage : styles.assistantMessage}`}
            >
              <div className={styles.messageContent}>
                <div className={styles.messageText}>
                  {message.sender === 'assistant'
                    ? formatMessage(message.text)
                    : <p>{message.text}</p>
                  }
                </div>
                <span className={styles.messageTime}>{formatTime(message.timestamp)}</span>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className={`${styles.message} ${styles.assistantMessage}`}>
              <div className={styles.messageContent}>
                <div className={styles.typingIndicator}>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>


        <div className={styles.inputContainer}>
          <input
            ref={inputRef}
            type="text"
            className={styles.chatInput}
            placeholder="Ask me anything..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isTyping}
          />
          <button
            className={styles.sendButton}
            onClick={() => handleSendMessage()}
            disabled={!inputValue.trim() || isTyping}
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
        <span className={styles.chatButtonBadge}>
          <IoSparkles />
        </span>
      </button>
    </div>,
    document.body
  )
})

export default ChatPanel

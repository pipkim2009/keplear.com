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
  const [bottomOffset, setBottomOffset] = useState(24)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Adjust position based on footer visibility
  useEffect(() => {
    const BASE_OFFSET = 24

    const updatePosition = () => {
      const footer = document.querySelector('.footer')
      if (!footer) {
        setBottomOffset(BASE_OFFSET)
        return
      }

      const footerRect = footer.getBoundingClientRect()
      const viewportHeight = window.innerHeight

      // Footer is visible if its top edge is within the viewport
      const isFooterVisible = footerRect.top < viewportHeight && footerRect.bottom > 0

      if (isFooterVisible) {
        // Calculate how much of the footer is visible from the bottom of viewport
        const footerVisibleHeight = viewportHeight - footerRect.top
        setBottomOffset(footerVisibleHeight + BASE_OFFSET)
      } else {
        setBottomOffset(BASE_OFFSET)
      }
    }

    // Only update position on scroll/resize - not on initial load
    window.addEventListener('scroll', updatePosition, { passive: true })
    window.addEventListener('resize', updatePosition, { passive: true })
    document.addEventListener('scroll', updatePosition, { passive: true, capture: true })

    return () => {
      window.removeEventListener('scroll', updatePosition)
      window.removeEventListener('resize', updatePosition)
      document.removeEventListener('scroll', updatePosition, { capture: true })
    }
  }, [])

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
    <div className={styles.chatContainer} style={{ bottom: `${bottomOffset}px` }}>
      {/* Chat Panel */}
      <div className={`${styles.chatPanel} ${isOpen ? styles.open : ''}`}>
        <div className={styles.chatHeader}>
          <div className={styles.chatHeaderInfo}>
            <IoSparkles className={styles.chatHeaderIcon} />
            <span className={styles.chatHeaderTitle}>Keplear Assistant</span>
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
      </button>
    </div>,
    document.body
  )
})

export default ChatPanel

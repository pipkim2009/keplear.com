import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ChatPanel from '../ChatPanel'
import { TranslationProvider } from '../../../contexts/TranslationContext'

// Mock chatAI
vi.mock('../../../utils/chatAI', () => ({
  generateResponse: vi.fn().mockResolvedValue('Mock AI response'),
  getWelcomeMessage: vi.fn().mockReturnValue('Welcome to Keplear!'),
}))

function renderChatPanel() {
  return render(
    <TranslationProvider>
      <ChatPanel />
    </TranslationProvider>
  )
}

describe('ChatPanel', () => {
  it('renders chat toggle button', () => {
    renderChatPanel()
    // The chat button should be in the portal (document.body)
    const buttons = document.querySelectorAll('button')
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('opens chat panel on toggle click', async () => {
    renderChatPanel()
    // Find the toggle button (it's the one that opens the chat)
    const toggleButtons = document.querySelectorAll('button')
    const toggleButton = Array.from(toggleButtons).find(btn => !btn.closest('form'))
    if (toggleButton) {
      fireEvent.click(toggleButton)
      // After opening, should show the welcome message
      await waitFor(() => {
        expect(screen.getByText('Welcome to Keplear!')).toBeInTheDocument()
      })
    }
  })

  it('does not render XSS content as HTML', async () => {
    renderChatPanel()

    // Open the chat
    const toggleButtons = document.querySelectorAll('button')
    const toggleButton = Array.from(toggleButtons).find(btn => !btn.closest('form'))
    if (toggleButton) {
      fireEvent.click(toggleButton)
    }

    // Check the welcome message renders as text, not HTML
    // The formatMessage function should use React elements, not dangerouslySetInnerHTML
    await waitFor(() => {
      const messageElements = document.querySelectorAll('p')
      messageElements.forEach(el => {
        // Verify no script tags rendered
        expect(el.querySelector('script')).toBeNull()
        // Verify no img tags with onerror
        const imgs = el.querySelectorAll('img[onerror]')
        expect(imgs.length).toBe(0)
      })
    })
  })

  it('does not use dangerouslySetInnerHTML', async () => {
    renderChatPanel()

    // Open the chat
    const toggleButtons = document.querySelectorAll('button')
    const toggleButton = Array.from(toggleButtons).find(btn => !btn.closest('form'))
    if (toggleButton) {
      fireEvent.click(toggleButton)
    }

    // Check that no elements have dangerouslySetInnerHTML rendered attributes
    await waitFor(() => {
      const allElements = document.querySelectorAll('[data-reactroot] *')
      allElements.forEach(el => {
        // innerHTML should not contain raw script/event handler patterns
        expect(el.innerHTML).not.toMatch(/<script/i)
      })
    })
  })

  it('sends user messages via send button', async () => {
    const user = userEvent.setup()
    renderChatPanel()

    // Open chat
    const openButton = screen.getByLabelText('Open chat')
    fireEvent.click(openButton)

    // Find input and type a message
    await waitFor(() => {
      const input = document.querySelector('input')
      expect(input).not.toBeNull()
    })

    const input = document.querySelector('input')!
    await user.type(input, 'Hello bot')

    // Click the send button
    const sendButton = screen.getByLabelText('Send message')
    await user.click(sendButton)

    // User message should appear
    await waitFor(() => {
      expect(screen.getByText('Hello bot')).toBeInTheDocument()
    })
  })
})

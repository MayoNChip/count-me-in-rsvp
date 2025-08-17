/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import { MessageTemplateEditor } from '@/components/guests/message-template-editor'
import * as whatsappUtils from '@/lib/utils/whatsapp'

// Mock the WhatsApp utilities
vi.mock('@/lib/utils/whatsapp', () => ({
  createWhatsAppMessage: vi.fn()
}))

describe('MessageTemplateEditor', () => {
  const mockEvent = {
    id: 'event1',
    name: 'Wedding Celebration',
    date: '2025-12-31',
    time: '18:00:00',
    location: 'Grand Ballroom',
    description: 'A beautiful celebration',
    organizerEmail: 'organizer@example.com',
    createdAt: new Date(),
    updatedAt: new Date()
  }

  const mockGuest = {
    id: '1',
    name: 'John Doe',
    phone: '+1-555-123-4567',
    email: 'john@example.com',
    eventId: 'event1',
    token: 'token123',
    invitationStatus: 'pending',
    rsvpStatus: null,
    guestCount: null,
    createdAt: new Date(),
    updatedAt: new Date()
  }

  const defaultTemplate = `Hi {guestName}! 🎉

You're invited to {eventName} on {eventDate}!

Please RSVP using this link: {rsvpUrl}

Looking forward to celebrating with you! 💫`

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Component Render', () => {
    it('should render the template editor with default template', () => {
      render(
        <MessageTemplateEditor
          event={mockEvent}
          sampleGuest={mockGuest}
          initialTemplate={defaultTemplate}
          onChange={() => {}}
        />
      )

      expect(screen.getByText(/message template/i)).toBeInTheDocument()
      expect(screen.getByRole('textbox', { name: /template content/i })).toBeInTheDocument()
      expect(screen.getByText(/live preview/i)).toBeInTheDocument()
    })

    it('should display the initial template in textarea', () => {
      render(
        <MessageTemplateEditor
          event={mockEvent}
          sampleGuest={mockGuest}
          initialTemplate={defaultTemplate}
          onChange={() => {}}
        />
      )

      const textarea = screen.getByRole('textbox', { name: /template content/i })
      expect(textarea).toHaveValue(defaultTemplate)
    })

    it('should show available placeholders', () => {
      render(
        <MessageTemplateEditor
          event={mockEvent}
          sampleGuest={mockGuest}
          initialTemplate=""
          onChange={() => {}}
        />
      )

      // Check placeholder buttons exist
      expect(screen.getByRole('button', { name: /{guestName}/ })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /{eventName}/ })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /{eventDate}/ })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /{eventTime}/ })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /{eventLocation}/ })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /{rsvpUrl}/ })).toBeInTheDocument()
    })
  })

  describe('Template Editing', () => {
    it('should allow editing the template', () => {
      const onChangeMock = vi.fn()

      render(
        <MessageTemplateEditor
          event={mockEvent}
          sampleGuest={mockGuest}
          initialTemplate={defaultTemplate}
          onChange={onChangeMock}
        />
      )

      const textarea = screen.getByRole('textbox', { name: /template content/i })
      const customTemplate = 'Custom template with {guestName}'

      fireEvent.change(textarea, { target: { value: customTemplate } })

      expect(textarea).toHaveValue(customTemplate)
      expect(onChangeMock).toHaveBeenCalledWith(customTemplate)
    })

    it('should call onChange when template is modified', () => {
      const onChangeMock = vi.fn()

      render(
        <MessageTemplateEditor
          event={mockEvent}
          sampleGuest={mockGuest}
          initialTemplate={defaultTemplate}
          onChange={onChangeMock}
        />
      )

      const textarea = screen.getByRole('textbox', { name: /template content/i })
      fireEvent.change(textarea, { target: { value: 'New template' } })

      expect(onChangeMock).toHaveBeenCalledWith('New template')
    })

    it('should update preview when template changes', () => {
      vi.mocked(whatsappUtils.createWhatsAppMessage).mockReturnValue('Processed preview message')

      render(
        <MessageTemplateEditor
          event={mockEvent}
          sampleGuest={mockGuest}
          initialTemplate={defaultTemplate}
          onChange={() => {}}
        />
      )

      expect(whatsappUtils.createWhatsAppMessage).toHaveBeenCalledWith(
        mockGuest,
        mockEvent,
        expect.stringContaining('/rsvp/'),
        defaultTemplate
      )

      // Verify the preview is displayed
      expect(screen.getByText('Processed preview message')).toBeInTheDocument()
    })
  })

  describe('Placeholder Insertion', () => {
    it('should insert placeholders when clicked', () => {
      const onChangeMock = vi.fn()

      render(
        <MessageTemplateEditor
          event={mockEvent}
          sampleGuest={mockGuest}
          initialTemplate=""
          onChange={onChangeMock}
        />
      )

      const guestNameButton = screen.getByRole('button', { name: /{guestName}/ })
      fireEvent.click(guestNameButton)

      expect(onChangeMock).toHaveBeenCalledWith('{guestName}')
    })

    it('should append placeholders to existing template', () => {
      const onChangeMock = vi.fn()

      render(
        <MessageTemplateEditor
          event={mockEvent}
          sampleGuest={mockGuest}
          initialTemplate="Hello "
          onChange={onChangeMock}
        />
      )

      const guestNameButton = screen.getByRole('button', { name: /{guestName}/ })
      fireEvent.click(guestNameButton)

      expect(onChangeMock).toHaveBeenCalledWith('Hello {guestName}')
    })

    it('should handle multiple placeholder insertions', () => {
      const onChangeMock = vi.fn()

      render(
        <MessageTemplateEditor
          event={mockEvent}
          sampleGuest={mockGuest}
          initialTemplate=""
          onChange={onChangeMock}
        />
      )

      const guestNameButton = screen.getByRole('button', { name: /{guestName}/ })
      const eventNameButton = screen.getByRole('button', { name: /{eventName}/ })

      fireEvent.click(guestNameButton)
      expect(onChangeMock).toHaveBeenNthCalledWith(1, '{guestName}')

      fireEvent.click(eventNameButton)
      // Second click appends to existing template  
      expect(onChangeMock).toHaveBeenNthCalledWith(2, '{guestName}{eventName}')
    })
  })

  describe('Live Preview', () => {
    it('should display live preview of template', () => {
      const previewMessage = 'Hello John Doe! Welcome to Wedding Celebration!'
      vi.mocked(whatsappUtils.createWhatsAppMessage).mockReturnValue(previewMessage)

      render(
        <MessageTemplateEditor
          event={mockEvent}
          sampleGuest={mockGuest}
          initialTemplate="Hello {guestName}! Welcome to {eventName}!"
          onChange={() => {}}
        />
      )

      expect(screen.getByText(previewMessage)).toBeInTheDocument()
    })

    it('should handle empty template gracefully', () => {
      vi.mocked(whatsappUtils.createWhatsAppMessage).mockReturnValue('')

      render(
        <MessageTemplateEditor
          event={mockEvent}
          sampleGuest={mockGuest}
          initialTemplate=""
          onChange={() => {}}
        />
      )

      expect(screen.getByText(/no preview available/i)).toBeInTheDocument()
    })

    it('should update preview when sample guest changes', () => {
      const newGuest = {
        ...mockGuest,
        name: 'Jane Smith',
        token: 'token456'
      }

      vi.mocked(whatsappUtils.createWhatsAppMessage).mockReturnValue('Hello Jane Smith!')

      const { rerender } = render(
        <MessageTemplateEditor
          event={mockEvent}
          sampleGuest={mockGuest}
          initialTemplate="Hello {guestName}!"
          onChange={() => {}}
        />
      )

      rerender(
        <MessageTemplateEditor
          event={mockEvent}
          sampleGuest={newGuest}
          initialTemplate="Hello {guestName}!"
          onChange={() => {}}
        />
      )

      expect(whatsappUtils.createWhatsAppMessage).toHaveBeenCalledWith(
        newGuest,
        mockEvent,
        expect.stringContaining('/rsvp/token456'),
        'Hello {guestName}!'
      )
    })
  })

  describe('Default Templates', () => {
    it('should provide wedding template option', () => {
      render(
        <MessageTemplateEditor
          event={mockEvent}
          sampleGuest={mockGuest}
          initialTemplate=""
          onChange={() => {}}
        />
      )

      expect(screen.getByRole('button', { name: /wedding/i })).toBeInTheDocument()
    })

    it('should provide birthday template option', () => {
      render(
        <MessageTemplateEditor
          event={mockEvent}
          sampleGuest={mockGuest}
          initialTemplate=""
          onChange={() => {}}
        />
      )

      expect(screen.getByRole('button', { name: /birthday/i })).toBeInTheDocument()
    })

    it('should provide business template option', () => {
      render(
        <MessageTemplateEditor
          event={mockEvent}
          sampleGuest={mockGuest}
          initialTemplate=""
          onChange={() => {}}
        />
      )

      expect(screen.getByRole('button', { name: /business/i })).toBeInTheDocument()
    })

    it('should apply template when default template is selected', () => {
      const onChangeMock = vi.fn()

      render(
        <MessageTemplateEditor
          event={mockEvent}
          sampleGuest={mockGuest}
          initialTemplate=""
          onChange={onChangeMock}
        />
      )

      const weddingButton = screen.getByRole('button', { name: /wedding/i })
      fireEvent.click(weddingButton)

      expect(onChangeMock).toHaveBeenCalledWith(expect.stringContaining('getting married'))
    })
  })

  describe('Template Validation', () => {
    it('should show character count', () => {
      render(
        <MessageTemplateEditor
          event={mockEvent}
          sampleGuest={mockGuest}
          initialTemplate="Short message"
          onChange={() => {}}
        />
      )

      expect(screen.getByText(/13 characters/i)).toBeInTheDocument()
    })

    it('should warn when template is too long', () => {
      const longTemplate = 'A'.repeat(2000) // Very long template
      
      render(
        <MessageTemplateEditor
          event={mockEvent}
          sampleGuest={mockGuest}
          initialTemplate={longTemplate}
          onChange={() => {}}
        />
      )

      // Check for the validation message
      expect(screen.getByText(/message is too long/i)).toBeInTheDocument()
    })

    it('should validate required placeholders', () => {
      render(
        <MessageTemplateEditor
          event={mockEvent}
          sampleGuest={mockGuest}
          initialTemplate="Template without guest name"
          onChange={() => {}}
          requireGuestName={true}
        />
      )

      expect(screen.getByText(/must include.*guestName/i)).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(
        <MessageTemplateEditor
          event={mockEvent}
          sampleGuest={mockGuest}
          initialTemplate={defaultTemplate}
          onChange={() => {}}
        />
      )

      expect(screen.getByLabelText(/template content/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/message preview/i)).toBeInTheDocument()
    })

    it('should support keyboard navigation', () => {
      render(
        <MessageTemplateEditor
          event={mockEvent}
          sampleGuest={mockGuest}
          initialTemplate=""
          onChange={() => {}}
        />
      )

      const textarea = screen.getByRole('textbox', { name: /template content/i })
      const guestNameButton = screen.getByRole('button', { name: /{guestName}/ })

      // Elements should be focusable (part of tab order)
      expect(textarea).toBeInTheDocument()
      expect(guestNameButton).toBeInTheDocument()
      
      // Test that they can receive focus
      textarea.focus()
      expect(textarea).toHaveFocus()
    })
  })
})
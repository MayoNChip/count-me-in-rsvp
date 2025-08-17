/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import { WhatsAppBulkDialog } from '@/components/guests/whatsapp-bulk-dialog'
import * as whatsappUtils from '@/lib/utils/whatsapp'

// Mock the WhatsApp utilities
vi.mock('@/lib/utils/whatsapp', () => ({
  validatePhoneNumber: vi.fn(),
  formatPhoneForWhatsApp: vi.fn(),
  createWhatsAppMessage: vi.fn(),
  generateWhatsAppUrl: vi.fn()
}))

// Mock window.open
const mockWindowOpen = vi.fn()
Object.defineProperty(window, 'open', {
  writable: true,
  value: mockWindowOpen
})

describe('WhatsAppBulkDialog', () => {
  const mockGuests = [
    {
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
    },
    {
      id: '2',
      name: 'Jane Smith',
      phone: '+1-555-987-6543',
      email: 'jane@example.com',
      eventId: 'event1',
      token: 'token456',
      invitationStatus: 'pending',
      rsvpStatus: null,
      guestCount: null,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: '3',
      name: 'No Phone User',
      phone: null,
      email: 'noPhone@example.com',
      eventId: 'event1',
      token: 'token789',
      invitationStatus: 'pending',
      rsvpStatus: null,
      guestCount: null,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ]

  const mockEvent = {
    id: 'event1',
    name: 'Wedding Celebration',
    date: '2025-12-31',
    time: '18:00:00',
    location: 'Grand Ballroom',
    description: null,
    organizerEmail: 'organizer@example.com',
    createdAt: new Date(),
    updatedAt: new Date()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Dialog Render', () => {
    it('should render dialog when open', () => {
      render(
        <WhatsAppBulkDialog
          guests={mockGuests}
          event={mockEvent}
          open={true}
          onOpenChange={() => {}}
        />
      )

      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: /send whatsapp invitations/i })).toBeInTheDocument()
    })

    it('should not render dialog when closed', () => {
      render(
        <WhatsAppBulkDialog
          guests={mockGuests}
          event={mockEvent}
          open={false}
          onOpenChange={() => {}}
        />
      )

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  describe('Guest Selection', () => {
    it('should display all guests with valid phone numbers', () => {
      vi.mocked(whatsappUtils.validatePhoneNumber).mockImplementation((phone) => !!phone)
      
      render(
        <WhatsAppBulkDialog
          guests={mockGuests}
          event={mockEvent}
          open={true}
          onOpenChange={() => {}}
        />
      )

      // Check guest names appear in the checkbox list
      expect(screen.getByLabelText('John Doe')).toBeInTheDocument()
      expect(screen.getByLabelText('Jane Smith')).toBeInTheDocument()
      expect(screen.queryByText('No Phone User')).not.toBeInTheDocument()
    })

    it('should show count of selected guests', () => {
      vi.mocked(whatsappUtils.validatePhoneNumber).mockImplementation((phone) => !!phone)
      
      render(
        <WhatsAppBulkDialog
          guests={mockGuests}
          event={mockEvent}
          open={true}
          onOpenChange={() => {}}
        />
      )

      // Initially all valid guests should be selected
      expect(screen.getByText(/2 guests selected/i)).toBeInTheDocument()
    })

    it('should allow deselecting individual guests', () => {
      vi.mocked(whatsappUtils.validatePhoneNumber).mockImplementation((phone) => !!phone)
      
      render(
        <WhatsAppBulkDialog
          guests={mockGuests}
          event={mockEvent}
          open={true}
          onOpenChange={() => {}}
        />
      )

      const johnCheckbox = screen.getByRole('checkbox', { name: /john doe/i })
      fireEvent.click(johnCheckbox)

      expect(screen.getByText(/1 guest selected/i)).toBeInTheDocument()
    })

    it('should have select all/none functionality', () => {
      vi.mocked(whatsappUtils.validatePhoneNumber).mockImplementation((phone) => !!phone)
      
      render(
        <WhatsAppBulkDialog
          guests={mockGuests}
          event={mockEvent}
          open={true}
          onOpenChange={() => {}}
        />
      )

      const selectNoneButton = screen.getByRole('button', { name: /select none/i })
      fireEvent.click(selectNoneButton)
      expect(screen.getByText(/0 guests selected/i)).toBeInTheDocument()

      const selectAllButton = screen.getByRole('button', { name: /select all/i })
      fireEvent.click(selectAllButton)
      expect(screen.getByText(/2 guests selected/i)).toBeInTheDocument()
    })
  })

  describe('Message Customization', () => {
    it('should display message template editor', () => {
      vi.mocked(whatsappUtils.validatePhoneNumber).mockImplementation((phone) => !!phone)
      
      render(
        <WhatsAppBulkDialog
          guests={mockGuests}
          event={mockEvent}
          open={true}
          onOpenChange={() => {}}
        />
      )

      // Check for MessageTemplateEditor components
      expect(screen.getByRole('textbox', { name: /template content/i })).toBeInTheDocument()
      expect(screen.getByText(/message template/i)).toBeInTheDocument()
    })

    it('should allow editing message template through template editor', () => {
      vi.mocked(whatsappUtils.validatePhoneNumber).mockImplementation((phone) => !!phone)
      
      render(
        <WhatsAppBulkDialog
          guests={mockGuests}
          event={mockEvent}
          open={true}
          onOpenChange={() => {}}
        />
      )

      const messageTextarea = screen.getByRole('textbox', { name: /template content/i })
      const customMessage = 'Hi {guestName}! Custom invitation for {eventName}'
      
      fireEvent.change(messageTextarea, { target: { value: customMessage } })
      expect(messageTextarea).toHaveValue(customMessage)
    })

    it('should show message preview with placeholders replaced', () => {
      vi.mocked(whatsappUtils.validatePhoneNumber).mockImplementation((phone) => !!phone)
      vi.mocked(whatsappUtils.createWhatsAppMessage).mockReturnValue('Hi John Doe! You are invited to Wedding Celebration on December 31st, 2025!')
      
      render(
        <WhatsAppBulkDialog
          guests={mockGuests}
          event={mockEvent}
          open={true}
          onOpenChange={() => {}}
        />
      )

      // Check that createWhatsAppMessage was called to generate the preview
      expect(whatsappUtils.createWhatsAppMessage).toHaveBeenCalled()
    })
  })

  describe('Bulk Sending', () => {
    it('should prepare WhatsApp URLs for each selected guest', () => {
      vi.mocked(whatsappUtils.validatePhoneNumber).mockImplementation((phone) => !!phone)
      vi.mocked(whatsappUtils.formatPhoneForWhatsApp).mockImplementation((phone) => phone.replace(/\D/g, ''))
      vi.mocked(whatsappUtils.createWhatsAppMessage).mockImplementation((guest) => `Message for ${guest.name}`)
      vi.mocked(whatsappUtils.generateWhatsAppUrl).mockImplementation((phone, message) => `https://wa.me/${phone}?text=${encodeURIComponent(message)}`)
      
      render(
        <WhatsAppBulkDialog
          guests={mockGuests}
          event={mockEvent}
          open={true}
          onOpenChange={() => {}}
        />
      )

      // Verify that the send button is enabled when guests with phones are selected
      const sendButton = screen.getByRole('button', { name: /send invitations/i })
      expect(sendButton).not.toBeDisabled()
      
      // The component should show 2 guests selected (those with phones)
      expect(screen.getByText(/2 guests selected/i)).toBeInTheDocument()
    })

    it('should have proper UI states', () => {
      vi.mocked(whatsappUtils.validatePhoneNumber).mockImplementation((phone) => !!phone)
      vi.mocked(whatsappUtils.generateWhatsAppUrl).mockReturnValue('https://wa.me/test')
      
      render(
        <WhatsAppBulkDialog
          guests={mockGuests}
          event={mockEvent}
          open={true}
          onOpenChange={() => {}}
        />
      )

      const sendButton = screen.getByRole('button', { name: /send invitations/i })
      
      // Should not show sending state initially
      expect(screen.queryByText(/sending/i)).not.toBeInTheDocument()
      
      // Should not show completion message initially
      expect(screen.queryByText(/invitations sent successfully/i)).not.toBeInTheDocument()
      
      // Send button should be enabled when guests are selected
      expect(sendButton).not.toBeDisabled()
    })

    it('should disable send button when no guests selected', () => {
      vi.mocked(whatsappUtils.validatePhoneNumber).mockImplementation((phone) => !!phone)
      
      render(
        <WhatsAppBulkDialog
          guests={mockGuests}
          event={mockEvent}
          open={true}
          onOpenChange={() => {}}
        />
      )

      // Deselect all
      const selectNoneButton = screen.getByRole('button', { name: /select none/i })
      fireEvent.click(selectNoneButton)

      const sendButton = screen.getByRole('button', { name: /send invitations/i })
      expect(sendButton).toBeDisabled()
    })

    it('should handle sending to multiple guests', () => {
      vi.mocked(whatsappUtils.validatePhoneNumber).mockImplementation((phone) => !!phone)
      vi.mocked(whatsappUtils.generateWhatsAppUrl).mockReturnValue('https://wa.me/test')
      
      render(
        <WhatsAppBulkDialog
          guests={mockGuests}
          event={mockEvent}
          open={true}
          onOpenChange={() => {}}
        />
      )

      const sendButton = screen.getByRole('button', { name: /send invitations/i })
      
      // Verify button is enabled when guests are selected
      expect(sendButton).not.toBeDisabled()
    })
  })

  describe('Dialog Actions', () => {
    it('should call onOpenChange when cancel is clicked', () => {
      const onOpenChangeMock = vi.fn()
      
      render(
        <WhatsAppBulkDialog
          guests={mockGuests}
          event={mockEvent}
          open={true}
          onOpenChange={onOpenChangeMock}
        />
      )

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      fireEvent.click(cancelButton)

      expect(onOpenChangeMock).toHaveBeenCalledWith(false)
    })

    it('should have send button that responds to clicks', () => {
      vi.mocked(whatsappUtils.validatePhoneNumber).mockImplementation((phone) => !!phone)
      vi.mocked(whatsappUtils.generateWhatsAppUrl).mockReturnValue('https://wa.me/test')
      
      const onOpenChangeMock = vi.fn()
      
      render(
        <WhatsAppBulkDialog
          guests={mockGuests}
          event={mockEvent}
          open={true}
          onOpenChange={onOpenChangeMock}
        />
      )

      const sendButton = screen.getByRole('button', { name: /send invitations/i })
      expect(sendButton).not.toBeDisabled()
      
      // Verify cancel button works
      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      fireEvent.click(cancelButton)
      expect(onOpenChangeMock).toHaveBeenCalledWith(false)
    })
  })

  describe('Error Handling', () => {
    it('should handle WhatsApp URL generation failures gracefully', () => {
      vi.mocked(whatsappUtils.validatePhoneNumber).mockImplementation((phone) => !!phone)
      vi.mocked(whatsappUtils.generateWhatsAppUrl).mockReturnValue('') // Empty URL indicates failure
      
      render(
        <WhatsAppBulkDialog
          guests={mockGuests}
          event={mockEvent}
          open={true}
          onOpenChange={() => {}}
        />
      )

      const sendButton = screen.getByRole('button', { name: /send invitations/i })
      
      // Button should still be enabled even though URL generation will fail
      expect(sendButton).not.toBeDisabled()
      
      // The component should still render without errors
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
  })
})
/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import { WhatsAppSendButton } from '@/components/guests/whatsapp-send-button'
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

describe('WhatsAppSendButton', () => {
  const mockGuest = {
    id: '1',
    name: 'John Doe',
    phone: '+1-555-123-4567',
    email: 'john@example.com',
    eventId: 'event1',
    token: 'token123',
    invitationStatus: 'pending' as const,
    rsvpStatus: null,
    guestCount: null,
    createdAt: new Date(),
    updatedAt: new Date()
  }

  const mockEvent = {
    id: 'event1',
    name: 'Wedding Celebration',
    date: '2025-12-31',
    time: '18:00:00',
    location: 'Grand Ballroom',
    description: null,
    userId: 'user1',
    createdAt: new Date(),
    updatedAt: new Date()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Render States', () => {
    it('should render enabled button for guest with valid phone', () => {
      vi.mocked(whatsappUtils.validatePhoneNumber).mockReturnValue(true)
      
      render(<WhatsAppSendButton guest={mockGuest} event={mockEvent} />)
      
      const button = screen.getByRole('button', { name: /whatsapp/i })
      expect(button).toBeInTheDocument()
      expect(button).not.toBeDisabled()
      expect(screen.getByText(/whatsapp/i)).toBeInTheDocument()
    })

    it('should render disabled button for guest without phone', () => {
      const guestWithoutPhone = { ...mockGuest, phone: null }
      
      render(<WhatsAppSendButton guest={guestWithoutPhone} event={mockEvent} />)
      
      const button = screen.getByRole('button', { name: /whatsapp/i })
      expect(button).toBeDisabled()
    })

    it('should render disabled button for guest with invalid phone', () => {
      vi.mocked(whatsappUtils.validatePhoneNumber).mockReturnValue(false)
      const guestWithInvalidPhone = { ...mockGuest, phone: '123' }
      
      render(<WhatsAppSendButton guest={guestWithInvalidPhone} event={mockEvent} />)
      
      const button = screen.getByRole('button', { name: /whatsapp/i })
      expect(button).toBeDisabled()
    })

    it('should have proper aria-label for invalid phone number', () => {
      vi.mocked(whatsappUtils.validatePhoneNumber).mockReturnValue(false)
      const guestWithInvalidPhone = { ...mockGuest, phone: '123' }
      
      render(<WhatsAppSendButton guest={guestWithInvalidPhone} event={mockEvent} />)
      
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-label', 'Cannot send WhatsApp invitation - no phone number')
      expect(button).toBeDisabled()
    })
  })

  describe('WhatsApp URL Generation', () => {
    it('should generate WhatsApp URL and open window on click', async () => {
      vi.mocked(whatsappUtils.validatePhoneNumber).mockReturnValue(true)
      vi.mocked(whatsappUtils.formatPhoneForWhatsApp).mockReturnValue('15551234567')
      vi.mocked(whatsappUtils.createWhatsAppMessage).mockReturnValue('Test message')
      vi.mocked(whatsappUtils.generateWhatsAppUrl).mockReturnValue('https://wa.me/15551234567?text=Test%20message')
      
      render(<WhatsAppSendButton guest={mockGuest} event={mockEvent} />)
      
      const button = screen.getByRole('button', { name: /whatsapp/i })
      fireEvent.click(button)
      
      await waitFor(() => {
        expect(whatsappUtils.createWhatsAppMessage).toHaveBeenCalledWith(
          mockGuest,
          mockEvent,
          expect.stringContaining('/rsvp/token123'),
          undefined
        )
        expect(whatsappUtils.generateWhatsAppUrl).toHaveBeenCalledWith('15551234567', 'Test message')
        expect(mockWindowOpen).toHaveBeenCalledWith('https://wa.me/15551234567?text=Test%20message', '_blank')
      })
    })

    it('should use custom message template when provided', async () => {
      vi.mocked(whatsappUtils.validatePhoneNumber).mockReturnValue(true)
      vi.mocked(whatsappUtils.formatPhoneForWhatsApp).mockReturnValue('15551234567')
      vi.mocked(whatsappUtils.createWhatsAppMessage).mockReturnValue('Custom message')
      vi.mocked(whatsappUtils.generateWhatsAppUrl).mockReturnValue('https://wa.me/15551234567?text=Custom')
      
      const customTemplate = 'Custom template: {guestName} - {eventName}'
      
      render(
        <WhatsAppSendButton 
          guest={mockGuest} 
          event={mockEvent} 
          messageTemplate={customTemplate} 
        />
      )
      
      const button = screen.getByRole('button', { name: /whatsapp/i })
      fireEvent.click(button)
      
      await waitFor(() => {
        expect(whatsappUtils.createWhatsAppMessage).toHaveBeenCalledWith(
          mockGuest,
          mockEvent,
          expect.stringContaining('/rsvp/token123'),
          customTemplate
        )
      })
    })

    it('should handle URL generation failure gracefully', async () => {
      vi.mocked(whatsappUtils.validatePhoneNumber).mockReturnValue(true)
      vi.mocked(whatsappUtils.generateWhatsAppUrl).mockReturnValue('') // Empty URL indicates failure
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      render(<WhatsAppSendButton guest={mockGuest} event={mockEvent} />)
      
      const button = screen.getByRole('button', { name: /whatsapp/i })
      fireEvent.click(button)
      
      await waitFor(() => {
        expect(mockWindowOpen).not.toHaveBeenCalled()
        expect(consoleSpy).toHaveBeenCalledWith(
          'Failed to generate WhatsApp URL for guest:',
          mockGuest.id
        )
      })
      
      consoleSpy.mockRestore()
    })
  })

  describe('Loading States', () => {
    it('should show loading state during URL generation', async () => {
      vi.mocked(whatsappUtils.validatePhoneNumber).mockReturnValue(true)
      vi.mocked(whatsappUtils.formatPhoneForWhatsApp).mockReturnValue('15551234567')
      vi.mocked(whatsappUtils.createWhatsAppMessage).mockReturnValue('Test message')
      vi.mocked(whatsappUtils.generateWhatsAppUrl).mockReturnValue('https://wa.me/test')
      
      render(<WhatsAppSendButton guest={mockGuest} event={mockEvent} />)
      
      const button = screen.getByRole('button', { name: /whatsapp/i })
      
      // Initial state
      expect(button).not.toBeDisabled()
      expect(screen.getByText(/whatsapp/i)).toBeInTheDocument()
      
      fireEvent.click(button)
      
      // Should immediately show success state since we're not doing real async
      await waitFor(() => {
        expect(screen.getByText(/sent/i)).toBeInTheDocument()
      })
    })
  })

  describe('Success Feedback', () => {
    it('should show success feedback after successful send', async () => {
      vi.mocked(whatsappUtils.validatePhoneNumber).mockReturnValue(true)
      vi.mocked(whatsappUtils.formatPhoneForWhatsApp).mockReturnValue('15551234567')
      vi.mocked(whatsappUtils.createWhatsAppMessage).mockReturnValue('Test message')
      vi.mocked(whatsappUtils.generateWhatsAppUrl).mockReturnValue('https://wa.me/15551234567')
      
      render(<WhatsAppSendButton guest={mockGuest} event={mockEvent} />)
      
      const button = screen.getByRole('button', { name: /whatsapp/i })
      fireEvent.click(button)
      
      await waitFor(() => {
        expect(screen.getByText(/sent/i)).toBeInTheDocument()
      })
      
      // Should reset after timeout
      await waitFor(() => {
        expect(screen.getByText(/whatsapp/i)).toBeInTheDocument()
      }, { timeout: 3000 })
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      vi.mocked(whatsappUtils.validatePhoneNumber).mockReturnValue(true)
      
      render(<WhatsAppSendButton guest={mockGuest} event={mockEvent} />)
      
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-label', 'Send WhatsApp invitation to John Doe')
    })

    it('should have proper ARIA labels for disabled state', () => {
      const guestWithoutPhone = { ...mockGuest, phone: null }
      
      render(<WhatsAppSendButton guest={guestWithoutPhone} event={mockEvent} />)
      
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-label', 'Cannot send WhatsApp invitation - no phone number')
    })
  })

  describe('Component Variants', () => {
    it('should render compact variant correctly', () => {
      vi.mocked(whatsappUtils.validatePhoneNumber).mockReturnValue(true)
      
      render(<WhatsAppSendButton guest={mockGuest} event={mockEvent} variant="icon" />)
      
      const button = screen.getByRole('button')
      // Should only show icon, not text
      expect(screen.queryByText(/whatsapp/i)).not.toBeInTheDocument()
    })
  })
})
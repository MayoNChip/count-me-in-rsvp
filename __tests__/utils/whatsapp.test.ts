import { describe, it, expect } from 'vitest'
import { 
  formatPhoneForWhatsApp, 
  generateWhatsAppUrl, 
  createWhatsAppMessage,
  validatePhoneNumber 
} from '@/lib/utils/whatsapp'

describe('WhatsApp Utilities', () => {
  describe('formatPhoneForWhatsApp', () => {
    it('should format US phone number correctly', () => {
      expect(formatPhoneForWhatsApp('(555) 123-4567')).toBe('15551234567')
      expect(formatPhoneForWhatsApp('555-123-4567')).toBe('15551234567')
      expect(formatPhoneForWhatsApp('555.123.4567')).toBe('15551234567')
      expect(formatPhoneForWhatsApp('555 123 4567')).toBe('15551234567')
    })

    it('should handle international numbers', () => {
      expect(formatPhoneForWhatsApp('+44 20 7946 0958')).toBe('442079460958')
      expect(formatPhoneForWhatsApp('+972-54-123-4567')).toBe('972541234567')
      expect(formatPhoneForWhatsApp('+1-555-123-4567')).toBe('15551234567')
    })

    it('should handle numbers that already have country code', () => {
      expect(formatPhoneForWhatsApp('15551234567')).toBe('15551234567')
      expect(formatPhoneForWhatsApp('972541234567')).toBe('972541234567')
    })

    it('should add default country code for numbers without one', () => {
      expect(formatPhoneForWhatsApp('5551234567')).toBe('15551234567') // Default to US
    })

    it('should handle edge cases', () => {
      expect(formatPhoneForWhatsApp('')).toBe('')
      expect(formatPhoneForWhatsApp('   ')).toBe('')
      expect(formatPhoneForWhatsApp('abc123')).toBe('123')
    })
  })

  describe('validatePhoneNumber', () => {
    it('should validate correct phone numbers', () => {
      expect(validatePhoneNumber('15551234567')).toBe(true)
      expect(validatePhoneNumber('972541234567')).toBe(true)
      expect(validatePhoneNumber('+1-555-123-4567')).toBe(true)
    })

    it('should reject invalid phone numbers', () => {
      expect(validatePhoneNumber('')).toBe(false)
      expect(validatePhoneNumber('123')).toBe(false) // Too short
      expect(validatePhoneNumber('abc')).toBe(false) // Non-numeric
      expect(validatePhoneNumber('12345678901234567890')).toBe(false) // Too long
    })
  })

  describe('createWhatsAppMessage', () => {
    const mockGuest = {
      name: 'John Doe',
      phone: '+1-555-123-4567'
    }

    const mockEvent = {
      name: 'Wedding Celebration',
      date: '2025-12-31',
      time: '18:00:00',
      location: 'Grand Ballroom'
    }

    const mockRsvpUrl = 'https://countmein.com/rsvp/abc123'

    it('should create default message template', () => {
      const message = createWhatsAppMessage(mockGuest, mockEvent, mockRsvpUrl)
      
      expect(message).toContain('John Doe')
      expect(message).toContain('Wedding Celebration')
      expect(message).toContain('December 31st, 2025')
      expect(message).toContain('Grand Ballroom')
      expect(message).toContain(mockRsvpUrl)
    })

    it('should create custom message template', () => {
      const customTemplate = `Hi {guestName}! You're invited to {eventName} on {eventDate}. RSVP here: {rsvpUrl}`
      
      const message = createWhatsAppMessage(mockGuest, mockEvent, mockRsvpUrl, customTemplate)
      
      expect(message).toBe('Hi John Doe! You\'re invited to Wedding Celebration on December 31st, 2025. RSVP here: https://countmein.com/rsvp/abc123')
    })

    it('should handle missing event details gracefully', () => {
      const eventWithMissingData = {
        name: 'Test Event',
        date: '2025-12-31',
        time: null,
        location: null
      }

      const message = createWhatsAppMessage(mockGuest, eventWithMissingData, mockRsvpUrl)
      
      expect(message).toContain('Test Event')
      expect(message).toContain('John Doe')
      expect(message).toContain(mockRsvpUrl)
    })
  })

  describe('generateWhatsAppUrl', () => {
    it('should generate correct WhatsApp URL', () => {
      const phone = '15551234567'
      const message = 'Hello John! You are invited to our event.'
      
      const url = generateWhatsAppUrl(phone, message)
      
      expect(url).toBe('https://wa.me/15551234567?text=Hello%20John!%20You%20are%20invited%20to%20our%20event.')
    })

    it('should handle special characters in message', () => {
      const phone = '15551234567'
      const message = 'Hi! Event on 12/31 @ 6:00 PM. RSVP: https://example.com/rsvp?token=abc123'
      
      const url = generateWhatsAppUrl(phone, message)
      
      expect(url).toContain('wa.me/15551234567?text=')
      expect(url).toContain('Hi!')
      expect(url).toContain('https%3A%2F%2Fexample.com')
    })

    it('should handle empty message', () => {
      const phone = '15551234567'
      const message = ''
      
      const url = generateWhatsAppUrl(phone, message)
      
      expect(url).toBe('https://wa.me/15551234567')
    })

    it('should return empty string for invalid phone', () => {
      const phone = ''
      const message = 'Test message'
      
      const url = generateWhatsAppUrl(phone, message)
      
      expect(url).toBe('')
    })
  })
})
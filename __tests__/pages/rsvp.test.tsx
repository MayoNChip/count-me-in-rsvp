import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { db } from '@/lib/db'
import { events, guests } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { generateSecureToken } from '@/lib/utils/tokens'
import RsvpPage, { generateMetadata } from '@/app/rsvp/[token]/page'

// Mock the getRsvpPageData action
vi.mock('@/app/actions/rsvp', () => ({
  getRsvpPageData: vi.fn()
}))

describe('RSVP Page', () => {
  let testEvent: { id: string; name: string; date: string; time: string; location: string }
  let testGuest: { id: string; token: string; name: string; eventId: string }

  beforeEach(async () => {
    // Clean up any existing test data
    await db.delete(guests).where(eq(guests.name, 'RSVP Test Guest'))
    await db.delete(events).where(eq(events.name, 'RSVP Test Event'))

    // Create test event
    const [newEvent] = await db.insert(events).values({
      name: 'RSVP Test Event',
      date: '2025-12-31',
      time: '18:00:00',
      location: 'Test Venue',
      description: 'A test event for RSVP page',
      organizerEmail: 'test@example.com'
    }).returning()

    testEvent = newEvent

    // Create test guest with token
    const token = generateSecureToken(32)
    const [newGuest] = await db.insert(guests).values({
      eventId: testEvent.id,
      name: 'RSVP Test Guest',
      email: 'rsvp@example.com',
      token,
      maxGuests: 2,
      invitationStatus: 'sent',
      invitationSentAt: new Date(),
      invitationMethod: 'email'
    }).returning()

    testGuest = newGuest
  })

  afterEach(async () => {
    // Clean up test data
    if (testGuest) {
      await db.delete(guests).where(eq(guests.id, testGuest.id))
    }
    if (testEvent) {
      await db.delete(events).where(eq(events.id, testEvent.id))
    }
  })

  describe('Page Component', () => {
    it('should call getRsvpPageData with correct token', async () => {
      const { getRsvpPageData } = await import('@/app/actions/rsvp')
      
      // Mock successful data fetch
      vi.mocked(getRsvpPageData).mockResolvedValue({
        success: true,
        data: {
          guest: {
            id: testGuest.id,
            eventId: testEvent.id,
            name: testGuest.name,
            email: 'rsvp@example.com',
            phone: null,
            token: testGuest.token,
            maxGuests: 2,
            notes: null,
            invitationStatus: 'sent',
            invitationSentAt: new Date(),
            invitationMethod: 'email',
            createdAt: new Date(),
            updatedAt: new Date(),
            rsvp: null
          },
          event: {
            id: testEvent.id,
            name: testEvent.name,
            date: testEvent.date,
            time: testEvent.time,
            location: testEvent.location,
            description: 'A test event for RSVP page'
          },
          canUpdate: true
        }
      })

      const pageComponent = await RsvpPage({ 
        params: Promise.resolve({ token: testGuest.token })
      })

      // Verify the function was called with correct token
      expect(getRsvpPageData).toHaveBeenCalledWith(testGuest.token)
      expect(pageComponent).toBeDefined()
    })

    it('should handle invalid token gracefully', async () => {
      const { getRsvpPageData } = await import('@/app/actions/rsvp')
      
      // Mock failed data fetch
      vi.mocked(getRsvpPageData).mockResolvedValue({
        success: false,
        error: 'Invalid RSVP link'
      })

      const pageComponent = await RsvpPage({ 
        params: Promise.resolve({ token: 'invalid-token' })
      })

      expect(getRsvpPageData).toHaveBeenCalledWith('invalid-token')
      expect(pageComponent).toBeDefined()
    })

    it('should handle guest with existing response', async () => {
      const { getRsvpPageData } = await import('@/app/actions/rsvp')
      
      // Mock data fetch with existing RSVP
      vi.mocked(getRsvpPageData).mockResolvedValue({
        success: true,
        data: {
          guest: {
            id: testGuest.id,
            eventId: testEvent.id,
            name: testGuest.name,
            email: 'rsvp@example.com',
            phone: null,
            token: testGuest.token,
            maxGuests: 2,
            notes: null,
            invitationStatus: 'sent',
            invitationSentAt: new Date(),
            invitationMethod: 'email',
            createdAt: new Date(),
            updatedAt: new Date(),
            rsvp: {
              id: 'rsvp-123',
              status: 'yes',
              respondedAt: new Date(),
              numOfGuests: 2,
              guestNames: 'John Doe, Jane Doe',
              message: 'Excited to attend!'
            }
          },
          event: {
            id: testEvent.id,
            name: testEvent.name,
            date: testEvent.date,
            time: testEvent.time,
            location: testEvent.location,
            description: 'A test event for RSVP page'
          },
          canUpdate: true
        }
      })

      const pageComponent = await RsvpPage({ 
        params: Promise.resolve({ token: testGuest.token })
      })

      expect(getRsvpPageData).toHaveBeenCalledWith(testGuest.token)
      expect(pageComponent).toBeDefined()
    })

    it('should handle expired events', async () => {
      const { getRsvpPageData } = await import('@/app/actions/rsvp')
      
      // Mock data fetch with expired event
      vi.mocked(getRsvpPageData).mockResolvedValue({
        success: true,
        data: {
          guest: {
            id: testGuest.id,
            eventId: testEvent.id,
            name: testGuest.name,
            email: 'rsvp@example.com',
            phone: null,
            token: testGuest.token,
            maxGuests: 2,
            notes: null,
            invitationStatus: 'sent',
            invitationSentAt: new Date(),
            invitationMethod: 'email',
            createdAt: new Date(),
            updatedAt: new Date(),
            rsvp: null
          },
          event: {
            id: testEvent.id,
            name: testEvent.name,
            date: '2023-12-31', // Past date
            time: testEvent.time,
            location: testEvent.location,
            description: 'A test event for RSVP page'
          },
          canUpdate: false
        }
      })

      const pageComponent = await RsvpPage({ 
        params: Promise.resolve({ token: testGuest.token })
      })

      expect(getRsvpPageData).toHaveBeenCalledWith(testGuest.token)
      expect(pageComponent).toBeDefined()
    })

    it('should generate proper page metadata', async () => {
      const { getRsvpPageData } = await import('@/app/actions/rsvp')
      
      // Mock successful data fetch
      vi.mocked(getRsvpPageData).mockResolvedValue({
        success: true,
        data: {
          guest: {
            id: testGuest.id,
            eventId: testEvent.id,
            name: testGuest.name,
            email: 'rsvp@example.com',
            phone: null,
            token: testGuest.token,
            maxGuests: 2,
            notes: null,
            invitationStatus: 'sent',
            invitationSentAt: new Date(),
            invitationMethod: 'email',
            createdAt: new Date(),
            updatedAt: new Date(),
            rsvp: null
          },
          event: {
            id: testEvent.id,
            name: testEvent.name,
            date: testEvent.date,
            time: testEvent.time,
            location: testEvent.location,
            description: 'A test event for RSVP page'
          },
          canUpdate: true
        }
      })

      const metadata = await generateMetadata({ 
        params: Promise.resolve({ token: testGuest.token })
      })

      expect(metadata.title).toBe('RSVP - RSVP Test Event')
      expect(metadata.description).toContain('RSVP for RSVP Test Event')
      expect(metadata.robots).toBe('noindex, nofollow')
    })

    it('should generate error metadata for invalid token', async () => {
      const { getRsvpPageData } = await import('@/app/actions/rsvp')
      
      // Mock failed data fetch
      vi.mocked(getRsvpPageData).mockResolvedValue({
        success: false,
        error: 'Invalid RSVP link'
      })

      const metadata = await generateMetadata({ 
        params: Promise.resolve({ token: 'invalid-token' })
      })

      expect(metadata.title).toBe('RSVP Not Found')
      expect(metadata.description).toBe('This RSVP link is invalid or has expired.')
    })
  })
})
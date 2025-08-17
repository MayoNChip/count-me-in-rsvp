import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { db } from '@/lib/db'
import { events, guests } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getRsvpPageData } from '@/app/actions/rsvp'
import { generateSecureToken } from '@/lib/utils/tokens'

describe('RSVP Server Actions', () => {
  let testEvent: { id: string; name: string; date: string; time: string; location: string }
  let testGuest: { id: string; token: string; name: string; eventId: string }

  beforeEach(async () => {
    // Clean up any existing test data
    await db.delete(guests).where(eq(guests.name, 'Test Guest'))
    await db.delete(events).where(eq(events.name, 'Test Event'))

    // Create test event
    const [newEvent] = await db.insert(events).values({
      name: 'Test Event',
      date: '2025-12-31',
      time: '18:00:00',
      location: 'Test Venue',
      description: 'A test event for RSVP functionality',
      organizerEmail: 'test@example.com'
    }).returning()

    testEvent = newEvent

    // Create test guest with token
    const token = generateSecureToken(32)
    const [newGuest] = await db.insert(guests).values({
      eventId: testEvent.id,
      name: 'Test Guest',
      email: 'guest@example.com',
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

  describe('getRsvpPageData', () => {
    it('should return guest and event data for valid token', async () => {
      const result = await getRsvpPageData(testGuest.token)

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      
      if (result.data) {
        expect(result.data.guest.id).toBe(testGuest.id)
        expect(result.data.guest.name).toBe('Test Guest')
        expect(result.data.guest.token).toBe(testGuest.token)
        
        expect(result.data.event.id).toBe(testEvent.id)
        expect(result.data.event.name).toBe('Test Event')
        expect(result.data.event.date).toBe('2025-12-31')
        expect(result.data.event.time).toBe('18:00:00')
        expect(result.data.event.location).toBe('Test Venue')
        
        expect(result.data.canUpdate).toBe(true)
      }
    })

    it('should return error for invalid token', async () => {
      const invalidToken = 'invalid-token-123'
      const result = await getRsvpPageData(invalidToken)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid RSVP link')
      expect(result.data).toBeUndefined()
    })

    it('should return error for empty token', async () => {
      const result = await getRsvpPageData('')

      expect(result.success).toBe(false)
      expect(result.error).toBe('RSVP token is required')
      expect(result.data).toBeUndefined()
    })

    it('should return canUpdate: false for expired events', async () => {
      // Create an expired event (yesterday)
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      
      const [expiredEvent] = await db.insert(events).values({
        name: 'Expired Event',
        date: yesterday.toISOString().split('T')[0],
        time: '18:00:00',
        location: 'Past Venue',
        organizerEmail: 'test@example.com'
      }).returning()

      // Create guest for expired event
      const expiredToken = generateSecureToken(32)
      const [expiredGuest] = await db.insert(guests).values({
        eventId: expiredEvent.id,
        name: 'Expired Guest',
        email: 'expired@example.com',
        token: expiredToken,
        maxGuests: 1
      }).returning()

      const result = await getRsvpPageData(expiredToken)

      expect(result.success).toBe(true)
      expect(result.data?.canUpdate).toBe(false)

      // Clean up
      await db.delete(guests).where(eq(guests.id, expiredGuest.id))
      await db.delete(events).where(eq(events.id, expiredEvent.id))
    })

    it('should handle malformed tokens gracefully', async () => {
      const malformedTokens = [
        'too-short',
        'contains spaces',
        'special@chars!',
        null as any,
        undefined as any
      ]

      for (const token of malformedTokens) {
        const result = await getRsvpPageData(token)
        expect(result.success).toBe(false)
        expect(result.error).toBeDefined()
      }
    })

    it('should include existing RSVP response if present', async () => {
      // First get the guest data to create an RSVP response
      const guestResult = await getRsvpPageData(testGuest.token)
      expect(guestResult.success).toBe(true)

      // Create an RSVP response for the guest
      if (guestResult.data) {
        const { createRsvpResponse } = await import('@/app/actions/guests')
        await createRsvpResponse({
          guestId: guestResult.data.guest.id,
          status: 'yes',
          numOfGuests: 2,
          guestNames: 'John Doe, Jane Doe',
          message: 'Looking forward to it!'
        })

        // Get the data again and verify RSVP is included
        const resultWithRsvp = await getRsvpPageData(testGuest.token)
        expect(resultWithRsvp.success).toBe(true)
        expect(resultWithRsvp.data?.guest.rsvp).toBeDefined()
        expect(resultWithRsvp.data?.guest.rsvp?.status).toBe('yes')
        expect(resultWithRsvp.data?.guest.rsvp?.numOfGuests).toBe(2)
      }
    })

    it('should validate token format and length', async () => {
      const shortToken = 'abc123'
      const result = await getRsvpPageData(shortToken)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid RSVP link')
    })

    it('should handle database connection errors', async () => {
      // This test would normally use a mocked database that throws an error
      // For now, we'll test with a malformed token that would cause a database error
      const malformedToken = 'a'.repeat(1000) // Very long token
      const result = await getRsvpPageData(malformedToken)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })
})
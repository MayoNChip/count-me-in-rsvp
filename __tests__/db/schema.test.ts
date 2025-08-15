import { describe, it, expect } from 'vitest'
import { events, guests, rsvpResponses } from '@/lib/db/schema'

describe('Database Schema', () => {
  describe('Events Table', () => {
    it('should have required columns', () => {
      expect(events.id).toBeDefined()
      expect(events.name).toBeDefined()
      expect(events.date).toBeDefined()
      expect(events.organizerEmail).toBeDefined()
      expect(events.createdAt).toBeDefined()
      expect(events.updatedAt).toBeDefined()
    })

    it('should have proper column configurations', () => {
      expect(events.name.notNull).toBe(true)
      expect(events.date.notNull).toBe(true)
      expect(events.organizerEmail.notNull).toBe(true)
    })
  })

  describe('Guests Table', () => {
    it('should have required columns', () => {
      expect(guests.id).toBeDefined()
      expect(guests.eventId).toBeDefined()
      expect(guests.name).toBeDefined()
      expect(guests.token).toBeDefined()
      expect(guests.maxGuests).toBeDefined()
      expect(guests.createdAt).toBeDefined()
      expect(guests.updatedAt).toBeDefined()
    })

    it('should have proper column configurations', () => {
      expect(guests.name.notNull).toBe(true)
      expect(guests.eventId.notNull).toBe(true)
      expect(guests.token.notNull).toBe(true)
      expect(guests.maxGuests.notNull).toBe(true)
    })
  })

  describe('RSVP Responses Table', () => {
    it('should have required columns', () => {
      expect(rsvpResponses.id).toBeDefined()
      expect(rsvpResponses.guestId).toBeDefined()
      expect(rsvpResponses.status).toBeDefined()
      expect(rsvpResponses.numOfGuests).toBeDefined()
      expect(rsvpResponses.createdAt).toBeDefined()
      expect(rsvpResponses.updatedAt).toBeDefined()
    })

    it('should have proper column configurations', () => {
      expect(rsvpResponses.guestId.notNull).toBe(true)
      expect(rsvpResponses.status.notNull).toBe(true)
      expect(rsvpResponses.numOfGuests.notNull).toBe(true)
    })
  })

  describe('Type Inference', () => {
    it('should infer types correctly', () => {
      // These tests ensure TypeScript types are working
      const eventData: typeof events.$inferInsert = {
        name: 'Test Event',
        date: '2025-12-31',
        organizerEmail: 'test@example.com'
      }
      expect(eventData.name).toBe('Test Event')

      const guestData: typeof guests.$inferInsert = {
        eventId: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Guest',
        token: 'test-token',
        maxGuests: 2
      }
      expect(guestData.maxGuests).toBe(2)

      const rsvpData: typeof rsvpResponses.$inferInsert = {
        guestId: '123e4567-e89b-12d3-a456-426614174000',
        status: 'yes',
        numOfGuests: 1
      }
      expect(rsvpData.status).toBe('yes')
    })
  })
})
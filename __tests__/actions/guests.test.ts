import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@/lib/db'
import { events, guests, rsvpResponses } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { 
  createGuest, 
  updateGuest, 
  deleteGuest, 
  bulkImportGuests,
  createRsvpResponse,
  updateRsvpResponse
} from '@/app/actions/guests'

describe('Guest Server Actions', () => {
  let testEventId: string

  beforeEach(async () => {
    // Clean up database
    await db.delete(rsvpResponses)
    await db.delete(guests)
    await db.delete(events)

    // Create a test event
    const [testEvent] = await db.insert(events).values({
      name: 'Test Event',
      date: '2025-12-31',
      organizerEmail: 'test@example.com'
    }).returning()

    testEventId = testEvent.id
  })

  describe('createGuest', () => {
    it('should create a new guest with valid data', async () => {
      const guestData = {
        eventId: testEventId,
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        maxGuests: 2,
        notes: 'VIP guest'
      }

      const result = await createGuest(guestData)

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data?.name).toBe('John Doe')
      expect(result.data?.email).toBe('john@example.com')
      expect(result.data?.maxGuests).toBe(2)
      expect(result.data?.token).toBeDefined()
      expect(result.data?.token.length).toBeGreaterThan(0)
    })

    it('should create a guest with minimal required data', async () => {
      const guestData = {
        eventId: testEventId,
        name: 'Jane Doe'
      }

      const result = await createGuest(guestData)

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data?.name).toBe('Jane Doe')
      expect(result.data?.email).toBeNull()
      expect(result.data?.phone).toBeNull()
      expect(result.data?.maxGuests).toBe(1)
    })

    it('should validate required fields', async () => {
      const guestData = {
        eventId: testEventId,
        name: '', // Empty name should fail
        email: 'invalid-email' // Invalid email should fail
      }

      const result = await createGuest(guestData)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should validate event ID format', async () => {
      const guestData = {
        eventId: 'invalid-uuid',
        name: 'John Doe'
      }

      const result = await createGuest(guestData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Valid event ID is required')
    })
  })

  describe('updateGuest', () => {
    it('should update an existing guest', async () => {
      // Create a guest first
      const [guest] = await db.insert(guests).values({
        eventId: testEventId,
        name: 'Original Name',
        email: 'original@example.com',
        token: 'test-token-123',
        maxGuests: 1
      }).returning()

      const updateData = {
        id: guest.id,
        name: 'Updated Name',
        email: 'updated@example.com',
        maxGuests: 3
      }

      const result = await updateGuest(updateData)

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data?.name).toBe('Updated Name')
      expect(result.data?.email).toBe('updated@example.com')
      expect(result.data?.maxGuests).toBe(3)
    })

    it('should fail to update non-existent guest', async () => {
      const updateData = {
        id: '00000000-0000-0000-0000-000000000000',
        name: 'Updated Name'
      }

      const result = await updateGuest(updateData)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Guest not found')
    })

    it('should validate update data', async () => {
      const updateData = {
        id: 'invalid-uuid',
        name: 'Valid Name'
      }

      const result = await updateGuest(updateData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Valid guest ID is required')
    })
  })

  describe('deleteGuest', () => {
    it('should delete an existing guest', async () => {
      // Create a guest first
      const [guest] = await db.insert(guests).values({
        eventId: testEventId,
        name: 'To Be Deleted',
        token: 'test-token-delete',
        maxGuests: 1
      }).returning()

      const result = await deleteGuest({ id: guest.id })

      expect(result.success).toBe(true)

      // Verify guest is deleted
      const deletedGuest = await db.select().from(guests).where(eq(guests.id, guest.id))
      expect(deletedGuest.length).toBe(0)
    })

    it('should fail to delete non-existent guest', async () => {
      const result = await deleteGuest({ id: '00000000-0000-0000-0000-000000000000' })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Guest not found')
    })

    it('should validate delete parameters', async () => {
      const result = await deleteGuest({ id: 'invalid-uuid' })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Valid guest ID is required')
    })
  })

  describe('bulkImportGuests', () => {
    it('should import multiple guests', async () => {
      const importData = {
        eventId: testEventId,
        guests: [
          { name: 'Guest 1', email: 'guest1@example.com', maxGuests: 1 },
          { name: 'Guest 2', email: 'guest2@example.com', maxGuests: 2 },
          { name: 'Guest 3', phone: '+1234567890', maxGuests: 1 }
        ]
      }

      const result = await bulkImportGuests(importData)

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data?.imported).toBe(3)
      expect(result.data?.failed).toBe(0)

      // Verify guests were created
      const allGuests = await db.select().from(guests).where(eq(guests.eventId, testEventId))
      expect(allGuests.length).toBe(3)
    })

    it('should handle validation failures in bulk import', async () => {
      const importData = {
        eventId: testEventId,
        guests: [
          { name: 'Valid Guest', email: 'valid@example.com' },
          { name: '', email: 'invalid-name@example.com' }, // Invalid: empty name
          { name: 'Another Valid Guest', email: 'another@example.com' }
        ]
      }

      const result = await bulkImportGuests(importData)

      // Should fail validation at the schema level due to empty name
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should validate bulk import data', async () => {
      const importData = {
        eventId: 'invalid-uuid',
        guests: [{ name: 'Test Guest' }]
      }

      const result = await bulkImportGuests(importData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Valid event ID is required')
    })
  })

  describe('createRsvpResponse', () => {
    it('should create an RSVP response for a guest', async () => {
      // Create a guest first
      const [guest] = await db.insert(guests).values({
        eventId: testEventId,
        name: 'RSVP Guest',
        token: 'rsvp-token-123',
        maxGuests: 2
      }).returning()

      const rsvpData = {
        guestId: guest.id,
        status: 'yes' as const,
        numOfGuests: 2,
        guestNames: 'John Doe, Jane Doe',
        message: 'Looking forward to the event!'
      }

      const result = await createRsvpResponse(rsvpData)

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data?.status).toBe('yes')
      expect(result.data?.numOfGuests).toBe(2)
      expect(result.data?.guestNames).toBe('John Doe, Jane Doe')
      expect(result.data?.respondedAt).toBeDefined()
    })

    it('should fail to create duplicate RSVP response', async () => {
      // Create a guest first
      const [guest] = await db.insert(guests).values({
        eventId: testEventId,
        name: 'RSVP Guest',
        token: 'rsvp-token-duplicate',
        maxGuests: 1
      }).returning()

      // Create first RSVP
      await db.insert(rsvpResponses).values({
        guestId: guest.id,
        status: 'yes',
        numOfGuests: 1
      })

      // Try to create duplicate RSVP
      const rsvpData = {
        guestId: guest.id,
        status: 'no' as const,
        numOfGuests: 0
      }

      const result = await createRsvpResponse(rsvpData)

      expect(result.success).toBe(false)
      expect(result.error).toBe('RSVP response already exists for this guest')
    })

    it('should validate RSVP response data', async () => {
      const rsvpData = {
        guestId: 'invalid-uuid',
        status: 'invalid-status' as any,
        numOfGuests: -1 // Invalid number
      }

      const result = await createRsvpResponse(rsvpData)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('updateRsvpResponse', () => {
    it('should update an existing RSVP response', async () => {
      // Create a guest and RSVP first
      const [guest] = await db.insert(guests).values({
        eventId: testEventId,
        name: 'Update RSVP Guest',
        token: 'update-rsvp-token',
        maxGuests: 2
      }).returning()

      const [rsvp] = await db.insert(rsvpResponses).values({
        guestId: guest.id,
        status: 'maybe',
        numOfGuests: 1
      }).returning()

      const updateData = {
        id: rsvp.id,
        status: 'yes' as const,
        numOfGuests: 2,
        guestNames: 'Updated Guest Names'
      }

      const result = await updateRsvpResponse(updateData)

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data?.status).toBe('yes')
      expect(result.data?.numOfGuests).toBe(2)
      expect(result.data?.guestNames).toBe('Updated Guest Names')
    })

    it('should fail to update non-existent RSVP', async () => {
      const updateData = {
        id: '00000000-0000-0000-0000-000000000000',
        status: 'yes' as const
      }

      const result = await updateRsvpResponse(updateData)

      expect(result.success).toBe(false)
      expect(result.error).toBe('RSVP response not found')
    })
  })
})
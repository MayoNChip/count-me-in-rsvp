import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { db } from '@/lib/db'
import { events } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

// Import the Server Actions we'll create
import { createEvent, updateEvent, deleteEvent } from '@/app/actions/events'

describe('Event Server Actions', () => {
  // Test data
  const mockEventData = {
    name: 'Test Wedding',
    date: '2025-12-31',
    time: '18:00',
    location: 'Test Venue',
    description: 'A beautiful test wedding',
    organizerEmail: 'test@example.com'
  }

  let createdEventId: string

  afterEach(async () => {
    // Clean up any created events
    if (createdEventId) {
      await db.delete(events).where(eq(events.id, createdEventId))
      createdEventId = ''
    }
  })

  describe('createEvent', () => {
    it('should create a new event with valid data', async () => {
      const result = await createEvent(mockEventData)

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data?.name).toBe(mockEventData.name)
      expect(result.data?.organizerEmail).toBe(mockEventData.organizerEmail)
      expect(result.error).toBeUndefined()

      // Store ID for cleanup
      createdEventId = result.data!.id
    })

    it('should validate required fields', async () => {
      const invalidData = {
        // Missing required fields
        name: '',
        date: '',
        organizerEmail: ''
      }

      const result = await createEvent(invalidData as any)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.data).toBeUndefined()
    })

    it('should validate email format', async () => {
      const invalidEmailData = {
        ...mockEventData,
        organizerEmail: 'invalid-email'
      }

      const result = await createEvent(invalidEmailData)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.error).toContain('email')
    })

    it('should validate date format', async () => {
      const invalidDateData = {
        ...mockEventData,
        date: 'invalid-date'
      }

      const result = await createEvent(invalidDateData)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('updateEvent', () => {
    beforeEach(async () => {
      // Create an event to update
      const result = await createEvent(mockEventData)
      createdEventId = result.data!.id
    })

    it('should update an existing event', async () => {
      const updateData = {
        id: createdEventId,
        name: 'Updated Wedding Name',
        location: 'Updated Venue'
      }

      const result = await updateEvent(updateData)

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data?.name).toBe(updateData.name)
      expect(result.data?.location).toBe(updateData.location)
      expect(result.data?.date).toBe(mockEventData.date) // Unchanged
    })

    it('should fail to update non-existent event', async () => {
      const updateData = {
        id: '00000000-0000-0000-0000-000000000000',
        name: 'Updated Name'
      }

      const result = await updateEvent(updateData)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should validate update data', async () => {
      const invalidUpdateData = {
        id: createdEventId,
        organizerEmail: 'invalid-email'
      }

      const result = await updateEvent(invalidUpdateData)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('deleteEvent', () => {
    beforeEach(async () => {
      // Create an event to delete
      const result = await createEvent(mockEventData)
      createdEventId = result.data!.id
    })

    it('should delete an existing event', async () => {
      const result = await deleteEvent({ id: createdEventId })

      expect(result.success).toBe(true)
      expect(result.error).toBeUndefined()

      // Verify event was deleted
      const deletedEvent = await db.select().from(events).where(eq(events.id, createdEventId))
      expect(deletedEvent).toHaveLength(0)

      // Clear ID so cleanup doesn't fail
      createdEventId = ''
    })

    it('should fail to delete non-existent event', async () => {
      const result = await deleteEvent({ id: '00000000-0000-0000-0000-000000000000' })

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should validate delete parameters', async () => {
      const result = await deleteEvent({ id: '' })

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })
})
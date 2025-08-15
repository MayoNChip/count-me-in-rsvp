import { describe, it, expect } from 'vitest'
import { db } from '@/lib/db'
import { events, guests, rsvpResponses } from '@/lib/db/schema'
import { nanoid } from 'nanoid'
import { eq } from 'drizzle-orm'

describe('Database Connection', () => {
  it('should connect to the database', async () => {
    // Simple connectivity test
    const result = await db.execute('SELECT 1 as test')
    expect(result[0].test).toBe(1)
  })

  it('should create and retrieve an event', async () => {
    const eventData = {
      name: 'Test Wedding',
      date: '2025-12-31',
      organizerEmail: 'test@example.com',
      location: 'Test Venue',
      description: 'A test event'
    }

    const [insertedEvent] = await db.insert(events).values(eventData).returning()
    expect(insertedEvent.name).toBe(eventData.name)
    expect(insertedEvent.organizerEmail).toBe(eventData.organizerEmail)

    // Clean up
    await db.delete(events).where(eq(events.id, insertedEvent.id))
  })

  it('should create and retrieve a guest with RSVP', async () => {
    // First create an event
    const eventData = {
      name: 'Test Event',
      date: '2025-12-31',
      organizerEmail: 'test@example.com'
    }

    const [insertedEvent] = await db.insert(events).values(eventData).returning()

    // Create a guest
    const guestData = {
      eventId: insertedEvent.id,
      name: 'John Doe',
      email: 'john@example.com',
      token: nanoid(),
      maxGuests: 2
    }

    const [insertedGuest] = await db.insert(guests).values(guestData).returning()
    expect(insertedGuest.name).toBe(guestData.name)
    expect(insertedGuest.maxGuests).toBe(2)

    // Create an RSVP response
    const rsvpData = {
      guestId: insertedGuest.id,
      status: 'yes',
      numOfGuests: 2,
      guestNames: 'John Doe, Jane Doe'
    }

    const [insertedRsvp] = await db.insert(rsvpResponses).values(rsvpData).returning()
    expect(insertedRsvp.status).toBe('yes')
    expect(insertedRsvp.numOfGuests).toBe(2)

    // Clean up (cascading delete should handle guests and responses)
    await db.delete(events).where(eq(events.id, insertedEvent.id))
  })

  it('should respect foreign key constraints', async () => {
    // Try to create a guest without a valid event ID
    const invalidGuestData = {
      eventId: '00000000-0000-0000-0000-000000000000',
      name: 'Invalid Guest',
      token: nanoid(),
      maxGuests: 1
    }

    await expect(
      db.insert(guests).values(invalidGuestData)
    ).rejects.toThrow()
  })

  it('should enforce unique token constraint', async () => {
    // Create an event first
    const eventData = {
      name: 'Test Event',
      date: '2025-12-31',
      organizerEmail: 'test@example.com'
    }

    const [insertedEvent] = await db.insert(events).values(eventData).returning()

    const token = nanoid()
    
    // Create first guest with a token
    const guestData1 = {
      eventId: insertedEvent.id,
      name: 'Guest 1',
      token: token,
      maxGuests: 1
    }

    await db.insert(guests).values(guestData1)

    // Try to create second guest with the same token
    const guestData2 = {
      eventId: insertedEvent.id,
      name: 'Guest 2',
      token: token, // Same token - should fail
      maxGuests: 1
    }

    await expect(
      db.insert(guests).values(guestData2)
    ).rejects.toThrow()

    // Clean up
    await db.delete(events).where(eq(events.id, insertedEvent.id))
  })
})
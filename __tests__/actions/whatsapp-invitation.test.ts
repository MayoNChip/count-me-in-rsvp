import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { markWhatsAppInvitationSent, markBulkWhatsAppInvitationsSent } from '@/app/actions/whatsapp-invitation'
import { db } from '@/lib/db'
import { events, guests } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

describe('WhatsApp Invitation Actions', () => {
  let testEventId: string
  let testGuestId1: string
  let testGuestId2: string
  let testGuestId3: string

  beforeEach(async () => {
    // Create test event
    const [testEvent] = await db
      .insert(events)
      .values({
        name: 'Test Event',
        date: '2025-12-31',
        time: '18:00:00',
        location: 'Test Venue',
        organizerEmail: 'test@example.com'
      })
      .returning()
    
    testEventId = testEvent.id

    // Create test guests
    const insertedGuests = await db
      .insert(guests)
      .values([
        {
          eventId: testEventId,
          name: 'Guest One',
          email: 'guest1@example.com',
          phone: '+1-555-123-4567',
          token: 'token123',
          maxGuests: 2,
          invitationStatus: 'not_sent'
        },
        {
          eventId: testEventId,
          name: 'Guest Two',
          email: 'guest2@example.com',
          phone: '+1-555-987-6543',
          token: 'token456',
          maxGuests: 1,
          invitationStatus: 'not_sent'
        },
        {
          eventId: testEventId,
          name: 'Guest Three',
          email: 'guest3@example.com',
          phone: null,
          token: 'token789',
          maxGuests: 1,
          invitationStatus: 'not_sent'
        }
      ])
      .returning()
    
    testGuestId1 = insertedGuests[0].id
    testGuestId2 = insertedGuests[1].id
    testGuestId3 = insertedGuests[2].id
  })

  afterEach(async () => {
    // Clean up test data
    await db.delete(guests).where(eq(guests.eventId, testEventId))
    await db.delete(events).where(eq(events.id, testEventId))
  })

  describe('markWhatsAppInvitationSent', () => {
    it('should mark a single guest invitation as sent via WhatsApp', async () => {
      const result = await markWhatsAppInvitationSent(testGuestId1)

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data?.invitationStatus).toBe('sent')
      expect(result.data?.invitationMethod).toBe('whatsapp')
      expect(result.data?.invitationSentAt).toBeInstanceOf(Date)
    })

    it('should update existing invitation status to WhatsApp', async () => {
      // First mark as sent via email
      await db
        .update(guests)
        .set({ 
          invitationStatus: 'sent',
          invitationMethod: 'email',
          invitationSentAt: new Date()
        })
        .where(eq(guests.id, testGuestId1))

      // Then update to WhatsApp
      const result = await markWhatsAppInvitationSent(testGuestId1)

      expect(result.success).toBe(true)
      expect(result.data?.invitationMethod).toBe('whatsapp')
    })

    it('should handle invalid guest ID', async () => {
      const result = await markWhatsAppInvitationSent('invalid-id')

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should handle database errors gracefully', async () => {
      // Use a guest ID that doesn't exist
      const result = await markWhatsAppInvitationSent('00000000-0000-0000-0000-000000000000')

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('markBulkWhatsAppInvitationsSent', () => {
    it('should mark multiple guest invitations as sent via WhatsApp', async () => {
      const guestIds = [testGuestId1, testGuestId2]
      const result = await markBulkWhatsAppInvitationsSent(guestIds)

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data?.updatedCount).toBe(2)

      // Verify both guests were updated
      const updatedGuests = await db
        .select()
        .from(guests)
        .where(eq(guests.eventId, testEventId))

      const guest1 = updatedGuests.find(g => g.id === testGuestId1)
      const guest2 = updatedGuests.find(g => g.id === testGuestId2)

      expect(guest1?.invitationStatus).toBe('sent')
      expect(guest1?.invitationMethod).toBe('whatsapp')
      expect(guest2?.invitationStatus).toBe('sent')
      expect(guest2?.invitationMethod).toBe('whatsapp')
    })

    it('should handle empty guest ID array', async () => {
      const result = await markBulkWhatsAppInvitationsSent([])

      expect(result.success).toBe(true)
      expect(result.data?.updatedCount).toBe(0)
    })

    it('should handle mix of valid and invalid IDs', async () => {
      const guestIds = [testGuestId1, 'invalid-id', testGuestId2]
      const result = await markBulkWhatsAppInvitationsSent(guestIds)

      // Should still succeed but only update valid IDs
      expect(result.success).toBe(true)
      expect(result.data?.updatedCount).toBe(2)
    })

    it('should update invitation timestamp', async () => {
      const beforeUpdate = new Date()
      
      const result = await markBulkWhatsAppInvitationsSent([testGuestId1])

      expect(result.success).toBe(true)

      const [updatedGuest] = await db
        .select()
        .from(guests)
        .where(eq(guests.id, testGuestId1))

      expect(updatedGuest.invitationSentAt).toBeDefined()
      expect(updatedGuest.invitationSentAt!.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime())
    })

    it('should not update guests without phone numbers', async () => {
      // Guest 3 has no phone number
      const result = await markBulkWhatsAppInvitationsSent([testGuestId3])

      expect(result.success).toBe(true)
      expect(result.data?.updatedCount).toBe(0) // Should not update any guests
      
      const [guest3] = await db
        .select()
        .from(guests)
        .where(eq(guests.id, testGuestId3))

      // Should remain not_sent since no phone number
      expect(guest3.invitationStatus).toBe('not_sent')
    })
  })
})
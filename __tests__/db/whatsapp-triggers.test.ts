import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { db } from '@/lib/db'
import { whatsappInvitations, events, guests } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

describe('WhatsApp Database Triggers', () => {
  // Test data
  let testEventId: string
  let testGuestId: string

  beforeEach(async () => {
    // Create test event
    const eventResult = await db.insert(events).values({
      name: 'Test Event',
      date: '2025-09-15',
      organizerEmail: 'test@example.com'
    }).returning({ id: events.id })
    testEventId = eventResult[0].id

    // Create test guest
    const guestResult = await db.insert(guests).values({
      eventId: testEventId,
      name: 'Test Guest',
      email: 'guest@example.com',
      phone: '+15551234567',
      token: 'test-token-' + Date.now(),
      invitationStatus: 'not_sent',
      invitationMethod: 'email'
    }).returning({ id: guests.id })
    testGuestId = guestResult[0].id
  })

  afterEach(async () => {
    // Clean up test data
    await db.delete(whatsappInvitations).where(eq(whatsappInvitations.eventId, testEventId))
    await db.delete(guests).where(eq(guests.eventId, testEventId))
    await db.delete(events).where(eq(events.id, testEventId))
  })

  describe('Status Synchronization Trigger', () => {
    it('should sync guest invitation status when WhatsApp invitation is created', async () => {
      // Verify initial guest status
      const initialGuest = await db.select().from(guests).where(eq(guests.id, testGuestId))
      expect(initialGuest[0].invitationStatus).toBe('not_sent')
      expect(initialGuest[0].invitationMethod).toBe('email')
      expect(initialGuest[0].invitationSentAt).toBeNull()

      // Create WhatsApp invitation
      await db.insert(whatsappInvitations).values({
        guestId: testGuestId,
        eventId: testEventId,
        templateName: 'rsvp_invitation',
        twilioStatus: 'queued'
      })

      // Check that guest status was updated by trigger
      const updatedGuest = await db.select().from(guests).where(eq(guests.id, testGuestId))
      expect(updatedGuest[0].invitationStatus).toBe('queued')
      expect(updatedGuest[0].invitationMethod).toBe('whatsapp')
      expect(updatedGuest[0].invitationSentAt).toBeDefined()
    })

    it('should sync guest status when WhatsApp invitation status is updated', async () => {
      // Create initial WhatsApp invitation
      const invitation = await db.insert(whatsappInvitations).values({
        guestId: testGuestId,
        eventId: testEventId,
        templateName: 'rsvp_invitation',
        twilioStatus: 'queued'
      }).returning()

      // Verify initial sync
      let guest = await db.select().from(guests).where(eq(guests.id, testGuestId))
      expect(guest[0].invitationStatus).toBe('queued')

      // Update invitation status to 'sent'
      await db.update(whatsappInvitations)
        .set({ 
          twilioStatus: 'sent',
          sentAt: new Date()
        })
        .where(eq(whatsappInvitations.id, invitation[0].id))

      // Check that guest status was updated by trigger
      guest = await db.select().from(guests).where(eq(guests.id, testGuestId))
      expect(guest[0].invitationStatus).toBe('sent')

      // Update to 'delivered'
      await db.update(whatsappInvitations)
        .set({ 
          twilioStatus: 'delivered',
          deliveredAt: new Date()
        })
        .where(eq(whatsappInvitations.id, invitation[0].id))

      // Check final status
      guest = await db.select().from(guests).where(eq(guests.id, testGuestId))
      expect(guest[0].invitationStatus).toBe('delivered')
    })

    it('should use sentAt when available, otherwise queuedAt for invitation_sent_at', async () => {
      const queuedTime = new Date('2025-08-16T10:00:00Z')
      const sentTime = new Date('2025-08-16T10:05:00Z')

      // Create invitation with only queuedAt
      const invitation1 = await db.insert(whatsappInvitations).values({
        guestId: testGuestId,
        eventId: testEventId,
        templateName: 'rsvp_invitation',
        twilioStatus: 'queued',
        queuedAt: queuedTime
      }).returning()

      let guest = await db.select().from(guests).where(eq(guests.id, testGuestId))
      expect(guest[0].invitationSentAt?.getTime()).toBe(queuedTime.getTime())

      // Update with sentAt
      await db.update(whatsappInvitations)
        .set({ 
          twilioStatus: 'sent',
          sentAt: sentTime
        })
        .where(eq(whatsappInvitations.id, invitation1[0].id))

      guest = await db.select().from(guests).where(eq(guests.id, testGuestId))
      expect(guest[0].invitationSentAt?.getTime()).toBe(sentTime.getTime())
    })

    it('should handle failed invitation status', async () => {
      // Create failed invitation
      await db.insert(whatsappInvitations).values({
        guestId: testGuestId,
        eventId: testEventId,
        templateName: 'rsvp_invitation',
        twilioStatus: 'failed',
        twilioErrorCode: '21211',
        twilioErrorMessage: 'Invalid phone number',
        failedAt: new Date()
      })

      // Check that guest status reflects failure
      const guest = await db.select().from(guests).where(eq(guests.id, testGuestId))
      expect(guest[0].invitationStatus).toBe('failed')
      expect(guest[0].invitationMethod).toBe('whatsapp')
    })
  })

  describe('Updated At Trigger', () => {
    it('should update updated_at timestamp when WhatsApp invitation is modified', async () => {
      // Create invitation
      const invitation = await db.insert(whatsappInvitations).values({
        guestId: testGuestId,
        eventId: testEventId,
        templateName: 'rsvp_invitation',
        twilioStatus: 'queued'
      }).returning()

      const originalUpdatedAt = invitation[0].updatedAt

      // Wait a moment to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 100))

      // Update the invitation
      await db.update(whatsappInvitations)
        .set({ twilioStatus: 'sent' })
        .where(eq(whatsappInvitations.id, invitation[0].id))

      // Check that updated_at was changed
      const updatedInvitation = await db.select()
        .from(whatsappInvitations)
        .where(eq(whatsappInvitations.id, invitation[0].id))

      expect(updatedInvitation[0].updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime())
    })

    it('should set updated_at timestamp on INSERT operations', async () => {
      const invitation = await db.insert(whatsappInvitations).values({
        guestId: testGuestId,
        eventId: testEventId,
        templateName: 'rsvp_invitation',
        twilioStatus: 'queued'
      }).returning()

      // updated_at should be set to current time on insert
      expect(invitation[0].updatedAt).toBeDefined()
      expect(invitation[0].createdAt).toBeDefined()
      // Both timestamps should be very close (within 1 second)
      const timeDiff = Math.abs(invitation[0].updatedAt.getTime() - invitation[0].createdAt.getTime())
      expect(timeDiff).toBeLessThan(1000)
    })
  })

  describe('Trigger Edge Cases', () => {
    it('should handle null twilio_status gracefully', async () => {
      // Create invitation without twilio_status
      await db.insert(whatsappInvitations).values({
        guestId: testGuestId,
        eventId: testEventId,
        templateName: 'rsvp_invitation'
        // twilioStatus is null
      })

      // Guest status should default to 'queued' when twilio_status is null
      const guest = await db.select().from(guests).where(eq(guests.id, testGuestId))
      expect(guest[0].invitationStatus).toBe('queued') // Default fallback from trigger
      expect(guest[0].invitationMethod).toBe('whatsapp') // Should still be set
    })

    it('should handle multiple rapid status updates', async () => {
      const invitation = await db.insert(whatsappInvitations).values({
        guestId: testGuestId,
        eventId: testEventId,
        templateName: 'rsvp_invitation',
        twilioStatus: 'queued'
      }).returning()

      // Rapid updates
      await db.update(whatsappInvitations)
        .set({ twilioStatus: 'sent' })
        .where(eq(whatsappInvitations.id, invitation[0].id))

      await db.update(whatsappInvitations)
        .set({ twilioStatus: 'delivered' })
        .where(eq(whatsappInvitations.id, invitation[0].id))

      await db.update(whatsappInvitations)
        .set({ twilioStatus: 'read' })
        .where(eq(whatsappInvitations.id, invitation[0].id))

      // Final status should be 'read'
      const guest = await db.select().from(guests).where(eq(guests.id, testGuestId))
      expect(guest[0].invitationStatus).toBe('read')
    })
  })
})
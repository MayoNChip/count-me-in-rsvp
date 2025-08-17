import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { db } from '@/lib/db'
import { whatsappTemplates, whatsappInvitations, events, guests } from '@/lib/db/schema'
import { eq, sql } from 'drizzle-orm'

describe('WhatsApp Database Schema', () => {
  // Test data
  let testEventId: string
  let testGuestId: string
  let testTemplateId: string

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
      token: 'test-token-' + Date.now()
    }).returning({ id: guests.id })
    testGuestId = guestResult[0].id
  })

  afterEach(async () => {
    // Clean up test data
    await db.delete(whatsappInvitations).where(eq(whatsappInvitations.eventId, testEventId))
    await db.delete(whatsappTemplates).where(eq(whatsappTemplates.id, testTemplateId))
    await db.delete(guests).where(eq(guests.eventId, testEventId))
    await db.delete(events).where(eq(events.id, testEventId))
  })

  describe('WhatsApp Templates Table', () => {
    it('should create and retrieve WhatsApp templates', async () => {
      const templateData = {
        name: 'test_template',
        displayName: 'Test Template',
        content: 'Hello {{guest_name}}, you are invited to {{event_name}}!',
        variables: ['guest_name', 'event_name'],
        description: 'Test template for unit tests',
        isActive: true
      }

      const result = await db.insert(whatsappTemplates)
        .values(templateData)
        .returning()

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe(templateData.name)
      expect(result[0].displayName).toBe(templateData.displayName)
      expect(result[0].content).toBe(templateData.content)
      expect(result[0].variables).toEqual(templateData.variables)
      expect(result[0].isActive).toBe(true)
      expect(result[0].isApproved).toBe(false) // default value

      testTemplateId = result[0].id
    })

    it('should enforce unique template names', async () => {
      const templateData = {
        name: 'unique_template',
        displayName: 'Unique Template',
        content: 'Test content {{guest_name}}',
        variables: ['guest_name']
      }

      // First insert should succeed
      const firstResult = await db.insert(whatsappTemplates)
        .values(templateData)
        .returning({ id: whatsappTemplates.id })
      
      testTemplateId = firstResult[0].id

      // Second insert with same name should fail
      await expect(
        db.insert(whatsappTemplates).values(templateData)
      ).rejects.toThrow()
    })

    it('should store and retrieve JSONB variables correctly', async () => {
      const complexVariables = [
        'guest_name',
        'event_name', 
        'event_date',
        'event_location',
        'rsvp_link'
      ]

      const result = await db.insert(whatsappTemplates)
        .values({
          name: 'complex_template',
          displayName: 'Complex Template',
          content: 'Template with many variables',
          variables: complexVariables
        })
        .returning()

      testTemplateId = result[0].id

      expect(result[0].variables).toEqual(complexVariables)
      expect(Array.isArray(result[0].variables)).toBe(true)
    })
  })

  describe('WhatsApp Invitations Table', () => {
    beforeEach(async () => {
      // Create test template for invitations
      const templateResult = await db.insert(whatsappTemplates)
        .values({
          name: 'invitation_template',
          displayName: 'Invitation Template',
          content: 'You are invited!',
          variables: ['guest_name']
        })
        .returning({ id: whatsappTemplates.id })
      
      testTemplateId = templateResult[0].id
    })

    it('should create and retrieve WhatsApp invitations', async () => {
      const invitationData = {
        guestId: testGuestId,
        eventId: testEventId,
        templateName: 'invitation_template',
        twilioMessageSid: 'SM1234567890abcdef',
        twilioStatus: 'queued',
        messageContent: 'You are invited to Test Event!',
        templateVariables: { guest_name: 'Test Guest', event_name: 'Test Event' }
      }

      const result = await db.insert(whatsappInvitations)
        .values(invitationData)
        .returning()

      expect(result).toHaveLength(1)
      expect(result[0].guestId).toBe(testGuestId)
      expect(result[0].eventId).toBe(testEventId)
      expect(result[0].templateName).toBe(invitationData.templateName)
      expect(result[0].twilioMessageSid).toBe(invitationData.twilioMessageSid)
      expect(result[0].twilioStatus).toBe(invitationData.twilioStatus)
      expect(result[0].retryCount).toBe(0) // default value
      expect(result[0].maxRetries).toBe(3) // default value
      expect(result[0].queuedAt).toBeDefined()
    })

    it('should enforce unique Twilio message SIDs', async () => {
      const invitationData = {
        guestId: testGuestId,
        eventId: testEventId,
        templateName: 'invitation_template',
        twilioMessageSid: 'SM_DUPLICATE_TEST'
      }

      // First insert should succeed
      await db.insert(whatsappInvitations).values(invitationData)

      // Second insert with same SID should fail
      await expect(
        db.insert(whatsappInvitations).values(invitationData)
      ).rejects.toThrow()
    })

    it('should handle JSONB template variables correctly', async () => {
      const templateVars = {
        guest_name: 'John Doe',
        event_name: 'Wedding Reception',
        event_date: '2025-09-15',
        event_location: 'Grand Ballroom',
        custom_message: 'Looking forward to seeing you!'
      }

      const result = await db.insert(whatsappInvitations)
        .values({
          guestId: testGuestId,
          eventId: testEventId,
          templateName: 'invitation_template',
          templateVariables: templateVars
        })
        .returning()

      expect(result[0].templateVariables).toEqual(templateVars)
    })

    it('should maintain foreign key relationships', async () => {
      const invitation = await db.insert(whatsappInvitations)
        .values({
          guestId: testGuestId,
          eventId: testEventId,
          templateName: 'invitation_template'
        })
        .returning()

      // Query with joins to verify relationships
      const joinResult = await db
        .select({
          invitationId: whatsappInvitations.id,
          guestName: guests.name,
          eventName: events.name
        })
        .from(whatsappInvitations)
        .innerJoin(guests, eq(whatsappInvitations.guestId, guests.id))
        .innerJoin(events, eq(whatsappInvitations.eventId, events.id))
        .where(eq(whatsappInvitations.id, invitation[0].id))

      expect(joinResult).toHaveLength(1)
      expect(joinResult[0].guestName).toBe('Test Guest')
      expect(joinResult[0].eventName).toBe('Test Event')
    })

    it('should cascade delete when guest is deleted', async () => {
      // Create invitation
      const invitation = await db.insert(whatsappInvitations)
        .values({
          guestId: testGuestId,
          eventId: testEventId,
          templateName: 'invitation_template'
        })
        .returning()

      // Delete guest (should cascade to invitation)
      await db.delete(guests).where(eq(guests.id, testGuestId))

      // Invitation should be deleted
      const remainingInvitations = await db
        .select()
        .from(whatsappInvitations)
        .where(eq(whatsappInvitations.id, invitation[0].id))

      expect(remainingInvitations).toHaveLength(0)
    })
  })

  describe('Guest Table Enum Updates', () => {
    it('should support new invitation status values', async () => {
      const statusValues = ['not_sent', 'queued', 'sent', 'delivered', 'read', 'failed']
      
      for (const status of statusValues) {
        const guest = await db.insert(guests)
          .values({
            eventId: testEventId,
            name: `Guest ${status}`,
            token: `token-${status}-${Date.now()}`,
            invitationStatus: status as any
          })
          .returning()

        expect(guest[0].invitationStatus).toBe(status)

        // Clean up
        await db.delete(guests).where(eq(guests.id, guest[0].id))
      }
    })

    it('should support new invitation method values', async () => {
      const methodValues = ['email', 'whatsapp', 'manual']
      
      for (const method of methodValues) {
        const guest = await db.insert(guests)
          .values({
            eventId: testEventId,
            name: `Guest ${method}`,
            token: `token-${method}-${Date.now()}`,
            invitationMethod: method as any
          })
          .returning()

        expect(guest[0].invitationMethod).toBe(method)

        // Clean up
        await db.delete(guests).where(eq(guests.id, guest[0].id))
      }
    })
  })

  describe('Default WhatsApp Template', () => {
    it('should have default RSVP invitation template', async () => {
      const defaultTemplate = await db
        .select()
        .from(whatsappTemplates)
        .where(eq(whatsappTemplates.name, 'rsvp_invitation'))

      expect(defaultTemplate).toHaveLength(1)
      expect(defaultTemplate[0].displayName).toBe('RSVP Invitation')
      expect(defaultTemplate[0].isActive).toBe(true)
      expect(defaultTemplate[0].content).toContain('{{guest_name}}')
      expect(defaultTemplate[0].content).toContain('{{event_name}}')
      expect(defaultTemplate[0].content).toContain('{{rsvp_link}}')
      
      // Check variables array
      expect(Array.isArray(defaultTemplate[0].variables)).toBe(true)
      expect(defaultTemplate[0].variables).toContain('guest_name')
      expect(defaultTemplate[0].variables).toContain('event_name')
      expect(defaultTemplate[0].variables).toContain('rsvp_link')
    })
  })

  describe('Database Constraints and Validation', () => {
    it('should enforce NOT NULL constraints', async () => {
      // Template without required fields should fail
      await expect(
        db.insert(whatsappTemplates).values({
          displayName: 'Test', // missing name, content, variables
        } as any)
      ).rejects.toThrow()

      // Invitation without required fields should fail
      await expect(
        db.insert(whatsappInvitations).values({
          guestId: testGuestId, // missing eventId, templateName
        } as any)
      ).rejects.toThrow()
    })

    it('should set correct default values', async () => {
      const template = await db.insert(whatsappTemplates)
        .values({
          name: 'default_test',
          displayName: 'Default Test',
          content: 'Test content',
          variables: ['test']
        })
        .returning()

      testTemplateId = template[0].id

      expect(template[0].isApproved).toBe(false)
      expect(template[0].isActive).toBe(true)
      expect(template[0].createdAt).toBeDefined()
      expect(template[0].updatedAt).toBeDefined()

      const invitation = await db.insert(whatsappInvitations)
        .values({
          guestId: testGuestId,
          eventId: testEventId,
          templateName: 'default_test'
        })
        .returning()

      expect(invitation[0].retryCount).toBe(0)
      expect(invitation[0].maxRetries).toBe(3)
      expect(invitation[0].queuedAt).toBeDefined()
      expect(invitation[0].createdAt).toBeDefined()
      expect(invitation[0].updatedAt).toBeDefined()
    })
  })
})
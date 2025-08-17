import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest'
import { TwilioService } from '@/lib/services/twilio'
import { db } from '@/lib/db'
import { whatsappInvitations, whatsappTemplates, events, guests } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import twilio, { validateRequest } from 'twilio'

// Mock Twilio
vi.mock('twilio', () => ({
  default: vi.fn(() => ({
    messages: {
      create: vi.fn(),
      get: vi.fn(() => ({
        fetch: vi.fn()
      }))
    }
  })),
  validateRequest: vi.fn().mockReturnValue(true)
}))

describe('TwilioService', () => {
  let service: TwilioService
  let mockTwilioClient: any
  let testEventId: string
  let testGuestId: string
  let testTemplateId: string

  beforeEach(async () => {
    // Setup environment variables
    process.env.TWILIO_ACCOUNT_SID = 'ACtest123'
    process.env.TWILIO_AUTH_TOKEN = 'testtoken123'
    process.env.TWILIO_WHATSAPP_NUMBER = '+15558157377'
    process.env.TWILIO_STATUS_CALLBACK_URL = 'http://localhost:3000/api/whatsapp/webhook'
    process.env.TWILIO_WEBHOOK_SECRET = 'webhook_secret_123'

    // Create mock Twilio client
    mockTwilioClient = {
      messages: Object.assign(
        vi.fn((sid: string) => ({
          fetch: vi.fn().mockResolvedValue({
            sid,
            status: 'delivered',
            from: 'whatsapp:+15558157377',
            to: 'whatsapp:+15551234567'
          })
        })),
        {
          create: vi.fn().mockResolvedValue({
            sid: 'SM123456789',
            status: 'queued',
            from: 'whatsapp:+15558157377',
            to: 'whatsapp:+15551234567',
            body: 'Test message'
          })
        }
      )
    };
    
    (twilio as unknown as Mock).mockReturnValue(mockTwilioClient)

    // Create test data
    const eventResult = await db.insert(events).values({
      name: 'Test Event',
      date: '2025-09-15',
      organizerEmail: 'test@example.com'
    }).returning({ id: events.id })
    testEventId = eventResult[0].id

    const guestResult = await db.insert(guests).values({
      eventId: testEventId,
      name: 'Test Guest',
      email: 'guest@example.com',
      phone: '+15551234567',
      token: 'test-token-' + Date.now()
    }).returning({ id: guests.id })
    testGuestId = guestResult[0].id

    // Create test template
    const templateResult = await db.insert(whatsappTemplates).values({
      name: 'test_template',
      displayName: 'Test Template',
      content: 'Hello {{guest_name}}, you are invited to {{event_name}}!',
      variables: ['guest_name', 'event_name'],
      isActive: true
    }).returning({ id: whatsappTemplates.id })
    testTemplateId = templateResult[0].id

    // Create service instance
    service = new TwilioService()
  })

  afterEach(async () => {
    // Clean up test data
    await db.delete(whatsappInvitations).where(eq(whatsappInvitations.eventId, testEventId))
    await db.delete(whatsappTemplates).where(eq(whatsappTemplates.id, testTemplateId))
    await db.delete(guests).where(eq(guests.eventId, testEventId))
    await db.delete(events).where(eq(events.id, testEventId))
    
    // Clear mocks
    vi.clearAllMocks()
    
    // Clean up environment variables
    delete process.env.TWILIO_ACCOUNT_SID
    delete process.env.TWILIO_AUTH_TOKEN
    delete process.env.TWILIO_WHATSAPP_NUMBER
    delete process.env.TWILIO_STATUS_CALLBACK_URL
    delete process.env.TWILIO_WEBHOOK_SECRET
  })

  describe('Constructor', () => {
    it('should initialize with environment variables', () => {
      expect(() => new TwilioService()).not.toThrow()
    })

    it('should initialize with provided config', () => {
      const config = {
        accountSid: 'ACcustom123',
        authToken: 'customtoken',
        whatsappNumber: '+15559999999',
        statusCallbackUrl: 'http://example.com/webhook'
      }
      
      expect(() => new TwilioService(config)).not.toThrow()
    })

    it('should throw error if required config is missing', () => {
      delete process.env.TWILIO_ACCOUNT_SID
      expect(() => new TwilioService()).toThrow('Twilio configuration is missing required fields')
    })

    it('should format WhatsApp number correctly', () => {
      const service1 = new TwilioService({
        accountSid: 'AC123',
        authToken: 'token',
        whatsappNumber: '+15551234567'
      })
      
      const service2 = new TwilioService({
        accountSid: 'AC123',
        authToken: 'token',
        whatsappNumber: 'whatsapp:+15551234567'
      })
      
      // Both should work without throwing
      expect(service1).toBeDefined()
      expect(service2).toBeDefined()
    })
  })

  describe('sendWhatsAppMessage', () => {
    it('should send a message successfully', async () => {
      const result = await service.sendWhatsAppMessage({
        to: '+15551234567',
        templateName: 'test_template',
        variables: {
          guest_name: 'John Doe',
          event_name: 'Wedding Reception'
        },
        guestId: testGuestId,
        eventId: testEventId
      })

      expect(result).toBe('SM123456789')
      expect(mockTwilioClient.messages.create).toHaveBeenCalledWith({
        from: 'whatsapp:+15558157377',
        to: 'whatsapp:+15551234567',
        body: 'Hello John Doe, you are invited to Wedding Reception!',
        statusCallback: 'http://localhost:3000/api/whatsapp/webhook'
      })

      // Check that invitation was created
      const invitations = await db
        .select()
        .from(whatsappInvitations)
        .where(eq(whatsappInvitations.guestId, testGuestId))

      expect(invitations).toHaveLength(1)
      expect(invitations[0].twilioMessageSid).toBe('SM123456789')
      expect(invitations[0].twilioStatus).toBe('queued')
      expect(invitations[0].messageContent).toBe('Hello John Doe, you are invited to Wedding Reception!')
    })

    it('should handle phone number with whatsapp: prefix', async () => {
      await service.sendWhatsAppMessage({
        to: 'whatsapp:+15551234567',
        templateName: 'test_template',
        variables: {
          guest_name: 'Jane Doe',
          event_name: 'Birthday Party'
        },
        guestId: testGuestId,
        eventId: testEventId
      })

      expect(mockTwilioClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'whatsapp:+15551234567'
        })
      )
    })

    it('should throw error if template not found', async () => {
      await expect(
        service.sendWhatsAppMessage({
          to: '+15551234567',
          templateName: 'non_existent_template',
          variables: {},
          guestId: testGuestId,
          eventId: testEventId
        })
      ).rejects.toThrow("Template 'non_existent_template' not found")
    })

    it('should handle Twilio API errors', async () => {
      const twilioError = {
        code: 21211,
        message: 'Invalid phone number',
        moreInfo: 'https://www.twilio.com/docs/errors/21211'
      }
      
      mockTwilioClient.messages.create.mockRejectedValueOnce(twilioError)

      await expect(
        service.sendWhatsAppMessage({
          to: 'invalid',
          templateName: 'test_template',
          variables: {
            guest_name: 'Test',
            event_name: 'Event'
          },
          guestId: testGuestId,
          eventId: testEventId
        })
      ).rejects.toThrow('The phone number provided is invalid')

      // Check that failure was recorded
      const invitations = await db
        .select()
        .from(whatsappInvitations)
        .where(eq(whatsappInvitations.guestId, testGuestId))

      // There might be 2 invitations - one from the initial attempt and one from recording the failure
      // Let's check the failed one (should be the last one)
      const failedInvitation = invitations.find(inv => inv.twilioStatus === 'failed')
      expect(failedInvitation).toBeDefined()
      expect(failedInvitation?.twilioErrorCode).toBe('21211')
      expect(failedInvitation?.twilioErrorMessage).toBe('Invalid phone number')
    })

    it('should render template variables correctly', async () => {
      // Create a template with multiple variables
      // Delete any existing template with this name first
      await db.delete(whatsappTemplates).where(eq(whatsappTemplates.name, 'complex_template'))
      
      await db.insert(whatsappTemplates).values({
        name: 'complex_template',
        displayName: 'Complex Template',
        content: 'Dear {{guest_name}}, {{event_name}} on {{event_date}} at {{event_location}}. RSVP: {{rsvp_link}}',
        variables: ['guest_name', 'event_name', 'event_date', 'event_location', 'rsvp_link'],
        isActive: true
      })

      await service.sendWhatsAppMessage({
        to: '+15551234567',
        templateName: 'complex_template',
        variables: {
          guest_name: 'Alice',
          event_name: 'Annual Gala',
          event_date: 'December 31, 2025',
          event_location: 'Grand Ballroom',
          rsvp_link: 'https://example.com/rsvp/123'
        },
        guestId: testGuestId,
        eventId: testEventId
      })

      expect(mockTwilioClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          body: 'Dear Alice, Annual Gala on December 31, 2025 at Grand Ballroom. RSVP: https://example.com/rsvp/123'
        })
      )
    })
  })

  describe('sendBulkWhatsAppMessages', () => {
    it('should send multiple messages with rate limiting', async () => {
      // Create second guest for bulk test
      const guest2Result = await db.insert(guests).values({
        eventId: testEventId,
        name: 'Test Guest 2',
        email: 'guest2@example.com',
        phone: '+15552222222',
        token: 'test-token-2-' + Date.now()
      }).returning({ id: guests.id })
      const testGuestId2 = guest2Result[0].id

      const messages = [
        {
          to: '+15551111111',
          templateName: 'test_template',
          variables: { guest_name: 'Guest 1', event_name: 'Event' },
          guestId: testGuestId,
          eventId: testEventId
        },
        {
          to: '+15552222222',
          templateName: 'test_template',
          variables: { guest_name: 'Guest 2', event_name: 'Event' },
          guestId: testGuestId2,
          eventId: testEventId
        }
      ]

      // Mock delay to speed up test
      vi.spyOn(service as any, 'delay').mockResolvedValue(undefined)

      // Mock both messages to succeed
      mockTwilioClient.messages.create
        .mockResolvedValueOnce({ sid: 'SM111', status: 'queued' })
        .mockResolvedValueOnce({ sid: 'SM222', status: 'queued' })

      const result = await service.sendBulkWhatsAppMessages(messages)

      expect(result.successful).toHaveLength(2)
      expect(result.failed).toHaveLength(0)
      expect(mockTwilioClient.messages.create).toHaveBeenCalledTimes(2)
      
      // Verify rate limiting was applied
      expect((service as any).delay).toHaveBeenCalledWith(1000)
      
      // Clean up second guest
      await db.delete(guests).where(eq(guests.id, testGuestId2))
    })

    it('should handle partial failures in bulk send', async () => {
      const messages = [
        {
          to: '+15551111111',
          templateName: 'test_template',
          variables: { guest_name: 'Guest 1', event_name: 'Event' },
          guestId: testGuestId,
          eventId: testEventId
        },
        {
          to: '+15552222222',
          templateName: 'test_template',
          variables: { guest_name: 'Guest 2', event_name: 'Event' },
          guestId: 'invalid-guest-id',
          eventId: testEventId
        }
      ]

      // Mock first call success, second call failure
      mockTwilioClient.messages.create
        .mockResolvedValueOnce({ sid: 'SM111', status: 'queued' })
        .mockRejectedValueOnce({ code: 21211, message: 'Invalid number' })

      vi.spyOn(service as any, 'delay').mockResolvedValue(undefined)

      const result = await service.sendBulkWhatsAppMessages(messages)

      expect(result.successful).toHaveLength(1)
      expect(result.failed).toHaveLength(1)
      expect(result.failed).toHaveLength(1)
      expect(result.failed[0].guestId).toBe('invalid-guest-id')
      expect(result.failed[0].error).toContain('Failed query')
    })
  })

  describe('validateWebhookSignature', () => {
    it('should validate webhook signature correctly', () => {
      const result = service.validateWebhookSignature(
        'signature123',
        'http://localhost:3000/webhook',
        { MessageSid: 'SM123' }
      )

      expect(result).toBe(true)
      expect(validateRequest).toHaveBeenCalledWith(
        'webhook_secret_123',
        'signature123',
        'http://localhost:3000/webhook',
        { MessageSid: 'SM123' }
      )
    })

    it('should skip validation if webhook secret not configured', () => {
      delete process.env.TWILIO_WEBHOOK_SECRET
      const serviceNoSecret = new TwilioService()

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      const result = serviceNoSecret.validateWebhookSignature(
        'signature123',
        'http://localhost:3000/webhook',
        {}
      )

      expect(result).toBe(true)
      expect(consoleSpy).toHaveBeenCalledWith(
        'TWILIO_WEBHOOK_SECRET not configured, skipping signature validation'
      )

      consoleSpy.mockRestore()
    })
  })

  describe('processStatusUpdate', () => {
    let invitationId: string

    beforeEach(async () => {
      // Create a test invitation
      const result = await db.insert(whatsappInvitations).values({
        guestId: testGuestId,
        eventId: testEventId,
        templateName: 'test_template',
        twilioMessageSid: 'SM987654321',
        twilioStatus: 'queued',
        retryCount: 0,
        maxRetries: 3
      }).returning({ id: whatsappInvitations.id })
      invitationId = result[0].id
    })

    it('should update status to sent', async () => {
      await service.processStatusUpdate('SM987654321', 'sent')

      const invitation = await db
        .select()
        .from(whatsappInvitations)
        .where(eq(whatsappInvitations.id, invitationId))
        .then(r => r[0])

      expect(invitation.twilioStatus).toBe('sent')
      expect(invitation.sentAt).toBeDefined()
    })

    it('should update status to delivered', async () => {
      await service.processStatusUpdate('SM987654321', 'delivered')

      const invitation = await db
        .select()
        .from(whatsappInvitations)
        .where(eq(whatsappInvitations.id, invitationId))
        .then(r => r[0])

      expect(invitation.twilioStatus).toBe('delivered')
      expect(invitation.deliveredAt).toBeDefined()
    })

    it('should update status to read', async () => {
      await service.processStatusUpdate('SM987654321', 'read')

      const invitation = await db
        .select()
        .from(whatsappInvitations)
        .where(eq(whatsappInvitations.id, invitationId))
        .then(r => r[0])

      expect(invitation.twilioStatus).toBe('read')
      expect(invitation.readAt).toBeDefined()
    })

    it('should handle failed status with retry scheduling', async () => {
      await service.processStatusUpdate(
        'SM987654321',
        'failed',
        '63016',  // Use a retryable error code
        'WhatsApp message failed'
      )

      const invitation = await db
        .select()
        .from(whatsappInvitations)
        .where(eq(whatsappInvitations.id, invitationId))
        .then(r => r[0])

      expect(invitation.twilioStatus).toBe('failed')
      expect(invitation.failedAt).toBeDefined()
      expect(invitation.twilioErrorCode).toBe('63016')
      expect(invitation.twilioErrorMessage).toBe('WhatsApp message failed')
      expect(invitation.retryCount).toBe(1)
      expect(invitation.nextRetryAt).toBeDefined()
    })

    it('should not schedule retry if max retries exceeded', async () => {
      // Update invitation to max retries
      await db.update(whatsappInvitations)
        .set({ retryCount: 3 })
        .where(eq(whatsappInvitations.id, invitationId))

      await service.processStatusUpdate(
        'SM987654321',
        'failed',
        '21211',
        'Invalid phone number'
      )

      const invitation = await db
        .select()
        .from(whatsappInvitations)
        .where(eq(whatsappInvitations.id, invitationId))
        .then(r => r[0])

      expect(invitation.retryCount).toBe(3)
      expect(invitation.nextRetryAt).toBeNull()
    })

    it('should warn if invitation not found', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      await service.processStatusUpdate('SM_UNKNOWN', 'delivered')
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'No invitation found for message SID: SM_UNKNOWN'
      )

      consoleSpy.mockRestore()
    })
  })

  describe('getMessageStatus', () => {
    it('should fetch message status from Twilio', async () => {
      const result = await service.getMessageStatus('SM123456')

      expect(result).toEqual({
        sid: 'SM123456',
        status: 'delivered',
        from: 'whatsapp:+15558157377',
        to: 'whatsapp:+15551234567'
      })
      
      expect(mockTwilioClient.messages).toHaveBeenCalledWith('SM123456')
    })
  })

  describe('Error Handling', () => {
    it('should identify Twilio errors correctly', () => {
      const twilioError = { code: 21211, message: 'Invalid phone number' }
      const regularError = new Error('Regular error')

      expect((service as any).isTwilioError(twilioError)).toBe(true)
      expect((service as any).isTwilioError(regularError)).toBe(false)
    })

    it('should calculate retry delays with exponential backoff', () => {
      const getRetryDelay = (service as any).getRetryDelay.bind(service)

      expect(getRetryDelay(1)).toBe(60000) // 1 minute
      expect(getRetryDelay(2)).toBe(120000) // 2 minutes
      expect(getRetryDelay(3)).toBe(240000) // 4 minutes
      expect(getRetryDelay(4)).toBe(480000) // 8 minutes
      expect(getRetryDelay(10)).toBeLessThanOrEqual(3600000) // Max 1 hour
    })
  })
})
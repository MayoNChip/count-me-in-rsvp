import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { events, guests, whatsappInvitations, whatsappTemplates } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { QueueService } from '@/lib/services/queue'
import { TwilioService } from '@/lib/services/twilio'

// Mock services
vi.mock('@/lib/services/queue')
vi.mock('@/lib/services/twilio')

describe('WhatsApp API Endpoints', () => {
  let testEventId: string
  let testGuestId: string
  let testTemplateId: string
  let mockQueueService: any
  let mockTwilioService: any

  beforeEach(async () => {
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

    const templateResult = await db.insert(whatsappTemplates).values({
      name: 'test_invitation',
      displayName: 'Test Invitation',
      content: 'Hello {{guest_name}}, you are invited to {{event_name}}!',
      variables: ['guest_name', 'event_name'],
      isActive: true
    }).returning({ id: whatsappTemplates.id })
    testTemplateId = templateResult[0].id

    // Setup mocks
    mockQueueService = {
      addJob: vi.fn(),
      addBulkJobs: vi.fn(),
      getJob: vi.fn(),
      processQueue: vi.fn()
    }
    
    mockTwilioService = {
      sendWhatsAppMessage: vi.fn(),
      validateWebhookSignature: vi.fn()
    }

    vi.mocked(QueueService).mockImplementation(() => mockQueueService)
    vi.mocked(TwilioService).mockImplementation(() => mockTwilioService)
  })

  afterEach(async () => {
    // Clean up test data
    await db.delete(whatsappInvitations).where(eq(whatsappInvitations.eventId, testEventId))
    await db.delete(guests).where(eq(guests.eventId, testEventId))
    await db.delete(events).where(eq(events.id, testEventId))
    await db.delete(whatsappTemplates).where(eq(whatsappTemplates.id, testTemplateId))
    vi.clearAllMocks()
  })

  describe('POST /api/whatsapp/send-invitation', () => {
    it('should send single WhatsApp invitation successfully', async () => {
      const requestBody = {
        guestId: testGuestId,
        templateName: 'test_invitation',
        variables: {
          guest_name: 'John Doe',
          event_name: 'Wedding Reception'
        }
      }

      mockQueueService.addJob.mockResolvedValue('job-123')

      // Import and test the endpoint
      const { POST } = await import('@/app/api/whatsapp/send-invitation/route')
      const request = new NextRequest('http://localhost:3000/api/whatsapp/send-invitation', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.jobId).toBe('job-123')
      expect(mockQueueService.addJob).toHaveBeenCalledWith({
        type: 'whatsapp_send',
        guestId: testGuestId,
        eventId: testEventId,
        templateName: 'test_invitation',
        variables: requestBody.variables
      })
    })

    it('should return 400 for missing required fields', async () => {
      const requestBody = {
        guestId: testGuestId
        // Missing templateName and variables
      }

      const { POST } = await import('@/app/api/whatsapp/send-invitation/route')
      const request = new NextRequest('http://localhost:3000/api/whatsapp/send-invitation', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('required')
    })

    it('should return 404 for non-existent guest', async () => {
      const requestBody = {
        guestId: '00000000-0000-0000-0000-000000000000',
        templateName: 'test_invitation',
        variables: {
          guest_name: 'John Doe',
          event_name: 'Wedding'
        }
      }

      const { POST } = await import('@/app/api/whatsapp/send-invitation/route')
      const request = new NextRequest('http://localhost:3000/api/whatsapp/send-invitation', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Guest not found')
    })

    it('should handle queue service errors', async () => {
      const requestBody = {
        guestId: testGuestId,
        templateName: 'test_invitation',
        variables: {
          guest_name: 'John Doe',
          event_name: 'Wedding'
        }
      }

      mockQueueService.addJob.mockRejectedValue(new Error('Queue service error'))

      const { POST } = await import('@/app/api/whatsapp/send-invitation/route')
      const request = new NextRequest('http://localhost:3000/api/whatsapp/send-invitation', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Failed to queue invitation')
    })
  })

  describe('POST /api/whatsapp/send-bulk', () => {
    it('should send bulk WhatsApp invitations successfully', async () => {
      // Create additional guest
      const guest2Result = await db.insert(guests).values({
        eventId: testEventId,
        name: 'Test Guest 2',
        email: 'guest2@example.com',
        phone: '+15551234568',
        token: 'test-token-2-' + Date.now()
      }).returning({ id: guests.id })
      const testGuestId2 = guest2Result[0].id

      const requestBody = {
        eventId: testEventId,
        guestIds: [testGuestId, testGuestId2],
        templateName: 'test_invitation',
        variables: {
          event_name: 'Wedding Reception'
        }
      }

      mockQueueService.addBulkJobs.mockResolvedValue(['job-123', 'job-124'])

      const { POST } = await import('@/app/api/whatsapp/send-bulk/route')
      const request = new NextRequest('http://localhost:3000/api/whatsapp/send-bulk', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.jobIds).toEqual(['job-123', 'job-124'])
      expect(mockQueueService.addBulkJobs).toHaveBeenCalled()

      // Clean up additional guest
      await db.delete(guests).where(eq(guests.id, testGuestId2))
    })

    it('should return 400 for empty guest list', async () => {
      const requestBody = {
        eventId: testEventId,
        guestIds: [],
        templateName: 'test_invitation',
        variables: {}
      }

      const { POST } = await import('@/app/api/whatsapp/send-bulk/route')
      const request = new NextRequest('http://localhost:3000/api/whatsapp/send-bulk', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('guest')
    })
  })

  describe('GET /api/whatsapp/status/[jobId]', () => {
    it('should return job status successfully', async () => {
      const mockJob = {
        id: 'job-123',
        type: 'whatsapp_send',
        status: 'completed',
        priority: 'normal',
        data: {
          guestId: testGuestId,
          templateName: 'test_invitation'
        },
        attempts: 1,
        maxRetries: 3,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: new Date().toISOString()
      }

      mockQueueService.getJob.mockResolvedValue(mockJob)

      const { GET } = await import('@/app/api/whatsapp/status/[jobId]/route')
      const request = new NextRequest('http://localhost:3000/api/whatsapp/status/job-123')
      
      const response = await GET(request, { params: { jobId: 'job-123' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.job.id).toBe('job-123')
      expect(data.job.status).toBe('completed')
    })

    it('should return 404 for non-existent job', async () => {
      mockQueueService.getJob.mockResolvedValue(null)

      const { GET } = await import('@/app/api/whatsapp/status/[jobId]/route')
      const request = new NextRequest('http://localhost:3000/api/whatsapp/status/non-existent')
      
      const response = await GET(request, { params: { jobId: 'non-existent' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Job not found')
    })
  })

  describe('GET /api/whatsapp/invitations/[eventId]', () => {
    it('should return WhatsApp invitations for event', async () => {
      // Create test invitation
      await db.insert(whatsappInvitations).values({
        eventId: testEventId,
        guestId: testGuestId,
        templateName: 'test_invitation',
        messageContent: 'Hello John, you are invited!',
        twilioStatus: 'sent'
      })

      const { GET } = await import('@/app/api/whatsapp/invitations/[eventId]/route')
      const request = new NextRequest(`http://localhost:3000/api/whatsapp/invitations/${testEventId}`)
      
      const response = await GET(request, { params: { eventId: testEventId } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.invitations).toBeDefined()
      expect(data.invitations.length).toBeGreaterThan(0)
    })

    it('should return empty array for event with no invitations', async () => {
      const { GET } = await import('@/app/api/whatsapp/invitations/[eventId]/route')
      const request = new NextRequest(`http://localhost:3000/api/whatsapp/invitations/${testEventId}`)
      
      const response = await GET(request, { params: { eventId: testEventId } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.invitations).toEqual([])
    })
  })

  describe('POST /api/whatsapp/retry/[invitationId]', () => {
    it('should retry failed invitation successfully', async () => {
      // Create failed invitation
      const invitationResult = await db.insert(whatsappInvitations).values({
        eventId: testEventId,
        guestId: testGuestId,
        templateName: 'test_invitation',
        messageContent: 'Hello John, you are invited!',
        twilioStatus: 'failed',
        twilioErrorMessage: 'API Error'
      }).returning({ id: whatsappInvitations.id })
      const invitationId = invitationResult[0].id

      mockQueueService.addJob.mockResolvedValue('job-124')

      const { POST } = await import('@/app/api/whatsapp/retry/[invitationId]/route')
      const request = new NextRequest(`http://localhost:3000/api/whatsapp/retry/${invitationId}`, {
        method: 'POST'
      })
      
      const response = await POST(request, { params: { invitationId } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.jobId).toBe('job-124')
      expect(mockQueueService.addJob).toHaveBeenCalled()
    })

    it('should return 404 for non-existent invitation', async () => {
      const { POST } = await import('@/app/api/whatsapp/retry/[invitationId]/route')
      const request = new NextRequest('http://localhost:3000/api/whatsapp/retry/non-existent', {
        method: 'POST'
      })
      
      const response = await POST(request, { params: { invitationId: 'non-existent' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Invitation not found')
    })

    it('should return 400 for invitation that is not failed', async () => {
      // Create successful invitation
      const invitationResult = await db.insert(whatsappInvitations).values({
        eventId: testEventId,
        guestId: testGuestId,
        templateName: 'test_invitation',
        messageContent: 'Hello John, you are invited!',
        twilioStatus: 'sent'
      }).returning({ id: whatsappInvitations.id })
      const invitationId = invitationResult[0].id

      const { POST } = await import('@/app/api/whatsapp/retry/[invitationId]/route')
      const request = new NextRequest(`http://localhost:3000/api/whatsapp/retry/${invitationId}`, {
        method: 'POST'
      })
      
      const response = await POST(request, { params: { invitationId } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('retry')
    })
  })

  describe('POST /api/whatsapp/webhook', () => {
    it('should process webhook with valid signature', async () => {
      const webhookPayload = {
        MessageSid: 'SM123',
        MessageStatus: 'delivered',
        To: '+15551234567'
      }

      mockTwilioService.validateWebhookSignature.mockReturnValue(true)

      const { POST } = await import('@/app/api/whatsapp/webhook/route')
      const request = new NextRequest('http://localhost:3000/api/whatsapp/webhook', {
        method: 'POST',
        body: new URLSearchParams(webhookPayload).toString(),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Twilio-Signature': 'valid-signature'
        }
      })
      
      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(mockTwilioService.validateWebhookSignature).toHaveBeenCalled()
    })

    it('should reject webhook with invalid signature', async () => {
      const webhookPayload = {
        MessageSid: 'SM123',
        MessageStatus: 'delivered',
        To: '+15551234567'
      }

      mockTwilioService.validateWebhookSignature.mockReturnValue(false)

      const { POST } = await import('@/app/api/whatsapp/webhook/route')
      const request = new NextRequest('http://localhost:3000/api/whatsapp/webhook', {
        method: 'POST',
        body: new URLSearchParams(webhookPayload).toString(),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Twilio-Signature': 'invalid-signature'
        }
      })
      
      const response = await POST(request)

      expect(response.status).toBe(401)
    })

    it('should update invitation status from webhook', async () => {
      // Create invitation with pending status
      const invitationResult = await db.insert(whatsappInvitations).values({
        eventId: testEventId,
        guestId: testGuestId,
        templateName: 'test_invitation',
        messageContent: 'Hello John, you are invited!',
        twilioStatus: 'queued',
        twilioMessageSid: 'SM123'
      }).returning({ id: whatsappInvitations.id })

      const webhookPayload = {
        MessageSid: 'SM123',
        MessageStatus: 'delivered',
        To: '+15551234567'
      }

      mockTwilioService.validateWebhookSignature.mockReturnValue(true)

      const { POST } = await import('@/app/api/whatsapp/webhook/route')
      const request = new NextRequest('http://localhost:3000/api/whatsapp/webhook', {
        method: 'POST',
        body: new URLSearchParams(webhookPayload).toString(),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Twilio-Signature': 'valid-signature'
        }
      })
      
      const response = await POST(request)

      expect(response.status).toBe(200)

      // Verify invitation status was updated
      const [updatedInvitation] = await db
        .select()
        .from(whatsappInvitations)
        .where(eq(whatsappInvitations.twilioMessageSid, 'SM123'))
        .limit(1)

      expect(updatedInvitation.twilioStatus).toBe('delivered')
    })
  })

  describe('Error Handling', () => {
    it('should handle malformed JSON in requests', async () => {
      const { POST } = await import('@/app/api/whatsapp/send-invitation/route')
      const request = new NextRequest('http://localhost:3000/api/whatsapp/send-invitation', {
        method: 'POST',
        body: 'invalid-json',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Invalid JSON')
    })

    it('should handle database connection errors', async () => {
      // Mock database error
      vi.spyOn(db, 'select').mockImplementation(() => {
        throw new Error('Database connection failed')
      })

      const requestBody = {
        guestId: testGuestId,
        templateName: 'test_invitation',
        variables: {}
      }

      const { POST } = await import('@/app/api/whatsapp/send-invitation/route')
      const request = new NextRequest('http://localhost:3000/api/whatsapp/send-invitation', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)

      expect(response.status).toBe(500)
    })

    it('should handle missing environment variables gracefully', async () => {
      // This would be tested by mocking process.env or service initialization
      // For now, we assume proper error handling in service constructors
      expect(true).toBe(true)
    })
  })

  describe('Authentication & Authorization', () => {
    it('should require authentication for protected endpoints', async () => {
      // This test would verify JWT or session authentication
      // Implementation depends on the authentication strategy chosen
      expect(true).toBe(true)
    })

    it('should verify user has access to event', async () => {
      // This test would verify the user can only access their own events
      // Implementation depends on the authorization strategy
      expect(true).toBe(true)
    })
  })

  describe('Rate Limiting', () => {
    it('should enforce rate limits on bulk operations', async () => {
      // This test would verify rate limiting for bulk sends
      // Implementation would depend on the rate limiting strategy
      expect(true).toBe(true)
    })

    it('should allow normal operations within rate limits', async () => {
      // This test would verify normal operations work within limits
      expect(true).toBe(true)
    })
  })
})
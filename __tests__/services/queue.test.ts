import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest'
import { QueueService, QueueJob, JobStatus, JobPriority } from '@/lib/services/queue'
import { db } from '@/lib/db'
import { whatsappInvitations, events, guests } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { kv } from '@vercel/kv'

// Mock @vercel/kv
vi.mock('@vercel/kv', () => ({
  kv: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    lpush: vi.fn(),
    rpop: vi.fn(),
    llen: vi.fn(),
    exists: vi.fn(),
    expire: vi.fn(),
    incr: vi.fn(),
    decr: vi.fn()
  }
}))

describe('QueueService', () => {
  let service: QueueService
  let testEventId: string
  let testGuestId: string

  beforeEach(async () => {
    // Clear all mocks
    vi.clearAllMocks()
    
    // Setup mock responses
    vi.mocked(kv.get).mockResolvedValue(null)
    vi.mocked(kv.set).mockResolvedValue('OK')
    vi.mocked(kv.del).mockResolvedValue(1)
    vi.mocked(kv.lpush).mockResolvedValue(1)
    vi.mocked(kv.rpop).mockResolvedValue(null)
    vi.mocked(kv.llen).mockResolvedValue(0)
    vi.mocked(kv.exists).mockResolvedValue(0)
    vi.mocked(kv.expire).mockResolvedValue(1)
    vi.mocked(kv.incr).mockResolvedValue(1)
    vi.mocked(kv.decr).mockResolvedValue(0)

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

    service = new QueueService()
  })

  afterEach(async () => {
    // Clean up test data
    await db.delete(whatsappInvitations).where(eq(whatsappInvitations.eventId, testEventId))
    await db.delete(guests).where(eq(guests.eventId, testEventId))
    await db.delete(events).where(eq(events.id, testEventId))
  })

  describe('Constructor', () => {
    it('should initialize queue service', () => {
      expect(service).toBeDefined()
      expect(service).toBeInstanceOf(QueueService)
    })

    it('should initialize with default configuration', () => {
      const config = (service as any).config
      expect(config.maxRetries).toBe(3)
      expect(config.retryDelay).toBe(60000) // 1 minute
      expect(config.rateLimitWindow).toBe(1000) // 1 second
      expect(config.rateLimitMax).toBe(1)
    })

    it('should initialize with custom configuration', () => {
      const customService = new QueueService({
        maxRetries: 5,
        retryDelay: 30000,
        rateLimitWindow: 500,
        rateLimitMax: 2
      })
      
      const config = (customService as any).config
      expect(config.maxRetries).toBe(5)
      expect(config.retryDelay).toBe(30000)
      expect(config.rateLimitWindow).toBe(500)
      expect(config.rateLimitMax).toBe(2)
    })
  })

  describe('addJob', () => {
    it('should add a WhatsApp job to the queue', async () => {
      const jobData = {
        type: 'whatsapp_send' as const,
        guestId: testGuestId,
        eventId: testEventId,
        templateName: 'wedding_invitation',
        variables: {
          guest_name: 'John Doe',
          event_name: 'Wedding Reception'
        }
      }

      vi.mocked(kv.lpush).mockResolvedValueOnce(1)
      vi.mocked(kv.set).mockResolvedValueOnce('OK')

      const jobId = await service.addJob(jobData)

      expect(jobId).toBeDefined()
      expect(typeof jobId).toBe('string')
      expect(kv.lpush).toHaveBeenCalledWith(
        'queue:whatsapp_send',
        expect.any(String)
      )
      expect(kv.set).toHaveBeenCalledWith(
        `job:${jobId}`,
        expect.stringContaining('"status":"pending"'),
        { ex: 86400 } // 24 hours
      )
    })

    it('should add job with high priority to front of queue', async () => {
      const jobData = {
        type: 'whatsapp_send' as const,
        guestId: testGuestId,
        eventId: testEventId,
        templateName: 'urgent_reminder',
        variables: { guest_name: 'Jane' }
      }

      const jobId = await service.addJob(jobData, JobPriority.HIGH)

      expect(kv.lpush).toHaveBeenCalledWith(
        'queue:whatsapp_send:high',
        expect.any(String)
      )
    })

    it('should add job with low priority to back of queue', async () => {
      const jobData = {
        type: 'whatsapp_send' as const,
        guestId: testGuestId,
        eventId: testEventId,
        templateName: 'follow_up',
        variables: { guest_name: 'Bob' }
      }

      const jobId = await service.addJob(jobData, JobPriority.LOW)

      expect(kv.lpush).toHaveBeenCalledWith(
        'queue:whatsapp_send:low',
        expect.any(String)
      )
    })

    it('should handle bulk job addition', async () => {
      const jobs = [
        {
          type: 'whatsapp_send' as const,
          guestId: testGuestId,
          eventId: testEventId,
          templateName: 'invitation',
          variables: { guest_name: 'Guest 1' }
        },
        {
          type: 'whatsapp_send' as const,
          guestId: testGuestId,
          eventId: testEventId,
          templateName: 'invitation',
          variables: { guest_name: 'Guest 2' }
        }
      ]

      const jobIds = await service.addBulkJobs(jobs)

      expect(jobIds).toHaveLength(2)
      expect(kv.lpush).toHaveBeenCalledTimes(2)
      expect(kv.set).toHaveBeenCalledTimes(2)
    })
  })

  describe('getJob', () => {
    it('should retrieve job by ID', async () => {
      const jobData = {
        id: 'test-job-123',
        type: 'whatsapp_send',
        status: 'pending',
        priority: 'normal',
        data: {
          guestId: testGuestId,
          templateName: 'test'
        },
        attempts: 0,
        maxRetries: 3,
        createdAt: new Date().toISOString()
      }

      vi.mocked(kv.get).mockResolvedValueOnce(JSON.stringify(jobData))

      const job = await service.getJob('test-job-123')

      expect(job).toBeDefined()
      expect(job!.id).toBe('test-job-123')
      expect(job!.status).toBe('pending')
      expect(kv.get).toHaveBeenCalledWith('job:test-job-123')
    })

    it('should return null for non-existent job', async () => {
      vi.mocked(kv.get).mockResolvedValueOnce(null)

      const job = await service.getJob('non-existent')

      expect(job).toBeNull()
    })

    it('should handle malformed job data', async () => {
      vi.mocked(kv.get).mockResolvedValueOnce('invalid-json')

      const job = await service.getJob('malformed-job')

      expect(job).toBeNull()
    })
  })

  describe('processQueue', () => {
    it('should process jobs from high priority queue first', async () => {
      const highPriorityJob = {
        id: 'high-job',
        type: 'whatsapp_send',
        data: { guestId: testGuestId, templateName: 'urgent' }
      }

      const normalPriorityJob = {
        id: 'normal-job',
        type: 'whatsapp_send',
        data: { guestId: testGuestId, templateName: 'normal' }
      }

      // Mock queue responses
      vi.mocked(kv.rpop)
        .mockResolvedValueOnce(JSON.stringify(highPriorityJob)) // High priority queue has job
        .mockResolvedValueOnce(null) // High priority queue empty on second call
        .mockResolvedValueOnce(JSON.stringify(normalPriorityJob)) // Normal queue has job

      // Mock job retrieval
      vi.mocked(kv.get)
        .mockResolvedValueOnce(JSON.stringify({
          ...highPriorityJob,
          status: 'pending',
          attempts: 0,
          maxRetries: 3
        }))
        .mockResolvedValueOnce(JSON.stringify({
          ...normalPriorityJob,
          status: 'pending',
          attempts: 0,
          maxRetries: 3
        }))

      const processor = vi.fn().mockResolvedValue({ success: true })
      const processedJobs = []

      // Process 2 jobs
      for (let i = 0; i < 2; i++) {
        const job = await service.processQueue(processor)
        if (job) processedJobs.push(job)
      }

      expect(processedJobs).toHaveLength(2)
      expect(processedJobs[0].id).toBe('high-job') // High priority processed first
      expect(processedJobs[1].id).toBe('normal-job')
    })

    it('should update job status during processing', async () => {
      const job = {
        id: 'test-job',
        type: 'whatsapp_send',
        data: { guestId: testGuestId, templateName: 'test' }
      }

      vi.mocked(kv.rpop).mockResolvedValueOnce(JSON.stringify(job))
      vi.mocked(kv.get).mockResolvedValueOnce(JSON.stringify({
        ...job,
        status: 'pending',
        attempts: 0,
        maxRetries: 3
      }))

      const processor = vi.fn().mockResolvedValue({ success: true })

      await service.processQueue(processor)

      expect(kv.set).toHaveBeenCalledWith(
        'job:test-job',
        expect.stringContaining('"status":"processing"'),
        { ex: 86400 }
      )
      expect(kv.set).toHaveBeenCalledWith(
        'job:test-job',
        expect.stringContaining('"status":"completed"'),
        { ex: 86400 }
      )
    })

    it('should handle job processing failures', async () => {
      const job = {
        id: 'failing-job',
        type: 'whatsapp_send',
        data: { guestId: testGuestId, templateName: 'test' }
      }

      vi.mocked(kv.rpop).mockResolvedValueOnce(JSON.stringify(job))
      vi.mocked(kv.get).mockResolvedValueOnce(JSON.stringify({
        ...job,
        status: 'pending',
        attempts: 0,
        maxRetries: 3
      }))

      const processor = vi.fn().mockResolvedValue({ 
        success: false, 
        error: 'API Error',
        retry: true
      })

      await service.processQueue(processor)

      // Job should be marked as retrying since retry=true and attempts < maxRetries
      expect(kv.set).toHaveBeenCalledWith(
        'job:failing-job',
        expect.stringContaining('"status":"retrying"'),
        { ex: 86400 }
      )
      expect(kv.set).toHaveBeenCalledWith(
        'job:failing-job',
        expect.stringContaining('"attempts":1'),
        { ex: 86400 }
      )
    })

    it('should retry failed jobs when retry limit not exceeded', async () => {
      const job = {
        id: 'retry-job',
        type: 'whatsapp_send',
        data: { guestId: testGuestId, templateName: 'test' }
      }

      vi.mocked(kv.rpop).mockResolvedValueOnce(JSON.stringify(job))
      vi.mocked(kv.get).mockResolvedValueOnce(JSON.stringify({
        ...job,
        status: 'pending',
        attempts: 1, // Already attempted once
        maxRetries: 3
      }))

      const processor = vi.fn().mockResolvedValue({ 
        success: false, 
        error: 'Temporary error',
        retry: true
      })

      await service.processQueue(processor)

      // Should schedule retry
      expect(kv.set).toHaveBeenCalledWith(
        expect.stringMatching(/^retry:/),
        expect.stringContaining('retry-job'),
        { ex: expect.any(Number) }
      )
    })

    it('should not retry when max attempts exceeded', async () => {
      const job = {
        id: 'max-retry-job',
        type: 'whatsapp_send',
        data: { guestId: testGuestId, templateName: 'test' }
      }

      vi.mocked(kv.rpop).mockResolvedValueOnce(JSON.stringify(job))
      vi.mocked(kv.get).mockResolvedValueOnce(JSON.stringify({
        ...job,
        status: 'pending',
        attempts: 3, // Max attempts reached
        maxRetries: 3
      }))

      const processor = vi.fn().mockResolvedValue({ 
        success: false, 
        error: 'Permanent failure',
        retry: false
      })

      await service.processQueue(processor)

      expect(kv.set).toHaveBeenCalledWith(
        'job:max-retry-job',
        expect.stringContaining('"status":"failed"'),
        { ex: 86400 }
      )
      // Should not schedule retry
      expect(kv.set).not.toHaveBeenCalledWith(
        expect.stringMatching(/^retry:/),
        expect.any(String),
        expect.any(Object)
      )
    })
  })

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      // Mock rate limit counter
      vi.mocked(kv.incr)
        .mockResolvedValueOnce(1) // First call within limit
        .mockResolvedValueOnce(2) // Second call exceeds limit

      const isAllowed1 = await service.checkRateLimit('whatsapp_send')
      const isAllowed2 = await service.checkRateLimit('whatsapp_send')

      expect(isAllowed1).toBe(true)
      expect(isAllowed2).toBe(false)
    })

    it('should reset rate limit counter after window expires', async () => {
      vi.mocked(kv.incr).mockResolvedValueOnce(1)
      vi.mocked(kv.expire).mockResolvedValueOnce(1)

      const isAllowed = await service.checkRateLimit('whatsapp_send')

      expect(isAllowed).toBe(true)
      expect(kv.expire).toHaveBeenCalledWith(
        expect.stringMatching(/^rate_limit:/),
        1 // 1 second window
      )
    })

    it('should handle different rate limits for different job types', async () => {
      const customService = new QueueService({
        rateLimits: {
          whatsapp_send: { window: 1000, max: 1 },
          email_send: { window: 1000, max: 10 }
        }
      })

      vi.mocked(kv.incr).mockResolvedValue(1)

      const whatsappAllowed = await customService.checkRateLimit('whatsapp_send')
      const emailAllowed = await customService.checkRateLimit('email_send')

      expect(whatsappAllowed).toBe(true)
      expect(emailAllowed).toBe(true)
    })
  })

  describe('Queue Statistics', () => {
    it('should return queue length for each priority', async () => {
      vi.mocked(kv.llen)
        .mockResolvedValueOnce(2) // High priority
        .mockResolvedValueOnce(5) // Normal priority
        .mockResolvedValueOnce(1) // Low priority

      const stats = await service.getQueueStats()

      expect(stats).toEqual({
        high: 2,
        normal: 5,
        low: 1,
        total: 8
      })
    })

    it('should return job status counts', async () => {
      // This would require scanning all jobs, simplified for test
      const mockJobs = [
        { status: 'pending' },
        { status: 'processing' },
        { status: 'completed' },
        { status: 'failed' }
      ]

      // Mock the job status scanning method
      vi.spyOn(service as any, '_scanJobStatuses').mockResolvedValueOnce({
        pending: 1,
        processing: 1,
        completed: 1,
        failed: 1
      })

      const statusCounts = await service.getJobStatusCounts()

      expect(statusCounts).toEqual({
        pending: 1,
        processing: 1,
        completed: 1,
        failed: 1
      })
    })
  })

  describe('Cleanup', () => {
    it('should clean up completed jobs older than threshold', async () => {
      const oldJobId = 'old-completed-job'
      const recentJobId = 'recent-completed-job'

      // Mock job cleanup
      vi.spyOn(service as any, '_cleanupCompletedJobs').mockResolvedValueOnce(1)

      const cleanedCount = await service.cleanupCompletedJobs(3600) // 1 hour

      expect(cleanedCount).toBe(1)
    })

    it('should clean up failed jobs older than threshold', async () => {
      vi.spyOn(service as any, '_cleanupFailedJobs').mockResolvedValueOnce(2)

      const cleanedCount = await service.cleanupFailedJobs(86400) // 24 hours

      expect(cleanedCount).toBe(2)
    })
  })

  describe('Error Handling', () => {
    it('should handle Redis connection errors gracefully', async () => {
      vi.mocked(kv.lpush).mockRejectedValueOnce(new Error('Redis connection failed'))

      const jobData = {
        type: 'whatsapp_send' as const,
        guestId: testGuestId,
        eventId: testEventId,
        templateName: 'test',
        variables: {}
      }

      await expect(service.addJob(jobData)).rejects.toThrow('Redis connection failed')
    })

    it('should handle malformed job data in queue', async () => {
      vi.mocked(kv.rpop).mockResolvedValueOnce('invalid-json')

      const processor = vi.fn()
      const job = await service.processQueue(processor)

      expect(job).toBeNull()
      expect(processor).not.toHaveBeenCalled()
    })

    it('should handle processor throwing errors', async () => {
      const job = {
        id: 'error-job',
        type: 'whatsapp_send',
        data: { guestId: testGuestId, templateName: 'test' }
      }

      vi.mocked(kv.rpop).mockResolvedValueOnce(JSON.stringify(job))
      vi.mocked(kv.get).mockResolvedValueOnce(JSON.stringify({
        ...job,
        status: 'pending',
        attempts: 0,
        maxRetries: 3
      }))

      const processor = vi.fn().mockRejectedValue(new Error('Processor crashed'))

      await service.processQueue(processor)

      // Job should be marked as retrying since attempts < maxRetries
      expect(kv.set).toHaveBeenCalledWith(
        'job:error-job',
        expect.stringContaining('"status":"retrying"'),
        { ex: 86400 }
      )
    })
  })

  describe('Retry Processing', () => {
    it('should process scheduled retries', async () => {
      const retryTime = Date.now() - 1000 // 1 second ago
      const jobId = 'retry-job-123'

      // Mock the private method to return retry keys
      vi.spyOn(service as any, 'getRetryKeys').mockResolvedValueOnce([`retry:${retryTime}`])
      
      vi.mocked(kv.get)
        .mockResolvedValueOnce(jobId) // Return job ID from retry key
        .mockResolvedValueOnce(JSON.stringify({
          id: jobId,
          type: 'whatsapp_send',
          status: 'failed',
          priority: 'normal',
          attempts: 1,
          maxRetries: 3,
          data: { guestId: testGuestId, templateName: 'test' }
        }))

      const retryJobs = await service.processRetries()

      expect(retryJobs).toBe(1)
      expect(kv.lpush).toHaveBeenCalledWith(
        'queue:whatsapp_send',
        expect.any(String)
      )
      expect(kv.del).toHaveBeenCalledWith(`retry:${retryTime}`)
    })

    it('should not process retries that are not due yet', async () => {
      const futureTime = Date.now() + 60000 // 1 minute in future
      vi.mocked(kv.get).mockResolvedValueOnce(`retry:${futureTime}`)

      const retryJobs = await service.processRetries()

      expect(retryJobs).toBe(0)
      expect(kv.lpush).not.toHaveBeenCalled()
    })
  })
})
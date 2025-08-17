import { kv } from '@vercel/kv'

export enum JobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  RETRYING = 'retrying'
}

export enum JobPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high'
}

export interface WhatsAppJobData {
  type: 'whatsapp_send'
  guestId: string
  eventId: string
  templateName: string
  variables: Record<string, string>
  phone?: string
}

export interface QueueJob {
  id: string
  type: string
  status: JobStatus
  priority: JobPriority
  data: WhatsAppJobData
  attempts: number
  maxRetries: number
  createdAt: string
  updatedAt: string
  processedAt?: string
  completedAt?: string
  failedAt?: string
  error?: string
  result?: any
}

export interface JobProcessResult {
  success: boolean
  error?: string
  result?: any
  retry?: boolean
}

export interface QueueConfig {
  maxRetries?: number
  retryDelay?: number
  rateLimitWindow?: number
  rateLimitMax?: number
  rateLimits?: Record<string, { window: number; max: number }>
}

export interface QueueStats {
  high: number
  normal: number
  low: number
  total: number
}

export interface JobStatusCounts {
  pending: number
  processing: number
  completed: number
  failed: number
}

export class QueueService {
  private config: Required<QueueConfig>

  constructor(config: QueueConfig = {}) {
    this.config = {
      maxRetries: config.maxRetries ?? 3,
      retryDelay: config.retryDelay ?? 60000, // 1 minute
      rateLimitWindow: config.rateLimitWindow ?? 1000, // 1 second
      rateLimitMax: config.rateLimitMax ?? 1,
      rateLimits: config.rateLimits ?? {}
    }
  }

  /**
   * Add a job to the queue
   */
  async addJob(
    jobData: WhatsAppJobData,
    priority: JobPriority = JobPriority.NORMAL
  ): Promise<string> {
    const jobId = this.generateJobId()
    const now = new Date().toISOString()

    const job: QueueJob = {
      id: jobId,
      type: jobData.type,
      status: JobStatus.PENDING,
      priority,
      data: jobData,
      attempts: 0,
      maxRetries: this.config.maxRetries,
      createdAt: now,
      updatedAt: now
    }

    // Store job details
    await kv.set(`job:${jobId}`, JSON.stringify(job), { ex: 86400 }) // 24 hours

    // Add to appropriate priority queue
    const queueKey = this.getQueueKey(jobData.type, priority)
    await kv.lpush(queueKey, JSON.stringify({ id: jobId, type: jobData.type, data: jobData }))

    return jobId
  }

  /**
   * Add multiple jobs to the queue
   */
  async addBulkJobs(
    jobs: WhatsAppJobData[],
    priority: JobPriority = JobPriority.NORMAL
  ): Promise<string[]> {
    const jobIds: string[] = []

    for (const jobData of jobs) {
      const jobId = await this.addJob(jobData, priority)
      jobIds.push(jobId)
    }

    return jobIds
  }

  /**
   * Get job by ID
   */
  async getJob(jobId: string): Promise<QueueJob | null> {
    try {
      const jobData = await kv.get(`job:${jobId}`)
      if (!jobData || typeof jobData !== 'string') {
        return null
      }

      return JSON.parse(jobData) as QueueJob
    } catch (error) {
      console.error(`Failed to parse job data for ${jobId}:`, error)
      return null
    }
  }

  /**
   * Process next job from queue
   */
  async processQueue(
    processor: (job: QueueJob) => Promise<JobProcessResult>
  ): Promise<QueueJob | null> {
    // Check high priority queue first
    let jobData = await kv.rpop(this.getQueueKey('whatsapp_send', JobPriority.HIGH))
    
    // Then normal priority
    if (!jobData) {
      jobData = await kv.rpop(this.getQueueKey('whatsapp_send', JobPriority.NORMAL))
    }
    
    // Finally low priority
    if (!jobData) {
      jobData = await kv.rpop(this.getQueueKey('whatsapp_send', JobPriority.LOW))
    }

    if (!jobData) {
      return null
    }

    try {
      const queueItem = JSON.parse(jobData as string)
      const job = await this.getJob(queueItem.id)
      
      if (!job) {
        console.warn(`Job ${queueItem.id} not found in storage`)
        return null
      }

      // Check rate limit before processing
      const rateLimitKey = `rate_limit:${job.type}`
      const isAllowed = await this.checkRateLimit(job.type)
      
      if (!isAllowed) {
        // Put job back at the end of the queue
        const queueKey = this.getQueueKey(job.type, job.priority)
        await kv.lpush(queueKey, jobData)
        console.log(`Rate limit exceeded for ${job.type}, job ${job.id} requeued`)
        return null
      }

      // Update job status to processing
      job.status = JobStatus.PROCESSING
      job.updatedAt = new Date().toISOString()
      job.processedAt = job.updatedAt
      await this.updateJob(job)

      try {
        // Process the job
        const result = await processor(job)

        if (result.success) {
          // Job completed successfully
          job.status = JobStatus.COMPLETED
          job.completedAt = new Date().toISOString()
          job.result = result.result
        } else {
          // Job failed
          job.status = JobStatus.FAILED
          job.failedAt = new Date().toISOString()
          job.error = result.error
          job.attempts += 1

          // Schedule retry if within limits and retryable
          if (job.attempts < job.maxRetries && result.retry) {
            await this.scheduleRetry(job)
          }
        }
      } catch (error) {
        // Processor threw an error
        job.status = JobStatus.FAILED
        job.failedAt = new Date().toISOString()
        job.error = error instanceof Error ? error.message : 'Unknown processing error'
        job.attempts += 1

        // Schedule retry if within limits
        if (job.attempts < job.maxRetries) {
          await this.scheduleRetry(job)
        }
      }

      job.updatedAt = new Date().toISOString()
      await this.updateJob(job)

      return job
    } catch (error) {
      console.error('Failed to process queue item:', error)
      return null
    }
  }

  /**
   * Check if operation is within rate limits
   */
  async checkRateLimit(jobType: string): Promise<boolean> {
    const rateLimitConfig = this.config.rateLimits[jobType] || {
      window: this.config.rateLimitWindow,
      max: this.config.rateLimitMax
    }

    const key = `rate_limit:${jobType}:${Math.floor(Date.now() / rateLimitConfig.window)}`
    const current = await kv.incr(key)
    
    if (current === 1) {
      // Set expiration on first increment
      await kv.expire(key, Math.ceil(rateLimitConfig.window / 1000))
    }

    return current <= rateLimitConfig.max
  }

  /**
   * Schedule a job for retry
   */
  async scheduleRetry(job: QueueJob): Promise<void> {
    const retryDelay = this.calculateRetryDelay(job.attempts)
    const retryTime = Date.now() + retryDelay
    const retryKey = `retry:${retryTime}`

    job.status = JobStatus.RETRYING
    await kv.set(retryKey, job.id, { ex: Math.ceil(retryDelay / 1000) + 60 }) // Add buffer
  }

  /**
   * Process scheduled retries
   */
  async processRetries(): Promise<number> {
    const now = Date.now()
    let processedCount = 0

    // Scan for retry keys that are due (simplified approach)
    // In production, you might want to use a more efficient method
    try {
      const retryKeys = await this.getRetryKeys(now)
      
      for (const retryKey of retryKeys) {
        const jobId = await kv.get(retryKey)
        if (jobId && typeof jobId === 'string') {
          const job = await this.getJob(jobId)
          if (job) {
            // Add back to queue
            const queueKey = this.getQueueKey(job.type, job.priority)
            await kv.lpush(queueKey, JSON.stringify({ id: job.id, type: job.type, data: job.data }))
            
            // Update job status
            job.status = JobStatus.PENDING
            job.updatedAt = new Date().toISOString()
            await this.updateJob(job)
            
            // Remove retry key
            await kv.del(retryKey)
            processedCount++
          }
        }
      }
    } catch (error) {
      console.error('Failed to process retries:', error)
    }

    return processedCount
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<QueueStats> {
    const [high, normal, low] = await Promise.all([
      kv.llen(this.getQueueKey('whatsapp_send', JobPriority.HIGH)),
      kv.llen(this.getQueueKey('whatsapp_send', JobPriority.NORMAL)),
      kv.llen(this.getQueueKey('whatsapp_send', JobPriority.LOW))
    ])

    return {
      high: high || 0,
      normal: normal || 0,
      low: low || 0,
      total: (high || 0) + (normal || 0) + (low || 0)
    }
  }

  /**
   * Get job status counts
   */
  async getJobStatusCounts(): Promise<JobStatusCounts> {
    // This is a simplified implementation
    // In production, you might want to maintain counters or use a more efficient scanning method
    return this._scanJobStatuses()
  }

  /**
   * Clean up completed jobs older than specified age
   */
  async cleanupCompletedJobs(maxAgeSeconds: number): Promise<number> {
    return this._cleanupCompletedJobs(maxAgeSeconds)
  }

  /**
   * Clean up failed jobs older than specified age
   */
  async cleanupFailedJobs(maxAgeSeconds: number): Promise<number> {
    return this._cleanupFailedJobs(maxAgeSeconds)
  }

  /**
   * Update job in storage
   */
  private async updateJob(job: QueueJob): Promise<void> {
    await kv.set(`job:${job.id}`, JSON.stringify(job), { ex: 86400 })
  }

  /**
   * Generate unique job ID
   */
  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Get queue key for job type and priority
   */
  private getQueueKey(jobType: string, priority: JobPriority): string {
    const baseKey = `queue:${jobType}`
    return priority === JobPriority.NORMAL ? baseKey : `${baseKey}:${priority}`
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(attempt: number): number {
    // Exponential backoff: 1min, 2min, 4min, 8min, etc.
    const baseDelay = this.config.retryDelay
    return Math.min(baseDelay * Math.pow(2, attempt - 1), 3600000) // Max 1 hour
  }

  /**
   * Get retry keys that are due for processing
   */
  private async getRetryKeys(now: number): Promise<string[]> {
    // This is a simplified implementation
    // In production, you might want to use Redis SCAN or maintain a sorted set
    return []
  }

  /**
   * Scan job statuses (simplified implementation)
   */
  private async _scanJobStatuses(): Promise<JobStatusCounts> {
    // This is a simplified implementation
    // In production, you might want to maintain real-time counters
    return {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0
    }
  }

  /**
   * Clean up completed jobs (simplified implementation)
   */
  private async _cleanupCompletedJobs(maxAgeSeconds: number): Promise<number> {
    // This is a simplified implementation
    // In production, you would scan for old completed jobs and delete them
    return 0
  }

  /**
   * Clean up failed jobs (simplified implementation)
   */
  private async _cleanupFailedJobs(maxAgeSeconds: number): Promise<number> {
    // This is a simplified implementation
    // In production, you would scan for old failed jobs and delete them
    return 0
  }

  /**
   * Clear all queues (useful for testing)
   */
  async clearAllQueues(): Promise<void> {
    const queues = [
      this.getQueueKey('whatsapp_send', JobPriority.HIGH),
      this.getQueueKey('whatsapp_send', JobPriority.NORMAL),
      this.getQueueKey('whatsapp_send', JobPriority.LOW)
    ]

    for (const queue of queues) {
      await kv.del(queue)
    }
  }

  /**
   * Get all jobs for debugging (limit results)
   */
  async getAllJobs(limit: number = 100): Promise<QueueJob[]> {
    // This is a simplified implementation for debugging
    // In production, you would implement proper pagination
    const jobs: QueueJob[] = []
    
    try {
      // This is a placeholder - in reality you'd scan the job keys
      // For now, return empty array since we can't easily scan Redis keys
      return jobs
    } catch (error) {
      console.error('Failed to get all jobs:', error)
      return []
    }
  }

  /**
   * Pause queue processing
   */
  async pauseQueue(jobType: string): Promise<void> {
    await kv.set(`queue:${jobType}:paused`, 'true', { ex: 3600 }) // Pause for 1 hour max
  }

  /**
   * Resume queue processing
   */
  async resumeQueue(jobType: string): Promise<void> {
    await kv.del(`queue:${jobType}:paused`)
  }

  /**
   * Check if queue is paused
   */
  async isQueuePaused(jobType: string): Promise<boolean> {
    const paused = await kv.get(`queue:${jobType}:paused`)
    return paused === 'true'
  }
}
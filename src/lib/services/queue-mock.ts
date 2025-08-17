// Mock queue service for local testing without Redis
import { QueueJob, JobStatus, JobPriority, WhatsAppJobData, JobProcessResult } from './queue'

// In-memory storage for testing
const jobs = new Map<string, QueueJob>()
const queues = {
  high: [] as string[],
  normal: [] as string[],
  low: [] as string[]
}

export class MockQueueService {
  private config = {
    maxRetries: 3,
    retryDelay: 60000,
    rateLimitWindow: 1000,
    rateLimitMax: 1,
    rateLimits: {}
  }

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

    // Store job
    jobs.set(jobId, job)

    // Add to appropriate queue
    const queueKey = priority.toLowerCase() as keyof typeof queues
    queues[queueKey].push(jobId)

    console.log(`Mock: Added job ${jobId} to ${queueKey} queue`)
    
    return jobId
  }

  async addBulkJobs(
    jobsData: WhatsAppJobData[],
    priority: JobPriority = JobPriority.NORMAL
  ): Promise<string[]> {
    const jobIds: string[] = []
    
    for (const jobData of jobsData) {
      const jobId = await this.addJob(jobData, priority)
      jobIds.push(jobId)
    }
    
    return jobIds
  }

  async getJob(jobId: string): Promise<QueueJob | null> {
    return jobs.get(jobId) || null
  }

  async processQueue(
    processor: (job: QueueJob) => Promise<JobProcessResult>
  ): Promise<QueueJob | null> {
    // Try high priority first, then normal, then low
    for (const queueKey of ['high', 'normal', 'low'] as const) {
      const jobId = queues[queueKey].shift()
      if (jobId) {
        const job = jobs.get(jobId)
        if (job) {
          console.log(`Mock: Processing job ${jobId} from ${queueKey} queue`)
          
          // Update job status
          job.status = JobStatus.PROCESSING
          job.updatedAt = new Date().toISOString()
          
          try {
            const result = await processor(job)
            
            if (result.success) {
              job.status = JobStatus.COMPLETED
              job.completedAt = new Date().toISOString()
              job.result = result.result
            } else {
              job.status = JobStatus.FAILED
              job.failedAt = new Date().toISOString()
              job.error = result.error
              job.attempts += 1
            }
          } catch (error) {
            job.status = JobStatus.FAILED
            job.failedAt = new Date().toISOString()
            job.error = error instanceof Error ? error.message : 'Unknown error'
            job.attempts += 1
          }
          
          job.updatedAt = new Date().toISOString()
          jobs.set(jobId, job)
          
          return job
        }
      }
    }
    
    return null
  }

  async checkRateLimit(jobType: string): Promise<boolean> {
    // Mock: always allow for testing
    return true
  }

  async getQueueStats() {
    return {
      high: queues.high.length,
      normal: queues.normal.length,
      low: queues.low.length,
      total: queues.high.length + queues.normal.length + queues.low.length
    }
  }

  async clearAllQueues(): Promise<void> {
    queues.high = []
    queues.normal = []
    queues.low = []
    jobs.clear()
  }

  private generateJobId(): string {
    return `mock_job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}
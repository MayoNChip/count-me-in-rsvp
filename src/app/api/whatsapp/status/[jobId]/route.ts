import { NextRequest, NextResponse } from 'next/server'
import { QueueService } from '@/lib/services/queue'
import { db } from '@/lib/db'
import { whatsappInvitations, guests, events } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

// Parameter validation schema
const JobIdSchema = z.object({
  jobId: z.string().min(1, 'Job ID is required')
})

interface RouteParams {
  params: Promise<{
    jobId: string
  }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Await and validate job ID parameter
    const resolvedParams = await params
    const validation = JobIdSchema.safeParse(resolvedParams)
    if (!validation.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid job ID',
        details: validation.error.issues
      }, { status: 400 })
    }

    const { jobId } = validation.data

    // Get job from queue service
    const queueService = new QueueService()
    const job = await queueService.getJob(jobId)

    if (!job) {
      return NextResponse.json({
        success: false,
        error: 'Job not found'
      }, { status: 404 })
    }

    // Since we don't have jobId in the schema, we'll try to match by job type and guest
    // This is a limitation - in a real implementation, we'd store the jobId
    const invitation = null // For now, we'll work without invitation context

    // Calculate job progress and statistics
    const progress = {
      status: job.status,
      attempts: job.attempts,
      maxRetries: job.maxRetries,
      progressPercentage: calculateProgressPercentage(job),
      estimatedCompletion: calculateEstimatedCompletion(job)
    }

    // Determine detailed status message
    const statusMessage = getDetailedStatusMessage(job, invitation)

    return NextResponse.json({
      success: true,
      job: {
        id: job.id,
        type: job.type,
        status: job.status,
        priority: job.priority,
        attempts: job.attempts,
        maxRetries: job.maxRetries,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        processedAt: job.processedAt,
        completedAt: job.completedAt,
        failedAt: job.failedAt,
        error: job.error,
        result: job.result
      },
      invitation: null, // Not available without jobId in schema
      progress,
      statusMessage,
      timeline: buildJobTimeline(job, invitation)
    })

  } catch (error) {
    console.error('Get job status error:', error)

    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve job status'
    }, { status: 500 })
  }
}

/**
 * Calculate progress percentage based on job status and attempts
 */
function calculateProgressPercentage(job: any): number {
  switch (job.status) {
    case 'pending':
      return 0
    case 'processing':
      return 50
    case 'completed':
      return 100
    case 'failed':
      return job.attempts >= job.maxRetries ? 100 : (job.attempts / job.maxRetries) * 80
    case 'retrying':
      return (job.attempts / job.maxRetries) * 60
    default:
      return 0
  }
}

/**
 * Calculate estimated completion time for job
 */
function calculateEstimatedCompletion(job: any): string | null {
  if (job.status === 'completed' || job.status === 'failed') {
    return null
  }

  if (job.status === 'processing') {
    // Estimate 30 seconds for processing
    const estimatedTime = new Date(Date.now() + 30000)
    return estimatedTime.toISOString()
  }

  if (job.status === 'retrying') {
    // Calculate next retry time based on exponential backoff
    const baseDelay = 60000 // 1 minute
    const retryDelay = Math.min(baseDelay * Math.pow(2, job.attempts - 1), 3600000) // Max 1 hour
    const estimatedTime = new Date(Date.now() + retryDelay)
    return estimatedTime.toISOString()
  }

  return null // For pending jobs, we can't estimate
}

/**
 * Get detailed human-readable status message
 */
function getDetailedStatusMessage(job: any, invitation: any): string {
  const baseMessages = {
    pending: 'Job is waiting to be processed in the queue',
    processing: 'Message is being sent via WhatsApp',
    completed: 'Message sent successfully',
    failed: 'Message sending failed',
    retrying: 'Job will retry after a delay'
  }

  let message = baseMessages[job.status as keyof typeof baseMessages] || 'Unknown status'

  // Add attempt information for failed/retrying jobs
  if (job.status === 'failed' || job.status === 'retrying') {
    message += ` (attempt ${job.attempts}/${job.maxRetries})`
  }

  // Add invitation-specific context if available
  if (invitation) {
    if (invitation.status === 'delivered') {
      message = 'Message delivered to recipient'
    } else if (invitation.status === 'read') {
      message = 'Message delivered and read by recipient'
    } else if (invitation.errorMessage) {
      message += `: ${invitation.errorMessage}`
    }
  }

  return message
}

/**
 * Build timeline of job events
 */
function buildJobTimeline(job: any, invitation: any): Array<{
  timestamp: string
  event: string
  description: string
  status: 'completed' | 'current' | 'pending'
}> {
  const timeline = []

  // Job created
  timeline.push({
    timestamp: job.createdAt,
    event: 'Job Created',
    description: 'WhatsApp invitation job added to queue',
    status: 'completed' as const
  })

  // Job processing
  if (job.processedAt) {
    timeline.push({
      timestamp: job.processedAt,
      event: 'Processing Started',
      description: 'Job picked up from queue and processing began',
      status: 'completed' as const
    })
  } else if (job.status === 'processing') {
    timeline.push({
      timestamp: new Date().toISOString(),
      event: 'Processing Started',
      description: 'Job is currently being processed',
      status: 'current' as const
    })
  } else {
    timeline.push({
      timestamp: '',
      event: 'Processing',
      description: 'Waiting to be processed',
      status: 'pending' as const
    })
  }

  // Message sent
  if (invitation?.sentAt) {
    timeline.push({
      timestamp: invitation.sentAt,
      event: 'Message Sent',
      description: 'WhatsApp message sent via Twilio',
      status: 'completed' as const
    })
  } else if (job.status === 'processing') {
    timeline.push({
      timestamp: '',
      event: 'Message Sent',
      description: 'Sending WhatsApp message',
      status: 'current' as const
    })
  } else if (job.status === 'failed') {
    timeline.push({
      timestamp: job.failedAt || '',
      event: 'Message Failed',
      description: job.error || 'Message sending failed',
      status: 'completed' as const
    })
  } else {
    timeline.push({
      timestamp: '',
      event: 'Message Sent',
      description: 'Will send WhatsApp message',
      status: 'pending' as const
    })
  }

  // Message delivered
  if (invitation?.deliveredAt) {
    timeline.push({
      timestamp: invitation.deliveredAt,
      event: 'Message Delivered',
      description: 'Message delivered to recipient device',
      status: 'completed' as const
    })
  } else if (invitation?.sentAt && !invitation?.errorMessage) {
    timeline.push({
      timestamp: '',
      event: 'Message Delivered',
      description: 'Waiting for delivery confirmation',
      status: 'pending' as const
    })
  }

  return timeline
}

// OPTIONS handler for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
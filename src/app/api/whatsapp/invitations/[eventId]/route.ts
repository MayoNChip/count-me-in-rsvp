import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { whatsappInvitations, guests, events, whatsappTemplates } from '@/lib/db/schema'
import { eq, desc, and } from 'drizzle-orm'
import { z } from 'zod'

// Parameter validation schema
const EventIdSchema = z.object({
  eventId: z.string().min(1, 'Event ID is required')
})

// Query parameter validation schema
const QuerySchema = z.object({
  status: z.string().optional(),
  template: z.string().optional(),
  limit: z.string().transform(val => parseInt(val, 10)).optional(),
  offset: z.string().transform(val => parseInt(val, 10)).optional(),
  sortBy: z.enum(['createdAt', 'sentAt', 'guestName', 'status']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
})

interface RouteParams {
  params: Promise<{
    eventId: string
  }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Await and validate event ID parameter
    const resolvedParams = await params
    const eventValidation = EventIdSchema.safeParse(resolvedParams)
    if (!eventValidation.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid event ID',
        details: eventValidation.error.issues
      }, { status: 400 })
    }

    const { eventId } = eventValidation.data

    // Parse and validate query parameters
    const url = new URL(request.url)
    const queryParams = Object.fromEntries(url.searchParams.entries())
    
    const queryValidation = QuerySchema.safeParse(queryParams)
    if (!queryValidation.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid query parameters',
        details: queryValidation.error.issues
      }, { status: 400 })
    }

    const { status, template, limit = 50, offset = 0, sortBy, sortOrder } = queryValidation.data

    // Verify event exists
    const [event] = await db
      .select()
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1)

    if (!event) {
      return NextResponse.json({
        success: false,
        error: 'Event not found'
      }, { status: 404 })
    }

    // Apply filters
    const filters = [eq(whatsappInvitations.eventId, eventId)]

    if (status) {
      filters.push(eq(whatsappInvitations.twilioStatus, status))
    }

    if (template) {
      filters.push(eq(whatsappInvitations.templateName, template))
    }

    // Determine order column
    let orderColumn
    switch (sortBy) {
      case 'sentAt':
        orderColumn = sortOrder === 'asc' ? whatsappInvitations.sentAt : desc(whatsappInvitations.sentAt)
        break
      case 'guestName':
        orderColumn = sortOrder === 'asc' ? guests.name : desc(guests.name)
        break
      case 'status':
        orderColumn = sortOrder === 'asc' ? whatsappInvitations.twilioStatus : desc(whatsappInvitations.twilioStatus)
        break
      default: // createdAt
        orderColumn = sortOrder === 'asc' ? whatsappInvitations.createdAt : desc(whatsappInvitations.createdAt)
    }

    // Build complete query in one chain
    const invitations = await db
      .select({
        id: whatsappInvitations.id,
        eventId: whatsappInvitations.eventId,
        guestId: whatsappInvitations.guestId,
        templateName: whatsappInvitations.templateName,
        messageContent: whatsappInvitations.messageContent,
        twilioStatus: whatsappInvitations.twilioStatus,
        twilioMessageSid: whatsappInvitations.twilioMessageSid,
        templateVariables: whatsappInvitations.templateVariables,
        twilioErrorMessage: whatsappInvitations.twilioErrorMessage,
        sentAt: whatsappInvitations.sentAt,
        deliveredAt: whatsappInvitations.deliveredAt,
        readAt: whatsappInvitations.readAt,
        createdAt: whatsappInvitations.createdAt,
        updatedAt: whatsappInvitations.updatedAt,
        guestName: guests.name,
        guestEmail: guests.email,
        guestPhone: guests.phone,
        templateDisplayName: whatsappTemplates.displayName
      })
      .from(whatsappInvitations)
      .leftJoin(guests, eq(whatsappInvitations.guestId, guests.id))
      .leftJoin(whatsappTemplates, eq(whatsappTemplates.name, whatsappInvitations.templateName))
      .where(and(...filters))
      .orderBy(orderColumn)
      .limit(limit)
      .offset(offset)

    // Get total count for pagination
    const [{ count }] = await db
      .select({ count: db.$count(whatsappInvitations) })
      .from(whatsappInvitations)
      .where(and(...filters))

    // Calculate statistics
    const stats = await calculateInvitationStats(eventId)

    // Format response
    const formattedInvitations = invitations.map(invitation => ({
      id: invitation.id,
      eventId: invitation.eventId,
      guest: {
        id: invitation.guestId,
        name: invitation.guestName,
        email: invitation.guestEmail,
        phone: invitation.guestPhone
      },
      template: {
        name: invitation.templateName,
        displayName: invitation.templateDisplayName
      },
      messageContent: invitation.messageContent,
      status: invitation.twilioStatus,
      messageSid: invitation.twilioMessageSid,
      variables: invitation.templateVariables,
      errorMessage: invitation.twilioErrorMessage,
      timeline: {
        createdAt: invitation.createdAt,
        sentAt: invitation.sentAt,
        deliveredAt: invitation.deliveredAt,
        readAt: invitation.readAt,
        updatedAt: invitation.updatedAt
      },
      statusBadge: getStatusBadge(invitation.twilioStatus || 'pending'),
      canRetry: invitation.twilioStatus === 'failed'
    }))

    return NextResponse.json({
      success: true,
      event: {
        id: event.id,
        name: event.name
      },
      invitations: formattedInvitations,
      pagination: {
        total: count,
        limit,
        offset,
        hasMore: offset + limit < count,
        totalPages: Math.ceil(count / limit),
        currentPage: Math.floor(offset / limit) + 1
      },
      stats,
      filters: {
        status: status || null,
        template: template || null
      },
      sorting: {
        sortBy,
        sortOrder
      }
    })

  } catch (error) {
    console.error('Get invitations error:', error)

    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve invitations'
    }, { status: 500 })
  }
}

/**
 * Calculate invitation statistics for the event
 */
async function calculateInvitationStats(eventId: string) {
  const [statsResult] = await db
    .select({
      total: db.$count(whatsappInvitations),
      queued: db.$count(whatsappInvitations, eq(whatsappInvitations.twilioStatus, 'queued')),
      sent: db.$count(whatsappInvitations, eq(whatsappInvitations.twilioStatus, 'sent')),
      delivered: db.$count(whatsappInvitations, eq(whatsappInvitations.twilioStatus, 'delivered')),
      read: db.$count(whatsappInvitations, eq(whatsappInvitations.twilioStatus, 'read')),
      failed: db.$count(whatsappInvitations, eq(whatsappInvitations.twilioStatus, 'failed'))
    })
    .from(whatsappInvitations)
    .where(eq(whatsappInvitations.eventId, eventId))

  const total = statsResult?.total || 0
  const queued = statsResult?.queued || 0
  const sent = statsResult?.sent || 0
  const delivered = statsResult?.delivered || 0
  const read = statsResult?.read || 0
  const failed = statsResult?.failed || 0

  const successfulDeliveries = delivered + read
  const deliveryRate = total > 0 ? (successfulDeliveries / total) * 100 : 0
  const readRate = total > 0 ? (read / total) * 100 : 0
  const failureRate = total > 0 ? (failed / total) * 100 : 0

  return {
    counts: {
      total,
      queued,
      sent,
      delivered,
      read,
      failed,
      successful: successfulDeliveries
    },
    rates: {
      delivery: Math.round(deliveryRate * 100) / 100,
      read: Math.round(readRate * 100) / 100,
      failure: Math.round(failureRate * 100) / 100
    },
    summary: {
      totalSent: sent + delivered + read,
      awaitingDelivery: sent,
      needsRetry: failed
    }
  }
}

/**
 * Get status badge configuration for UI display
 */
function getStatusBadge(status: string): {
  variant: string
  label: string
  color: string
} {
  const badges = {
    queued: {
      variant: 'secondary',
      label: 'Queued',
      color: 'gray'
    },
    pending: {
      variant: 'secondary',
      label: 'Pending',
      color: 'gray'
    },
    sent: {
      variant: 'default',
      label: 'Sent',
      color: 'blue'
    },
    delivered: {
      variant: 'success',
      label: 'Delivered',
      color: 'green'
    },
    read: {
      variant: 'success',
      label: 'Read',
      color: 'emerald'
    },
    failed: {
      variant: 'destructive',
      label: 'Failed',
      color: 'red'
    }
  }

  return badges[status as keyof typeof badges] || badges.pending
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
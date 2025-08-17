import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { whatsappInvitations, guests, events, whatsappTemplates } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { QueueService, JobPriority } from '@/lib/services/queue'
import { TemplateService } from '@/lib/services/template'
import { z } from 'zod'

// Parameter validation schema
const InvitationIdSchema = z.object({
  invitationId: z.string().min(1, 'Invitation ID is required')
})

// Request body validation schema (optional parameters for retry)
const RetryRequestSchema = z.object({
  priority: z.enum(['low', 'normal', 'high']).default('normal'),
  updateTemplate: z.boolean().default(false),
  templateName: z.string().optional(),
  variables: z.record(z.string(), z.string()).optional()
})

interface RouteParams {
  params: Promise<{
    invitationId: string
  }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // Await and validate invitation ID parameter
    const resolvedParams = await params
    const paramValidation = InvitationIdSchema.safeParse(resolvedParams)
    if (!paramValidation.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid invitation ID',
        details: paramValidation.error.issues
      }, { status: 400 })
    }

    const { invitationId } = paramValidation.data

    // Parse and validate request body (optional)
    let requestBody = {}
    try {
      const bodyText = await request.text()
      if (bodyText) {
        requestBody = JSON.parse(bodyText)
      }
    } catch (e) {
      return NextResponse.json({
        success: false,
        error: 'Invalid JSON in request body'
      }, { status: 400 })
    }

    const bodyValidation = RetryRequestSchema.safeParse(requestBody)
    if (!bodyValidation.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request body',
        details: bodyValidation.error.issues
      }, { status: 400 })
    }

    const { priority, updateTemplate, templateName, variables } = bodyValidation.data

    // Get invitation with related data
    const [invitation] = await db
      .select({
        id: whatsappInvitations.id,
        eventId: whatsappInvitations.eventId,
        guestId: whatsappInvitations.guestId,
        templateName: whatsappInvitations.templateName,
        messageContent: whatsappInvitations.messageContent,
        twilioStatus: whatsappInvitations.twilioStatus,
        templateVariables: whatsappInvitations.templateVariables,
        twilioErrorMessage: whatsappInvitations.twilioErrorMessage,
        guestName: guests.name,
        guestEmail: guests.email,
        guestPhone: guests.phone,
        eventName: events.name,
        templateDisplayName: whatsappTemplates.displayName,
        templateContent: whatsappTemplates.content
      })
      .from(whatsappInvitations)
      .leftJoin(guests, eq(whatsappInvitations.guestId, guests.id))
      .leftJoin(events, eq(whatsappInvitations.eventId, events.id))
      .leftJoin(whatsappTemplates, eq(whatsappTemplates.name, whatsappInvitations.templateName))
      .where(eq(whatsappInvitations.id, invitationId))
      .limit(1)

    if (!invitation) {
      return NextResponse.json({
        success: false,
        error: 'Invitation not found'
      }, { status: 404 })
    }

    // Check if invitation can be retried
    if (invitation.twilioStatus !== 'failed') {
      return NextResponse.json({
        success: false,
        error: 'Only failed invitations can be retried',
        currentStatus: invitation.twilioStatus
      }, { status: 400 })
    }

    if (!invitation.guestPhone) {
      return NextResponse.json({
        success: false,
        error: 'Guest has no phone number'
      }, { status: 400 })
    }

    // Determine template to use
    let finalTemplate = {
      name: invitation.templateName,
      content: invitation.templateContent
    }

    // If updating template, load the new one
    if (updateTemplate && templateName) {
      const templateService = new TemplateService()
      const newTemplate = await templateService.loadTemplate(templateName)
      
      if (!newTemplate) {
        return NextResponse.json({
          success: false,
          error: `Template '${templateName}' not found or inactive`
        }, { status: 404 })
      }

      finalTemplate = {
        name: newTemplate.name,
        content: newTemplate.content
      }
    }

    // Determine variables to use
    let finalVariables: Record<string, string> = (invitation.templateVariables as Record<string, string>) || {}

    // Merge with new variables if provided
    if (variables) {
      finalVariables = {
        ...finalVariables,
        ...variables
      }
    }

    // Ensure default variables are present
    finalVariables = {
      guest_name: invitation.guestName || 'Guest',
      event_name: invitation.eventName || 'Event',
      ...finalVariables
    }

    // Validate template variables if updating template
    if (updateTemplate && templateName) {
      const templateService = new TemplateService()
      const templateValidation = await templateService.validateTemplate(templateName, finalVariables)
      
      if (!templateValidation.isValid) {
        return NextResponse.json({
          success: false,
          error: 'Template validation failed',
          details: templateValidation.errors,
          missingVariables: templateValidation.missingVariables
        }, { status: 400 })
      }
    }

    // Create new job for queue
    const queueService = new QueueService()
    const jobPriority = priority === 'high' ? JobPriority.HIGH : 
                       priority === 'low' ? JobPriority.LOW : 
                       JobPriority.NORMAL

    const newJobId = await queueService.addJob({
      type: 'whatsapp_send',
      guestId: invitation.guestId,
      eventId: invitation.eventId,
      templateName: finalTemplate.name,
      variables: finalVariables,
      phone: invitation.guestPhone
    }, jobPriority)

    // Render new message content
    const templateService = new TemplateService()
    const newMessageContent = templateService.renderTemplate(finalTemplate.content || '', finalVariables)

    // Update invitation record
    await db.update(whatsappInvitations)
      .set({
        templateName: finalTemplate.name,
        messageContent: newMessageContent,
        twilioStatus: 'queued',
        templateVariables: finalVariables,
        twilioErrorMessage: null, // Clear previous error
        twilioMessageSid: null, // Clear previous message SID
        sentAt: null, // Clear previous timestamps
        deliveredAt: null,
        readAt: null,
        updatedAt: new Date()
      })
      .where(eq(whatsappInvitations.id, invitationId))

    // Track retry attempt (for analytics/monitoring)
    const retryMetadata = {
      retryReason: invitation.twilioErrorMessage,
      templateChanged: updateTemplate && templateName !== invitation.templateName,
      variablesUpdated: !!variables,
      priority
    }

    return NextResponse.json({
      success: true,
      message: 'Invitation retry queued successfully',
      newJobId,
      invitation: {
        id: invitation.id,
        status: 'queued',
        guestName: invitation.guestName,
        phoneNumber: invitation.guestPhone,
        messagePreview: newMessageContent,
        template: {
          name: finalTemplate.name,
          changed: updateTemplate && templateName !== invitation.templateName
        },
        variables: finalVariables
      },
      retry: {
        priority,
        metadata: retryMetadata
      }
    })

  } catch (error) {
    console.error('Retry invitation error:', error)

    if (error instanceof Error) {
      if (error.message.includes('Queue service error')) {
        return NextResponse.json({
          success: false,
          error: 'Failed to queue retry - queue service unavailable'
        }, { status: 503 })
      }
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to retry invitation'
    }, { status: 500 })
  }
}

// GET method to check if invitation can be retried
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Await and validate invitation ID parameter
    const resolvedParams = await params
    const paramValidation = InvitationIdSchema.safeParse(resolvedParams)
    if (!paramValidation.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid invitation ID'
      }, { status: 400 })
    }

    const { invitationId } = paramValidation.data

    // Get invitation status
    const [invitation] = await db
      .select({
        id: whatsappInvitations.id,
        twilioStatus: whatsappInvitations.twilioStatus,
        twilioErrorMessage: whatsappInvitations.twilioErrorMessage,
        guestName: guests.name,
        guestPhone: guests.phone
      })
      .from(whatsappInvitations)
      .leftJoin(guests, eq(whatsappInvitations.guestId, guests.id))
      .where(eq(whatsappInvitations.id, invitationId))
      .limit(1)

    if (!invitation) {
      return NextResponse.json({
        success: false,
        error: 'Invitation not found'
      }, { status: 404 })
    }

    const canRetry = invitation.twilioStatus === 'failed' && !!invitation.guestPhone
    const reasons = []

    if (invitation.twilioStatus !== 'failed') {
      reasons.push(`Status is '${invitation.twilioStatus}', only failed invitations can be retried`)
    }

    if (!invitation.guestPhone) {
      reasons.push('Guest has no phone number')
    }

    return NextResponse.json({
      success: true,
      invitation: {
        id: invitation.id,
        guestName: invitation.guestName,
        status: invitation.twilioStatus,
        errorMessage: invitation.twilioErrorMessage
      },
      canRetry,
      reasons: reasons.length > 0 ? reasons : undefined
    })

  } catch (error) {
    console.error('Check retry eligibility error:', error)

    return NextResponse.json({
      success: false,
      error: 'Failed to check retry eligibility'
    }, { status: 500 })
  }
}

// OPTIONS handler for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
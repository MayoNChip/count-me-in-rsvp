import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { guests, events, whatsappInvitations, whatsappTemplates } from '@/lib/db/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { QueueService, JobPriority, WhatsAppJobData } from '@/lib/services/queue'
import { TemplateService } from '@/lib/services/template'
import { z } from 'zod'

// Request validation schema
const SendBulkSchema = z.object({
  eventId: z.string().min(1, 'Event ID is required').optional(),
  guestIds: z.array(z.string().min(1)).min(1, 'At least one guest ID is required').max(100, 'Maximum 100 guests per bulk operation'),
  templateName: z.string().min(1, 'Template name is required'),
  variables: z.record(z.string()).default({}),
  priority: z.enum(['low', 'normal', 'high']).default('normal'),
  batchSize: z.number().min(1).max(50).default(10) // Process in batches to avoid overwhelming the queue
})

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json().catch(() => {
      throw new Error('Invalid JSON in request body')
    })

    const validation = SendBulkSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: validation.error.errors
      }, { status: 400 })
    }

    const { eventId, guestIds, templateName, variables, priority, batchSize } = validation.data

    // Verify template exists and is active
    const templateService = new TemplateService()
    const template = await templateService.loadTemplate(templateName)
    
    if (!template) {
      return NextResponse.json({
        success: false,
        error: `Template '${templateName}' not found or inactive`
      }, { status: 404 })
    }

    // Validate template variables
    const templateValidation = await templateService.validateTemplate(templateName, variables)
    if (!templateValidation.isValid) {
      return NextResponse.json({
        success: false,
        error: 'Template validation failed',
        details: templateValidation.errors,
        missingVariables: templateValidation.missingVariables
      }, { status: 400 })
    }

    // Build query to get guests
    let guestQuery = db
      .select({
        id: guests.id,
        name: guests.name,
        phone: guests.phone,
        eventId: guests.eventId,
        eventName: events.name
      })
      .from(guests)
      .innerJoin(events, eq(guests.eventId, events.id))
      .where(inArray(guests.id, guestIds))

    // If eventId is provided, add it to the filter
    if (eventId) {
      guestQuery = guestQuery.where(and(
        inArray(guests.id, guestIds),
        eq(guests.eventId, eventId)
      ))
    }

    const guestList = await guestQuery

    if (guestList.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No valid guests found'
      }, { status: 404 })
    }

    // Check for guests without phone numbers
    const guestsWithoutPhones = guestList.filter(guest => !guest.phone)
    if (guestsWithoutPhones.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Some guests have no phone number',
        guestsWithoutPhones: guestsWithoutPhones.map(g => ({ id: g.id, name: g.name }))
      }, { status: 400 })
    }

    // Check for existing pending invitations
    const existingInvitations = await db
      .select({
        guestId: whatsappInvitations.guestId,
        id: whatsappInvitations.id
      })
      .from(whatsappInvitations)
      .where(and(
        inArray(whatsappInvitations.guestId, guestIds),
        eq(whatsappInvitations.templateName, template.name),
        eq(whatsappInvitations.twilioStatus, 'queued')
      ))

    if (existingInvitations.length > 0) {
      const conflictingGuests = guestList.filter(g => 
        existingInvitations.some(inv => inv.guestId === g.id)
      )
      
      return NextResponse.json({
        success: false,
        error: 'Some guests already have pending invitations',
        conflicts: conflictingGuests.map(g => ({ 
          id: g.id, 
          name: g.name,
          existingInvitationId: existingInvitations.find(inv => inv.guestId === g.id)?.id
        }))
      }, { status: 409 })
    }

    // Prepare jobs for queue
    const jobs: WhatsAppJobData[] = []
    const invitationRecords = []

    for (const guest of guestList) {
      // Add default variables specific to each guest
      const finalVariables = {
        guest_name: guest.name,
        event_name: guest.eventName,
        ...variables
      }

      // Create job data
      const jobData: WhatsAppJobData = {
        type: 'whatsapp_send',
        guestId: guest.id,
        eventId: guest.eventId,
        templateName: template.name,
        variables: finalVariables,
        phone: guest.phone
      }

      jobs.push(jobData)

      // Prepare invitation record
      const messageContent = templateService.renderTemplate(template.content, finalVariables)
      invitationRecords.push({
        eventId: guest.eventId,
        guestId: guest.id,
        templateName: template.name,
        messageContent,
        twilioStatus: 'queued' as const,
        templateVariables: finalVariables
      })
    }

    // Add jobs to queue in batches
    const queueService = new QueueService()
    const jobPriority = priority === 'high' ? JobPriority.HIGH : 
                       priority === 'low' ? JobPriority.LOW : 
                       JobPriority.NORMAL

    const allJobIds: string[] = []
    
    // Process in batches to avoid overwhelming the queue
    for (let i = 0; i < jobs.length; i += batchSize) {
      const batch = jobs.slice(i, i + batchSize)
      const batchJobIds = await queueService.addBulkJobs(batch, jobPriority)
      allJobIds.push(...batchJobIds)
    }

    // Insert invitation records into database
    await db.insert(whatsappInvitations).values(invitationRecords)

    return NextResponse.json({
      success: true,
      message: `${guestList.length} invitations queued successfully`,
      jobIds: allJobIds,
      totalGuests: guestList.length,
      batchesCreated: Math.ceil(jobs.length / batchSize),
      preview: {
        sampleMessage: invitationRecords[0]?.messageContent,
        templateUsed: template.name
      }
    })

  } catch (error) {
    console.error('Send bulk invitations error:', error)

    if (error instanceof Error) {
      if (error.message.includes('Invalid JSON')) {
        return NextResponse.json({
          success: false,
          error: error.message
        }, { status: 400 })
      }

      if (error.message.includes('Queue service error')) {
        return NextResponse.json({
          success: false,
          error: 'Failed to queue invitations - queue service unavailable'
        }, { status: 503 })
      }
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to queue bulk invitations'
    }, { status: 500 })
  }
}

// OPTIONS handler for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
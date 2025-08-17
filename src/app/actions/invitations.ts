'use server'

import { db } from '@/lib/db'
import { guests, events } from '@/lib/db/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { 
  sendInvitationSchema,
  bulkSendInvitationsSchema,
  updateInvitationStatusSchema,
  type SendInvitationInput,
  type BulkSendInvitationsInput,
  type UpdateInvitationStatusInput
} from '@/lib/validations/invitations'
import { createRsvpUrl } from '@/lib/utils/tokens'

export type ActionResult<T = unknown> = {
  success: boolean
  data?: T
  error?: string
}

// Send invitation to a single guest
export async function sendInvitation(input: SendInvitationInput): Promise<ActionResult<{ sent: boolean }>> {
  try {
    // Validate input
    const validated = sendInvitationSchema.parse(input)
    
    // Get guest details
    const guest = await db
      .select({
        id: guests.id,
        name: guests.name,
        email: guests.email,
        phone: guests.phone,
        token: guests.token,
        eventId: guests.eventId,
      })
      .from(guests)
      .where(eq(guests.id, validated.guestId))
      .limit(1)
    
    if (guest.length === 0) {
      return {
        success: false,
        error: 'Guest not found'
      }
    }
    
    const guestData = guest[0]
    
    // Get event details
    const event = await db
      .select({
        name: events.name,
        date: events.date,
        time: events.time,
        location: events.location,
      })
      .from(events)
      .where(eq(events.id, guestData.eventId))
      .limit(1)
    
    if (event.length === 0) {
      return {
        success: false,
        error: 'Event not found'
      }
    }
    
    const eventData = event[0]
    
    // Generate RSVP URL
    const rsvpUrl = createRsvpUrl(guestData.token)
    
    // TODO: Implement actual email/SMS sending
    // For now, we'll just simulate the invitation being sent
    let sent = false
    
    switch (validated.method) {
      case 'email':
        if (guestData.email) {
          // TODO: Send email invitation
          console.log(`Sending email invitation to ${guestData.email}`)
          console.log(`RSVP URL: ${rsvpUrl}`)
          sent = true
        } else {
          return {
            success: false,
            error: 'Guest has no email address'
          }
        }
        break
        
      case 'sms':
        if (guestData.phone) {
          // TODO: Send SMS invitation
          console.log(`Sending SMS invitation to ${guestData.phone}`)
          console.log(`RSVP URL: ${rsvpUrl}`)
          sent = true
        } else {
          return {
            success: false,
            error: 'Guest has no phone number'
          }
        }
        break
        
      case 'manual':
        // Manual means we mark it as sent but don't actually send anything
        sent = true
        break
    }
    
    if (sent) {
      // Update guest invitation status
      await db
        .update(guests)
        .set({
          invitationStatus: 'sent',
          invitationSentAt: new Date(),
          invitationMethod: validated.method,
          updatedAt: new Date(),
        })
        .where(eq(guests.id, validated.guestId))
      
      console.log(`Invitation sent to guest: ${guestData.name}`)
    }
    
    return {
      success: true,
      data: { sent }
    }
  } catch (error) {
    console.error('Send invitation error:', error)
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send invitation'
    }
  }
}

// Send invitations to multiple guests
export async function bulkSendInvitations(input: BulkSendInvitationsInput): Promise<ActionResult<{ sent: number, failed: number }>> {
  try {
    // Validate input
    const validated = bulkSendInvitationsSchema.parse(input)
    
    let sent = 0
    let failed = 0
    const errors: string[] = []
    
    // Process each guest
    for (const guestId of validated.guestIds) {
      try {
        const result = await sendInvitation({
          guestId,
          method: validated.method,
          customMessage: validated.customMessage,
        })
        
        if (result.success && result.data?.sent) {
          sent++
        } else {
          failed++
          if (result.error) {
            errors.push(`Guest ${guestId}: ${result.error}`)
          }
        }
      } catch (error) {
        failed++
        errors.push(`Guest ${guestId}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        console.error(`Failed to send invitation to guest ${guestId}:`, error)
      }
    }
    
    console.log(`Bulk invitations completed: ${sent} sent, ${failed} failed`)
    
    return {
      success: true,
      data: { sent, failed },
      error: errors.length > 0 ? errors.join('; ') : undefined
    }
  } catch (error) {
    console.error('Bulk send invitations error:', error)
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send invitations'
    }
  }
}

// Update invitation status manually
export async function updateInvitationStatus(input: UpdateInvitationStatusInput): Promise<ActionResult<typeof guests.$inferSelect>> {
  try {
    // Validate input
    const validated = updateInvitationStatusSchema.parse(input)
    
    // Check if guest exists
    const existingGuest = await db.select().from(guests).where(eq(guests.id, validated.guestId)).limit(1)
    
    if (existingGuest.length === 0) {
      return {
        success: false,
        error: 'Guest not found'
      }
    }
    
    // Prepare update data
    const updateData: Partial<typeof guests.$inferInsert> = {
      invitationStatus: validated.status,
      updatedAt: new Date(),
    }
    
    if (validated.sentAt) {
      updateData.invitationSentAt = validated.sentAt
    }
    
    if (validated.method) {
      updateData.invitationMethod = validated.method
    }
    
    // Update guest invitation status
    const [updatedGuest] = await db
      .update(guests)
      .set(updateData)
      .where(eq(guests.id, validated.guestId))
      .returning()
    
    console.log('Guest invitation status updated:', updatedGuest.id)
    
    return {
      success: true,
      data: updatedGuest
    }
  } catch (error) {
    console.error('Update invitation status error:', error)
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update invitation status'
    }
  }
}

// Mark guests as invited (bulk operation)
export async function markGuestsAsInvited(guestIds: string[]): Promise<ActionResult<{ updated: number }>> {
  try {
    if (guestIds.length === 0) {
      return {
        success: false,
        error: 'No guests selected'
      }
    }
    
    // Update all selected guests
    await db
      .update(guests)
      .set({
        invitationStatus: 'sent',
        invitationSentAt: new Date(),
        invitationMethod: 'manual',
        updatedAt: new Date(),
      })
      .where(inArray(guests.id, guestIds))
    
    console.log(`Marked ${guestIds.length} guests as invited`)
    
    return {
      success: true,
      data: { updated: guestIds.length }
    }
  } catch (error) {
    console.error('Mark guests as invited error:', error)
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to mark guests as invited'
    }
  }
}
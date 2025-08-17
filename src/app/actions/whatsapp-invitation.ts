'use server'

import { db } from '@/lib/db'
import { guests } from '@/lib/db/schema'
import { eq, inArray, and, isNotNull } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

type ActionResult<T> = {
  success: boolean
  data?: T
  error?: string
}

/**
 * Mark a single guest's invitation as sent via WhatsApp
 */
export async function markWhatsAppInvitationSent(
  guestId: string
): Promise<ActionResult<typeof guests.$inferSelect>> {
  try {
    const [updatedGuest] = await db
      .update(guests)
      .set({
        invitationStatus: 'sent',
        invitationMethod: 'whatsapp',
        invitationSentAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(guests.id, guestId))
      .returning()

    if (!updatedGuest) {
      return {
        success: false,
        error: 'Guest not found'
      }
    }

    // Revalidate the events page to show updated status (skip in test environment)
    if (process.env.NODE_ENV !== 'test') {
      revalidatePath('/events')
    }
    
    return {
      success: true,
      data: updatedGuest
    }
  } catch (error) {
    console.error('Error marking WhatsApp invitation as sent:', error)
    return {
      success: false,
      error: 'Failed to update invitation status'
    }
  }
}

/**
 * Mark multiple guests' invitations as sent via WhatsApp
 */
export async function markBulkWhatsAppInvitationsSent(
  guestIds: string[]
): Promise<ActionResult<{ updatedCount: number }>> {
  try {
    if (guestIds.length === 0) {
      return {
        success: true,
        data: { updatedCount: 0 }
      }
    }

    // Filter out invalid UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const validUUIDs = guestIds.filter(id => uuidRegex.test(id))

    if (validUUIDs.length === 0) {
      return {
        success: true,
        data: { updatedCount: 0 }
      }
    }

    // First, get the guests to check which ones have phone numbers
    const guestsToUpdate = await db
      .select({ id: guests.id })
      .from(guests)
      .where(
        and(
          inArray(guests.id, validUUIDs),
          isNotNull(guests.phone)
        )
      )

    if (guestsToUpdate.length === 0) {
      return {
        success: true,
        data: { updatedCount: 0 }
      }
    }

    const validGuestIds = guestsToUpdate.map(g => g.id)

    // Update all valid guests
    const updatedGuests = await db
      .update(guests)
      .set({
        invitationStatus: 'sent',
        invitationMethod: 'whatsapp',
        invitationSentAt: new Date(),
        updatedAt: new Date()
      })
      .where(inArray(guests.id, validGuestIds))
      .returning({ id: guests.id })

    // Revalidate the events page to show updated status (skip in test environment)
    if (process.env.NODE_ENV !== 'test') {
      revalidatePath('/events')
    }
    
    return {
      success: true,
      data: { updatedCount: updatedGuests.length }
    }
  } catch (error) {
    console.error('Error marking bulk WhatsApp invitations as sent:', error)
    return {
      success: false,
      error: 'Failed to update invitation statuses'
    }
  }
}
'use server'

import { db } from '@/lib/db'
import { guests, rsvpResponses } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { 
  createGuestSchema, 
  updateGuestSchema, 
  deleteGuestSchema,
  bulkImportGuestsSchema,
  rsvpResponseSchema,
  updateRsvpResponseSchema,
  type CreateGuestInput,
  type UpdateGuestInput,
  type DeleteGuestInput,
  type BulkImportGuestsInput,
  type RsvpResponseInput,
  type UpdateRsvpResponseInput
} from '@/lib/validations/guests'
import { generateSecureToken } from '@/lib/utils/tokens'

export type ActionResult<T = unknown> = {
  success: boolean
  data?: T
  error?: string
}

export async function createGuest(input: CreateGuestInput): Promise<ActionResult<typeof guests.$inferSelect>> {
  try {
    // Validate input
    const validated = createGuestSchema.parse(input)
    
    // Generate unique token for RSVP link
    const token = generateSecureToken(32)
    
    // Create guest in database
    const [newGuest] = await db.insert(guests).values({
      eventId: validated.eventId,
      name: validated.name,
      email: validated.email || null,
      phone: validated.phone || null,
      token,
      maxGuests: validated.maxGuests,
      notes: validated.notes || null,
    }).returning()
    
    console.log('Guest created:', newGuest.id)
    
    return { 
      success: true, 
      data: newGuest 
    }
  } catch (error) {
    console.error('Create guest error:', error)
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to create guest'
    }
  }
}

export async function updateGuest(input: UpdateGuestInput): Promise<ActionResult<typeof guests.$inferSelect>> {
  try {
    // Validate input
    const validated = updateGuestSchema.parse(input)
    
    // Check if guest exists
    const existingGuest = await db.select().from(guests).where(eq(guests.id, validated.id)).limit(1)
    
    if (existingGuest.length === 0) {
      return {
        success: false,
        error: 'Guest not found'
      }
    }
    
    // Prepare update data (only include provided fields)
    const updateData: Partial<typeof guests.$inferInsert> = {}
    if (validated.name !== undefined) updateData.name = validated.name
    if (validated.email !== undefined) updateData.email = validated.email || null
    if (validated.phone !== undefined) updateData.phone = validated.phone || null
    if (validated.maxGuests !== undefined) updateData.maxGuests = validated.maxGuests
    if (validated.notes !== undefined) updateData.notes = validated.notes || null
    
    // Update guest in database
    const [updatedGuest] = await db
      .update(guests)
      .set({
        ...updateData,
        updatedAt: new Date()
      })
      .where(eq(guests.id, validated.id))
      .returning()
    
    console.log('Guest updated:', updatedGuest.id)
    
    return { 
      success: true, 
      data: updatedGuest 
    }
  } catch (error) {
    console.error('Update guest error:', error)
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update guest'
    }
  }
}

export async function deleteGuest(input: DeleteGuestInput): Promise<ActionResult<void>> {
  try {
    // Validate input
    const validated = deleteGuestSchema.parse(input)
    
    // Check if guest exists
    const existingGuest = await db.select().from(guests).where(eq(guests.id, validated.id)).limit(1)
    
    if (existingGuest.length === 0) {
      return {
        success: false,
        error: 'Guest not found'
      }
    }
    
    // Delete guest (cascading deletes will handle RSVP responses)
    await db.delete(guests).where(eq(guests.id, validated.id))
    
    console.log('Guest deleted:', validated.id)
    
    return { 
      success: true 
    }
  } catch (error) {
    console.error('Delete guest error:', error)
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to delete guest'
    }
  }
}

export async function bulkImportGuests(input: BulkImportGuestsInput): Promise<ActionResult<{ imported: number, failed: number }>> {
  try {
    // Validate input
    const validated = bulkImportGuestsSchema.parse(input)
    
    let imported = 0
    let failed = 0
    const errors: string[] = []
    
    // Process each guest
    for (const guestData of validated.guests) {
      try {
        const token = generateSecureToken(32)
        
        await db.insert(guests).values({
          eventId: validated.eventId,
          name: guestData.name,
          email: guestData.email || null,
          phone: guestData.phone || null,
          token,
          maxGuests: guestData.maxGuests || 1,
          notes: guestData.notes || null,
        })
        
        imported++
      } catch (error) {
        failed++
        errors.push(`Failed to import ${guestData.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        console.error(`Failed to import guest ${guestData.name}:`, error)
      }
    }
    
    console.log(`Bulk import completed: ${imported} imported, ${failed} failed`)
    
    return { 
      success: true, 
      data: { imported, failed },
      error: errors.length > 0 ? errors.join('; ') : undefined
    }
  } catch (error) {
    console.error('Bulk import error:', error)
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to import guests'
    }
  }
}

export async function createRsvpResponse(input: RsvpResponseInput): Promise<ActionResult<typeof rsvpResponses.$inferSelect>> {
  try {
    // Validate input
    const validated = rsvpResponseSchema.parse(input)
    
    // Check if guest exists
    const existingGuest = await db.select().from(guests).where(eq(guests.id, validated.guestId)).limit(1)
    
    if (existingGuest.length === 0) {
      return {
        success: false,
        error: 'Guest not found'
      }
    }
    
    // Check if RSVP already exists
    const existingRsvp = await db.select().from(rsvpResponses).where(eq(rsvpResponses.guestId, validated.guestId)).limit(1)
    
    if (existingRsvp.length > 0) {
      return {
        success: false,
        error: 'RSVP response already exists for this guest'
      }
    }
    
    // Create RSVP response
    const [newRsvp] = await db.insert(rsvpResponses).values({
      guestId: validated.guestId,
      status: validated.status,
      respondedAt: new Date(),
      numOfGuests: validated.numOfGuests,
      guestNames: validated.guestNames || null,
      message: validated.message || null,
    }).returning()
    
    console.log('RSVP response created:', newRsvp.id)
    
    return { 
      success: true, 
      data: newRsvp 
    }
  } catch (error) {
    console.error('Create RSVP response error:', error)
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to create RSVP response'
    }
  }
}

export async function updateRsvpResponse(input: UpdateRsvpResponseInput): Promise<ActionResult<typeof rsvpResponses.$inferSelect>> {
  try {
    // Validate input
    const validated = updateRsvpResponseSchema.parse(input)
    
    // Check if RSVP exists
    const existingRsvp = await db.select().from(rsvpResponses).where(eq(rsvpResponses.id, validated.id)).limit(1)
    
    if (existingRsvp.length === 0) {
      return {
        success: false,
        error: 'RSVP response not found'
      }
    }
    
    // Prepare update data
    const updateData: Partial<typeof rsvpResponses.$inferInsert> = {}
    if (validated.status !== undefined) updateData.status = validated.status
    if (validated.numOfGuests !== undefined) updateData.numOfGuests = validated.numOfGuests
    if (validated.guestNames !== undefined) updateData.guestNames = validated.guestNames || null
    if (validated.message !== undefined) updateData.message = validated.message || null
    
    // Update RSVP response
    const [updatedRsvp] = await db
      .update(rsvpResponses)
      .set({
        ...updateData,
        respondedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(rsvpResponses.id, validated.id))
      .returning()
    
    console.log('RSVP response updated:', updatedRsvp.id)
    
    return { 
      success: true, 
      data: updatedRsvp 
    }
  } catch (error) {
    console.error('Update RSVP response error:', error)
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update RSVP response'
    }
  }
}
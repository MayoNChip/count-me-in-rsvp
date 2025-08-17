'use server'

import { db } from '@/lib/db'
import { events } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { 
  createEventSchema, 
  updateEventSchema, 
  deleteEventSchema,
  type CreateEventInput,
  type UpdateEventInput,
  type DeleteEventInput
} from '@/lib/validations/events'

export type ActionResult<T = unknown> = {
  success: boolean
  data?: T
  error?: string
}

export async function createEvent(input: CreateEventInput): Promise<ActionResult<typeof events.$inferSelect>> {
  try {
    // Validate input
    const validated = createEventSchema.parse(input)
    
    // Create event in database
    const [newEvent] = await db.insert(events).values({
      name: validated.name,
      date: validated.date,
      time: validated.time || null,
      location: validated.location || null,
      description: validated.description || null,
      organizerEmail: validated.organizerEmail
    }).returning()
    
    console.log('Event created:', newEvent.id)
    
    return { 
      success: true, 
      data: newEvent 
    }
  } catch (error) {
    console.error('Create event error:', error)
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to create event'
    }
  }
}

export async function updateEvent(input: UpdateEventInput): Promise<ActionResult<typeof events.$inferSelect>> {
  try {
    // Validate input
    const validated = updateEventSchema.parse(input)
    
    // Check if event exists
    const existingEvent = await db.select().from(events).where(eq(events.id, validated.id)).limit(1)
    
    if (existingEvent.length === 0) {
      return {
        success: false,
        error: 'Event not found'
      }
    }
    
    // Prepare update data (only include provided fields)
    const updateData: Partial<typeof events.$inferInsert> = {}
    if (validated.name !== undefined) updateData.name = validated.name
    if (validated.date !== undefined) updateData.date = validated.date
    if (validated.time !== undefined) updateData.time = validated.time || null
    if (validated.location !== undefined) updateData.location = validated.location || null
    if (validated.description !== undefined) updateData.description = validated.description || null
    if (validated.organizerEmail !== undefined) updateData.organizerEmail = validated.organizerEmail
    
    // Update event in database
    const [updatedEvent] = await db
      .update(events)
      .set({
        ...updateData,
        updatedAt: new Date()
      })
      .where(eq(events.id, validated.id))
      .returning()
    
    console.log('Event updated:', updatedEvent.id)
    
    return { 
      success: true, 
      data: updatedEvent 
    }
  } catch (error) {
    console.error('Update event error:', error)
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update event'
    }
  }
}

export async function deleteEvent(input: DeleteEventInput): Promise<ActionResult<void>> {
  try {
    // Validate input
    const validated = deleteEventSchema.parse(input)
    
    // Check if event exists
    const existingEvent = await db.select().from(events).where(eq(events.id, validated.id)).limit(1)
    
    if (existingEvent.length === 0) {
      return {
        success: false,
        error: 'Event not found'
      }
    }
    
    // Delete event (cascading deletes will handle guests and RSVPs)
    await db.delete(events).where(eq(events.id, validated.id))
    
    console.log('Event deleted:', validated.id)
    
    return { 
      success: true 
    }
  } catch (error) {
    console.error('Delete event error:', error)
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to delete event'
    }
  }
}
'use server'

import { db } from '@/lib/db'
import { events, guests, rsvpResponses } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { isAfter, parseISO } from 'date-fns'
import { revalidatePath } from 'next/cache'

export type ActionResult<T = unknown> = {
  success: boolean
  data?: T
  error?: string
}

export type EventDetails = {
  id: string
  name: string
  date: string
  time: string | null
  location: string | null
  description: string | null
  invitationImageUrl: string | null
}

export type GuestWithEvent = {
  id: string
  eventId: string
  name: string
  email: string | null
  phone: string | null
  token: string
  maxGuests: number
  notes: string | null
  invitationStatus: string
  invitationSentAt: Date | null
  invitationMethod: string | null
  createdAt: Date
  updatedAt: Date
  rsvp: {
    id: string
    status: string
    respondedAt: Date | null
    numOfGuests: number
    guestNames: string | null
    message: string | null
  } | null
}

export type RsvpPageData = {
  guest: GuestWithEvent
  event: EventDetails
  canUpdate: boolean
}

/**
 * Fetch all necessary data for RSVP page using guest token
 * Validates token, retrieves guest and event information, and determines if updates are allowed
 */
export async function getRsvpPageData(token: string): Promise<ActionResult<RsvpPageData>> {
  try {
    // Validate token input
    if (!token || typeof token !== 'string') {
      return {
        success: false,
        error: 'RSVP token is required'
      }
    }

    // Basic token format validation (should be at least 16 characters)
    if (token.length < 16 || token.includes(' ')) {
      return {
        success: false,
        error: 'Invalid RSVP link'
      }
    }

    // Fetch guest with event details and RSVP response
    const result = await db
      .select({
        // Guest fields
        guestId: guests.id,
        guestEventId: guests.eventId,
        guestName: guests.name,
        guestEmail: guests.email,
        guestPhone: guests.phone,
        guestToken: guests.token,
        guestMaxGuests: guests.maxGuests,
        guestNotes: guests.notes,
        guestInvitationStatus: guests.invitationStatus,
        guestInvitationSentAt: guests.invitationSentAt,
        guestInvitationMethod: guests.invitationMethod,
        guestCreatedAt: guests.createdAt,
        guestUpdatedAt: guests.updatedAt,
        
        // Event fields
        eventId: events.id,
        eventName: events.name,
        eventDate: events.date,
        eventTime: events.time,
        eventLocation: events.location,
        eventDescription: events.description,
        eventInvitationImageUrl: events.invitationImageUrl,
        
        // RSVP fields
        rsvpId: rsvpResponses.id,
        rsvpStatus: rsvpResponses.status,
        rsvpRespondedAt: rsvpResponses.respondedAt,
        rsvpNumOfGuests: rsvpResponses.numOfGuests,
        rsvpGuestNames: rsvpResponses.guestNames,
        rsvpMessage: rsvpResponses.message,
      })
      .from(guests)
      .innerJoin(events, eq(guests.eventId, events.id))
      .leftJoin(rsvpResponses, eq(guests.id, rsvpResponses.guestId))
      .where(eq(guests.token, token))
      .limit(1)

    if (result.length === 0) {
      return {
        success: false,
        error: 'Invalid RSVP link'
      }
    }

    const data = result[0]

    // Transform the result to match our expected structure
    const guest: GuestWithEvent = {
      id: data.guestId,
      eventId: data.guestEventId,
      name: data.guestName,
      email: data.guestEmail,
      phone: data.guestPhone,
      token: data.guestToken,
      maxGuests: data.guestMaxGuests,
      notes: data.guestNotes,
      invitationStatus: data.guestInvitationStatus || 'not_sent',
      invitationSentAt: data.guestInvitationSentAt,
      invitationMethod: data.guestInvitationMethod,
      createdAt: data.guestCreatedAt,
      updatedAt: data.guestUpdatedAt,
      rsvp: data.rsvpId ? {
        id: data.rsvpId,
        status: data.rsvpStatus!,
        respondedAt: data.rsvpRespondedAt,
        numOfGuests: data.rsvpNumOfGuests!,
        guestNames: data.rsvpGuestNames,
        message: data.rsvpMessage,
      } : null
    }

    const event: EventDetails = {
      id: data.eventId,
      name: data.eventName,
      date: data.eventDate,
      time: data.eventTime,
      location: data.eventLocation,
      description: data.eventDescription,
      invitationImageUrl: data.eventInvitationImageUrl,
    }

    // Determine if the guest can still update their response
    // For now, we'll allow updates if the event date hasn't passed
    const eventDate = parseISO(data.eventDate)
    const today = new Date()
    const canUpdate = !isAfter(today, eventDate)

    return {
      success: true,
      data: {
        guest,
        event,
        canUpdate
      }
    }
  } catch (error) {
    console.error('Get RSVP page data error:', error)
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load RSVP information'
    }
  }
}

export type RsvpSubmissionData = {
  status: 'yes' | 'no' | 'maybe'
  numOfGuests: number
  guestNames: string | null
  message: string
}

/**
 * Submit or update RSVP response for a guest
 */
export async function submitRsvpResponse(token: string, data: RsvpSubmissionData): Promise<ActionResult> {
  try {
    // Validate inputs
    if (!token || typeof token !== 'string') {
      return {
        success: false,
        error: 'RSVP token is required'
      }
    }

    if (!data.status || !['yes', 'no', 'maybe'].includes(data.status)) {
      return {
        success: false,
        error: 'Valid response status is required'
      }
    }

    if (typeof data.numOfGuests !== 'number' || data.numOfGuests < 0) {
      return {
        success: false,
        error: 'Valid guest count is required'
      }
    }

    // Find the guest by token
    const guestResult = await db
      .select({
        id: guests.id,
        eventId: guests.eventId,
        maxGuests: guests.maxGuests,
        eventDate: events.date
      })
      .from(guests)
      .innerJoin(events, eq(guests.eventId, events.id))
      .where(eq(guests.token, token))
      .limit(1)

    if (guestResult.length === 0) {
      return {
        success: false,
        error: 'Invalid RSVP link'
      }
    }

    const guest = guestResult[0]

    // Check if event hasn't passed
    const eventDate = parseISO(guest.eventDate)
    const today = new Date()
    if (isAfter(today, eventDate)) {
      return {
        success: false,
        error: 'This event has already passed. RSVP responses are no longer accepted.'
      }
    }

    // Validate guest count doesn't exceed maximum
    if (data.numOfGuests > guest.maxGuests) {
      return {
        success: false,
        error: `You can bring a maximum of ${guest.maxGuests} guests`
      }
    }

    // Check if RSVP response already exists
    const existingRsvp = await db
      .select({ id: rsvpResponses.id })
      .from(rsvpResponses)
      .where(eq(rsvpResponses.guestId, guest.id))
      .limit(1)

    const rsvpData = {
      guestId: guest.id,
      status: data.status,
      numOfGuests: data.numOfGuests,
      guestNames: data.guestNames,
      message: data.message || null,
      respondedAt: new Date()
    }

    if (existingRsvp.length > 0) {
      // Update existing RSVP
      await db
        .update(rsvpResponses)
        .set({
          status: rsvpData.status,
          numOfGuests: rsvpData.numOfGuests,
          guestNames: rsvpData.guestNames,
          message: rsvpData.message,
          respondedAt: rsvpData.respondedAt
        })
        .where(eq(rsvpResponses.id, existingRsvp[0].id))
    } else {
      // Create new RSVP
      await db.insert(rsvpResponses).values(rsvpData)
    }

    // Revalidate the RSVP page to show updated data
    if (process.env.NODE_ENV !== 'test') {
      revalidatePath(`/rsvp/${token}`)
    }

    return {
      success: true,
      data: {
        status: data.status,
        numOfGuests: data.numOfGuests,
        message: data.message
      }
    }
  } catch (error) {
    console.error('Submit RSVP response error:', error)
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to submit RSVP response'
    }
  }
}
import { db } from '@/lib/db'
import { events, guests, rsvpResponses } from '@/lib/db/schema'
import { eq, and, count, isNull, isNotNull } from 'drizzle-orm'
import { generateSecureToken } from '@/lib/utils/tokens'

export type GuestWithRsvp = {
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
  rsvpStatus: string | null
  guestCount: number | null
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

export async function getGuestsByEvent(eventId: string): Promise<GuestWithRsvp[]> {
  try {
    const guestsWithRsvp = await db
      .select({
        id: guests.id,
        eventId: guests.eventId,
        name: guests.name,
        email: guests.email,
        phone: guests.phone,
        token: guests.token,
        maxGuests: guests.maxGuests,
        notes: guests.notes,
        invitationStatus: guests.invitationStatus,
        invitationSentAt: guests.invitationSentAt,
        invitationMethod: guests.invitationMethod,
        createdAt: guests.createdAt,
        updatedAt: guests.updatedAt,
        rsvpId: rsvpResponses.id,
        rsvpStatus: rsvpResponses.status,
        rsvpRespondedAt: rsvpResponses.respondedAt,
        rsvpNumOfGuests: rsvpResponses.numOfGuests,
        rsvpGuestNames: rsvpResponses.guestNames,
        rsvpMessage: rsvpResponses.message,
      })
      .from(guests)
      .leftJoin(rsvpResponses, eq(guests.id, rsvpResponses.guestId))
      .where(eq(guests.eventId, eventId))
      .orderBy(guests.name)

    // Transform the result to match our expected structure
    return guestsWithRsvp.map(guest => ({
      id: guest.id,
      eventId: guest.eventId,
      name: guest.name,
      email: guest.email,
      phone: guest.phone,
      token: guest.token,
      maxGuests: guest.maxGuests,
      notes: guest.notes,
      invitationStatus: guest.invitationStatus || 'not_sent',
      invitationSentAt: guest.invitationSentAt,
      invitationMethod: guest.invitationMethod,
      rsvpStatus: guest.rsvpStatus,
      guestCount: guest.rsvpNumOfGuests,
      createdAt: guest.createdAt,
      updatedAt: guest.updatedAt,
      rsvp: guest.rsvpId ? {
        id: guest.rsvpId,
        status: guest.rsvpStatus!,
        respondedAt: guest.rsvpRespondedAt,
        numOfGuests: guest.rsvpNumOfGuests!,
        guestNames: guest.rsvpGuestNames,
        message: guest.rsvpMessage,
      } : null
    }))
  } catch (error) {
    console.error('Error fetching guests:', error)
    throw new Error('Failed to fetch guests')
  }
}

export async function getGuestById(id: string): Promise<GuestWithRsvp | null> {
  try {
    const result = await db
      .select({
        id: guests.id,
        eventId: guests.eventId,
        name: guests.name,
        email: guests.email,
        phone: guests.phone,
        token: guests.token,
        maxGuests: guests.maxGuests,
        notes: guests.notes,
        invitationStatus: guests.invitationStatus,
        invitationSentAt: guests.invitationSentAt,
        invitationMethod: guests.invitationMethod,
        createdAt: guests.createdAt,
        updatedAt: guests.updatedAt,
        rsvpId: rsvpResponses.id,
        rsvpStatus: rsvpResponses.status,
        rsvpRespondedAt: rsvpResponses.respondedAt,
        rsvpNumOfGuests: rsvpResponses.numOfGuests,
        rsvpGuestNames: rsvpResponses.guestNames,
        rsvpMessage: rsvpResponses.message,
      })
      .from(guests)
      .leftJoin(rsvpResponses, eq(guests.id, rsvpResponses.guestId))
      .where(eq(guests.id, id))
      .limit(1)

    if (result.length === 0) {
      return null
    }

    const guest = result[0]
    return {
      id: guest.id,
      eventId: guest.eventId,
      name: guest.name,
      email: guest.email,
      phone: guest.phone,
      token: guest.token,
      maxGuests: guest.maxGuests,
      notes: guest.notes,
      invitationStatus: guest.invitationStatus || 'not_sent',
      invitationSentAt: guest.invitationSentAt,
      invitationMethod: guest.invitationMethod,
      rsvpStatus: guest.rsvpStatus,
      guestCount: guest.rsvpNumOfGuests,
      createdAt: guest.createdAt,
      updatedAt: guest.updatedAt,
      rsvp: guest.rsvpId ? {
        id: guest.rsvpId,
        status: guest.rsvpStatus!,
        respondedAt: guest.rsvpRespondedAt,
        numOfGuests: guest.rsvpNumOfGuests!,
        guestNames: guest.rsvpGuestNames,
        message: guest.rsvpMessage,
      } : null
    }
  } catch (error) {
    console.error('Error fetching guest:', error)
    throw new Error('Failed to fetch guest')
  }
}

export async function getGuestByToken(token: string): Promise<GuestWithRsvp | null> {
  try {
    const result = await db
      .select({
        id: guests.id,
        eventId: guests.eventId,
        name: guests.name,
        email: guests.email,
        phone: guests.phone,
        token: guests.token,
        maxGuests: guests.maxGuests,
        notes: guests.notes,
        invitationStatus: guests.invitationStatus,
        invitationSentAt: guests.invitationSentAt,
        invitationMethod: guests.invitationMethod,
        createdAt: guests.createdAt,
        updatedAt: guests.updatedAt,
        rsvpId: rsvpResponses.id,
        rsvpStatus: rsvpResponses.status,
        rsvpRespondedAt: rsvpResponses.respondedAt,
        rsvpNumOfGuests: rsvpResponses.numOfGuests,
        rsvpGuestNames: rsvpResponses.guestNames,
        rsvpMessage: rsvpResponses.message,
      })
      .from(guests)
      .leftJoin(rsvpResponses, eq(guests.id, rsvpResponses.guestId))
      .where(eq(guests.token, token))
      .limit(1)

    if (result.length === 0) {
      return null
    }

    const guest = result[0]
    return {
      id: guest.id,
      eventId: guest.eventId,
      name: guest.name,
      email: guest.email,
      phone: guest.phone,
      token: guest.token,
      maxGuests: guest.maxGuests,
      notes: guest.notes,
      invitationStatus: guest.invitationStatus || 'not_sent',
      invitationSentAt: guest.invitationSentAt,
      invitationMethod: guest.invitationMethod,
      rsvpStatus: guest.rsvpStatus,
      guestCount: guest.rsvpNumOfGuests,
      createdAt: guest.createdAt,
      updatedAt: guest.updatedAt,
      rsvp: guest.rsvpId ? {
        id: guest.rsvpId,
        status: guest.rsvpStatus!,
        respondedAt: guest.rsvpRespondedAt,
        numOfGuests: guest.rsvpNumOfGuests!,
        guestNames: guest.rsvpGuestNames,
        message: guest.rsvpMessage,
      } : null
    }
  } catch (error) {
    console.error('Error fetching guest by token:', error)
    throw new Error('Failed to fetch guest')
  }
}

export async function getGuestStats(eventId: string) {
  try {
    // Get total guests
    const totalGuests = await db
      .select({ count: count() })
      .from(guests)
      .where(eq(guests.eventId, eventId))

    // Get response statistics
    const responseStats = await db
      .select({
        status: rsvpResponses.status,
        count: count(),
      })
      .from(rsvpResponses)
      .innerJoin(guests, eq(guests.id, rsvpResponses.guestId))
      .where(eq(guests.eventId, eventId))
      .groupBy(rsvpResponses.status)

    // Get guests who haven't responded yet
    const noResponse = await db
      .select({ count: count() })
      .from(guests)
      .leftJoin(rsvpResponses, eq(guests.id, rsvpResponses.guestId))
      .where(and(
        eq(guests.eventId, eventId),
        isNull(rsvpResponses.id)
      ))

    // Calculate statistics
    const total = totalGuests[0]?.count || 0
    const responsesByStatus = responseStats.reduce((acc, stat) => {
      acc[stat.status as 'yes' | 'no' | 'maybe'] = stat.count
      return acc
    }, { yes: 0, no: 0, maybe: 0 })

    const responded = responsesByStatus.yes + responsesByStatus.no + responsesByStatus.maybe
    const pending = noResponse[0]?.count || 0

    return {
      total,
      responded,
      pending,
      yes: responsesByStatus.yes,
      no: responsesByStatus.no,
      maybe: responsesByStatus.maybe,
    }
  } catch (error) {
    console.error('Error fetching guest stats:', error)
    throw new Error('Failed to fetch guest statistics')
  }
}

// Helper function to generate secure tokens (we'll create this)
export { generateSecureToken }
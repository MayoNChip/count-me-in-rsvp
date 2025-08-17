import { db } from '@/lib/db'
import { events, guests, rsvpResponses } from '@/lib/db/schema'
import { eq, count, sql } from 'drizzle-orm'

export async function getEvents(organizerEmail?: string) {
  try {
    let query = db
      .select({
        id: events.id,
        name: events.name,
        date: events.date,
        time: events.time,
        location: events.location,
        description: events.description,
        organizerEmail: events.organizerEmail,
        createdAt: events.createdAt,
        updatedAt: events.updatedAt,
        guestCount: sql<number>`count(${guests.id})`.as('guest_count'),
      })
      .from(events)
      .leftJoin(guests, eq(events.id, guests.eventId))
      .groupBy(events.id)

    // If organizerEmail is provided, filter by it, otherwise show all events
    if (organizerEmail) {
      query = query.where(eq(events.organizerEmail, organizerEmail))
    }

    const eventList = await query.orderBy(events.date)

    return eventList
  } catch (error) {
    console.error('Error fetching events:', error)
    throw new Error('Failed to fetch events')
  }
}

export type EventWithStats = Awaited<ReturnType<typeof getEventById>>

export async function getEventById(id: string) {
  try {
    // Get event details
    const [event] = await db
      .select()
      .from(events)
      .where(eq(events.id, id))
      .limit(1)

    if (!event) {
      return null
    }

    // Get guest statistics
    const guestStats = await db
      .select({
        totalInvited: count(),
      })
      .from(guests)
      .where(eq(guests.eventId, id))

    const rsvpStats = await db
      .select({
        status: rsvpResponses.status,
        totalResponses: count(),
      })
      .from(rsvpResponses)
      .innerJoin(guests, eq(guests.id, rsvpResponses.guestId))
      .where(eq(guests.eventId, id))
      .groupBy(rsvpResponses.status)

    // Calculate statistics
    const totalInvited = guestStats[0]?.totalInvited || 0
    const responsesByStatus = rsvpStats.reduce((acc, stat) => {
      acc[stat.status as 'yes' | 'no' | 'maybe'] = stat.totalResponses
      return acc
    }, { yes: 0, no: 0, maybe: 0 })

    const totalResponded = responsesByStatus.yes + responsesByStatus.no + responsesByStatus.maybe
    const totalPending = totalInvited - totalResponded

    return {
      ...event,
      stats: {
        totalInvited,
        totalResponded,
        totalYes: responsesByStatus.yes,
        totalNo: responsesByStatus.no,
        totalMaybe: responsesByStatus.maybe,
        totalPending,
      }
    }
  } catch (error) {
    console.error('Error fetching event:', error)
    throw new Error('Failed to fetch event')
  }
}
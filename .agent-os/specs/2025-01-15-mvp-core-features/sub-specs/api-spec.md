# API Specification

This is the API specification for the spec detailed in @.agent-os/specs/2025-01-15-mvp-core-features/spec.md

> Created: 2025-01-15
> Version: 1.0.0

## API Architecture

Using Next.js 15 Server Actions for all data mutations and Server Components for data fetching with Drizzle ORM for type-safe database operations. This eliminates the need for traditional API routes while maintaining type safety and security.

## Server Actions

### Event Management

#### createEvent

**Purpose:** Create a new event
**Location:** `app/actions/events.ts`
**Parameters:**
```typescript
{
  name: string
  date: string // ISO date
  time?: string
  location?: string
  description?: string
  organizerEmail: string
}
```
**Returns:** `{ success: boolean, data?: Event, error?: string }`
**Validation:** Zod schema validation for all inputs

#### updateEvent

**Purpose:** Update existing event details
**Location:** `app/actions/events.ts`
**Parameters:**
```typescript
{
  id: string
  name?: string
  date?: string
  time?: string
  location?: string
  description?: string
}
```
**Returns:** `{ success: boolean, data?: Event, error?: string }`

#### deleteEvent

**Purpose:** Delete an event and all associated data
**Location:** `app/actions/events.ts`
**Parameters:** `{ id: string }`
**Returns:** `{ success: boolean, error?: string }`

### Guest Management

#### addGuest

**Purpose:** Add a guest to an event
**Location:** `app/actions/guests.ts`
**Parameters:**
```typescript
{
  eventId: string
  name: string
  email?: string
  phone?: string
  maxGuests?: number // Default: 1
  notes?: string
}
```
**Returns:** `{ success: boolean, data?: Guest, error?: string }`
**Notes:** Automatically generates unique token for RSVP link

#### updateGuest

**Purpose:** Update guest information
**Location:** `app/actions/guests.ts`
**Parameters:**
```typescript
{
  id: string
  name?: string
  email?: string
  phone?: string
  maxGuests?: number
  notes?: string
}
```
**Returns:** `{ success: boolean, data?: Guest, error?: string }`

#### deleteGuest

**Purpose:** Remove a guest from an event
**Location:** `app/actions/guests.ts`
**Parameters:** `{ id: string }`
**Returns:** `{ success: boolean, error?: string }`

#### bulkAddGuests

**Purpose:** Add multiple guests at once
**Location:** `app/actions/guests.ts`
**Parameters:**
```typescript
{
  eventId: string
  guests: Array<{
    name: string
    email?: string
    phone?: string
  }>
}
```
**Returns:** `{ success: boolean, data?: Guest[], error?: string }`

### RSVP Management

#### submitRsvp

**Purpose:** Submit or update RSVP response
**Location:** `app/actions/rsvp.ts`
**Parameters:**
```typescript
{
  guestToken: string
  status: 'yes' | 'no' | 'maybe'
  numOfGuests?: number // Required if status is 'yes', must be <= maxGuests
  guestNames?: string // Names of all attending guests
  message?: string
}
```
**Returns:** `{ success: boolean, data?: RsvpResponse, error?: string }`
**Public Access:** Yes (via guest token)
**Validation:** numOfGuests cannot exceed maxGuests set for the guest

#### getGuestByToken

**Purpose:** Retrieve guest and event details by RSVP token
**Location:** `app/actions/rsvp.ts`
**Parameters:** `{ token: string }`
**Returns:** `{ success: boolean, data?: { guest: Guest, event: Event, response?: RsvpResponse }, error?: string }`
**Public Access:** Yes

## Data Fetching Functions

### Events

#### getEvents

**Purpose:** Fetch all events for an organizer
**Location:** `app/lib/data/events.ts`
**Parameters:** `{ organizerEmail: string }`
**Returns:** `Promise<Event[]>`
**Usage:** Server Component data fetching

#### getEventById

**Purpose:** Fetch single event with statistics
**Location:** `app/lib/data/events.ts`
**Parameters:** `{ id: string }`
**Returns:** `Promise<EventWithStats | null>`

### Guests

#### getEventGuests

**Purpose:** Fetch all guests for an event with RSVP status
**Location:** `app/lib/data/guests.ts`
**Parameters:** `{ eventId: string }`
**Returns:** `Promise<GuestWithResponse[]>`

#### getGuestStatistics

**Purpose:** Get RSVP statistics for an event
**Location:** `app/lib/data/guests.ts`
**Parameters:** `{ eventId: string }`
**Returns:** 
```typescript
Promise<{
  totalInvited: number
  totalResponded: number
  totalYes: number
  totalNo: number
  totalMaybe: number
  totalPending: number
}>
```

## Authentication & Authorization

### Protected Actions

All event and guest management actions require authentication:
- Check for valid session via Supabase auth
- Verify organizer owns the event being modified
- Return unauthorized error if checks fail

### Public Actions

RSVP submission actions are public but require valid guest token:
- Validate token exists in database
- Ensure token matches guest record
- Allow guest to only modify their own response

## Error Handling

All Server Actions follow consistent error handling:

```typescript
try {
  // Validate input
  const validated = schema.parse(input)
  
  // Perform operation
  const result = await operation(validated)
  
  // Return success
  return { success: true, data: result }
} catch (error) {
  // Log error for debugging
  console.error('Action error:', error)
  
  // Return user-friendly error
  return { 
    success: false, 
    error: error instanceof Error ? error.message : 'An error occurred'
  }
}
```

## Rate Limiting

Implement rate limiting for public actions:
- RSVP submissions: 10 per minute per IP
- Guest token lookups: 20 per minute per IP
- Use middleware or service like Upstash for rate limiting

## Caching Strategy

Using TanStack Query for client-side caching:
- Event data: 5 minute stale time
- Guest lists: 1 minute stale time
- RSVP statistics: 30 second stale time
- Invalidate on mutations
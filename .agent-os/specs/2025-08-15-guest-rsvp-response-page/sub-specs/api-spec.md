# API Specification

This is the API specification for the spec detailed in @.agent-os/specs/2025-08-15-guest-rsvp-response-page/spec.md

> Created: 2025-08-15
> Version: 1.0.0

## Endpoints

### GET /rsvp/[token]

**Purpose:** Validate guest token and retrieve event/guest information for RSVP page
**Parameters:** 
- `token` (string, required) - Unique guest token from URL path
**Response:** HTML page with pre-loaded event and guest data
**Errors:** 
- 404 if token is invalid or expired
- 500 for server errors

### Server Actions

All RSVP operations will use existing Server Actions with potential additions:

### `getGuestByToken(token: string)`

**Purpose:** Retrieve guest and event information using secure token
**Parameters:**
- `token` (string) - Unique guest identifier
**Response:**
```typescript
{
  success: boolean
  data?: GuestWithRsvp & { event: EventDetails }
  error?: string
}
```

### `createRsvpResponse(input: CreateRsvpInput)` (existing)

**Purpose:** Create new RSVP response for guest
**Parameters:**
```typescript
{
  guestId: string
  status: 'yes' | 'no' | 'maybe'
  numOfGuests: number
  guestNames?: string
  message?: string
}
```

### `updateRsvpResponse(input: UpdateRsvpInput)` (existing)

**Purpose:** Update existing RSVP response
**Parameters:**
```typescript
{
  id: string
  status: 'yes' | 'no' | 'maybe'
  numOfGuests: number
  guestNames?: string
  message?: string
}
```

## New Server Action Required

### `getRsvpPageData(token: string)`

**Purpose:** Fetch all necessary data for RSVP page in single call
**Implementation:**
```typescript
export async function getRsvpPageData(token: string): Promise<ActionResult<{
  guest: GuestWithRsvp
  event: EventDetails
  canUpdate: boolean
}>> {
  // Validate token
  // Fetch guest with event details
  // Check if response deadline has passed
  // Return combined data
}
```

## Error Handling

### Invalid Token
- **Condition:** Token doesn't exist or is malformed
- **Response:** 404 page with friendly error message
- **User Action:** Contact event organizer

### Expired Event
- **Condition:** Event date has passed
- **Response:** Show event details but disable form
- **User Action:** Display "Event has ended" message

### Response Deadline Passed
- **Condition:** RSVP deadline has been reached
- **Response:** Show current response but disable editing
- **User Action:** Display "Response deadline passed" message

### Network Errors
- **Condition:** Database or server errors
- **Response:** Toast error with retry option
- **User Action:** Allow form resubmission
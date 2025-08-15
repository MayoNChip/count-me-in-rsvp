# Tests Specification

This is the tests coverage details for the spec detailed in @.agent-os/specs/2025-01-15-mvp-core-features/spec.md

> Created: 2025-01-15
> Version: 1.0.0

## Test Coverage

### Unit Tests

**Server Actions - Events**
- Test createEvent with valid data returns success
- Test createEvent with invalid data returns validation error
- Test updateEvent updates only provided fields
- Test deleteEvent removes event and cascades to guests
- Test authorization checks for event ownership

**Server Actions - Guests**
- Test addGuest creates guest with unique token
- Test addGuest prevents duplicate emails per event
- Test bulkAddGuests handles multiple guests efficiently
- Test updateGuest modifies guest data correctly
- Test deleteGuest removes guest and associated responses

**Server Actions - RSVP**
- Test submitRsvp creates new response for first submission
- Test submitRsvp updates existing response on resubmission
- Test getGuestByToken returns correct guest and event data
- Test invalid token returns appropriate error
- Test numOfGuests validation against maxGuests limit
- Test numOfGuests must be positive when status is 'yes'
- Test numOfGuests can be 0 when status is 'no'

**Data Validation**
- Test Zod schemas for event creation
- Test Zod schemas for guest creation
- Test Zod schemas for RSVP submission
- Test email format validation
- Test date/time format validation

### Integration Tests

**Event Management Flow**
- Create event → Add guests → View dashboard
- Update event details → Verify changes reflected
- Delete event → Verify cascade deletion of guests

**Guest Management Flow**
- Add single guest → Verify token generation
- Bulk add guests → Verify all created with unique tokens
- Update guest details → Verify changes saved
- Delete guest → Verify RSVP response also deleted

**RSVP Submission Flow**
- Access RSVP page with valid token → View event details
- Submit RSVP response → Receive confirmation
- Update RSVP response → Verify change saved
- Access with invalid token → Show error page

**Dashboard Statistics**
- Add guests → Verify count updates
- Submit RSVPs → Verify statistics update
- Change RSVP status → Verify counts adjust correctly

### Feature Tests (E2E)

**Complete Event Creation Workflow**
1. Navigate to homepage
2. Click "Create Event"
3. Fill in event details
4. Submit form
5. Verify redirect to event dashboard
6. Confirm event appears in list

**Complete RSVP Workflow**
1. Navigate to RSVP link with token
2. View event information
3. Select attendance status
4. Enter number of guests attending (if yes)
5. Enter guest names (optional)
6. Submit response
7. Verify confirmation page
8. Return and update response
9. Verify update saved

**Admin Dashboard Workflow**
1. Login as event organizer
2. View events list
3. Select specific event
4. View guest list with statuses
5. Add new guest
6. Edit existing guest
7. Delete guest
8. Verify statistics update

### Mocking Requirements

**Supabase Client**
- Mock database queries for unit tests
- Mock auth state for protected routes
- Mock real-time subscriptions for integration tests

**Email Service (Future)**
- Mock email sending for notification tests
- Verify email templates render correctly
- Test email queuing logic

**External APIs**
- Mock nanoid for predictable token generation in tests
- Mock date/time for consistent test results

## Test Configuration

### Test Environment Setup

```typescript
// Setup test database
- Use separate Supabase project for testing
- Reset database before each test suite
- Seed with known test data

// Setup test authentication
- Mock Supabase auth for unit tests
- Use test users for integration tests
```

### Test Data Factories

```typescript
// Event factory
createTestEvent(overrides?: Partial<Event>)

// Guest factory  
createTestGuest(eventId: string, overrides?: Partial<Guest>)

// RSVP Response factory
createTestResponse(guestId: string, overrides?: Partial<RsvpResponse>)
```

### Performance Tests

- Test bulk guest addition with 100+ guests
- Test dashboard loading with 500+ guests
- Test concurrent RSVP submissions
- Measure Server Action response times

### Accessibility Tests

- Test keyboard navigation through forms
- Test screen reader compatibility
- Test color contrast ratios
- Test focus management
- Test error message accessibility

## Test Execution Strategy

1. **Unit Tests First** - Write unit tests before implementation (TDD)
2. **Integration During Development** - Add integration tests as features connect
3. **E2E After Integration** - Full workflow tests once features are complete
4. **Performance Last** - Optimize based on performance test results

## Coverage Goals

- Unit Test Coverage: 80% minimum
- Integration Test Coverage: Critical paths 100%
- E2E Test Coverage: Main user workflows 100%
- Overall Coverage Target: 85%
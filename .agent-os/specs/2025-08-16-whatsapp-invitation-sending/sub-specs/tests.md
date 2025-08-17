# Tests Specification

This is the tests coverage details for the spec detailed in @.agent-os/specs/2025-08-16-whatsapp-invitation-sending/spec.md

> Created: 2025-08-16
> Version: 1.0.0

## Test Coverage

### Unit Tests

**TwilioService**
- Send message with valid phone number and template
- Handle invalid phone number format
- Handle Twilio API rate limiting
- Handle Twilio API errors
- Validate webhook signature correctly
- Reject invalid webhook signatures
- Parse webhook payload correctly
- Handle malformed webhook payloads

**TemplateService**
- Render template with all variables provided
- Handle missing required variables
- Validate template syntax
- Substitute variables correctly
- Handle special characters in variables
- Validate message length limits
- Load template from database
- Handle non-existent template gracefully

**QueueService**
- Queue single invitation correctly
- Queue bulk invitations with batching
- Apply rate limiting per account
- Process queue in FIFO order
- Handle retry logic for failed messages
- Respect max retry limits
- Schedule delayed retries correctly
- Update job status during processing

**WhatsAppController**
- Validate guest permissions before sending
- Validate event ownership
- Handle missing phone numbers
- Create invitation records correctly
- Update invitation status from webhooks
- Handle duplicate invitation attempts
- Rate limit per user correctly
- Return proper error responses

### Integration Tests

**WhatsApp Invitation Flow**
- Complete invitation sending process from dashboard to delivery
- Webhook status update end-to-end flow
- Bulk invitation sending with multiple guests
- Failed invitation retry mechanism
- Queue processing with multiple messages
- Rate limiting across multiple requests
- Database consistency during concurrent operations

**API Endpoint Integration**
- POST /api/whatsapp/send-invitation with valid data
- POST /api/whatsapp/send-invitation with invalid guest
- POST /api/whatsapp/send-bulk with multiple guests
- GET /api/whatsapp/status/{jobId} during processing
- GET /api/whatsapp/invitations/{eventId} with filters
- POST /api/whatsapp/retry/{invitationId} for failed invitation
- POST /api/whatsapp/webhook with Twilio payload

**Database Integration**
- WhatsApp invitation record creation
- Status updates from webhook processing
- Guest table synchronization
- Template loading and validation
- Retry count increments
- Cascade deletion with event/guest removal

### Feature Tests

**Guest Dashboard WhatsApp Integration**
- Display invitation status for each guest
- Show send WhatsApp button for guests with phone numbers
- Hide button for guests without phone numbers
- Update status in real-time when webhook received
- Display retry button for failed invitations
- Show bulk send option for multiple selected guests
- Display sending progress during bulk operations

**Invitation Sending Scenarios**
- Send invitation to guest with valid phone number
- Attempt to send to guest without phone number
- Send bulk invitations to mixed valid/invalid numbers
- Handle Twilio service downtime gracefully
- Process webhook updates in correct order
- Retry failed invitations automatically
- Respect rate limits during high-volume sending

**Template Management**
- Load default RSVP template
- Substitute all required variables
- Handle custom template variables
- Validate template before sending
- Fallback to default when custom template fails
- Preview template with sample data

### Mocking Requirements

**Twilio API Service**
- Mock message sending responses (success/failure)
- Mock rate limiting responses
- Mock webhook signature validation
- Mock different delivery status updates
- Simulate API timeouts and network errors

**Database Operations**
- Mock invitation record creation/updates
- Mock guest and event queries
- Mock template loading operations
- Mock concurrent access scenarios

**Queue System**
- Mock job creation and status tracking
- Mock queue processing delays
- Mock retry scheduling
- Mock queue failure scenarios

**Time-based Operations**
- Mock current timestamp for consistent testing
- Mock retry delay calculations
- Mock webhook timing sequences
- Mock rate limit reset timing

## Test Data Setup

### Guest Test Data
```typescript
const testGuests = [
  { id: 'guest-1', phone: '+15551234567', name: 'John Doe' },
  { id: 'guest-2', phone: '+15559876543', name: 'Jane Smith' },
  { id: 'guest-3', phone: null, name: 'Bob Johnson' }, // No phone
  { id: 'guest-4', phone: 'invalid-phone', name: 'Alice Brown' }, // Invalid format
];
```

### Event Test Data
```typescript
const testEvent = {
  id: 'event-1',
  name: 'Test Wedding',
  date: '2025-09-15',
  time: '18:00',
  location: 'Test Venue',
  organizerEmail: 'organizer@test.com'
};
```

### Template Test Data
```typescript
const testTemplate = {
  name: 'rsvp_invitation',
  content: 'Hi {{guest_name}}! You\'re invited to {{event_name}} on {{event_date}}. RSVP: {{rsvp_link}}',
  variables: ['guest_name', 'event_name', 'event_date', 'rsvp_link']
};
```

### Twilio Mock Responses
```typescript
const mockTwilioResponses = {
  success: { sid: 'SM1234567890', status: 'queued' },
  rateLimited: { code: 20429, message: 'Too Many Requests' },
  invalidNumber: { code: 21211, message: 'Invalid To number' },
  webhookPayload: {
    MessageSid: 'SM1234567890',
    MessageStatus: 'delivered',
    To: 'whatsapp:+15551234567',
    From: 'whatsapp:+15558157377'
  }
};
```

## Performance Testing

### Load Testing Scenarios
- Send 100 invitations simultaneously
- Process 500 webhook updates in 1 minute
- Handle 50 concurrent bulk sending requests
- Measure queue processing throughput
- Test database performance under load

### Rate Limiting Validation
- Verify Twilio rate limits are respected
- Test user rate limits work correctly
- Ensure fair queuing across multiple users
- Validate retry backoff timing

### Memory and Resource Usage
- Monitor memory usage during bulk operations
- Test queue cleanup after job completion
- Validate database connection pooling
- Check for memory leaks in long-running processes

## Error Recovery Testing

### Network Failure Scenarios
- Twilio API unavailable during sending
- Webhook delivery failures
- Database connection interruptions
- Queue system failures

### Data Consistency Testing
- Ensure invitation status consistency
- Validate retry count accuracy
- Test concurrent webhook processing
- Verify guest table synchronization

### Graceful Degradation
- Continue operation when queue is full
- Handle partial Twilio service outages
- Maintain user experience during errors
- Provide meaningful error messages
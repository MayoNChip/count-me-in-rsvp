# API Specification

This is the API specification for the spec detailed in @.agent-os/specs/2025-08-16-whatsapp-invitation-sending/spec.md

> Created: 2025-08-16
> Version: 1.0.0

## API Endpoints

### POST /api/whatsapp/send-invitation

**Purpose:** Send WhatsApp invitation to a single guest
**Authentication:** Required (event organizer)
**Rate Limit:** 10 requests per minute per user

**Parameters:**
```typescript
{
  guestId: string; // UUID of the guest
  templateName?: string; // Template to use (defaults to 'rsvp_invitation')
  customVariables?: Record<string, string>; // Override template variables
}
```

**Response:**
```typescript
{
  success: boolean;
  data?: {
    invitationId: string; // UUID of whatsapp_invitations record
    status: 'queued' | 'sent';
    estimatedDelivery?: string; // ISO timestamp
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}
```

**Errors:**
- `400` - Invalid guest ID or missing phone number
- `404` - Guest not found or not accessible by user
- `429` - Rate limit exceeded
- `500` - Twilio API error or internal server error

### POST /api/whatsapp/send-bulk

**Purpose:** Send WhatsApp invitations to multiple guests
**Authentication:** Required (event organizer)
**Rate Limit:** 1 request per minute per user

**Parameters:**
```typescript
{
  eventId: string; // UUID of the event
  guestIds: string[]; // Array of guest UUIDs (max 100)
  templateName?: string; // Template to use
  batchSize?: number; // Messages per batch (default: 10)
  delayBetweenBatches?: number; // Seconds between batches (default: 5)
}
```

**Response:**
```typescript
{
  success: boolean;
  data?: {
    jobId: string; // Background job identifier
    totalGuests: number;
    estimatedCompletion: string; // ISO timestamp
    batchInfo: {
      batchSize: number;
      totalBatches: number;
      delayBetweenBatches: number;
    };
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}
```

### GET /api/whatsapp/status/{jobId}

**Purpose:** Get status of bulk sending job
**Authentication:** Required (event organizer)

**Response:**
```typescript
{
  success: boolean;
  data?: {
    jobId: string;
    status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
    progress: {
      total: number;
      processed: number;
      successful: number;
      failed: number;
      percentage: number;
    };
    startedAt?: string; // ISO timestamp
    completedAt?: string; // ISO timestamp
    errors?: Array<{
      guestId: string;
      error: string;
    }>;
  };
}
```

### GET /api/whatsapp/invitations/{eventId}

**Purpose:** Get WhatsApp invitation status for all guests in an event
**Authentication:** Required (event organizer)

**Parameters:**
- `status?` - Filter by invitation status
- `limit?` - Number of results (default: 50, max: 100)
- `offset?` - Pagination offset

**Response:**
```typescript
{
  success: boolean;
  data?: {
    invitations: Array<{
      id: string;
      guestId: string;
      guestName: string;
      guestPhone: string;
      status: string;
      sentAt?: string;
      deliveredAt?: string;
      readAt?: string;
      failedAt?: string;
      errorMessage?: string;
      retryCount: number;
      canRetry: boolean;
    }>;
    pagination: {
      total: number;
      limit: number;
      offset: number;
      hasMore: boolean;
    };
  };
}
```

### POST /api/whatsapp/retry/{invitationId}

**Purpose:** Retry failed WhatsApp invitation
**Authentication:** Required (event organizer)

**Response:**
```typescript
{
  success: boolean;
  data?: {
    invitationId: string;
    status: 'queued';
    retryCount: number;
  };
  error?: {
    code: string;
    message: string;
  };
}
```

### POST /api/whatsapp/webhook

**Purpose:** Receive delivery status updates from Twilio
**Authentication:** Twilio signature validation
**Public Endpoint:** Yes (but secured with signature validation)

**Webhook Payload (from Twilio):**
```typescript
{
  MessageSid: string;
  MessageStatus: 'queued' | 'sent' | 'delivered' | 'read' | 'failed' | 'undelivered';
  To: string; // Phone number
  From: string; // Twilio WhatsApp number
  ErrorCode?: string;
  ErrorMessage?: string;
  Timestamp: string;
}
```

**Response:**
```typescript
{
  success: boolean;
  message: string;
}
```

## Controllers and Business Logic

### WhatsAppController

**sendInvitation**
- Validate guest ID and phone number
- Load event and guest data
- Check if invitation already exists and is recent
- Generate message from template
- Queue message for sending
- Return invitation tracking ID

**sendBulkInvitations**
- Validate event ID and guest IDs
- Check user permissions for event
- Create background job for bulk processing
- Return job tracking information

**getJobStatus**
- Query job status from queue system
- Return progress and completion information

**getInvitationStatus**
- Query WhatsApp invitations for event
- Apply filters and pagination
- Return formatted invitation data

**retryInvitation**
- Validate invitation ID and retry eligibility
- Reset invitation status and increment retry count
- Queue for resending

**handleWebhook**
- Validate Twilio signature
- Parse webhook payload
- Update invitation status in database
- Trigger real-time updates to dashboard

### TwilioService

**sendMessage**
- Format message using template
- Send via Twilio WhatsApp API
- Handle rate limiting and retries
- Return Twilio message SID

**validateWebhookSignature**
- Verify webhook came from Twilio
- Prevent spoofed status updates

### TemplateService

**renderTemplate**
- Load template by name
- Substitute variables with guest/event data
- Validate required variables are present
- Return formatted message

**validateTemplate**
- Check template syntax
- Verify all variables are defined
- Validate message length limits

### QueueService

**queueInvitation**
- Add message to sending queue
- Apply rate limiting
- Schedule based on priority and delays

**processQueue**
- Background worker to process queued messages
- Handle retries for failed messages
- Update status in database

## Error Handling

### Rate Limiting
- Implement exponential backoff for Twilio rate limits
- Queue messages when limits are hit
- Provide user feedback about delays

### Invalid Phone Numbers
- Validate phone number format before sending
- Mark as failed immediately for invalid numbers
- Provide clear error messages

### Template Errors
- Validate template variables before sending
- Fallback to default template if custom fails
- Log template errors for debugging

### Webhook Security
- Validate all incoming webhooks
- Log suspicious webhook attempts
- Gracefully handle malformed payloads
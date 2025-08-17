# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-08-16-whatsapp-invitation-sending/spec.md

> Created: 2025-08-16
> Version: 1.0.0

## Technical Requirements

- **Twilio WhatsApp API Integration**: Server-side implementation using Twilio Node.js SDK
- **Rate Limiting**: Respect Twilio's WhatsApp messaging limits (80 messages/second, 1000/hour for new numbers)
- **Message Templates**: Support for approved WhatsApp Business templates with variable substitution
- **Webhook Handling**: Process delivery status updates from Twilio in real-time
- **Queue Management**: Implement background job processing for bulk sending
- **Error Handling**: Comprehensive error handling for API failures, rate limits, and invalid numbers
- **Security**: Validate webhook signatures and sanitize user inputs
- **Database Transactions**: Atomic updates for invitation status changes

## Approach Options

**Option A: Simple Direct API Calls**
- Pros: Straightforward implementation, minimal dependencies
- Cons: No retry mechanism, limited scalability, blocking operations

**Option B: Queue-Based Processing with Background Jobs** (Selected)
- Pros: Scalable, non-blocking, retry support, rate limiting built-in
- Cons: More complex setup, requires queue infrastructure

**Option C: Third-party Service Integration**
- Pros: Managed infrastructure, advanced features
- Cons: Additional costs, vendor lock-in, less control

**Rationale:** Option B provides the best balance of reliability and scalability while maintaining control over the implementation. The queue-based approach ensures we can handle bulk sending without hitting rate limits and provides retry mechanisms for failed messages.

## External Dependencies

- **twilio** - Official Twilio Node.js SDK for WhatsApp API integration
  - **Justification:** Official SDK provides typed interfaces, automatic retries, and webhook validation
- **@vercel/kv** - Redis-compatible storage for queue management
  - **Justification:** Serverless-friendly Redis alternative for job queues and rate limiting
- **@vercel/cron** - Scheduled job processing for queue workers
  - **Justification:** Handles background job processing in serverless environment

## Implementation Strategy

### Phase 1: Core Twilio Integration
1. Set up Twilio client with environment variables
2. Create basic message sending functionality
3. Implement webhook endpoint for status updates
4. Add database fields for invitation tracking

### Phase 2: Template System
1. Create message template configuration
2. Implement template variable substitution
3. Add template validation and preview functionality

### Phase 3: Queue Management
1. Implement Redis-based job queue
2. Add rate limiting middleware
3. Create background worker for processing jobs
4. Add retry logic for failed messages

### Phase 4: UI Integration
1. Update guest dashboard with send buttons
2. Add invitation status display
3. Implement bulk selection and sending
4. Add real-time status updates

## Error Handling Strategy

- **Rate Limiting**: Exponential backoff with jitter for rate limit errors
- **Invalid Numbers**: Validate phone numbers before sending, mark as failed if invalid
- **Template Errors**: Validate template variables before sending
- **Network Issues**: Automatic retry with exponential backoff
- **Webhook Security**: Validate Twilio signatures to prevent spoofing
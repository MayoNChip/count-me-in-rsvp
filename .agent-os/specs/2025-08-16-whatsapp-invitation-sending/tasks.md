# Spec Tasks

These are the tasks to be completed for the spec detailed in @.agent-os/specs/2025-08-16-whatsapp-invitation-sending/spec.md

> Created: 2025-08-16
> Status: Ready for Implementation

## Tasks

- [ ] 1. Database Schema Updates and Migrations
  - [ ] 1.1 Write tests for new database schema
  - [ ] 1.2 Create migration for whatsapp_invitations table
  - [ ] 1.3 Create migration for whatsapp_templates table
  - [ ] 1.4 Update guests table enum values for WhatsApp statuses
  - [ ] 1.5 Add database triggers for status synchronization
  - [ ] 1.6 Insert default WhatsApp template
  - [ ] 1.7 Verify all migrations run successfully

- [x] 2. Twilio Integration Setup
  - [x] 2.1 Write tests for Twilio service
  - [x] 2.2 Install twilio SDK dependency
  - [x] 2.3 Create Twilio service class with message sending
  - [x] 2.4 Implement webhook signature validation
  - [x] 2.5 Add environment variables for Twilio configuration
  - [x] 2.6 Create error handling for Twilio API responses
  - [x] 2.7 Verify Twilio service tests pass

- [x] 3. Template System Implementation
  - [x] 3.1 Write tests for template service
  - [x] 3.2 Create template rendering service
  - [x] 3.3 Implement variable substitution logic
  - [x] 3.4 Add template validation and error handling
  - [x] 3.5 Create template preview functionality
  - [x] 3.6 Add template loading from database
  - [x] 3.7 Verify template service tests pass

- [ ] 4. Queue Management System
  - [ ] 4.1 Write tests for queue service
  - [ ] 4.2 Install @vercel/kv for Redis functionality
  - [ ] 4.3 Create job queue implementation
  - [ ] 4.4 Implement rate limiting middleware
  - [ ] 4.5 Create background worker for processing jobs
  - [ ] 4.6 Add retry logic for failed messages
  - [ ] 4.7 Verify queue service tests pass

- [ ] 5. API Endpoints Implementation
  - [ ] 5.1 Write tests for WhatsApp API endpoints
  - [ ] 5.2 Create POST /api/whatsapp/send-invitation endpoint
  - [ ] 5.3 Create POST /api/whatsapp/send-bulk endpoint
  - [ ] 5.4 Create GET /api/whatsapp/status/{jobId} endpoint
  - [ ] 5.5 Create GET /api/whatsapp/invitations/{eventId} endpoint
  - [ ] 5.6 Create POST /api/whatsapp/retry/{invitationId} endpoint
  - [ ] 5.7 Create POST /api/whatsapp/webhook endpoint
  - [ ] 5.8 Verify all API endpoint tests pass

- [ ] 6. UI Integration Updates
  - [ ] 6.1 Write tests for WhatsApp UI components
  - [ ] 6.2 Add WhatsApp send button to guest dashboard
  - [ ] 6.3 Update invitation status display for WhatsApp
  - [ ] 6.4 Implement bulk selection and sending interface
  - [ ] 6.5 Add real-time status updates via polling/websockets
  - [ ] 6.6 Create retry button for failed invitations
  - [ ] 6.7 Add progress indicator for bulk sending operations
  - [ ] 6.8 Verify all UI component tests pass
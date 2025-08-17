# Database Schema

This is the database schema implementation for the spec detailed in @.agent-os/specs/2025-08-16-whatsapp-invitation-sending/spec.md

> Created: 2025-08-16
> Version: 1.0.0

## Schema Changes

### Modifications to Existing Tables

#### guests table
The existing `guests` table already has most fields needed, but we'll extend the `invitation_status` and `invitation_method` fields to support WhatsApp-specific statuses:

**Updated ENUM values for invitation_status:**
- `not_sent` (existing)
- `queued` (new) - Message queued for sending
- `sent` (existing) - Message sent to Twilio
- `delivered` (new) - Message delivered to recipient's device
- `read` (new) - Message read by recipient
- `failed` (existing) - Message failed to send

**Updated ENUM values for invitation_method:**
- `email` (existing)
- `whatsapp` (new)
- `manual` (existing)

### New Tables

#### whatsapp_invitations
Track detailed WhatsApp invitation metadata and delivery status:

```sql
CREATE TABLE whatsapp_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  
  -- Twilio specific fields
  twilio_message_sid VARCHAR(50) UNIQUE, -- Twilio message identifier
  twilio_status VARCHAR(20), -- Twilio status: queued, sent, delivered, read, failed, undelivered
  twilio_error_code VARCHAR(10), -- Twilio error code if failed
  twilio_error_message TEXT, -- Detailed error message
  
  -- Message content
  template_name VARCHAR(100) NOT NULL, -- Template used for message
  template_variables JSONB, -- Variables used in template substitution
  message_content TEXT, -- Final message content sent
  
  -- Delivery tracking
  queued_at TIMESTAMP DEFAULT NOW(),
  sent_at TIMESTAMP, -- When message was sent to Twilio
  delivered_at TIMESTAMP, -- When message was delivered to device
  read_at TIMESTAMP, -- When message was read by recipient
  failed_at TIMESTAMP, -- When message failed
  
  -- Retry tracking
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  next_retry_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_whatsapp_invitations_guest_id ON whatsapp_invitations(guest_id);
CREATE INDEX idx_whatsapp_invitations_event_id ON whatsapp_invitations(event_id);
CREATE INDEX idx_whatsapp_invitations_twilio_sid ON whatsapp_invitations(twilio_message_sid);
CREATE INDEX idx_whatsapp_invitations_status ON whatsapp_invitations(twilio_status);
CREATE INDEX idx_whatsapp_invitations_next_retry ON whatsapp_invitations(next_retry_at) WHERE next_retry_at IS NOT NULL;
```

#### whatsapp_templates
Store and manage WhatsApp message templates:

```sql
CREATE TABLE whatsapp_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL, -- Template identifier
  display_name VARCHAR(200) NOT NULL, -- Human-readable name
  
  -- Template content
  content TEXT NOT NULL, -- Template with {{variables}}
  variables JSONB NOT NULL, -- Required variables definition
  
  -- Twilio integration
  twilio_template_id VARCHAR(100), -- If using Twilio templates
  is_approved BOOLEAN DEFAULT false, -- WhatsApp Business approval status
  
  -- Metadata
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Index for template lookup
CREATE INDEX idx_whatsapp_templates_name ON whatsapp_templates(name);
CREATE INDEX idx_whatsapp_templates_active ON whatsapp_templates(is_active) WHERE is_active = true;
```

## Migration Script

```sql
-- Add new enum values to existing invitation_status
ALTER TYPE invitation_status_enum ADD VALUE 'queued';
ALTER TYPE invitation_status_enum ADD VALUE 'delivered';
ALTER TYPE invitation_status_enum ADD VALUE 'read';

-- Add new enum values to existing invitation_method  
ALTER TYPE invitation_method_enum ADD VALUE 'whatsapp';

-- Create the new tables
-- (whatsapp_invitations and whatsapp_templates creation scripts from above)

-- Insert default WhatsApp template
INSERT INTO whatsapp_templates (name, display_name, content, variables, description, is_active) VALUES (
  'rsvp_invitation',
  'RSVP Invitation',
  'Hi {{guest_name}}! You''re invited to {{event_name}} on {{event_date}} at {{event_location}}. Please RSVP here: {{rsvp_link}}',
  '["guest_name", "event_name", "event_date", "event_location", "rsvp_link"]'::jsonb,
  'Standard RSVP invitation template for WhatsApp',
  true
);
```

## Rationale

### Separate WhatsApp Invitations Table
- **Detailed Tracking**: WhatsApp has rich delivery status that doesn't fit well in the generic guests table
- **Retry Logic**: Separate table allows complex retry scenarios without cluttering guests table
- **Audit Trail**: Complete history of invitation attempts and status changes
- **Twilio Integration**: Store Twilio-specific identifiers and error codes

### Template System
- **Consistency**: Ensures all messages follow approved templates
- **Compliance**: WhatsApp Business requires pre-approved templates
- **Flexibility**: Variables allow personalization while maintaining structure
- **Management**: Easy to update templates without code changes

### Database Performance
- **Indexes**: Strategic indexes on frequently queried fields
- **Partitioning Ready**: Structure supports future partitioning by event_id or date
- **JSON Storage**: JSONB for flexible template variables and metadata

## Data Integrity

### Constraints
- Foreign key relationships ensure referential integrity
- Unique constraints on Twilio message SIDs prevent duplicates
- Check constraints on retry counts prevent infinite loops

### Triggers
```sql
-- Update timestamp trigger for whatsapp_invitations
CREATE OR REPLACE FUNCTION update_whatsapp_invitations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_whatsapp_invitations_updated_at
  BEFORE UPDATE ON whatsapp_invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_whatsapp_invitations_updated_at();

-- Sync invitation status with guests table
CREATE OR REPLACE FUNCTION sync_guest_invitation_status()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE guests 
  SET 
    invitation_status = NEW.twilio_status,
    invitation_sent_at = COALESCE(NEW.sent_at, NEW.queued_at),
    invitation_method = 'whatsapp',
    updated_at = NOW()
  WHERE id = NEW.guest_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_guest_invitation_status
  AFTER INSERT OR UPDATE ON whatsapp_invitations
  FOR EACH ROW
  EXECUTE FUNCTION sync_guest_invitation_status();
```
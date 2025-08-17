# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-08-15-whatsapp-invitation-sending/spec.md

> Created: 2025-08-15
> Version: 1.0.0

## Technical Requirements

- **WhatsApp Web API** - Use `wa.me` URLs to open pre-filled messages
- **Phone Number Formatting** - Ensure international format (remove spaces, dashes, etc.)
- **Message Template Engine** - Dynamic message generation with placeholders
- **Client-Side Integration** - Handle WhatsApp opening in browser/app
- **Invitation Status Tracking** - Update database when invitations are sent via WhatsApp
- **Error Handling** - Graceful handling of missing phone numbers and formatting issues

## Approach Options

**Option A:** Simple URL Generation
- Pros: No external dependencies, works on all devices, immediate implementation
- Cons: Requires user to manually send each message, no automation

**Option B:** WhatsApp Business API Integration (Selected for Future)
- Pros: Fully automated sending, delivery tracking, professional appearance
- Cons: Requires business verification, monthly costs, complex setup

**Option C:** Third-party Services (Twilio, etc.)
- Pros: Easier than Business API, good reliability
- Cons: Additional costs, vendor lock-in, still requires approval

**Rationale:** Option A provides immediate value with zero cost and complexity. Can upgrade to Option B later when the app has paying customers.

## External Dependencies

- **None** - Uses native WhatsApp Web integration via URLs

## Technical Architecture

### WhatsApp URL Format
```
https://wa.me/[phone_number]?text=[encoded_message]
```

### Message Template Structure
```typescript
interface WhatsAppTemplate {
  subject: string
  message: string
  placeholders: {
    guestName: string
    eventName: string
    eventDate: string
    eventLocation: string
    rsvpUrl: string
  }
}
```

### Component Integration
```
components/guests/
├── whatsapp-send-button.tsx     # Individual send button
├── whatsapp-bulk-dialog.tsx     # Bulk send interface  
└── whatsapp-template-editor.tsx # Message customization
```

### Server Actions
```typescript
// Mark invitation as sent via WhatsApp
async function markWhatsAppInvitationSent(guestId: string)

// Generate WhatsApp URL with message
async function generateWhatsAppUrl(guestId: string, customMessage?: string)

// Bulk generate WhatsApp URLs
async function generateBulkWhatsAppUrls(guestIds: string[], customMessage?: string)
```

### Phone Number Processing
```typescript
// Clean and format phone number for WhatsApp
function formatPhoneForWhatsApp(phone: string): string {
  // Remove all non-digits except +
  // Ensure international format
  // Validate length and format
}
```
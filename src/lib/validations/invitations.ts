import { z } from 'zod'

// Invitation status enum
export const InvitationStatus = {
  NOT_SENT: 'not_sent',
  SENT: 'sent',
  DELIVERED: 'delivered',
  FAILED: 'failed',
  BOUNCED: 'bounced',
} as const

export type InvitationStatusType = typeof InvitationStatus[keyof typeof InvitationStatus]

// Invitation method enum
export const InvitationMethod = {
  EMAIL: 'email',
  SMS: 'sms',
  MANUAL: 'manual',
} as const

export type InvitationMethodType = typeof InvitationMethod[keyof typeof InvitationMethod]

// Send invitation schema
export const sendInvitationSchema = z.object({
  guestId: z.string().uuid('Valid guest ID is required'),
  method: z.enum(['email', 'sms', 'manual'], { required_error: 'Invitation method is required' }),
  customMessage: z.string().optional(),
})

// Bulk send invitations schema
export const bulkSendInvitationsSchema = z.object({
  eventId: z.string().uuid('Valid event ID is required'),
  guestIds: z.array(z.string().uuid()).min(1, 'At least one guest must be selected'),
  method: z.enum(['email', 'sms', 'manual'], { required_error: 'Invitation method is required' }),
  customMessage: z.string().optional(),
})

// Update invitation status schema
export const updateInvitationStatusSchema = z.object({
  guestId: z.string().uuid('Valid guest ID is required'),
  status: z.enum(['not_sent', 'sent', 'delivered', 'failed', 'bounced'], { 
    required_error: 'Invitation status is required' 
  }),
  sentAt: z.date().optional(),
  method: z.enum(['email', 'sms', 'manual']).optional(),
})

// Export types
export type SendInvitationInput = z.infer<typeof sendInvitationSchema>
export type BulkSendInvitationsInput = z.infer<typeof bulkSendInvitationsSchema>
export type UpdateInvitationStatusInput = z.infer<typeof updateInvitationStatusSchema>
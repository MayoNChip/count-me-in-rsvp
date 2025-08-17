import { z } from 'zod'

// Base guest schema for common fields
const baseGuestSchema = {
  name: z.string().min(1, 'Guest name is required').max(255, 'Name too long'),
  email: z.string().email('Valid email is required').optional().or(z.literal('')),
  phone: z.string().max(50, 'Phone number too long').optional().or(z.literal('')),
  maxGuests: z.number().min(1, 'Must allow at least 1 guest').max(10, 'Maximum 10 guests allowed').default(1),
  notes: z.string().optional().or(z.literal('')),
}

// Create guest schema
export const createGuestSchema = z.object({
  eventId: z.string().uuid('Valid event ID is required'),
  ...baseGuestSchema,
})

// Update guest schema
export const updateGuestSchema = z.object({
  id: z.string().uuid('Valid guest ID is required'),
  eventId: z.string().uuid('Valid event ID is required').optional(),
  ...baseGuestSchema,
}).partial().required({ id: true })

// Delete guest schema
export const deleteGuestSchema = z.object({
  id: z.string().uuid('Valid guest ID is required'),
})

// Get guests schema
export const getGuestsSchema = z.object({
  eventId: z.string().uuid('Valid event ID is required'),
})

// Bulk import schema
export const bulkImportGuestsSchema = z.object({
  eventId: z.string().uuid('Valid event ID is required'),
  guests: z.array(z.object({
    name: z.string().min(1, 'Guest name is required'),
    email: z.string().email('Valid email required').optional(),
    phone: z.string().optional(),
    maxGuests: z.number().min(1).max(10).default(1),
    notes: z.string().optional(),
  })).min(1, 'At least one guest required'),
})

// RSVP response schema
export const rsvpResponseSchema = z.object({
  guestId: z.string().uuid('Valid guest ID is required'),
  status: z.enum(['yes', 'no', 'maybe'], { required_error: 'RSVP status is required' }),
  numOfGuests: z.number().min(0, 'Number of guests cannot be negative').max(10, 'Maximum 10 guests'),
  guestNames: z.string().optional().or(z.literal('')),
  message: z.string().optional().or(z.literal('')),
})

// Update RSVP response schema
export const updateRsvpResponseSchema = z.object({
  id: z.string().uuid('Valid RSVP ID is required'),
  status: z.enum(['yes', 'no', 'maybe']).optional(),
  numOfGuests: z.number().min(0).max(10).optional(),
  guestNames: z.string().optional().or(z.literal('')),
  message: z.string().optional().or(z.literal('')),
}).partial().required({ id: true })

// Guest token verification schema
export const verifyGuestTokenSchema = z.object({
  token: z.string().min(1, 'Guest token is required'),
})

// Export types
export type CreateGuestInput = z.infer<typeof createGuestSchema>
export type UpdateGuestInput = z.infer<typeof updateGuestSchema>
export type DeleteGuestInput = z.infer<typeof deleteGuestSchema>
export type GetGuestsInput = z.infer<typeof getGuestsSchema>
export type BulkImportGuestsInput = z.infer<typeof bulkImportGuestsSchema>
export type RsvpResponseInput = z.infer<typeof rsvpResponseSchema>
export type UpdateRsvpResponseInput = z.infer<typeof updateRsvpResponseSchema>
export type VerifyGuestTokenInput = z.infer<typeof verifyGuestTokenSchema>

// Guest status enum for UI
export const GuestStatus = {
  INVITED: 'invited',
  RESPONDED: 'responded',
  YES: 'yes',
  NO: 'no',
  MAYBE: 'maybe',
} as const

export type GuestStatusType = typeof GuestStatus[keyof typeof GuestStatus]
import { z } from 'zod'

export const createEventSchema = z.object({
  name: z.string().min(1, 'Event name is required').max(255, 'Event name is too long'),
  date: z.string().min(1, 'Event date is required').regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  time: z.string().optional(),
  location: z.string().optional(),
  description: z.string().optional(),
  organizerEmail: z.string().email('Valid email is required')
})

export const updateEventSchema = z.object({
  id: z.string().uuid('Valid event ID is required'),
  name: z.string().min(1, 'Event name is required').max(255, 'Event name is too long').optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
  time: z.string().optional(),
  location: z.string().optional(),
  description: z.string().optional(),
  organizerEmail: z.string().email('Valid email is required').optional()
})

export const deleteEventSchema = z.object({
  id: z.string().uuid('Valid event ID is required').min(1, 'Event ID is required')
})

export type CreateEventInput = z.infer<typeof createEventSchema>
export type UpdateEventInput = z.infer<typeof updateEventSchema>
export type DeleteEventInput = z.infer<typeof deleteEventSchema>
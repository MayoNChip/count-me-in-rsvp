import { pgTable, uuid, varchar, text, date, time, timestamp, integer, jsonb, boolean, pgEnum } from 'drizzle-orm/pg-core';

// Enums for invitation status and method
export const invitationStatusEnum = pgEnum('invitation_status', [
  'not_sent',
  'queued', 
  'sent',
  'delivered',
  'read',
  'failed'
]);

export const invitationMethodEnum = pgEnum('invitation_method', [
  'email',
  'whatsapp',
  'manual'
]);

export const events = pgTable('events', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  date: date('date').notNull(),
  time: time('time'),
  location: text('location'),
  description: text('description'),
  organizerEmail: varchar('organizer_email', { length: 255 }).notNull(),
  invitationImageUrl: text('invitation_image_url'),
  invitationImageFilename: varchar('invitation_image_filename', { length: 255 }),
  invitationImageSize: integer('invitation_image_size'),
  invitationImageUploadedAt: timestamp('invitation_image_uploaded_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const guests = pgTable('guests', {
  id: uuid('id').defaultRandom().primaryKey(),
  eventId: uuid('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  token: varchar('token', { length: 255 }).unique().notNull(),
  maxGuests: integer('max_guests').default(1).notNull(),
  notes: text('notes'),
  invitationStatus: invitationStatusEnum('invitation_status').default('not_sent').notNull(),
  invitationSentAt: timestamp('invitation_sent_at'),
  invitationMethod: invitationMethodEnum('invitation_method').default('email'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const rsvpResponses = pgTable('rsvp_responses', {
  id: uuid('id').defaultRandom().primaryKey(),
  guestId: uuid('guest_id').notNull().references(() => guests.id, { onDelete: 'cascade' }),
  status: varchar('status', { length: 20 }).notNull(),
  respondedAt: timestamp('responded_at'),
  numOfGuests: integer('num_of_guests').default(1).notNull(),
  guestNames: text('guest_names'),
  message: text('message'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const whatsappTemplates = pgTable('whatsapp_templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 100 }).unique().notNull(),
  displayName: varchar('display_name', { length: 200 }).notNull(),
  content: text('content').notNull(),
  variables: jsonb('variables').notNull(),
  twilioTemplateId: varchar('twilio_template_id', { length: 100 }),
  isApproved: boolean('is_approved').default(false),
  description: text('description'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const whatsappInvitations = pgTable('whatsapp_invitations', {
  id: uuid('id').defaultRandom().primaryKey(),
  guestId: uuid('guest_id').notNull().references(() => guests.id, { onDelete: 'cascade' }),
  eventId: uuid('event_id').notNull().references(() => events.id, { onDelete: 'cascade' }),
  
  // Twilio specific fields
  twilioMessageSid: varchar('twilio_message_sid', { length: 50 }).unique(),
  twilioStatus: varchar('twilio_status', { length: 20 }),
  twilioErrorCode: varchar('twilio_error_code', { length: 10 }),
  twilioErrorMessage: text('twilio_error_message'),
  
  // Message content
  templateName: varchar('template_name', { length: 100 }).notNull(),
  templateVariables: jsonb('template_variables'),
  messageContent: text('message_content'),
  
  // Delivery tracking
  queuedAt: timestamp('queued_at').defaultNow(),
  sentAt: timestamp('sent_at'),
  deliveredAt: timestamp('delivered_at'),
  readAt: timestamp('read_at'),
  failedAt: timestamp('failed_at'),
  
  // Retry tracking
  retryCount: integer('retry_count').default(0),
  maxRetries: integer('max_retries').default(3),
  nextRetryAt: timestamp('next_retry_at'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;

export type Guest = typeof guests.$inferSelect;
export type NewGuest = typeof guests.$inferInsert;

export type RsvpResponse = typeof rsvpResponses.$inferSelect;
export type NewRsvpResponse = typeof rsvpResponses.$inferInsert;

export type WhatsappTemplate = typeof whatsappTemplates.$inferSelect;
export type NewWhatsappTemplate = typeof whatsappTemplates.$inferInsert;

export type WhatsappInvitation = typeof whatsappInvitations.$inferSelect;
export type NewWhatsappInvitation = typeof whatsappInvitations.$inferInsert;
import { pgTable, uuid, varchar, text, date, time, timestamp, integer, boolean } from 'drizzle-orm/pg-core';

export const events = pgTable('events', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  date: date('date').notNull(),
  time: time('time'),
  location: text('location'),
  description: text('description'),
  organizerEmail: varchar('organizer_email', { length: 255 }).notNull(),
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

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;

export type Guest = typeof guests.$inferSelect;
export type NewGuest = typeof guests.$inferInsert;

export type RsvpResponse = typeof rsvpResponses.$inferSelect;
export type NewRsvpResponse = typeof rsvpResponses.$inferInsert;
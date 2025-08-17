import { pgTable, uuid, varchar, date, time, text, timestamp, foreignKey, integer, unique, jsonb, boolean, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const invitationMethod = pgEnum("invitation_method", ['email', 'whatsapp', 'manual'])
export const invitationStatus = pgEnum("invitation_status", ['not_sent', 'queued', 'sent', 'delivered', 'read', 'failed'])


export const events = pgTable("events", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	date: date().notNull(),
	time: time(),
	location: text(),
	description: text(),
	organizerEmail: varchar("organizer_email", { length: 255 }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const rsvpResponses = pgTable("rsvp_responses", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	guestId: uuid("guest_id").notNull(),
	status: varchar({ length: 20 }).notNull(),
	respondedAt: timestamp("responded_at", { mode: 'string' }),
	numOfGuests: integer("num_of_guests").default(1).notNull(),
	guestNames: text("guest_names"),
	message: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.guestId],
			foreignColumns: [guests.id],
			name: "rsvp_responses_guest_id_guests_id_fk"
		}).onDelete("cascade"),
]);

export const guests = pgTable("guests", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	eventId: uuid("event_id").notNull(),
	name: varchar({ length: 255 }).notNull(),
	email: varchar({ length: 255 }),
	phone: varchar({ length: 50 }),
	token: varchar({ length: 255 }).notNull(),
	maxGuests: integer("max_guests").default(1).notNull(),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	invitationStatus: invitationStatus("invitation_status").default('not_sent').notNull(),
	invitationSentAt: timestamp("invitation_sent_at", { mode: 'string' }),
	invitationMethod: invitationMethod("invitation_method").default('email'),
}, (table) => [
	foreignKey({
			columns: [table.eventId],
			foreignColumns: [events.id],
			name: "guests_event_id_events_id_fk"
		}).onDelete("cascade"),
	unique("guests_token_unique").on(table.token),
]);

export const whatsappTemplates = pgTable("whatsapp_templates", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: varchar({ length: 100 }).notNull(),
	displayName: varchar("display_name", { length: 200 }).notNull(),
	content: text().notNull(),
	variables: jsonb().notNull(),
	twilioTemplateId: varchar("twilio_template_id", { length: 100 }),
	isApproved: boolean("is_approved").default(false),
	description: text(),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("whatsapp_templates_name_unique").on(table.name),
]);

export const whatsappInvitations = pgTable("whatsapp_invitations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	guestId: uuid("guest_id").notNull(),
	eventId: uuid("event_id").notNull(),
	twilioMessageSid: varchar("twilio_message_sid", { length: 50 }),
	twilioStatus: varchar("twilio_status", { length: 20 }),
	twilioErrorCode: varchar("twilio_error_code", { length: 10 }),
	twilioErrorMessage: text("twilio_error_message"),
	templateName: varchar("template_name", { length: 100 }).notNull(),
	templateVariables: jsonb("template_variables"),
	messageContent: text("message_content"),
	queuedAt: timestamp("queued_at", { mode: 'string' }).defaultNow(),
	sentAt: timestamp("sent_at", { mode: 'string' }),
	deliveredAt: timestamp("delivered_at", { mode: 'string' }),
	readAt: timestamp("read_at", { mode: 'string' }),
	failedAt: timestamp("failed_at", { mode: 'string' }),
	retryCount: integer("retry_count").default(0),
	maxRetries: integer("max_retries").default(3),
	nextRetryAt: timestamp("next_retry_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.eventId],
			foreignColumns: [events.id],
			name: "whatsapp_invitations_event_id_events_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.guestId],
			foreignColumns: [guests.id],
			name: "whatsapp_invitations_guest_id_guests_id_fk"
		}).onDelete("cascade"),
	unique("whatsapp_invitations_twilio_message_sid_unique").on(table.twilioMessageSid),
]);

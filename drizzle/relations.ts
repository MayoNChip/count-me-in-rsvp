import { relations } from "drizzle-orm/relations";
import { guests, rsvpResponses, events, whatsappInvitations } from "./schema";

export const rsvpResponsesRelations = relations(rsvpResponses, ({one}) => ({
	guest: one(guests, {
		fields: [rsvpResponses.guestId],
		references: [guests.id]
	}),
}));

export const guestsRelations = relations(guests, ({one, many}) => ({
	rsvpResponses: many(rsvpResponses),
	event: one(events, {
		fields: [guests.eventId],
		references: [events.id]
	}),
	whatsappInvitations: many(whatsappInvitations),
}));

export const eventsRelations = relations(events, ({many}) => ({
	guests: many(guests),
	whatsappInvitations: many(whatsappInvitations),
}));

export const whatsappInvitationsRelations = relations(whatsappInvitations, ({one}) => ({
	event: one(events, {
		fields: [whatsappInvitations.eventId],
		references: [events.id]
	}),
	guest: one(guests, {
		fields: [whatsappInvitations.guestId],
		references: [guests.id]
	}),
}));
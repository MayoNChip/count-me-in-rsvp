CREATE TYPE "public"."invitation_method" AS ENUM('email', 'whatsapp', 'manual');--> statement-breakpoint
CREATE TYPE "public"."invitation_status" AS ENUM('not_sent', 'queued', 'sent', 'delivered', 'read', 'failed');--> statement-breakpoint
CREATE TABLE "whatsapp_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guest_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"twilio_message_sid" varchar(50),
	"twilio_status" varchar(20),
	"twilio_error_code" varchar(10),
	"twilio_error_message" text,
	"template_name" varchar(100) NOT NULL,
	"template_variables" jsonb,
	"message_content" text,
	"queued_at" timestamp DEFAULT now(),
	"sent_at" timestamp,
	"delivered_at" timestamp,
	"read_at" timestamp,
	"failed_at" timestamp,
	"retry_count" integer DEFAULT 0,
	"max_retries" integer DEFAULT 3,
	"next_retry_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "whatsapp_invitations_twilio_message_sid_unique" UNIQUE("twilio_message_sid")
);
--> statement-breakpoint
CREATE TABLE "whatsapp_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"display_name" varchar(200) NOT NULL,
	"content" text NOT NULL,
	"variables" jsonb NOT NULL,
	"twilio_template_id" varchar(100),
	"is_approved" boolean DEFAULT false,
	"description" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "whatsapp_templates_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "guests" ALTER COLUMN "invitation_status" SET DEFAULT 'not_sent'::"public"."invitation_status";--> statement-breakpoint
ALTER TABLE "guests" ALTER COLUMN "invitation_status" SET DATA TYPE "public"."invitation_status" USING "invitation_status"::"public"."invitation_status";--> statement-breakpoint
ALTER TABLE "guests" ALTER COLUMN "invitation_method" SET DEFAULT 'email'::"public"."invitation_method";--> statement-breakpoint
ALTER TABLE "guests" ALTER COLUMN "invitation_method" SET DATA TYPE "public"."invitation_method" USING "invitation_method"::"public"."invitation_method";--> statement-breakpoint
ALTER TABLE "whatsapp_invitations" ADD CONSTRAINT "whatsapp_invitations_guest_id_guests_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_invitations" ADD CONSTRAINT "whatsapp_invitations_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "guests" ADD COLUMN "invitation_status" varchar(20) DEFAULT 'not_sent' NOT NULL;--> statement-breakpoint
ALTER TABLE "guests" ADD COLUMN "invitation_sent_at" timestamp;--> statement-breakpoint
ALTER TABLE "guests" ADD COLUMN "invitation_method" varchar(20) DEFAULT 'email';
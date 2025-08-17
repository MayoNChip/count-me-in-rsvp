ALTER TABLE "events" ADD COLUMN "invitation_image_url" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "invitation_image_filename" varchar(255);--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "invitation_image_size" integer;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "invitation_image_uploaded_at" timestamp;
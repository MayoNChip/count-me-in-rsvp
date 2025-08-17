-- Add invitation status tracking to guests table
ALTER TABLE guests 
ADD COLUMN invitation_status VARCHAR(20) DEFAULT 'not_sent' NOT NULL,
ADD COLUMN invitation_sent_at TIMESTAMP,
ADD COLUMN invitation_method VARCHAR(20) DEFAULT 'email';
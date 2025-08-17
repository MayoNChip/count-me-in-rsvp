# Database Schema

This is the database schema implementation for the spec detailed in @.agent-os/specs/2025-08-17-invitation-image-display/spec.md

> Created: 2025-08-17
> Version: 1.0.0

## Schema Changes

### New Columns for Events Table

Add invitation image support to the existing `events` table:

```sql
-- Add invitation image columns to events table
ALTER TABLE events 
ADD COLUMN invitation_image_url TEXT,
ADD COLUMN invitation_image_filename TEXT,
ADD COLUMN invitation_image_size INTEGER,
ADD COLUMN invitation_image_uploaded_at TIMESTAMP WITH TIME ZONE;
```

### Column Specifications

- **invitation_image_url** (TEXT, nullable)
  - Stores the full S3 URL or CloudFront URL to the invitation image
  - Example: `https://d123456789.cloudfront.net/invitations/event-123/invitation.jpg`

- **invitation_image_filename** (TEXT, nullable)
  - Original filename for display and download purposes
  - Example: `wedding-invitation.jpg`

- **invitation_image_size** (INTEGER, nullable)
  - File size in bytes for storage tracking and validation
  - Used for storage usage analytics

- **invitation_image_uploaded_at** (TIMESTAMP WITH TIME ZONE, nullable)
  - Timestamp when the image was uploaded
  - Useful for audit trails and cleanup operations

## Storage Configuration

### Amazon S3 Bucket Setup

S3 bucket configuration for invitation images:

**Bucket Name**: `count-me-in-invitations`

**Bucket Policy** (JSON):
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::count-me-in-invitations/*"
    }
  ]
}
```

**CORS Configuration**:
```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST"],
    "AllowedOrigins": ["https://your-domain.com", "http://localhost:3000"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

### CloudFront Distribution

- **Origin**: S3 bucket `count-me-in-invitations`
- **Behavior**: Cache images with long TTL (1 year)
- **Compression**: Enable Gzip/Brotli compression
- **Security**: Origin Access Identity for secure S3 access

## Migration Script

### Up Migration (0002_add_invitation_images.sql)

```sql
-- Add invitation image support to events table
ALTER TABLE events 
ADD COLUMN invitation_image_url TEXT,
ADD COLUMN invitation_image_filename TEXT,
ADD COLUMN invitation_image_size INTEGER,
ADD COLUMN invitation_image_uploaded_at TIMESTAMP WITH TIME ZONE;

-- Add comment for clarity
COMMENT ON COLUMN events.invitation_image_url IS 'Full S3/CloudFront URL to the invitation image';
COMMENT ON COLUMN events.invitation_image_filename IS 'Original filename of the uploaded invitation image';
COMMENT ON COLUMN events.invitation_image_size IS 'File size in bytes';
COMMENT ON COLUMN events.invitation_image_uploaded_at IS 'Timestamp when invitation image was uploaded';
```

### Down Migration (for rollback)

```sql
-- Remove invitation image columns from events table
ALTER TABLE events 
DROP COLUMN invitation_image_url,
DROP COLUMN invitation_image_filename,
DROP COLUMN invitation_image_size,
DROP COLUMN invitation_image_uploaded_at;
```

**Note**: S3 bucket and CloudFront distribution cleanup must be done manually through AWS Console or CLI, as they are external to the database.

## Rationale

### Column Design
- Separate URL and filename for flexibility in display and storage management
- Size tracking enables storage quotas and usage analytics
- Timestamp helps with audit trails and potential cleanup operations

### Storage Architecture
- Public bucket allows direct image access without authentication
- Folder structure by event ID provides organization and security
- Policies ensure users can only manage their own event images

### Performance Considerations
- No additional indexes needed as invitation images are accessed by event ID
- Storage bucket provides CDN-like performance for image delivery
- Optional: Add cleanup job for orphaned images if events are deleted
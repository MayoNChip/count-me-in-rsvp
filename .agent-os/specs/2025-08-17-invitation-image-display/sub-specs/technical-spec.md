# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-08-17-invitation-image-display/spec.md

> Created: 2025-08-17
> Version: 1.0.0

## Technical Requirements

- **File Upload**: Support JPG, PNG, and WebP formats up to 5MB
- **Image Optimization**: Automatic compression and format conversion for web display
- **Storage**: Secure file storage using Amazon S3
- **Performance**: Lazy loading and responsive image display with Next.js Image component
- **Validation**: File type, size, and dimension validation on both client and server
- **Security**: Secure file upload with proper sanitization and access controls
- **Responsive Display**: Images must display properly on mobile, tablet, and desktop devices

## Approach Options

**Option A:** Supabase Storage with Next.js Image Optimization
- Pros: Leverages existing Supabase infrastructure, built-in CDN, automatic optimization via Next.js
- Cons: Requires Supabase Storage setup, additional complexity for image transformations

**Option B:** Direct file upload to Vercel with local storage
- Pros: Simpler implementation, no additional services, Next.js Image handles optimization
- Cons: Limited storage, no CDN benefits, files stored with application

**Option C:** Amazon S3 with CloudFront CDN (Selected)
- Pros: Scalable storage, global CDN distribution, cost-effective, industry standard
- Cons: Additional AWS setup, external dependency, requires AWS credentials management

**Rationale:** Option C (Amazon S3) provides the best scalability and performance for image storage. With CloudFront CDN integration, images will load quickly for guests worldwide. S3 is cost-effective and industry standard for file storage, and the tech stack already mentions S3 for asset storage.

## External Dependencies

- **@aws-sdk/client-s3** - AWS SDK for S3 operations
- **@aws-sdk/s3-request-presigner** - For generating presigned upload URLs
- **multer** or **formidable** - For handling multipart form uploads (server-side)
- **sharp** - Image processing and optimization (optional, for server-side processing)

## Implementation Details

### File Upload Flow
1. Client-side validation (file type, size)
2. Request presigned URL from server for S3 upload
3. Direct upload to S3 using presigned URL
4. Server receives upload confirmation and stores S3 URL in events table
5. Optional: Trigger image optimization via CloudFront or server processing

### Image Display Flow
1. Fetch event data including invitation image S3 URL
2. Use Next.js Image component with CloudFront URL
3. Implement lazy loading and responsive design
4. Fallback handling for missing images

### Storage Structure
```
s3-bucket/
└── invitations/
    └── {event-id}/
        ├── original/
        │   └── invitation.{ext}
        └── optimized/
            ├── invitation-thumb.webp
            ├── invitation-medium.webp
            └── invitation-large.webp
```

### Component Architecture
- `InvitationUpload` - Admin upload interface with S3 presigned URL handling
- `InvitationDisplay` - Guest-facing image display with CloudFront URLs
- `S3ImageUpload` - Utility functions for S3 operations and presigned URLs
- `ImageOptimization` - Server-side image processing utilities

### Environment Variables Required
```
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
S3_BUCKET_NAME=count-me-in-invitations
CLOUDFRONT_DOMAIN=your-cloudfront-domain.cloudfront.net
```

### Security Considerations
- Presigned URLs expire after 15 minutes
- S3 bucket configured with proper CORS for direct uploads
- File type validation on both client and server
- Image scanning for malicious content (optional)
- CloudFront caching with appropriate headers
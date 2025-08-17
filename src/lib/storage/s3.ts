import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME!;
const CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_DOMAIN;

// Supported file types for invitation images
export const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Validates file type and size
 */
export function validateImageFile(file: File): { isValid: boolean; error?: string } {
  if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
    return {
      isValid: false,
      error: 'Invalid file type. Only JPG, PNG, and WebP files are allowed.',
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: 'File size too large. Maximum size is 5MB.',
    };
  }

  return { isValid: true };
}

/**
 * Generates a unique file key for S3 storage
 */
export function generateFileKey(eventId: string, originalFilename: string): string {
  const timestamp = Date.now();
  const extension = originalFilename.split('.').pop();
  const sanitizedName = originalFilename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_');
  
  return `invitations/${eventId}/invitation_${timestamp}.${extension}`;
}

/**
 * Generates a presigned URL for uploading files directly to S3
 */
export async function generatePresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = 900 // 15 minutes
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: contentType,
    ACL: 'public-read', // Make the uploaded file publicly readable
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Generates the public URL for accessing an uploaded file
 */
export function getPublicFileUrl(key: string): string {
  if (CLOUDFRONT_DOMAIN) {
    return `https://${CLOUDFRONT_DOMAIN}/${key}`;
  }
  
  // Fallback to direct S3 URL
  const region = process.env.AWS_REGION || 'us-east-1';
  return `https://${BUCKET_NAME}.s3.${region}.amazonaws.com/${key}`;
}

/**
 * Deletes a file from S3
 */
export async function deleteFile(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  await s3Client.send(command);
}

/**
 * Extracts the S3 key from a public URL
 */
export function extractKeyFromUrl(url: string): string | null {
  try {
    if (url.includes(CLOUDFRONT_DOMAIN || '')) {
      // CloudFront URL format: https://domain.cloudfront.net/path/to/file
      return url.split(`${CLOUDFRONT_DOMAIN}/`)[1] || null;
    }
    
    // S3 URL format: https://bucket.s3.region.amazonaws.com/path/to/file
    const s3Pattern = new RegExp(`https://${BUCKET_NAME}\\.s3\\.[^/]+\\.amazonaws\\.com/(.+)`);
    const match = url.match(s3Pattern);
    return match ? match[1] : null;
  } catch (error) {
    console.error('Error extracting key from URL:', error);
    return null;
  }
}

/**
 * Uploads a file directly to S3 (server-side upload)
 */
export async function uploadFileToS3(
  key: string,
  file: Buffer,
  contentType: string
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: file,
    ContentType: contentType,
    ACL: 'public-read',
  });

  await s3Client.send(command);
  return getPublicFileUrl(key);
}

/**
 * Check if S3 is properly configured
 */
export function checkS3Configuration(): { isConfigured: boolean; missingVars: string[] } {
  const requiredVars = [
    'AWS_REGION',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'S3_BUCKET_NAME',
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  return {
    isConfigured: missingVars.length === 0,
    missingVars,
  };
}
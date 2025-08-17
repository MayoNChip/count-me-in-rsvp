'use server';

import { db } from '@/lib/db';
import { events } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { 
  generateFileKey, 
  generatePresignedUploadUrl, 
  validateImageFile, 
  getPublicFileUrl,
  deleteFile,
  extractKeyFromUrl,
  checkS3Configuration
} from '@/lib/storage/s3';
import { revalidatePath } from 'next/cache';

export interface PresignedUploadResponse {
  success: boolean;
  uploadUrl?: string;
  fileKey?: string;
  error?: string;
}

export interface UploadConfirmationData {
  eventId: string;
  fileKey: string;
  filename: string;
  fileSize: number;
}

/**
 * Generates a presigned URL for uploading invitation images
 */
export async function generateInvitationUploadUrl(
  eventId: string,
  filename: string,
  fileType: string,
  fileSize: number
): Promise<PresignedUploadResponse> {
  try {
    // Check S3 configuration
    const { isConfigured, missingVars } = checkS3Configuration();
    if (!isConfigured) {
      return {
        success: false,
        error: `S3 not configured. Missing environment variables: ${missingVars.join(', ')}`,
      };
    }

    // Validate file using a mock File object for server-side validation
    const mockFile = {
      type: fileType,
      size: fileSize,
    } as File;

    const validation = validateImageFile(mockFile);
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.error,
      };
    }

    // Verify event exists
    const event = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
    if (event.length === 0) {
      return {
        success: false,
        error: 'Event not found',
      };
    }

    // Generate file key and presigned URL
    const fileKey = generateFileKey(eventId, filename);
    const uploadUrl = await generatePresignedUploadUrl(fileKey, fileType);

    return {
      success: true,
      uploadUrl,
      fileKey,
    };
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    return {
      success: false,
      error: 'Failed to generate upload URL',
    };
  }
}

/**
 * Confirms successful upload and updates the database
 */
export async function confirmInvitationUpload(data: UploadConfirmationData) {
  try {
    const { eventId, fileKey, filename, fileSize } = data;

    // Generate public URL
    const publicUrl = getPublicFileUrl(fileKey);

    // Update event with invitation image details
    await db
      .update(events)
      .set({
        invitationImageUrl: publicUrl,
        invitationImageFilename: filename,
        invitationImageSize: fileSize,
        invitationImageUploadedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(events.id, eventId));

    // Revalidate relevant paths
    revalidatePath(`/admin/events/${eventId}`);
    revalidatePath('/admin');

    return { success: true };
  } catch (error) {
    console.error('Error confirming upload:', error);
    return {
      success: false,
      error: 'Failed to update event with image details',
    };
  }
}

/**
 * Removes invitation image from an event
 */
export async function removeInvitationImage(eventId: string) {
  try {
    // Get current event data
    const event = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
    if (event.length === 0) {
      return {
        success: false,
        error: 'Event not found',
      };
    }

    const currentEvent = event[0];
    
    // Delete file from S3 if it exists
    if (currentEvent.invitationImageUrl) {
      const fileKey = extractKeyFromUrl(currentEvent.invitationImageUrl);
      if (fileKey) {
        try {
          await deleteFile(fileKey);
        } catch (error) {
          console.error('Error deleting file from S3:', error);
          // Continue with database update even if S3 deletion fails
        }
      }
    }

    // Clear invitation image data from database
    await db
      .update(events)
      .set({
        invitationImageUrl: null,
        invitationImageFilename: null,
        invitationImageSize: null,
        invitationImageUploadedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(events.id, eventId));

    // Revalidate relevant paths
    revalidatePath(`/admin/events/${eventId}`);
    revalidatePath('/admin');

    return { success: true };
  } catch (error) {
    console.error('Error removing invitation image:', error);
    return {
      success: false,
      error: 'Failed to remove invitation image',
    };
  }
}

/**
 * Updates invitation image for an event (replaces existing)
 */
export async function updateInvitationImage(
  eventId: string,
  filename: string,
  fileType: string,
  fileSize: number
): Promise<PresignedUploadResponse> {
  try {
    // Remove existing image first
    const removeResult = await removeInvitationImage(eventId);
    if (!removeResult.success) {
      return {
        success: false,
        error: removeResult.error,
      };
    }

    // Generate new upload URL
    return await generateInvitationUploadUrl(eventId, filename, fileType, fileSize);
  } catch (error) {
    console.error('Error updating invitation image:', error);
    return {
      success: false,
      error: 'Failed to update invitation image',
    };
  }
}
'use client';

import { useState, useRef, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  generateInvitationUploadUrl, 
  confirmInvitationUpload,
  removeInvitationImage,
  type UploadConfirmationData 
} from '@/app/actions/invitation-images';
import { SUPPORTED_IMAGE_TYPES, MAX_FILE_SIZE } from '@/lib/storage/s3';
import Image from 'next/image';

interface InvitationUploadProps {
  eventId: string;
  currentImageUrl?: string | null;
  currentImageFilename?: string | null;
  onUploadComplete?: (imageUrl: string) => void;
  onRemoveComplete?: () => void;
}

export function InvitationUpload({
  eventId,
  currentImageUrl,
  currentImageFilename,
  onUploadComplete,
  onRemoveComplete,
}: InvitationUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback(async (file: File) => {
    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      // Generate presigned URL
      const urlResponse = await generateInvitationUploadUrl(
        eventId,
        file.name,
        file.type,
        file.size
      );

      if (!urlResponse.success) {
        setError(urlResponse.error || 'Failed to generate upload URL');
        return;
      }

      const { uploadUrl, fileKey } = urlResponse;

      // Upload file to S3
      const uploadResponse = await fetch(uploadUrl!, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file to storage');
      }

      setUploadProgress(100);

      // Confirm upload in database
      const confirmData: UploadConfirmationData = {
        eventId,
        fileKey: fileKey!,
        filename: file.name,
        fileSize: file.size,
      };

      const confirmResponse = await confirmInvitationUpload(confirmData);

      if (!confirmResponse.success) {
        setError('Failed to save image details');
        return;
      }

      // Success
      const imageUrl = `https://${process.env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN || `${process.env.NEXT_PUBLIC_S3_BUCKET_NAME}.s3.${process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1'}.amazonaws.com`}/${fileKey}`;
      onUploadComplete?.(imageUrl);
      setPreview(null);
    } catch (error) {
      console.error('Upload error:', error);
      setError('Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [eventId, onUploadComplete]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Upload file
      handleFileUpload(file);
    }
  }, [handleFileUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
    },
    maxSize: MAX_FILE_SIZE,
    multiple: false,
    onDropRejected: (fileRejections) => {
      const rejection = fileRejections[0];
      if (rejection.errors[0]?.code === 'file-too-large') {
        setError('File is too large. Maximum size is 5MB.');
      } else if (rejection.errors[0]?.code === 'file-invalid-type') {
        setError('Invalid file type. Only JPG, PNG, and WebP files are allowed.');
      } else {
        setError('Invalid file. Please try again.');
      }
    },
  });

  const handleRemoveImage = async () => {
    setIsUploading(true);
    setError(null);

    try {
      const result = await removeInvitationImage(eventId);
      if (result.success) {
        onRemoveComplete?.();
      } else {
        setError(result.error || 'Failed to remove image');
      }
    } catch (error) {
      console.error('Remove error:', error);
      setError('Failed to remove image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      {/* Current Image Display */}
      {currentImageUrl && !preview && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <ImageIcon className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium">Current Invitation Image</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRemoveImage}
                disabled={isUploading}
                className="text-red-600 hover:text-red-700"
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <X className="h-4 w-4" />
                )}
                Remove
              </Button>
            </div>
            
            <div className="relative w-full max-w-md mx-auto">
              <Image
                src={currentImageUrl}
                alt="Current invitation"
                width={400}
                height={300}
                className="rounded-lg border object-cover w-full h-auto"
              />
            </div>
            
            {currentImageFilename && (
              <p className="text-sm text-gray-500 mt-2 text-center">
                {currentImageFilename}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Upload Area */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Upload className="h-5 w-5 text-blue-600" />
              <span className="font-medium">
                {currentImageUrl ? 'Update Invitation Image' : 'Upload Invitation Image'}
              </span>
            </div>

            {/* Dropzone */}
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                ${isDragActive 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-300 hover:border-gray-400'
                }
                ${isUploading ? 'pointer-events-none opacity-50' : ''}
              `}
            >
              <input {...getInputProps()} ref={fileInputRef} />
              
              {preview ? (
                <div className="space-y-4">
                  <Image
                    src={preview}
                    alt="Preview"
                    width={200}
                    height={150}
                    className="mx-auto rounded-lg border object-cover"
                  />
                  <p className="text-sm text-gray-600">
                    {isUploading ? 'Uploading...' : 'Ready to upload'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <ImageIcon className="h-12 w-12 text-gray-400 mx-auto" />
                  <div>
                    <p className="text-lg font-medium text-gray-900">
                      {isDragActive ? 'Drop your image here' : 'Drop an image here'}
                    </p>
                    <p className="text-sm text-gray-600">
                      or{' '}
                      <button
                        type="button"
                        onClick={handleFileSelect}
                        className="text-blue-600 hover:text-blue-700 font-medium"
                      >
                        browse files
                      </button>
                    </p>
                  </div>
                  <p className="text-xs text-gray-500">
                    JPG, PNG, or WebP up to 5MB
                  </p>
                </div>
              )}
            </div>

            {/* Upload Progress */}
            {isUploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="w-full" />
              </div>
            )}

            {/* Error Message */}
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
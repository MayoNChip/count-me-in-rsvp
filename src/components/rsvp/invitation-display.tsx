'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ImageIcon } from 'lucide-react';

interface InvitationDisplayProps {
  imageUrl: string | null | undefined;
  eventName: string;
  className?: string;
}

export function InvitationDisplay({ imageUrl, eventName, className = '' }: InvitationDisplayProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Don't render anything if there's no image URL
  if (!imageUrl) {
    return null;
  }

  const handleImageLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  return (
    <Card className={`modern-card border-0 mb-6 ${className}`}>
      <CardContent className="p-6">
        <div className="relative w-full max-w-lg mx-auto">
          {isLoading && (
            <Skeleton className="w-full h-64 rounded-lg" />
          )}
          
          {hasError ? (
            <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
              <div className="text-center text-gray-500">
                <ImageIcon className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">Unable to load invitation image</p>
              </div>
            </div>
          ) : (
            <div className="relative">
              <Image
                src={imageUrl}
                alt={`Invitation for ${eventName}`}
                width={800}
                height={600}
                className={`
                  w-full h-auto rounded-lg shadow-lg object-cover
                  transition-opacity duration-300
                  ${isLoading ? 'opacity-0' : 'opacity-100'}
                `}
                style={{
                  maxHeight: '500px',
                  objectFit: 'contain',
                }}
                onLoad={handleImageLoad}
                onError={handleImageError}
                priority={true}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 66vw, 50vw"
              />
              
              {/* Subtle overlay for better text readability on top of image if needed */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent rounded-lg pointer-events-none" />
            </div>
          )}
          
          {/* Optional: Add a subtle caption */}
          <div className="mt-3 text-center">
            <p className="text-xs text-gray-500 font-medium">Event Invitation</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
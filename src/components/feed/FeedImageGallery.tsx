'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface FeedImageGalleryProps {
  imageUrls: string[];
  altText: string;
}

export default function FeedImageGallery({ imageUrls, altText }: FeedImageGalleryProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const goToNextImage = () => {
    setCurrentImageIndex((prevIndex) => (prevIndex + 1) % imageUrls.length);
  };

  const goToPrevImage = () => {
    setCurrentImageIndex((prevIndex) => (prevIndex - 1 + imageUrls.length) % imageUrls.length);
  };

  if (!imageUrls || imageUrls.length === 0) {
    return null;
  }

  return (
    <div className="relative w-full aspect-square bg-gray-100">
      <Image
        src={imageUrls[currentImageIndex]}
        alt={altText}
        fill
        style={{ objectFit: 'cover' }}
        className="w-full h-full"
      />

      {imageUrls.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            onClick={goToPrevImage}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 text-white hover:bg-black/70 rounded-full p-2"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={goToNextImage}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 text-white hover:bg-black/70 rounded-full p-2"
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex space-x-1">
            {imageUrls.map((_, index) => (
              <span
                key={index}
                className={`block w-2 h-2 rounded-full ${index === currentImageIndex ? 'bg-white' : 'bg-gray-400'}`}
              ></span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

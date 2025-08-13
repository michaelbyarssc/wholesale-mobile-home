import React, { useState, useEffect, useCallback } from 'react';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ImageGalleryModal } from '../ImageGalleryModal';
import { OptimizedImage } from '@/components/ui/optimized-image';

interface MobileHomeImage {
  id: string;
  image_url: string;
  image_type: string;
  alt_text: string | null;
  display_order: number;
}

interface OptimizedImageCarouselProps {
  images: MobileHomeImage[];
  homeModel: string;
}

const MemoizedCarouselItem = React.memo(({ 
  image, 
  index, 
  homeModel, 
  onImageError, 
  onImageLoad, 
  onImageClick 
}: {
  image: MobileHomeImage;
  index: number;
  homeModel: string;
  onImageError: (id: string, url: string) => void;
  onImageLoad: (id: string) => void;
  onImageClick: (index: number) => void;
}) => (
  <CarouselItem key={image.id}>
    <div className="relative">
      <OptimizedImage
        src={image.image_url}
        alt={image.alt_text || `${homeModel} ${image.image_type} view`}
        width={400}
        height={225}
        className="w-full h-56 object-cover rounded-lg cursor-pointer hover:scale-105 transition-transform duration-300"
        lazy={index !== 0}
        onError={() => onImageError(image.id, image.image_url)}
        onLoad={() => onImageLoad(image.id)}
        onClick={() => onImageClick(index)}
        sizes="(max-width: 768px) 100vw, 400px"
      />
      <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs capitalize">
        {image.image_type}
      </div>
    </div>
  </CarouselItem>
));

MemoizedCarouselItem.displayName = 'MemoizedCarouselItem';

export const OptimizedImageCarousel = React.memo(({ images, homeModel }: OptimizedImageCarouselProps) => {
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [retryAttempts, setRetryAttempts] = useState(0);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    setFailedImages(new Set());
    setLoadedImages(new Set());
    setRetryAttempts(0);
  }, [images]);

  const handleImageError = useCallback((imageId: string, imageUrl: string) => {
    setFailedImages(prev => new Set([...prev, imageId]));
  }, []);

  const handleImageLoad = useCallback((imageId: string) => {
    setLoadedImages(prev => new Set([...prev, imageId]));
  }, []);

  const handleRetry = useCallback(() => {
    setFailedImages(new Set());
    setLoadedImages(new Set());
    setRetryAttempts(prev => prev + 1);
  }, []);

  const handleImageClick = useCallback((index: number) => {
    setSelectedImageIndex(index);
    setIsGalleryOpen(true);
  }, []);

  if (!images || images.length === 0) {
    return (
      <div className="w-full h-56 bg-muted rounded-lg flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <div className="text-4xl mb-2">🏠</div>
          <p className="text-sm">No images available</p>
        </div>
      </div>
    );
  }

  const sortedImages = [...images].sort((a, b) => a.display_order - b.display_order);
  const validImages = sortedImages.filter(image => !failedImages.has(image.id));

  if (validImages.length === 0 && failedImages.size > 0) {
    return (
      <div className="w-full h-56 bg-muted rounded-lg flex items-center justify-center">
        <div className="text-center text-muted-foreground max-w-sm px-4">
          <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-amber-500" />
          <h3 className="font-semibold mb-2">Images Temporarily Unavailable</h3>
          <Button onClick={handleRetry} size="sm" variant="outline">
            <RefreshCw className="h-3 w-3 mr-1" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="w-full">
        <Carousel 
          className="w-full"
          opts={{
            loop: true,
            containScroll: "trimSnaps",
            skipSnaps: true,
            duration: 25
          }}
        >
          <CarouselContent className="-ml-1">
            {validImages.map((image, index) => (
              <MemoizedCarouselItem
                key={`${image.id}-${retryAttempts}`}
                image={image}
                index={index}
                homeModel={homeModel}
                onImageError={handleImageError}
                onImageLoad={handleImageLoad}
                onImageClick={handleImageClick}
              />
            ))}
          </CarouselContent>
          {validImages.length > 1 && (
            <>
              <CarouselPrevious className="left-2" />
              <CarouselNext className="right-2" />
            </>
          )}
        </Carousel>
      </div>

      <ImageGalleryModal
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        images={validImages}
        initialImageIndex={selectedImageIndex}
        homeModel={homeModel}
      />
    </>
  );
});

OptimizedImageCarousel.displayName = 'OptimizedImageCarousel';

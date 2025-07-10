
import React, { useState, useEffect } from 'react';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ImageGalleryModal } from './ImageGalleryModal';
import { OptimizedImage } from './OptimizedImage';

interface MobileHomeImage {
  id: string;
  image_url: string;
  image_type: string;
  alt_text: string | null;
  display_order: number;
}

interface MobileHomeImageCarouselProps {
  images: MobileHomeImage[];
  homeModel: string;
}

export const MobileHomeImageCarousel = ({ images, homeModel }: MobileHomeImageCarouselProps) => {
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [retryAttempts, setRetryAttempts] = useState(0);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Reset failed/loaded images when images prop changes
  useEffect(() => {
    setFailedImages(new Set());
    setLoadedImages(new Set());
    setRetryAttempts(0);
  }, [images]);

  if (!images || images.length === 0) {
    return (
      <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
        <div className="text-center text-gray-400">
          <div className="text-4xl mb-2">🏠</div>
          <p className="text-sm">No images available</p>
        </div>
      </div>
    );
  }

  // Sort images by display_order and filter out failed ones
  const sortedImages = [...images].sort((a, b) => a.display_order - b.display_order);
  const validImages = sortedImages.filter(image => !failedImages.has(image.id));
  const hasBlobUrls = images.some(img => img.image_url.startsWith('blob:'));

  const handleImageError = (imageId: string, imageUrl: string) => {
    console.log(`Image failed to load: ${imageId}, URL: ${imageUrl}`);
    console.log(`URL type: ${imageUrl.startsWith('blob:') ? 'blob' : 'regular'}`);
    setFailedImages(prev => new Set([...prev, imageId]));
  };

  const handleImageLoad = (imageId: string) => {
    console.log(`Image loaded successfully: ${imageId}`);
    setLoadedImages(prev => new Set([...prev, imageId]));
  };

  const handleRetry = () => {
    console.log('Retrying to load images...');
    setFailedImages(new Set());
    setLoadedImages(new Set());
    setRetryAttempts(prev => prev + 1);
  };

  const handleImageClick = (index: number) => {
    setSelectedImageIndex(index);
    setIsGalleryOpen(true);
  };

  // If all images fail to load, show enhanced fallback
  if (validImages.length === 0 && failedImages.size > 0) {
    return (
      <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
        <div className="text-center text-gray-500 max-w-sm px-4">
          <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-amber-500" />
          <h3 className="font-semibold mb-2">Images Temporarily Unavailable</h3>
          <p className="text-sm mb-3">
            {hasBlobUrls 
              ? "Images need to be re-uploaded after page refresh. This is a known issue with temporary image storage."
              : `${failedImages.size} images failed to load`
            }
          </p>
          <Button 
            onClick={handleRetry}
            size="sm"
            variant="outline"
            className="text-xs"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Carousel 
        className="w-full" 
        key={retryAttempts}
        opts={{
          loop: true
        }}
      >
        <CarouselContent>
          {validImages.map((image, index) => (
            <CarouselItem key={`${image.id}-${retryAttempts}`}>
              <div className="relative">
                <OptimizedImage
                  src={image.image_url}
                  alt={image.alt_text || `${homeModel} ${image.image_type} view - mobile home for sale with quality construction and modern features`}
                  aspectRatio="video"
                  className="rounded-lg cursor-pointer hover:scale-105 transition-transform duration-300"
                  priority={index === 0}
                  onError={() => handleImageError(image.id, image.image_url)}
                  onLoad={() => handleImageLoad(image.id)}
                  onClick={() => handleImageClick(index)}
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
                {/* Image type badge */}
                <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs capitalize">
                  {image.image_type}
                </div>
                {/* Image counter */}
                <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
                  {index + 1} / {validImages.length}
                </div>
                {/* Click to enlarge hint */}
                <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs opacity-0 hover:opacity-100 transition-opacity">
                  Click to enlarge
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        {validImages.length > 1 && (
          <>
            <CarouselPrevious className="left-2" />
            <CarouselNext className="right-2" />
          </>
        )}
      </Carousel>

      {/* Image Gallery Modal */}
      <ImageGalleryModal
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        images={validImages}
        initialImageIndex={selectedImageIndex}
        homeModel={homeModel}
      />
    </>
  );
};


import React from 'react';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';

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

  // Sort images by display_order
  const sortedImages = [...images].sort((a, b) => a.display_order - b.display_order);

  return (
    <Carousel className="w-full">
      <CarouselContent>
        {sortedImages.map((image, index) => (
          <CarouselItem key={image.id}>
            <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden relative">
              <img 
                src={image.image_url} 
                alt={image.alt_text || `${homeModel} ${image.image_type}`}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  // Create fallback content for this specific image
                  const fallback = document.createElement('div');
                  fallback.className = 'w-full h-full flex items-center justify-center text-gray-400 absolute inset-0';
                  fallback.innerHTML = `
                    <div class="text-center">
                      <div class="text-4xl mb-2">🏠</div>
                      <p class="text-sm">Image Loading...</p>
                    </div>
                  `;
                  const parent = target.parentElement!;
                  if (!parent.querySelector('.fallback-content')) {
                    fallback.classList.add('fallback-content');
                    parent.appendChild(fallback);
                  }
                }}
              />
              {/* Image type badge */}
              <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs capitalize">
                {image.image_type}
              </div>
              {/* Image counter */}
              <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs">
                {index + 1} / {sortedImages.length}
              </div>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      {sortedImages.length > 1 && (
        <>
          <CarouselPrevious className="left-2" />
          <CarouselNext className="right-2" />
        </>
      )}
    </Carousel>
  );
};

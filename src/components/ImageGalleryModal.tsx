
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface MobileHomeImage {
  id: string;
  image_url: string;
  image_type: string;
  alt_text: string | null;
  display_order: number;
}

interface ImageGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  images: MobileHomeImage[];
  initialImageIndex: number;
  homeModel: string;
}

export const ImageGalleryModal = ({ 
  isOpen, 
  onClose, 
  images, 
  initialImageIndex, 
  homeModel 
}: ImageGalleryModalProps) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Update current image when modal opens or initialImageIndex changes
  useEffect(() => {
    if (isOpen) {
      setCurrentImageIndex(initialImageIndex);
    }
  }, [isOpen, initialImageIndex]);

  // Sort images by display_order
  const sortedImages = [...images].sort((a, b) => a.display_order - b.display_order);

  const goToPrevious = () => {
    setCurrentImageIndex((prev) => 
      prev === 0 ? sortedImages.length - 1 : prev - 1
    );
  };

  const goToNext = () => {
    setCurrentImageIndex((prev) => 
      prev === sortedImages.length - 1 ? 0 : prev + 1
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      goToPrevious();
    } else if (e.key === 'ArrowRight') {
      goToNext();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!sortedImages.length) return null;

  const currentImage = sortedImages[currentImageIndex];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-6xl w-full h-[90vh] p-0 bg-black border-none"
        onKeyDown={handleKeyDown}
      >
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Close button */}
          <Button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 bg-black bg-opacity-50 hover:bg-opacity-70 text-white border-none"
            size="icon"
            variant="outline"
          >
            <X className="h-4 w-4" />
          </Button>

          {/* Image counter */}
          <div className="absolute top-4 left-4 z-10 bg-black bg-opacity-50 text-white px-3 py-1 rounded text-sm">
            {currentImageIndex + 1} / {sortedImages.length}
          </div>

          {/* Home model title */}
          <div className="absolute bottom-20 left-4 z-10 bg-black bg-opacity-50 text-white px-3 py-2 rounded">
            <h3 className="font-semibold">{homeModel}</h3>
            <p className="text-sm text-gray-300 capitalize">{currentImage.image_type}</p>
          </div>

          {/* Previous button */}
          {sortedImages.length > 1 && (
            <Button
              onClick={goToPrevious}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 bg-black bg-opacity-50 hover:bg-opacity-70 text-white border-none"
              size="icon"
              variant="outline"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
          )}

          {/* Next button */}
          {sortedImages.length > 1 && (
            <Button
              onClick={goToNext}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 bg-black bg-opacity-50 hover:bg-opacity-70 text-white border-none"
              size="icon"
              variant="outline"
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          )}

          {/* Main image */}
          <img
            src={currentImage.image_url}
            alt={currentImage.alt_text || `${homeModel} ${currentImage.image_type}`}
            className="max-w-full max-h-full object-contain"
          />

          {/* Thumbnail strip */}
          {sortedImages.length > 1 && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
              <div className="flex space-x-2 bg-black bg-opacity-50 p-2 rounded">
                {sortedImages.map((image, index) => (
                  <button
                    key={image.id}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`w-16 h-12 rounded overflow-hidden border-2 transition-all ${
                      index === currentImageIndex
                        ? 'border-white scale-110'
                        : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={image.image_url}
                      alt={`Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

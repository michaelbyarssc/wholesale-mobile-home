import { useEffect } from 'react';

interface ImagePrefetcherProps {
  images: string[];
  priority?: boolean;
}

export const ImagePrefetcher = ({ images, priority = false }: ImagePrefetcherProps) => {
  useEffect(() => {
    if (!images.length) return;

    const prefetchImages = () => {
      images.forEach((src, index) => {
        // Only prefetch first few critical images
        if (!priority && index > 3) return;
        
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.as = 'image';
        link.href = src;
        
        // Add to document head
        document.head.appendChild(link);
        
        // Clean up after some time
        setTimeout(() => {
          if (document.head.contains(link)) {
            document.head.removeChild(link);
          }
        }, 30000); // 30 seconds
      });
    };

    // Prefetch after a short delay to not interfere with critical resources
    const timeoutId = setTimeout(prefetchImages, priority ? 0 : 1000);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [images, priority]);

  return null; // This component doesn't render anything
};
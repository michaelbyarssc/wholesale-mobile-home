import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  placeholder?: string;
  lazy?: boolean;
  sizes?: string;
  quality?: number;
  className?: string;
  fallback?: string;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  placeholder,
  lazy = true,
  sizes,
  className,
  fallback = '/placeholder-image.jpg',
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const [imageSrc, setImageSrc] = useState(lazy ? '' : src);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (!lazy) {
      setImageSrc(src);
      return;
    }

    const img = imgRef.current;
    if (!img) return;

    // Create intersection observer for lazy loading
    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setImageSrc(src);
          observerRef.current?.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '50px' }
    );

    observerRef.current.observe(img);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [src, lazy]);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleError = () => {
    setIsError(true);
    setImageSrc(fallback);
  };

  // Generate responsive source set for better mobile performance
  const generateSrcSet = (baseSrc: string) => {
    if (!baseSrc || baseSrc.startsWith('data:') || baseSrc.includes('unsplash')) {
      return baseSrc;
    }
    
    // For local images, we would generate different sizes
    // This is a placeholder - in production you'd use a CDN or image optimization service
    return baseSrc;
  };

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* Placeholder background */}
      {!isLoaded && (
        <div 
          className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 animate-pulse"
          style={{ aspectRatio: width && height ? `${width}/${height}` : undefined }}
        >
          {placeholder && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
              {placeholder}
            </div>
          )}
        </div>
      )}
      
      {/* Main image */}
      <img
        ref={imgRef}
        src={imageSrc}
        srcSet={imageSrc ? generateSrcSet(imageSrc) : undefined}
        sizes={sizes || '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'}
        alt={alt}
        width={width}
        height={height}
        loading={lazy ? 'lazy' : 'eager'}
        decoding="async"
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          'transition-opacity duration-300',
          isLoaded ? 'opacity-100' : 'opacity-0',
          isError && 'opacity-50',
          className
        )}
        {...props}
      />
      
      {/* Error state */}
      {isError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-500 text-sm">
          Image failed to load
        </div>
      )}
    </div>
  );
};

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
  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (!lazy || !src) {
      setImageSrc(src);
      return;
    }

    const container = containerRef.current;
    if (!container) {
      // If container not available, load immediately
      console.log('No container found, loading immediately:', src);
      setImageSrc(src);
      return;
    }

    // Immediate fallback for first image or if intersection observer isn't supported
    const immediateTimeout = setTimeout(() => {
      if (!imageSrc) {
        console.log('Immediate fallback loading image:', src);
        setImageSrc(src);
      }
    }, 100);

    // Create intersection observer for lazy loading
    if ('IntersectionObserver' in window) {
      observerRef.current = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            console.log('Image intersecting, loading:', src);
            setImageSrc(src);
            clearTimeout(immediateTimeout);
            observerRef.current?.disconnect();
          }
        },
        { threshold: 0, rootMargin: '50px' }
      );

      observerRef.current.observe(container);
    } else {
      // Fallback for browsers without Intersection Observer
      console.log('No Intersection Observer support, loading immediately:', src);
      setImageSrc(src);
    }

    return () => {
      observerRef.current?.disconnect();
      clearTimeout(immediateTimeout);
    };
  }, [src, lazy, imageSrc]);

  const handleLoad = () => {
    console.log('Image loaded successfully:', src);
    setIsLoaded(true);
  };

  const handleError = () => {
    console.log('Image failed to load:', src);
    setIsError(true);
    if (fallback && src !== fallback) {
      setImageSrc(fallback);
      setIsError(false);
    }
  };

  return (
    <div 
      ref={containerRef}
      className={cn('relative overflow-hidden bg-muted', className)}
      style={{ 
        aspectRatio: width && height ? `${width}/${height}` : undefined,
        minHeight: height ? `${height}px` : '200px'
      }}
    >
      {/* Placeholder background */}
      {!isLoaded && !isError && (
        <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted/50 animate-pulse">
          {placeholder && (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
              {placeholder}
            </div>
          )}
        </div>
      )}
      
      {/* Main image */}
      {imageSrc && (
        <img
          src={imageSrc}
          alt={alt}
          width={width}
          height={height}
          loading={lazy ? 'lazy' : 'eager'}
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            'w-full h-full object-cover transition-opacity duration-300',
            isLoaded ? 'opacity-100' : 'opacity-0'
          )}
          {...props}
        />
      )}
      
      {/* Error state */}
      {isError && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground text-sm">
          <div className="text-center">
            <div className="text-2xl mb-2">🖼️</div>
            <p>Image failed to load</p>
          </div>
        </div>
      )}
    </div>
  );
};

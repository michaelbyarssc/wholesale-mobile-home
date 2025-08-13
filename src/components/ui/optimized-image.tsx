
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

  useEffect(() => {
    // Always load image immediately if not lazy or if we don't have a src yet
    if (!lazy || !imageSrc) {
      setImageSrc(src);
      return;
    }
  }, [src, lazy, imageSrc]);

  useEffect(() => {
    if (!lazy) return;

    const container = containerRef.current;
    if (!container) {
      setImageSrc(src);
      return;
    }

    // Simple intersection observer with immediate fallback
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setImageSrc(src);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    observer.observe(container);

    // Immediate fallback after 200ms
    const fallbackTimer = setTimeout(() => {
      setImageSrc(src);
      observer.disconnect();
    }, 200);

    return () => {
      observer.disconnect();
      clearTimeout(fallbackTimer);
    };
  }, [src, lazy]);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleError = () => {
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

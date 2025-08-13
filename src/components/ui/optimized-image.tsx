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
  const fallbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!lazy) {
      setImageSrc(src);
      return;
    }

    const container = containerRef.current;
    if (!container) {
      // If container not available, load immediately
      setImageSrc(src);
      return;
    }

    // Aggressive fallback: load image after 500ms if intersection observer fails
    fallbackTimeoutRef.current = setTimeout(() => {
      if (!imageSrc) {
        console.log('Fallback loading image after timeout:', src);
        setImageSrc(src);
      }
    }, 500);

    // Create intersection observer for lazy loading
    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          console.log('Image intersecting, loading:', src);
          setImageSrc(src);
          if (fallbackTimeoutRef.current) {
            clearTimeout(fallbackTimeoutRef.current);
          }
          observerRef.current?.disconnect();
        }
      },
      { threshold: 0, rootMargin: '200px' }
    );

    observerRef.current.observe(container);

    return () => {
      observerRef.current?.disconnect();
      if (fallbackTimeoutRef.current) {
        clearTimeout(fallbackTimeoutRef.current);
      }
    };
  }, [src, lazy, imageSrc]);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleError = () => {
    setIsError(true);
    setImageSrc(fallback);
  };

  // Generate responsive source set for better mobile performance
  const generateSrcSet = (baseSrc: string) => {
    if (!baseSrc || baseSrc.startsWith('data:')) return baseSrc;
    
    // Handle Unsplash images
    if (baseSrc.includes('unsplash')) {
      return `${baseSrc}&w=640 640w,
              ${baseSrc}&w=750 750w,
              ${baseSrc}&w=828 828w,
              ${baseSrc}&w=1080 1080w,
              ${baseSrc}&w=1200 1200w,
              ${baseSrc}&w=1920 1920w`;
    }

    // Handle local images
    const url = new URL(baseSrc, window.location.origin);
    const widths = [640, 750, 828, 1080, 1200, 1920];
    return widths
      .map(w => `${url.toString()}?w=${w} ${w}w`)
      .join(',');
  };

  return (
    <div 
      ref={containerRef}
      className={cn('relative overflow-hidden', className)}
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
            'w-full h-full object-cover transition-opacity duration-300',
            isLoaded ? 'opacity-100' : 'opacity-0',
            isError && 'opacity-50'
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
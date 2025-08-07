import React, { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  placeholder?: string;
  lazy?: boolean;
  sizes?: string;
  className?: string;
  fallback?: string;
  priority?: boolean;
}

// Single shared intersection observer for all images
let sharedObserver: IntersectionObserver | null = null;
const imageQueue = new Set<HTMLImageElement>();

const getSharedObserver = () => {
  if (!sharedObserver && typeof window !== 'undefined') {
    sharedObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            const src = img.dataset.src;
            if (src) {
              img.src = src;
              img.removeAttribute('data-src');
              sharedObserver?.unobserve(img);
            }
          }
        });
      },
      { threshold: 0.1, rootMargin: '50px' }
    );
  }
  return sharedObserver;
};

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
  priority = false,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
  }, []);

  const handleError = useCallback(() => {
    setIsError(true);
    if (imgRef.current) {
      imgRef.current.src = fallback;
    }
  }, [fallback]);

  useEffect(() => {
    const img = imgRef.current;
    if (!img || !lazy || priority) {
      return;
    }

    const observer = getSharedObserver();
    if (observer) {
      img.dataset.src = src;
      observer.observe(img);
    }

    return () => {
      if (observer && img) {
        observer.unobserve(img);
      }
    };
  }, [src, lazy, priority]);

  // Optimized srcset generation
  const generateSrcSet = useCallback((baseSrc: string) => {
    if (!baseSrc || baseSrc.startsWith('data:')) return '';
    
    if (baseSrc.includes('unsplash')) {
      return `${baseSrc}&w=640&q=80&fm=webp 640w,
              ${baseSrc}&w=1080&q=80&fm=webp 1080w,
              ${baseSrc}&w=1920&q=75&fm=webp 1920w`;
    }
    return '';
  }, []);

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* Fixed size placeholder to prevent layout shift */}
      {!isLoaded && (
        <div 
          className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200"
          style={{ 
            width: width || '100%',
            height: height || 'auto',
            aspectRatio: width && height ? `${width}/${height}` : '16/9'
          }}
        />
      )}
      
      <img
        ref={imgRef}
        src={lazy && !priority ? undefined : src}
        srcSet={generateSrcSet(src)}
        sizes={sizes || '(max-width: 768px) 100vw, 50vw'}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          'transition-opacity duration-300 will-change-[opacity]',
          isLoaded ? 'opacity-100' : 'opacity-0',
          className
        )}
        style={{
          width: width || '100%',
          height: height || 'auto',
          aspectRatio: width && height ? `${width}/${height}` : '16/9'
        }}
        {...props}
      />
    </div>
  );
};
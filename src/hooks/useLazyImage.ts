import { useState, useRef, useEffect } from 'react';

interface UseLazyImageProps {
  src: string;
  threshold?: number;
}

export const useLazyImage = ({ src, threshold = 0.1 }: UseLazyImageProps) => {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setImageSrc(src);
          observer.disconnect();
        }
      },
      { threshold }
    );

    observer.observe(img);

    return () => observer.disconnect();
  }, [src, threshold]);

  useEffect(() => {
    if (!imageSrc) return;

    const img = new Image();
    img.onload = () => setIsLoaded(true);
    img.onerror = () => setIsError(true);
    img.src = imageSrc;
  }, [imageSrc]);

  return {
    imgRef,
    src: imageSrc,
    isLoaded,
    isError,
  };
};
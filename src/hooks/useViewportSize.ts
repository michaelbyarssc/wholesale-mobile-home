import { useState, useEffect } from 'react';

interface ViewportSize {
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
}

export const useViewportSize = (): ViewportSize => {
  const [viewportSize, setViewportSize] = useState<ViewportSize>(() => {
    if (typeof window !== 'undefined') {
      const width = window.innerWidth;
      const height = window.innerHeight;
      console.log('🔍 VIEWPORT INIT:', width, 'x', height);
      return {
        width,
        height,
        isMobile: width < 768,
        isTablet: width >= 768 && width < 1024,
        isDesktop: width >= 1024,
      };
    }
    return {
      width: 0,
      height: 0,
      isMobile: false,
      isTablet: false,
      isDesktop: false,
    };
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      console.log('🔍 VIEWPORT RESIZE:', width, 'x', height, 'isMobile:', width < 768, 'isTablet:', width >= 768 && width < 1024, 'isDesktop:', width >= 1024);
      setViewportSize({
        width,
        height,
        isMobile: width < 768,
        isTablet: width >= 768 && width < 1024,
        isDesktop: width >= 1024,
      });
    };

    // Use requestAnimationFrame for better performance
    let rafId: number;
    const debouncedResize = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(handleResize);
    };

    window.addEventListener('resize', debouncedResize, { passive: true });
    
    return () => {
      window.removeEventListener('resize', debouncedResize);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return viewportSize;
};
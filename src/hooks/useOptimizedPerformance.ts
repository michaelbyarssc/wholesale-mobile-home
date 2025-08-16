import { useEffect, useCallback, useRef } from 'react';

interface PerformanceOptimizationOptions {
  enableScrollOptimization?: boolean;
  enableImageLazyLoading?: boolean;
  enableCarouselOptimization?: boolean;
  scrollThrottle?: number;
}

const isProduction = window.location.hostname !== 'localhost';

export const useOptimizedPerformance = ({
  enableScrollOptimization = true,
  enableImageLazyLoading = true,
  enableCarouselOptimization = true,
  scrollThrottle = 100
}: PerformanceOptimizationOptions = {}) => {
  const isInitialized = useRef(false);

  // Lightweight scroll performance optimization
  const optimizeScrollPerformance = useCallback(() => {
    if (!enableScrollOptimization || isProduction) return;

    requestAnimationFrame(() => {
      const carousels = document.querySelectorAll('[data-carousel]');
      carousels.forEach(carousel => {
        (carousel as HTMLElement).style.willChange = 'transform';
      });
    });
  }, [enableScrollOptimization]);

  // Minimal DOM optimization
  const optimizeCarousels = useCallback(() => {
    if (!enableCarouselOptimization || isProduction) return;
    // Minimal optimization in production
  }, [enableCarouselOptimization]);

  const applyContentVisibility = useCallback(() => {
    if (isProduction) return;
    // Disabled in production to prevent DOM thrashing
  }, []);

  const handleScroll = useCallback(() => {
    if (isProduction) return;
    // Disabled in production
  }, []);

  const optimizeImages = useCallback(() => {
    if (!enableImageLazyLoading || isProduction) return;
    // Minimal image optimization
  }, [enableImageLazyLoading]);

  const batchDOMOperations = useCallback(() => {
    if (isProduction) return;
    requestAnimationFrame(() => {
      optimizeScrollPerformance();
      optimizeCarousels();
      applyContentVisibility(); 
      optimizeImages();
    });
  }, [optimizeScrollPerformance, optimizeCarousels, applyContentVisibility, optimizeImages]);

  useEffect(() => {
    if (isInitialized.current || isProduction) return;
    
    // Light initialization only in development
    const timeoutId = setTimeout(() => {
      batchDOMOperations();
    }, 500);

    isInitialized.current = true;

    return () => {
      clearTimeout(timeoutId);
    };
  }, [batchDOMOperations]);

  // Force re-optimization (useful after dynamic content changes)
  const reoptimize = useCallback(() => {
    batchDOMOperations();
  }, [batchDOMOperations]);

  return {
    reoptimize
  };
};
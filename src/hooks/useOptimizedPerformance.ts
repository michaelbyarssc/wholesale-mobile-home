import { useEffect, useCallback, useRef } from 'react';
import { throttle, debounce } from '@/utils/performance';

interface PerformanceOptimizationOptions {
  enableScrollOptimization?: boolean;
  enableImageLazyLoading?: boolean;
  enableCarouselOptimization?: boolean;
  scrollThrottle?: number;
}

export const useOptimizedPerformance = ({
  enableScrollOptimization = true,
  enableImageLazyLoading = true,
  enableCarouselOptimization = true,
  scrollThrottle = 16
}: PerformanceOptimizationOptions = {}) => {
  const isInitialized = useRef(false);

  // Optimize scroll performance
  const optimizeScrollPerformance = useCallback(() => {
    if (!enableScrollOptimization) return;

    // Add will-change to elements that will be transformed during scroll
    const carousels = document.querySelectorAll('[data-carousel]');
    carousels.forEach(carousel => {
      (carousel as HTMLElement).style.willChange = 'transform';
      (carousel as HTMLElement).style.contain = 'layout style paint';
    });

    // Apply transform3d to trigger GPU acceleration
    const animatedElements = document.querySelectorAll('.hover\\:scale-105, .transition-transform');
    animatedElements.forEach(el => {
      (el as HTMLElement).style.transform = 'translateZ(0)';
    });
  }, [enableScrollOptimization]);

  // Optimize carousel performance
  const optimizeCarousels = useCallback(() => {
    if (!enableCarouselOptimization) return;

    const carouselSlides = document.querySelectorAll('.embla__slide');
    carouselSlides.forEach(slide => {
      (slide as HTMLElement).style.transform = 'translateZ(0)';
      (slide as HTMLElement).style.backfaceVisibility = 'hidden';
      (slide as HTMLElement).style.willChange = 'transform';
    });
  }, [enableCarouselOptimization]);

  // Apply content-visibility to improve rendering
  const applyContentVisibility = useCallback(() => {
    const cards = document.querySelectorAll('[data-mobile-home-card]');
    cards.forEach(card => {
      (card as HTMLElement).style.contentVisibility = 'auto';
      (card as HTMLElement).style.containIntrinsicSize = '0 500px';
    });
  }, []);

  // Throttled scroll handler to prevent excessive scroll events
  const handleScroll = useCallback(
    throttle(() => {
      // Pause non-critical animations during scroll
      const carousels = document.querySelectorAll('[data-carousel]');
      carousels.forEach(carousel => {
        (carousel as HTMLElement).style.animationPlayState = 'paused';
      });

      // Resume animations after scroll ends
      setTimeout(() => {
        carousels.forEach(carousel => {
          (carousel as HTMLElement).style.animationPlayState = 'running';
        });
      }, 150);
    }, scrollThrottle),
    [scrollThrottle]
  );

  // Optimize image loading
  const optimizeImages = useCallback(() => {
    if (!enableImageLazyLoading) return;

    // Add loading="lazy" to images that don't have it
    const images = document.querySelectorAll('img:not([loading])');
    images.forEach(img => {
      img.setAttribute('loading', 'lazy');
    });

    // Add decoding="async" for better performance
    const allImages = document.querySelectorAll('img');
    allImages.forEach(img => {
      img.setAttribute('decoding', 'async');
    });
  }, [enableImageLazyLoading]);

  // Reduce layout thrashing by batching DOM reads/writes
  const batchDOMOperations = useCallback(() => {
    // Use requestAnimationFrame to batch DOM operations
    requestAnimationFrame(() => {
      optimizeScrollPerformance();
      optimizeCarousels();
      applyContentVisibility();
      optimizeImages();
    });
  }, [optimizeScrollPerformance, optimizeCarousels, applyContentVisibility, optimizeImages]);

  useEffect(() => {
    if (isInitialized.current) return;
    
    // Initial optimization
    batchDOMOperations();
    
    // Add scroll listener
    if (enableScrollOptimization) {
      window.addEventListener('scroll', handleScroll, { passive: true });
    }

    // Observe for new content and re-optimize
    const observer = new MutationObserver(
      debounce(batchDOMOperations, 100)
    );

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false
    });

    isInitialized.current = true;

    return () => {
      if (enableScrollOptimization) {
        window.removeEventListener('scroll', handleScroll);
      }
      observer.disconnect();
    };
  }, [enableScrollOptimization, handleScroll, batchDOMOperations]);

  // Force re-optimization (useful after dynamic content changes)
  const reoptimize = useCallback(() => {
    batchDOMOperations();
  }, [batchDOMOperations]);

  return {
    reoptimize
  };
};
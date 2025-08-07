import { useEffect, useRef, useCallback } from 'react';

interface ScrollOptimizationOptions {
  throttleMs?: number;
  passive?: boolean;
  rootMargin?: string;
}

export const useScrollOptimization = (options: ScrollOptimizationOptions = {}) => {
  const { throttleMs = 16, passive = true, rootMargin = '0px' } = options;
  const rafId = useRef<number>();
  const lastScrollTime = useRef(0);

  const throttledScrollHandler = useCallback((callback: () => void) => {
    const now = Date.now();
    if (now - lastScrollTime.current >= throttleMs) {
      lastScrollTime.current = now;
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
      rafId.current = requestAnimationFrame(callback);
    }
  }, [throttleMs]);

  useEffect(() => {
    return () => {
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, []);

  return { throttledScrollHandler };
};

// Optimize scroll behavior for mobile
export const optimizeScrollForMobile = () => {
  if (typeof window === 'undefined') return;

  // Enable smooth scrolling
  document.documentElement.style.scrollBehavior = 'smooth';
  
  // Add CSS containment for better performance
  const style = document.createElement('style');
  style.textContent = `
    .scroll-optimized {
      contain: layout style paint;
      will-change: transform;
    }
    .scroll-item {
      transform: translateZ(0);
      backface-visibility: hidden;
    }
  `;
  document.head.appendChild(style);
};
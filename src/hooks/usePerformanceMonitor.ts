import { useEffect, useCallback } from 'react';

interface PerformanceMetrics {
  loadTime: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  firstInputDelay: number;
}

export const usePerformanceMonitor = () => {
  const measurePerformance = useCallback(() => {
    if (typeof window === 'undefined' || !window.performance) return;

    // Core Web Vitals measurement
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'navigation') {
          const navEntry = entry as PerformanceNavigationTiming;
          console.log('Page Load Time:', navEntry.loadEventEnd - navEntry.fetchStart, 'ms');
        }
        
        if (entry.entryType === 'paint') {
          if (entry.name === 'first-contentful-paint') {
            console.log('First Contentful Paint:', entry.startTime, 'ms');
          }
        }
        
        if (entry.entryType === 'largest-contentful-paint') {
          console.log('Largest Contentful Paint:', entry.startTime, 'ms');
        }
        
        if (entry.entryType === 'layout-shift') {
          const layoutShiftEntry = entry as any; // Layout shift entries aren't in standard types yet
          if (!layoutShiftEntry.hadRecentInput) {
            console.log('Cumulative Layout Shift:', layoutShiftEntry.value);
          }
        }
      }
    });

    // Observe different types of performance entries
    try {
      observer.observe({ entryTypes: ['navigation', 'paint'] });
      observer.observe({ entryTypes: ['largest-contentful-paint'] });
      observer.observe({ entryTypes: ['layout-shift'] });
    } catch (e) {
      // Some browsers might not support all entry types
      console.warn('Performance observation not fully supported');
    }

    return () => observer.disconnect();
  }, []);

  const logResourceTiming = useCallback(() => {
    if (typeof window === 'undefined' || !window.performance) return;

    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    const slowResources = resources.filter(resource => resource.duration > 1000);
    
    if (slowResources.length > 0) {
      console.group('Slow Loading Resources (>1s):');
      slowResources.forEach(resource => {
        console.log(`${resource.name}: ${Math.round(resource.duration)}ms`);
      });
      console.groupEnd();
    }
  }, []);

  useEffect(() => {
    const cleanup = measurePerformance();
    
    // Log resource timing after page load
    const timer = setTimeout(logResourceTiming, 2000);
    
    return () => {
      cleanup?.();
      clearTimeout(timer);
    };
  }, [measurePerformance, logResourceTiming]);

  const markFeature = useCallback((featureName: string) => {
    if (typeof window !== 'undefined' && window.performance) {
      performance.mark(`feature-${featureName}-start`);
    }
  }, []);

  const measureFeature = useCallback((featureName: string) => {
    if (typeof window !== 'undefined' && window.performance) {
      performance.mark(`feature-${featureName}-end`);
      performance.measure(
        `feature-${featureName}`,
        `feature-${featureName}-start`,
        `feature-${featureName}-end`
      );
      
      const measure = performance.getEntriesByName(`feature-${featureName}`)[0];
      if (measure) {
        console.log(`${featureName} took ${Math.round(measure.duration)}ms`);
      }
    }
  }, []);

  return { markFeature, measureFeature };
};
import { useEffect, useCallback } from 'react';

// Lightweight performance monitoring with reduced overhead
export const useOptimizedPerformanceMonitor = () => {
  useEffect(() => {
    // Only observe critical performance metrics
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

    let lcpObserver: PerformanceObserver | null = null;
    let clsObserver: PerformanceObserver | null = null;

    try {
      // Observe LCP with reduced frequency
      lcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1];
        if (lastEntry.startTime > 4000) { // Only log if LCP is concerning
          console.warn('⚠️ Poor LCP:', lastEntry.startTime);
        }
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'], buffered: false });

      // Observe CLS with threshold
      let clsScore = 0;
      clsObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        entries.forEach(entry => {
          if (entry.entryType === 'layout-shift') {
            const clsEntry = entry as any;
            if (!clsEntry.hadRecentInput) {
              clsScore += clsEntry.value;
              if (clsScore > 0.25) { // Only log if CLS is concerning
                console.warn('⚠️ Poor CLS:', clsScore);
              }
            }
          }
        });
      });
      clsObserver.observe({ entryTypes: ['layout-shift'], buffered: false });

    } catch (error) {
      console.error('Performance observer error:', error);
    }

    return () => {
      if (lcpObserver) lcpObserver.disconnect();
      if (clsObserver) clsObserver.disconnect();
    };
  }, []);

  // Simplified performance marking
  const markFeature = useCallback((feature: string) => {
    if (performance.mark) {
      performance.mark(`${feature}-start`);
    }
  }, []);

  const measureFeature = useCallback((feature: string) => {
    if (performance.measure && performance.mark) {
      try {
        performance.mark(`${feature}-end`);
        const measurement = performance.measure(feature, `${feature}-start`, `${feature}-end`);
        if (measurement.duration > 1000) { // Only log slow operations
          console.warn(`⚠️ Slow ${feature}:`, measurement.duration);
        }
      } catch (error) {
        // Ignore measurement errors
      }
    }
  }, []);

  return {
    markFeature,
    measureFeature
  };
};
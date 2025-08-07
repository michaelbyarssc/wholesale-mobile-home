import { useEffect, useCallback } from 'react';

// Lightweight performance monitoring with reduced overhead
export const useOptimizedPerformanceMonitor = () => {
  useEffect(() => {
    // Lightweight performance monitoring - only track critical issues
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

    let clsObserver: PerformanceObserver | null = null;

    try {
      // Only observe CLS since it's causing scroll issues
      let clsScore = 0;
      clsObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        entries.forEach(entry => {
          if (entry.entryType === 'layout-shift') {
            const clsEntry = entry as any;
            if (!clsEntry.hadRecentInput) {
              clsScore += clsEntry.value;
              // Reduced threshold and frequency
              if (clsScore > 0.5) {
                console.warn('CLS issue detected:', clsScore);
                clsScore = 0; // Reset to prevent spam
              }
            }
          }
        });
      });
      clsObserver.observe({ entryTypes: ['layout-shift'], buffered: false });

    } catch (error) {
      // Silent fail
    }

    return () => {
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
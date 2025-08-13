import { useEffect } from 'react';

interface LayoutShift extends PerformanceEntry {
  value: number;
  hadRecentInput: boolean;
}

export function usePerformanceMetrics() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

    // Only run performance monitoring in development
    const isDevelopment = window.location.hostname === 'localhost' || 
                         window.location.hostname.includes('lovableproject.com');
    
    if (!isDevelopment) return;

    // Throttle logging to prevent spam
    let lastLogTime = 0;
    const LOG_THROTTLE = 2000; // 2 seconds

    const throttledLog = (metric: string, value: number) => {
      const now = Date.now();
      if (now - lastLogTime > LOG_THROTTLE) {
        console.log(`${metric}: ${Math.round(value)}`);
        lastLogTime = now;
      }
    };

    // Observe LCP
    const lcpObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1];
      throttledLog('LCP', lastEntry.startTime);
    });
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

    // Observe FID
    const fidObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      entries.forEach(entry => {
        if (entry.entryType === 'first-input') {
          const fidEntry = entry as PerformanceEventTiming;
          throttledLog('FID', fidEntry.processingStart - fidEntry.startTime);
        }
      });
    });
    fidObserver.observe({ entryTypes: ['first-input'] });

    // Observe CLS - only log if concerning
    const clsObserver = new PerformanceObserver((entryList) => {
      let clsScore = 0;
      const entries = entryList.getEntries();
      entries.forEach(entry => {
        if (entry.entryType === 'layout-shift') {
          const clsEntry = entry as LayoutShift;
          if (!clsEntry.hadRecentInput) {
            clsScore += clsEntry.value;
          }
        }
      });
      // Only log if CLS is concerning (> 0.1)
      if (clsScore > 0.1) {
        throttledLog('CLS', clsScore);
      }
    });
    clsObserver.observe({ entryTypes: ['layout-shift'] });

    return () => {
      lcpObserver.disconnect();
      fidObserver.disconnect();
      clsObserver.disconnect();
    };
  }, []);
}
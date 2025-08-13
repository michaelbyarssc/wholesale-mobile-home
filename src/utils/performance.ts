// Performance utilities for mobile optimization

// Debounce function for performance-sensitive operations
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Throttle function for scroll/resize events
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

// Lazy load images with intersection observer
export const lazyLoadImages = () => {
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          const src = img.dataset.src;
          if (src) {
            img.src = src;
            img.removeAttribute('data-src');
            imageObserver.unobserve(img);
          }
        }
      });
    });

    document.querySelectorAll('img[data-src]').forEach((img) => {
      imageObserver.observe(img);
    });
  }
};

// Preload critical resources
export const preloadResource = (href: string, as: string, type?: string) => {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.href = href;
  link.as = as;
  if (type) link.type = type;
  document.head.appendChild(link);
};

// Environment detection
const isDevelopment = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || 
   window.location.hostname.includes('lovableproject.com'));

// Throttled performance logging to reduce console spam
const performanceLog = throttle((metric: string, value: number) => {
  if (isDevelopment) {
    console.log(`${metric}: ${Math.round(value)}ms`);
  }
}, 1000);

// Measure and log Core Web Vitals (throttled for production)
export const measureCoreWebVitals = () => {
  if (!isDevelopment) return; // Skip in production

  // First Contentful Paint
  new PerformanceObserver((entryList) => {
    for (const entry of entryList.getEntries()) {
      if (entry.name === 'first-contentful-paint') {
        performanceLog('FCP', entry.startTime);
      }
    }
  }).observe({ entryTypes: ['paint'] });

  // Largest Contentful Paint
  new PerformanceObserver((entryList) => {
    for (const entry of entryList.getEntries()) {
      performanceLog('LCP', entry.startTime);
    }
  }).observe({ entryTypes: ['largest-contentful-paint'] });

  // Cumulative Layout Shift
  let clsValue = 0;
  new PerformanceObserver((entryList) => {
    for (const entry of entryList.getEntries() as any[]) {
      if (!entry.hadRecentInput) {
        clsValue += entry.value;
        if (clsValue > 0.1) { // Only log if CLS is concerning
          performanceLog('CLS', clsValue * 1000); // Convert to readable number
        }
      }
    }
  }).observe({ entryTypes: ['layout-shift'] });
};

// Register service worker for better caching
export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      if (isDevelopment) {
        console.log('Service Worker registered successfully:', registration);
      }
      
      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New content is available
              if (isDevelopment) {
                console.log('New content available, refresh to update');
              }
            }
          });
        }
      });
    } catch (error) {
      if (isDevelopment) {
        console.error('Service Worker registration failed:', error);
      }
    }
  }
};

// Optimize images for different screen densities
export const getOptimizedImageSrc = (
  baseSrc: string,
  width: number,
  quality: number = 80
): string => {
  // For Unsplash images, add optimization parameters
  if (baseSrc.includes('unsplash.com')) {
    const url = new URL(baseSrc);
    url.searchParams.set('w', width.toString());
    url.searchParams.set('q', quality.toString());
    url.searchParams.set('fm', 'webp');
    url.searchParams.set('fit', 'crop');
    return url.toString();
  }
  
  return baseSrc;
};

// Check if device prefers reduced motion
export const prefersReducedMotion = (): boolean => {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

// Get device pixel ratio for optimal image loading
export const getDevicePixelRatio = (): number => {
  return window.devicePixelRatio || 1;
};

// Network quality detection for adaptive functionality
export const detectNetworkQuality = (): Promise<string> => {
  return new Promise((resolve) => {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      const downlink = connection.downlink || 0;
      
      if (downlink >= 10) resolve('fast');
      else if (downlink >= 1.5) resolve('good'); 
      else if (downlink >= 0.5) resolve('slow');
      else resolve('very-slow');
    } else {
      // Fallback: measure ping to determine quality
      const start = performance.now();
      fetch('/favicon.ico', { method: 'HEAD', cache: 'no-cache' })
        .then(() => {
          const ping = performance.now() - start;
          if (ping < 100) resolve('fast');
          else if (ping < 300) resolve('good');
          else if (ping < 1000) resolve('slow');
          else resolve('very-slow');
        })
        .catch(() => resolve('offline'));
    }
  });
};

// Adaptive image loading based on network and device
export const getAdaptiveImageSettings = async () => {
  const networkQuality = await detectNetworkQuality();
  const devicePixelRatio = getDevicePixelRatio();
  
  const settings = {
    fast: { quality: 90, maxWidth: 1920 * devicePixelRatio },
    good: { quality: 80, maxWidth: 1440 * devicePixelRatio },
    slow: { quality: 70, maxWidth: 1080 },
    'very-slow': { quality: 60, maxWidth: 720 },
    offline: { quality: 50, maxWidth: 480 }
  };
  
  return settings[networkQuality as keyof typeof settings] || settings.good;
};

// Battery-aware processing
export const isBatteryOptimizationNeeded = async (): Promise<boolean> => {
  try {
    if ('getBattery' in navigator) {
      const battery: any = await (navigator as any).getBattery();
      return battery.level < 0.2 || !battery.charging;
    }
  } catch (error) {
    console.log('Battery API not available');
  }
  return false;
};
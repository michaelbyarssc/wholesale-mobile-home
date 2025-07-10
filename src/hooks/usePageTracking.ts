import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAnalytics } from './useAnalytics';

export function usePageTracking() {
  const location = useLocation();
  const { trackPageView } = useAnalytics();
  const previousPathRef = useRef<string>('');

  useEffect(() => {
    // Track page view when route changes
    if (location.pathname !== previousPathRef.current) {
      trackPageView({
        searchQuery: location.search ? new URLSearchParams(location.search).get('q') || undefined : undefined,
      });
      previousPathRef.current = location.pathname;
    }
  }, [location, trackPageView]);

  useEffect(() => {
    // Track scroll depth
    let maxScrollDepth = 0;
    let scrollTimeout: NodeJS.Timeout;

    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const documentHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scrollDepth = Math.round((scrollTop / documentHeight) * 100);

      if (scrollDepth > maxScrollDepth) {
        maxScrollDepth = scrollDepth;
        
        // Debounce scroll tracking
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          trackPageView({
            pagePath: location.pathname,
            pageTitle: document.title,
            referrer: document.referrer,
          });
        }, 1000);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [location.pathname, trackPageView]);

  return null;
}
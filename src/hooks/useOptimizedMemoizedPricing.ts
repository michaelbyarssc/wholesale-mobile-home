import { useMemo } from 'react';
import { useOptimizedCustomerPricing } from './useOptimizedCustomerPricing';
import type { Database } from '@/integrations/supabase/types';
import { User } from '@supabase/supabase-js';

type MobileHome = Database['public']['Tables']['mobile_homes']['Row'];

// Create a pricing cache that persists across component renders
const pricingCache = new Map<string, { price: number; timestamp: number }>();
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

export const useOptimizedMemoizedPricing = (user: User | null, mobileHomes: MobileHome[]) => {
  const { calculateMobileHomePrice, loading: pricingLoading } = useOptimizedCustomerPricing(user);

  // Aggressive memoization with persistent cache
  const homePricing = useMemo(() => {
    if (pricingLoading || !mobileHomes.length) return {};
    
    const pricing: Record<string, number> = {};
    const now = Date.now();
    
    mobileHomes.forEach(home => {
      const cacheKey = `${user?.id || 'anon'}-${home.id}-${home.cost || home.price}`;
      const cached = pricingCache.get(cacheKey);
      
      // Use cached value if it's still valid
      if (cached && (now - cached.timestamp) < CACHE_DURATION) {
        pricing[home.id] = cached.price;
      } else {
        // Calculate and cache new price
        const price = calculateMobileHomePrice(home);
        pricing[home.id] = price;
        pricingCache.set(cacheKey, { price, timestamp: now });
      }
    });
    
    // Clean up old cache entries
    if (Math.random() < 0.1) { // 10% chance to clean up
      for (const [key, value] of pricingCache.entries()) {
        if ((now - value.timestamp) > CACHE_DURATION) {
          pricingCache.delete(key);
        }
      }
    }
    
    return pricing;
  }, [mobileHomes, calculateMobileHomePrice, pricingLoading, user?.id]);

  const getHomePrice = useMemo(() => {
    return (homeId: string) => homePricing[homeId] || 0;
  }, [homePricing]);

  return {
    getHomePrice,
    pricingLoading,
    homePricing,
    calculateMobileHomePrice // Export for backward compatibility
  };
};
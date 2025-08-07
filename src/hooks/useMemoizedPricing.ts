import { useMemo, useCallback } from 'react';
import { useCustomerPricing } from './useCustomerPricing';
import type { Database } from '@/integrations/supabase/types';
import { User } from '@supabase/supabase-js';

type MobileHome = Database['public']['Tables']['mobile_homes']['Row'];

export const useMemoizedPricing = (user: User | null, mobileHomes: MobileHome[]) => {
  const { calculateMobileHomePrice, loading: pricingLoading } = useCustomerPricing(user);

  // Create a stable homes reference based on IDs to prevent unnecessary recalculations
  const homesDataStable = useMemo(() => {
    return mobileHomes.map(home => ({
      id: home.id,
      price: home.price,
      cost: home.cost,
      minimum_profit: home.minimum_profit
    }));
  }, [mobileHomes]);

  // Memoize pricing calculations with stable dependencies
  const homePricing = useMemo(() => {
    if (pricingLoading || !homesDataStable.length) return {};
    
    const pricing: Record<string, number> = {};
    homesDataStable.forEach(homeData => {
      const fullHome = mobileHomes.find(h => h.id === homeData.id);
      if (fullHome) {
        pricing[homeData.id] = calculateMobileHomePrice(fullHome);
      }
    });
    
    return pricing;
  }, [homesDataStable, calculateMobileHomePrice, pricingLoading, mobileHomes]);

  // Memoize the getter function to prevent component re-renders
  const getHomePrice = useCallback((homeId: string) => {
    return homePricing[homeId] || 0;
  }, [homePricing]);

  return {
    getHomePrice,
    pricingLoading,
    homePricing,
    calculateMobileHomePrice // Export for backward compatibility
  };
};
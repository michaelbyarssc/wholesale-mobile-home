import { useMemo } from 'react';
import { useCustomerPricing } from './useCustomerPricing';
import type { Database } from '@/integrations/supabase/types';
import { User } from '@supabase/supabase-js';

type MobileHome = Database['public']['Tables']['mobile_homes']['Row'];

export const useMemoizedPricing = (user: User | null, mobileHomes: MobileHome[]) => {
  const { calculateMobileHomePrice, loading: pricingLoading } = useCustomerPricing(user);

  // Memoize pricing calculations to prevent recalculation on every render
  const homePricing = useMemo(() => {
    if (pricingLoading || !mobileHomes.length) return {};
    
    const pricing: Record<string, number> = {};
    mobileHomes.forEach(home => {
      pricing[home.id] = calculateMobileHomePrice(home);
    });
    
    return pricing;
  }, [mobileHomes, pricingLoading]);

  const getHomePrice = (homeId: string) => homePricing[homeId] || 0;

  return {
    getHomePrice,
    pricingLoading,
    homePricing,
    calculateMobileHomePrice // Export for backward compatibility
  };
};
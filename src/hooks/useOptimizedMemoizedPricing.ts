import { useMemo } from 'react';
import { useOptimizedCustomerPricing } from './useOptimizedCustomerPricing';
import type { Database } from '@/integrations/supabase/types';
import { User } from '@supabase/supabase-js';

type MobileHome = Database['public']['Tables']['mobile_homes']['Row'];

// Removed persistent cache to ensure we only show fresh, accurate prices for signed-in users

export const useOptimizedMemoizedPricing = (user: User | null, mobileHomes: MobileHome[]) => {
  const { calculateMobileHomePrice, loading: pricingLoading } = useOptimizedCustomerPricing(user);

  // Memoized pricing map computed only when pricing data is ready
  const homePricing = useMemo(() => {
    if (pricingLoading || !mobileHomes.length) return {};

    const pricing: Record<string, number> = {};
    mobileHomes.forEach((home) => {
      pricing[home.id] = calculateMobileHomePrice(home);
    });

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
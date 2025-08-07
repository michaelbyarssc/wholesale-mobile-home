import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

type MobileHome = Database['public']['Tables']['mobile_homes']['Row'];
type Service = Database['public']['Tables']['services']['Row'];
type HomeOption = Database['public']['Tables']['home_options']['Row'];

// Aggressive pricing cache with 15-minute stale time
const PRICING_CACHE_TIME = 15 * 60 * 1000; // 15 minutes
const PRICING_GC_TIME = 30 * 60 * 1000; // 30 minutes

export const useOptimizedCustomerPricing = (user: User | null) => {
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  // Fetch customer markup with extended caching but always refetch on mount for signed-in users to guarantee freshness
  const { 
    data: customerMarkup, 
    isLoading: markupLoading,
    isFetching,
    isSuccess,
    status,
    error,
    dataUpdatedAt
  } = useQuery({
    queryKey: ['customer-markup-optimized', user?.id],
    queryFn: async () => {
      if (!user) {
        return { 
          markup_percentage: 30, 
          tier_level: 'user', 
          super_admin_markup_percentage: 30 
        };
      }

      const { data, error } = await supabase
        .from('customer_markups')
        .select('markup_percentage, tier_level, super_admin_markup_percentage')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Pricing: Error fetching markup:', error);
        return null; // Do not fall back for signed-in users
      }

      return data; // Could be null if no row
    },
    enabled: true,
    staleTime: user ? 0 : PRICING_CACHE_TIME,
    gcTime: PRICING_GC_TIME,
    refetchOnWindowFocus: false,
    refetchOnMount: user ? true : false,
    refetchOnReconnect: user ? true : false,
  });

  useEffect(() => {
    // For signed-in users, keep loading true until we have a fresh DB value
    if (user) {
      setLoading(isFetching || markupLoading || !isSuccess || !customerMarkup);
    } else {
      // Anonymous users use default pricing immediately
      setLoading(false);
    }
  }, [user, isFetching, markupLoading, isSuccess, customerMarkup]);

  // Clear cached markup when the authenticated user changes to avoid stale data
  useEffect(() => {
    if (user) {
      queryClient.removeQueries({ queryKey: ['customer-markup-optimized'] });
    }
  }, [user?.id, queryClient]);

  // Memoized calculation functions to prevent recalculation
  const calculatePrice = useMemo(() => {
    return (basePrice: number): number => {
      if (!basePrice || !customerMarkup) return 0;
      
      const userMarkup = customerMarkup.markup_percentage || 30;
      const parentMarkup = customerMarkup.super_admin_markup_percentage || 30;
      const tierLevel = customerMarkup.tier_level || 'user';

      let finalPrice = basePrice;

      switch (tierLevel) {
        case 'super_admin':
          finalPrice = basePrice * (1 + userMarkup / 100);
          break;
        case 'admin':
          const adminBasePrice = basePrice * (1 + parentMarkup / 100);
          finalPrice = adminBasePrice * (1 + userMarkup / 100);
          break;
        case 'user':
          const userBasePrice = basePrice * (1 + parentMarkup / 100);
          finalPrice = userBasePrice * (1 + userMarkup / 100);
          break;
      }

      return finalPrice;
    };
  }, [customerMarkup]);

  const calculateMobileHomePrice = useMemo(() => {
    return (mobileHome: MobileHome | null): number => {
      if (!mobileHome?.price) return 0;

      const baseCost = mobileHome.cost || mobileHome.price;
      const tieredPrice = calculatePrice(baseCost);
      const minProfitPrice = baseCost + (mobileHome.minimum_profit || 0);
      
      return Math.max(tieredPrice, minProfitPrice);
    };
  }, [calculatePrice]);

  const calculateServicePrice = useMemo(() => {
    return (service: Service, mobileHome?: MobileHome | null): number => {
      if (!service) return 0;
      
      let baseCost = service.cost || service.price || 0;
      
      if (mobileHome?.width_feet) {
        if (mobileHome.width_feet < 16 && service.single_wide_price) {
          baseCost = service.cost || service.single_wide_price;
        } else if (mobileHome.width_feet >= 16 && service.double_wide_price) {
          baseCost = service.cost || service.double_wide_price;
        }
      }
      
      return calculatePrice(baseCost);
    };
  }, [calculatePrice]);

  const calculateHomeOptionPrice = useMemo(() => {
    return (option: HomeOption, squareFootage?: number): number => {
      if (!option) return 0;
      
      let baseCost = 0;

      if (option.pricing_type === 'per_sqft' && squareFootage && option.price_per_sqft) {
        baseCost = option.cost_price || (option.price_per_sqft * squareFootage);
      } else if (option.pricing_type === 'fixed' && option.cost_price) {
        baseCost = option.cost_price;
      }

      return calculatePrice(baseCost);
    };
  }, [calculatePrice]);

  const calculateTotalPrice = useMemo(() => {
    return (
      mobileHome: MobileHome | null,
      selectedServices: Service[] = [],
      selectedHomeOptions: { option: HomeOption; quantity: number }[] = []
    ): number => {
      const homePrice = calculateMobileHomePrice(mobileHome);
      const servicesPrice = selectedServices.reduce((total, service) => {
        return total + calculateServicePrice(service, mobileHome);
      }, 0);
      
      const optionsPrice = selectedHomeOptions.reduce((total, { option, quantity }) => {
        const optionPrice = calculateHomeOptionPrice(option, mobileHome?.square_footage || undefined);
        return total + (optionPrice * quantity);
      }, 0);

      return homePrice + servicesPrice + optionsPrice;
    };
  }, [calculateMobileHomePrice, calculateServicePrice, calculateHomeOptionPrice]);

  return {
    customerMarkup: customerMarkup?.markup_percentage || 30,
    markupPercentage: customerMarkup?.markup_percentage || 30,
    tierLevel: customerMarkup?.tier_level || 'user',
    parentMarkup: customerMarkup?.super_admin_markup_percentage || 30,
    loading,
    calculatePrice,
    calculateMobileHomePrice,
    calculateServicePrice,
    calculateHomeOptionPrice,
    calculateTotalPrice,
  };
};
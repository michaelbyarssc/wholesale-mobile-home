import React, { createContext, useContext, useMemo, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type MobileHome = Database['public']['Tables']['mobile_homes']['Row'];
type Service = Database['public']['Tables']['services']['Row'];
type HomeOption = Database['public']['Tables']['home_options']['Row'];

interface PricingContextValue {
  calculateMobileHomePrice: (mobileHome: MobileHome | null) => number;
  calculateServicePrice: (service: Service, mobileHome?: MobileHome | null) => number;
  calculateHomeOptionPrice: (option: HomeOption, squareFootage?: number) => number;
  calculateTotalPrice: (
    mobileHome: MobileHome | null,
    selectedServices: Service[],
    selectedHomeOptions: { option: HomeOption; quantity: number }[]
  ) => number;
  calculatePrice: (basePrice: number) => number;
  customerMarkup: any;
  markupPercentage: number;
  tierLevel: string;
  parentMarkup: number;
  loading: boolean;
}

const PricingContext = createContext<PricingContextValue | null>(null);

interface PricingProviderProps {
  children: React.ReactNode;
  user: User | null;
}

export const PricingProvider: React.FC<PricingProviderProps> = ({ children, user }) => {
  // **PHASE 1: Direct pricing data fetch without useCustomerPricing hook**
  const { data: customerMarkup, isLoading: markupLoading } = useQuery({
    queryKey: ['customer-markup-stable', user?.id],
    queryFn: async () => {
      if (!user?.id) {
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
        console.error('PricingProvider: Error fetching markup:', error);
        return { 
          markup_percentage: 30, 
          tier_level: 'user', 
          super_admin_markup_percentage: 30 
        };
      }

      return data || { 
        markup_percentage: 30, 
        tier_level: 'user', 
        super_admin_markup_percentage: 30 
      };
    },
    enabled: true,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false
  });

  // **PHASE 2: Extract primitive values for stable dependencies**
  const userMarkup = customerMarkup?.markup_percentage || 30;
  const parentMarkup = customerMarkup?.super_admin_markup_percentage || 30;
  const tierLevel = customerMarkup?.tier_level || 'user';

  // **PHASE 3: Create pricing calculation cache**
  const pricingCache = useMemo(() => new Map<string, number>(), [userMarkup, parentMarkup, tierLevel]);

  // **PHASE 4: Primitive-based pricing functions with ONLY primitive dependencies**
  const calculatePrice = useCallback((basePrice: number): number => {
    if (!basePrice) return 0;
    
    const cacheKey = `base-${basePrice}-${userMarkup}-${parentMarkup}-${tierLevel}`;
    const cached = pricingCache.get(cacheKey);
    if (cached !== undefined) return cached;

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

    pricingCache.set(cacheKey, finalPrice);
    return finalPrice;
  }, [userMarkup, parentMarkup, tierLevel, pricingCache]);

  const calculateMobileHomePrice = useCallback((mobileHome: MobileHome | null): number => {
    if (!mobileHome?.price) return 0;

    const baseCost = mobileHome.cost || mobileHome.price;
    const cacheKey = `home-${mobileHome.id}-${baseCost}-${mobileHome.minimum_profit || 0}-${userMarkup}-${parentMarkup}-${tierLevel}`;
    const cached = pricingCache.get(cacheKey);
    if (cached !== undefined) return cached;

    const tieredPrice = calculatePrice(baseCost);
    const minProfitPrice = baseCost + (mobileHome.minimum_profit || 0);
    const finalPrice = Math.max(tieredPrice, minProfitPrice);

    pricingCache.set(cacheKey, finalPrice);
    return finalPrice;
  }, [userMarkup, parentMarkup, tierLevel, calculatePrice, pricingCache]);

  const calculateServicePrice = useCallback((service: Service, mobileHome?: MobileHome | null): number => {
    if (!service) return 0;
    
    let baseCost = service.cost || service.price || 0;
    const width = mobileHome?.width_feet || 0;
    
    if (width > 0) {
      if (width < 16 && service.single_wide_price) {
        baseCost = service.cost || service.single_wide_price;
      } else if (width >= 16 && service.double_wide_price) {
        baseCost = service.cost || service.double_wide_price;
      }
    }
    
    const cacheKey = `service-${service.id}-${baseCost}-${width}-${userMarkup}-${parentMarkup}-${tierLevel}`;
    const cached = pricingCache.get(cacheKey);
    if (cached !== undefined) return cached;

    const finalPrice = calculatePrice(baseCost);
    pricingCache.set(cacheKey, finalPrice);
    return finalPrice;
  }, [userMarkup, parentMarkup, tierLevel, calculatePrice, pricingCache]);

  const calculateHomeOptionPrice = useCallback((option: HomeOption, squareFootage?: number): number => {
    if (!option) return 0;
    
    let baseCost = 0;
    const sqft = squareFootage || 0;

    if (option.pricing_type === 'per_sqft' && sqft && option.price_per_sqft) {
      baseCost = option.cost_price || (option.price_per_sqft * sqft);
    } else if (option.pricing_type === 'fixed' && option.cost_price) {
      baseCost = option.cost_price;
    }

    const cacheKey = `option-${option.id}-${baseCost}-${sqft}-${userMarkup}-${parentMarkup}-${tierLevel}`;
    const cached = pricingCache.get(cacheKey);
    if (cached !== undefined) return cached;

    const finalPrice = calculatePrice(baseCost);
    pricingCache.set(cacheKey, finalPrice);
    return finalPrice;
  }, [userMarkup, parentMarkup, tierLevel, calculatePrice, pricingCache]);

  const calculateTotalPrice = useCallback((
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
  }, [calculateMobileHomePrice, calculateServicePrice, calculateHomeOptionPrice]);

  // **PHASE 5: Fully stable context value with ONLY primitive dependencies**
  const contextValue = useMemo(() => ({
    calculateMobileHomePrice,
    calculateServicePrice,
    calculateHomeOptionPrice,
    calculateTotalPrice,
    calculatePrice,
    customerMarkup: userMarkup,
    markupPercentage: userMarkup,
    tierLevel,
    parentMarkup,
    loading: markupLoading,
  }), [
    calculateMobileHomePrice,
    calculateServicePrice,
    calculateHomeOptionPrice,
    calculateTotalPrice,
    calculatePrice,
    userMarkup,
    tierLevel,
    parentMarkup,
    markupLoading,
  ]);

  return (
    <PricingContext.Provider value={contextValue}>
      {children}
    </PricingContext.Provider>
  );
};

export const usePricingContext = (): PricingContextValue => {
  const context = useContext(PricingContext);
  if (!context) {
    throw new Error('usePricingContext must be used within a PricingProvider');
  }
  return context;
};
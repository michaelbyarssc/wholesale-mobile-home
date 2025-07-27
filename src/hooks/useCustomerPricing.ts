import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

type MobileHome = Database['public']['Tables']['mobile_homes']['Row'];
type Service = Database['public']['Tables']['services']['Row'];
type HomeOption = Database['public']['Tables']['home_options']['Row'];

export const useCustomerPricing = (user: User | null) => {
  const [loading, setLoading] = useState(true);

  console.log('useCustomerPricing: Hook called with user:', user?.id);

  // Fetch customer markup with tiered pricing info (cached for 5 minutes)
  const { data: customerMarkup, isLoading: markupLoading } = useQuery({
    queryKey: ['customer-markup', user?.id],
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
        console.error('useCustomerPricing: Error fetching markup:', error);
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
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnWindowFocus: false
  });

  useEffect(() => {
    if (!markupLoading) {
      console.log('useCustomerPricing: Setting loading to false');
      setLoading(false);
    }
  }, [markupLoading]);

  const calculatePrice = (basePrice: number): number => {
    if (!basePrice || !customerMarkup) return 0;
    
    const userMarkup = customerMarkup.markup_percentage || 30;
    const parentMarkup = customerMarkup.super_admin_markup_percentage || 30;
    const tierLevel = customerMarkup.tier_level || 'user';

    let finalPrice = basePrice;

    // Apply tiered pricing based on tier level
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

    console.log(`🔍 calculatePrice: Base: ${basePrice}, Tier: ${tierLevel}, Parent: ${parentMarkup}%, User: ${userMarkup}%, Final: ${finalPrice}`);
    return finalPrice;
  };

  const calculateMobileHomePrice = (mobileHome: MobileHome | null): number => {
    console.log('useCustomerPricing: calculateMobileHomePrice called with:', mobileHome?.id);
    
    if (!mobileHome) {
      console.log('useCustomerPricing: mobileHome is null, returning 0');
      return 0;
    }

    if (!mobileHome.price) {
      console.log('useCustomerPricing: mobileHome.price is null, returning 0');
      return 0;
    }

    // Use cost as base if available, otherwise use price
    const baseCost = mobileHome.cost || mobileHome.price;
    
    // Apply tiered pricing
    const tieredPrice = calculatePrice(baseCost);
    
    // Also check minimum profit requirement
    const minProfitPrice = baseCost + (mobileHome.minimum_profit || 0);
    
    // Use the higher of the two prices
    const finalPrice = Math.max(tieredPrice, minProfitPrice);
    
    console.log('useCustomerPricing: Tiered pricing - Base cost:', baseCost, 'Tiered price:', tieredPrice, 'Min profit:', minProfitPrice, 'Final (higher):', finalPrice);
    return finalPrice;
  };

  const calculateServicePrice = (service: Service, mobileHome?: MobileHome | null): number => {
    if (!service) return 0;
    
    let baseCost = service.cost || service.price || 0;
    
    // Use single wide or double wide pricing if available and mobile home width is known
    if (mobileHome?.width_feet) {
      if (mobileHome.width_feet < 16 && service.single_wide_price) {
        baseCost = service.cost || service.single_wide_price;
        console.log('useCustomerPricing: Using single wide cost for service:', service.name, baseCost);
      } else if (mobileHome.width_feet >= 16 && service.double_wide_price) {
        baseCost = service.cost || service.double_wide_price;
        console.log('useCustomerPricing: Using double wide cost for service:', service.name, baseCost);
      }
    }
    
    const finalPrice = calculatePrice(baseCost);
    console.log('useCustomerPricing: Service price calculation - Base cost:', baseCost, 'Final:', finalPrice);
    return finalPrice;
  };

  const calculateHomeOptionPrice = (option: HomeOption, squareFootage?: number): number => {
    if (!option) return 0;
    
    let baseCost = 0;

    if (option.pricing_type === 'per_sqft' && squareFootage && option.price_per_sqft) {
      baseCost = option.cost_price || (option.price_per_sqft * squareFootage);
      console.log(`🔍 useCustomerPricing: Option ${option.name} - Per sq ft cost: ${option.cost_price || option.price_per_sqft} × ${squareFootage} = ${baseCost}`);
    } else if (option.pricing_type === 'fixed' && option.cost_price) {
      baseCost = option.cost_price;
      console.log(`🔍 useCustomerPricing: Option ${option.name} - Fixed cost: ${baseCost}`);
    }

    const finalPrice = calculatePrice(baseCost);
    console.log(`🔍 useCustomerPricing: Option ${option.name} - Base cost: ${baseCost}, Final: ${finalPrice}`);
    return finalPrice;
  };

  const calculateTotalPrice = (
    mobileHome: MobileHome | null,
    selectedServices: Service[] = [],
    selectedHomeOptions: { option: HomeOption; quantity: number }[] = []
  ): number => {
    console.log('useCustomerPricing: calculateTotalPrice called');
    
    const homePrice = calculateMobileHomePrice(mobileHome);
    const servicesPrice = selectedServices.reduce((total, service) => {
      return total + calculateServicePrice(service, mobileHome);
    }, 0);
    
    const optionsPrice = selectedHomeOptions.reduce((total, { option, quantity }) => {
      const optionPrice = calculateHomeOptionPrice(option, mobileHome?.square_footage || undefined);
      return total + (optionPrice * quantity);
    }, 0);

    const totalPrice = homePrice + servicesPrice + optionsPrice;
    console.log('useCustomerPricing: Total price calculated:', totalPrice);
    return totalPrice;
  };

  console.log('useCustomerPricing: Returning hook values, loading:', loading);

  return {
    customerMarkup: customerMarkup?.markup_percentage || 30,
    markupPercentage: customerMarkup?.markup_percentage || 30, // Add alias for backward compatibility
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

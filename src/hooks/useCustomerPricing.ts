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

  // Fetch customer markup
  const { data: customerMarkup, isLoading: markupLoading } = useQuery({
    queryKey: ['customer-markup', user?.id],
    queryFn: async () => {
      if (!user) {
        console.log('useCustomerPricing: No user, returning default markup');
        return { markup_percentage: 30 };
      }

      console.log('useCustomerPricing: Fetching markup for user:', user.id);
      const { data, error } = await supabase
        .from('customer_markups')
        .select('markup_percentage')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('useCustomerPricing: Error fetching markup:', error);
        return { markup_percentage: 30 };
      }

      console.log('useCustomerPricing: Markup fetched:', data);
      return data || { markup_percentage: 30 };
    },
    enabled: true
  });

  useEffect(() => {
    if (!markupLoading) {
      console.log('useCustomerPricing: Setting loading to false');
      setLoading(false);
    }
  }, [markupLoading]);

  const calculatePrice = (basePrice: number): number => {
    if (!basePrice) return 0;
    const markup = customerMarkup?.markup_percentage || 30;
    return basePrice * (1 + markup / 100);
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

    const markup = customerMarkup?.markup_percentage || 30;
    
    // Pricing 1: Internal price + minimum profit
    const pricing1 = mobileHome.price + (mobileHome.minimum_profit || 0);
    
    // Pricing 2: Internal price + markup %
    const pricing2 = mobileHome.price * (1 + markup / 100);
    
    // Use the higher of the two prices
    const finalPrice = Math.max(pricing1, pricing2);
    
    console.log('useCustomerPricing: Pricing comparison - Cost + Min Profit:', pricing1, 'Cost + Markup%:', pricing2, 'Final (higher):', finalPrice);
    return finalPrice;
  };

  const calculateServicePrice = (service: Service): number => {
    if (!service?.price) return 0;
    const markup = customerMarkup?.markup_percentage || 30;
    return service.price * (1 + markup / 100);
  };

  const calculateHomeOptionPrice = (option: HomeOption, squareFootage?: number): number => {
    if (!option) return 0;
    
    const markup = customerMarkup?.markup_percentage || 30;
    let basePrice = 0;

    if (option.pricing_type === 'per_sqft' && squareFootage && option.price_per_sqft) {
      basePrice = option.price_per_sqft * squareFootage;
    } else if (option.pricing_type === 'fixed' && option.cost_price) {
      basePrice = option.cost_price;
    }

    return basePrice * (1 + markup / 100);
  };

  const calculateTotalPrice = (
    mobileHome: MobileHome | null,
    selectedServices: Service[] = [],
    selectedHomeOptions: { option: HomeOption; quantity: number }[] = []
  ): number => {
    console.log('useCustomerPricing: calculateTotalPrice called');
    
    const homePrice = calculateMobileHomePrice(mobileHome);
    const servicesPrice = selectedServices.reduce((total, service) => {
      return total + calculateServicePrice(service);
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
    loading,
    calculatePrice, // Add the missing calculatePrice function
    calculateMobileHomePrice,
    calculateServicePrice,
    calculateHomeOptionPrice,
    calculateTotalPrice,
  };
};

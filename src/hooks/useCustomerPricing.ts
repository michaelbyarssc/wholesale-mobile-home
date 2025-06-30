
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { formatPrice } from '@/lib/utils';
import { User } from '@supabase/supabase-js';

type MobileHome = Database['public']['Tables']['mobile_homes']['Row'];
type Service = Database['public']['Tables']['services']['Row'];
type HomeOption = Database['public']['Tables']['home_options']['Row'];

export const useCustomerPricing = (user?: User | null) => {
  const [markupPercentage, setMarkupPercentage] = useState<number>(30); // Default 30%
  const [minimumProfitPerHome, setMinimumProfitPerHome] = useState<number>(0); // Default 0
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPricing = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        setError(null);
        const { data, error: fetchError } = await supabase
          .from('customer_markups')
          .select('markup_percentage, minimum_profit_per_home')
          .eq('user_id', user.id)
          .maybeSingle();

        if (fetchError) {
          console.error('Error fetching customer pricing:', fetchError);
          setError(fetchError.message);
          // Keep default values on error
        } else if (data) {
          setMarkupPercentage(data.markup_percentage);
          setMinimumProfitPerHome(data.minimum_profit_per_home || 0);
        }
        // If no data found, keep default values
      } catch (err) {
        console.error('Unexpected error fetching pricing:', err);
        setError('Failed to load pricing information');
      } finally {
        setLoading(false);
      }
    };

    fetchPricing();
  }, [user?.id]);

  const calculatePrice = (baseCost: number): number => {
    if (typeof baseCost !== 'number' || baseCost < 0) {
      console.warn('Invalid base cost provided to calculatePrice:', baseCost);
      return 0;
    }
    
    // Calculate both pricing methods
    const markupPrice = baseCost * (1 + markupPercentage / 100);
    const minimumProfitPrice = baseCost + minimumProfitPerHome;
    
    // Return the higher of the two
    const finalPrice = Math.max(markupPrice, minimumProfitPrice);
    console.log(`Price calculation: baseCost=${baseCost}, markupPrice=${markupPrice}, minimumProfitPrice=${minimumProfitPrice}, finalPrice=${finalPrice}`);
    
    return Math.round(finalPrice * 100) / 100; // Round to 2 decimal places
  };

  const formatCalculatedPrice = (baseCost: number): string => {
    return formatPrice(calculatePrice(baseCost));
  };

  const calculateMobileHomePrice = (mobileHome: MobileHome): number => {
    // Use the price field as the base cost for calculations, not the internal cost field
    const baseCost = mobileHome.price || 0;
    
    // Get the home-specific minimum profit, fallback to customer's global minimum profit, then to 0
    const homeMinProfit = mobileHome.minimum_profit || minimumProfitPerHome || 0;
    
    // Calculate both pricing methods
    const markupPrice = baseCost * (1 + markupPercentage / 100);
    const minimumProfitPrice = baseCost + homeMinProfit;
    
    // Return the higher of the two
    const finalPrice = Math.max(markupPrice, minimumProfitPrice);
    console.log(`Mobile home pricing for ${mobileHome.model}: baseCost=${baseCost}, markupPrice=${markupPrice}, minimumProfitPrice=${minimumProfitPrice}, finalPrice=${finalPrice}`);
    return Math.round(finalPrice * 100) / 100;
  };

  const calculateServicePrice = (service: Service): number => {
    const baseCost = typeof service.cost === 'number' ? service.cost : 0;
    return calculatePrice(baseCost);
  };

  const calculateHomeOptionPrice = (homeOption: HomeOption, homeSquareFootage?: number): number => {
    if (homeOption.pricing_type === 'per_sqft') {
      if (!homeSquareFootage || !homeOption.price_per_sqft) {
        console.warn('Cannot calculate per-sqft pricing without square footage or price per sqft');
        return 0;
      }
      // For per-sqft pricing, apply customer markup to the per-sqft cost, then multiply by square footage
      const costPerSqft = homeOption.price_per_sqft;
      const markedUpCostPerSqft = calculatePrice(costPerSqft);
      return Math.round((markedUpCostPerSqft * homeSquareFootage) * 100) / 100;
    } else {
      // For fixed pricing, apply customer markup to the cost price
      const baseCost = homeOption.cost_price || 0;
      return calculatePrice(baseCost);
    }
  };

  const calculateTotalPrice = (
    mobileHome: MobileHome,
    selectedServices: Service[] = [],
    selectedHomeOptions: { option: HomeOption; quantity?: number }[] = []
  ): number => {
    const homePrice = calculateMobileHomePrice(mobileHome);
    const servicesPrice = selectedServices.reduce((total, service) => {
      return total + calculateServicePrice(service);
    }, 0);
    
    const homeOptionsPrice = selectedHomeOptions.reduce((total, { option, quantity = 1 }) => {
      const optionPrice = calculateHomeOptionPrice(option, mobileHome.square_footage || undefined);
      return total + (optionPrice * quantity);
    }, 0);
    
    return Math.round((homePrice + servicesPrice + homeOptionsPrice) * 100) / 100; // Round to 2 decimal places
  };

  return {
    markupPercentage,
    minimumProfitPerHome,
    customerMarkup: markupPercentage, // Add alias for backward compatibility
    loading,
    error,
    calculatePrice,
    formatCalculatedPrice,
    calculateMobileHomePrice,
    calculateServicePrice,
    calculateHomeOptionPrice,
    calculateTotalPrice,
  };
};

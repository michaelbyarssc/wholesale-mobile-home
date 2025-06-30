import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { formatPrice } from '@/lib/utils';
import { User } from '@supabase/supabase-js';

type MobileHome = Database['public']['Tables']['mobile_homes']['Row'];
type Service = Database['public']['Tables']['services']['Row'];

export const useCustomerPricing = (user?: User | null) => {
  const [markupPercentage, setMarkupPercentage] = useState<number>(30); // Default 30%
  const [minimumProfitPerHome, setMinimumProfitPerHome] = useState<number>(0); // Default $0
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
    
    const markup = markupPercentage / 100;
    const markupPrice = baseCost * (1 + markup);
    const minimumPrice = baseCost + minimumProfitPerHome;
    
    // Use the higher of the two prices
    const finalPrice = Math.max(markupPrice, minimumPrice);
    
    return Math.round(finalPrice * 100) / 100; // Round to 2 decimal places
  };

  const formatCalculatedPrice = (baseCost: number): string => {
    return formatPrice(calculatePrice(baseCost));
  };

  const calculateMobileHomePrice = (mobileHome: MobileHome): number => {
    const baseCost = typeof mobileHome.cost === 'number' ? mobileHome.cost : 0;
    return calculatePrice(baseCost);
  };

  const calculateServicePrice = (service: Service): number => {
    const baseCost = typeof service.cost === 'number' ? service.cost : 0;
    return calculatePrice(baseCost);
  };

  const calculateTotalPrice = (
    mobileHome: MobileHome,
    selectedServices: Service[] = []
  ): number => {
    const homePrice = calculateMobileHomePrice(mobileHome);
    const servicesPrice = selectedServices.reduce((total, service) => {
      return total + calculateServicePrice(service);
    }, 0);
    
    return Math.round((homePrice + servicesPrice) * 100) / 100; // Round to 2 decimal places
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
    calculateTotalPrice,
  };
};

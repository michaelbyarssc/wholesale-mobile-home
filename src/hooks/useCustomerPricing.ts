import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { formatPrice } from '@/lib/utils';
import { User } from '@supabase/supabase-js';

type MobileHome = Database['public']['Tables']['mobile_homes']['Row'];
type Service = Database['public']['Tables']['services']['Row'];

export const useCustomerPricing = (user?: User | null) => {
  const [markupPercentage, setMarkupPercentage] = useState<number>(30); // Default 30%
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMarkup = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        setError(null);
        const { data, error: fetchError } = await supabase
          .from('customer_markups')
          .select('markup_percentage')
          .eq('user_id', user.id)
          .maybeSingle();

        if (fetchError) {
          console.error('Error fetching customer markup:', fetchError);
          setError(fetchError.message);
          // Keep default markup on error
        } else if (data) {
          setMarkupPercentage(data.markup_percentage);
        }
        // If no data found, keep default markup
      } catch (err) {
        console.error('Unexpected error fetching markup:', err);
        setError('Failed to load pricing information');
      } finally {
        setLoading(false);
      }
    };

    fetchMarkup();
  }, [user?.id]);

  const calculatePrice = (baseCost: number): number => {
    if (typeof baseCost !== 'number' || baseCost < 0) {
      console.warn('Invalid base cost provided to calculatePrice:', baseCost);
      return 0;
    }
    
    const markup = markupPercentage / 100;
    return Math.round(baseCost * (1 + markup) * 100) / 100; // Round to 2 decimal places
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

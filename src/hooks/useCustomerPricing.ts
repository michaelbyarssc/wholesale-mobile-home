import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type MobileHome = Database['public']['Tables']['mobile_homes']['Row'];
type Service = Database['public']['Tables']['services']['Row'];

export const useCustomerPricing = (userId?: string) => {
  const [markupPercentage, setMarkupPercentage] = useState<number>(30); // Default 30%
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMarkup = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        setError(null);
        const { data, error: fetchError } = await supabase
          .from('customer_markups')
          .select('markup_percentage')
          .eq('user_id', userId)
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
  }, [userId]);

  const calculatePrice = (baseCost: number): number => {
    if (typeof baseCost !== 'number' || baseCost < 0) {
      console.warn('Invalid base cost provided to calculatePrice:', baseCost);
      return 0;
    }
    
    const markup = markupPercentage / 100;
    return Math.round(baseCost * (1 + markup) * 100) / 100; // Round to 2 decimal places
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
    loading,
    error,
    calculatePrice,
    calculateMobileHomePrice,
    calculateServicePrice,
    calculateTotalPrice,
  };
};

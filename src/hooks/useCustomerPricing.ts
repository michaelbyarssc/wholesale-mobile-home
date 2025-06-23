
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

interface CustomerMarkup {
  markup_percentage: number;
}

export const useCustomerPricing = (user: User | null) => {
  const [customerMarkup, setCustomerMarkup] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCustomerMarkup = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('customer_markups')
          .select('markup_percentage')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
          console.error('Error fetching customer markup:', error);
        }

        setCustomerMarkup(data?.markup_percentage || 0);
      } catch (error) {
        console.error('Error fetching customer markup:', error);
        setCustomerMarkup(0);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomerMarkup();
  }, [user]);

  const calculatePrice = (cost: number): number => {
    if (!cost || cost <= 0) return 0;
    return cost * (1 + customerMarkup / 100);
  };

  return {
    customerMarkup,
    calculatePrice,
    loading
  };
};

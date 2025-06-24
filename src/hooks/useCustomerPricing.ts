
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { formatPrice } from '@/lib/utils';

interface CustomerMarkup {
  markup_percentage: number;
}

export const useCustomerPricing = (user: User | null) => {
  const [customerMarkup, setCustomerMarkup] = useState<number>(30);
  const [loading, setLoading] = useState(true);

  const fetchCustomerMarkup = useCallback(async () => {
    if (!user) {
      setCustomerMarkup(30); // Default for anonymous users
      setLoading(false);
      return;
    }

    try {
      console.log('Fetching markup for user:', user.id);
      
      const { data, error } = await supabase
        .from('customer_markups')
        .select('markup_percentage')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching customer markup:', error);
        setCustomerMarkup(30);
      } else if (!data || error?.code === 'PGRST116') {
        // No markup found, create default
        console.log('No markup found, creating default 30%');
        
        const { error: insertError } = await supabase
          .from('customer_markups')
          .insert({ user_id: user.id, markup_percentage: 30 });

        if (insertError) {
          console.error('Error creating default markup:', insertError);
        }
        
        setCustomerMarkup(30);
      } else {
        console.log('Found markup:', data.markup_percentage);
        setCustomerMarkup(data.markup_percentage || 30);
      }
    } catch (error) {
      console.error('Error fetching customer markup:', error);
      setCustomerMarkup(30);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCustomerMarkup();
  }, [fetchCustomerMarkup]);

  // Set up real-time subscription to markup changes
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('customer-markup-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'customer_markups',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Markup change detected:', payload);
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const newMarkup = payload.new?.markup_percentage;
            if (newMarkup !== undefined) {
              console.log('Updating markup to:', newMarkup);
              setCustomerMarkup(newMarkup);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const calculatePrice = (cost: number): number => {
    if (!cost || cost <= 0) return 0;
    const price = cost * (1 + customerMarkup / 100);
    console.log(`Calculating price: cost=${cost}, markup=${customerMarkup}%, final=${price}`);
    return price;
  };

  const formatCalculatedPrice = (cost: number): string => {
    const price = calculatePrice(cost);
    return formatPrice(price);
  };

  const refreshMarkup = useCallback(() => {
    setLoading(true);
    fetchCustomerMarkup();
  }, [fetchCustomerMarkup]);

  return {
    customerMarkup,
    calculatePrice,
    formatCalculatedPrice,
    loading,
    refreshMarkup
  };
};

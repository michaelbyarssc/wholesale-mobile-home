import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DeliveryAddress } from './useShoppingCart';

interface ShippingCalculationResult {
  success: boolean;
  distance_miles?: number;
  travel_time_minutes?: number;
  factory?: {
    id: string;
    name: string;
    address: string;
  };
  cached?: boolean;
  error?: string;
}

export const useShippingCalculation = () => {
  const [calculations, setCalculations] = useState<Map<string, ShippingCalculationResult>>(new Map());
  const [loading, setLoading] = useState<Set<string>>(new Set());

  const calculateShipping = async (
    mobileHomeId: string,
    deliveryAddress: DeliveryAddress
  ): Promise<ShippingCalculationResult> => {
    const key = `${mobileHomeId}-${deliveryAddress.zipCode}`;
    
    // Return cached result if available
    if (calculations.has(key)) {
      const cached = calculations.get(key)!;
      console.log('🚚 Using cached shipping calculation:', cached);
      return cached;
    }

    // Avoid duplicate requests
    if (loading.has(key)) {
      console.log('🚚 Shipping calculation already in progress for:', key);
      return { success: false, error: 'Calculation in progress' };
    }

    setLoading(prev => new Set(prev).add(key));

    try {
      console.log('🚚 Calculating shipping distance for:', { mobileHomeId, deliveryAddress });

      const { data, error } = await supabase.functions.invoke('calculate-shipping-distance', {
        body: {
          mobileHomeId,
          deliveryAddress
        }
      });

      if (error) {
        console.error('🚚 Shipping calculation error:', error);
        throw new Error(error.message || 'Failed to calculate shipping distance');
      }

      if (!data.success) {
        console.error('🚚 Shipping calculation failed:', data.error);
        throw new Error(data.error || 'Shipping calculation failed');
      }

      const result: ShippingCalculationResult = {
        success: true,
        distance_miles: data.distance_miles,
        travel_time_minutes: data.travel_time_minutes,
        factory: data.factory,
        cached: data.cached
      };

      console.log('🚚 Shipping calculation successful:', result);

      // Cache the result
      setCalculations(prev => new Map(prev).set(key, result));

      return result;

    } catch (error) {
      console.error('🚚 Shipping calculation error:', error);
      
      const errorResult: ShippingCalculationResult = {
        success: false,
        error: error.message || 'Failed to calculate shipping distance'
      };

      // Cache error result to avoid immediate retries
      setCalculations(prev => new Map(prev).set(key, errorResult));

      return errorResult;

    } finally {
      setLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(key);
        return newSet;
      });
    }
  };

  const getShippingCalculation = (mobileHomeId: string, deliveryAddress: DeliveryAddress): ShippingCalculationResult | null => {
    const key = `${mobileHomeId}-${deliveryAddress.zipCode}`;
    return calculations.get(key) || null;
  };

  const isCalculating = (mobileHomeId: string, deliveryAddress: DeliveryAddress): boolean => {
    const key = `${mobileHomeId}-${deliveryAddress.zipCode}`;
    return loading.has(key);
  };

  const clearCalculations = () => {
    setCalculations(new Map());
    setLoading(new Set());
  };

  return {
    calculateShipping,
    getShippingCalculation,
    isCalculating,
    clearCalculations
  };
};
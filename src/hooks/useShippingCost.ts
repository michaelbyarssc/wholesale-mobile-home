import { useMemo } from 'react';
import { useShippingCalculation } from './useShippingCalculation';
import { DeliveryAddress } from './useShoppingCart';
import type { Database } from '@/integrations/supabase/types';

type MobileHome = Database['public']['Tables']['mobile_homes']['Row'];

interface ShippingCostResult {
  baseCost: number;
  permitCost: number;
  hotelCost: number;
  flatRate: number;
  totalCost: number;
  isCalculating: boolean;
  error?: string;
  breakdown: {
    distance: number;
    pricePerMile: number;
    isDoubleWide: boolean;
    crossesStateBorder: boolean;
    requiresHotel: boolean;
  } | null;
}

export const useShippingCost = () => {
  const { calculateShipping, getShippingCalculation, isCalculating } = useShippingCalculation();

  const calculateShippingCost = async (
    mobileHome: MobileHome,
    deliveryAddress: DeliveryAddress
  ): Promise<ShippingCostResult> => {
    try {
      // First calculate the distance
      const distanceResult = await calculateShipping(mobileHome.id, deliveryAddress);
      
      if (!distanceResult.success || !distanceResult.distance_miles) {
        return {
          baseCost: 0,
          permitCost: 0,
          hotelCost: 0,
          flatRate: 1000,
          totalCost: 1000,
          isCalculating: false,
          error: distanceResult.error || 'Failed to calculate shipping distance',
          breakdown: null
        };
      }

      const distance = distanceResult.distance_miles;
      
      // Determine if it's single or double wide (≤ 18 feet = single wide)
      const isDoubleWide = (mobileHome.width_feet || 0) > 18;
      const pricePerMile = 7; // Base rate for single wide
      const multiplier = isDoubleWide ? 2 : 1;
      
      // Calculate base cost ($7 per mile, x2 for double wide)
      const baseCost = distance * pricePerMile * multiplier;
      
      // Calculate permit cost
      const factoryState = distanceResult.factory?.address?.split(',').pop()?.trim().split(' ')[0] || '';
      const deliveryState = deliveryAddress.state;
      const crossesStateBorder = factoryState !== deliveryState;
      const permitCost = crossesStateBorder ? 60 : 30; // $30 x 2 if crossing states, $30 x 1 if same state
      
      // Calculate hotel cost ($125 if over 150 miles, x2 for double wide)
      const requiresHotel = distance > 150;
      const hotelCost = requiresHotel ? 125 * multiplier : 0;
      
      // Flat rate
      const flatRate = 1000;
      
      // Total cost with 15% markup
      const subtotal = baseCost + permitCost + hotelCost + flatRate;
      const totalCost = Math.round(subtotal * 1.15);
      
      return {
        baseCost,
        permitCost,
        hotelCost,
        flatRate,
        totalCost,
        isCalculating: false,
        breakdown: {
          distance,
          pricePerMile: pricePerMile * multiplier,
          isDoubleWide,
          crossesStateBorder,
          requiresHotel
        }
      };

    } catch (error) {
      console.error('Error calculating shipping cost:', error);
      return {
        baseCost: 0,
        permitCost: 0,
        hotelCost: 0,
        flatRate: 1000,
        totalCost: 1000,
        isCalculating: false,
        error: error instanceof Error ? error.message : 'Failed to calculate shipping cost',
        breakdown: null
      };
    }
  };

  const getShippingCost = (
    mobileHome: MobileHome,
    deliveryAddress: DeliveryAddress
  ): ShippingCostResult => {
    const distanceResult = getShippingCalculation(mobileHome.id, deliveryAddress);
    const calculating = isCalculating(mobileHome.id, deliveryAddress);
    
    if (calculating) {
      return {
        baseCost: 0,
        permitCost: 0,
        hotelCost: 0,
        flatRate: 1000,
        totalCost: 1000,
        isCalculating: true,
        breakdown: null
      };
    }
    
    if (!distanceResult || !distanceResult.success || !distanceResult.distance_miles) {
      return {
        baseCost: 0,
        permitCost: 0,
        hotelCost: 0,
        flatRate: 1000,
        totalCost: 1000,
        isCalculating: false,
        error: distanceResult?.error || 'No shipping calculation available',
        breakdown: null
      };
    }

    const distance = distanceResult.distance_miles;
    
    // Determine if it's single or double wide (≤ 18 feet = single wide)
    const isDoubleWide = (mobileHome.width_feet || 0) > 18;
    const pricePerMile = 7; // Base rate for single wide
    const multiplier = isDoubleWide ? 2 : 1;
    
    // Calculate base cost ($7 per mile, x2 for double wide)
    const baseCost = distance * pricePerMile * multiplier;
    
    // Calculate permit cost
    const factoryState = distanceResult.factory?.address?.split(',').pop()?.trim().split(' ')[0] || '';
    const deliveryState = deliveryAddress.state;
    const crossesStateBorder = factoryState !== deliveryState;
    const permitCost = crossesStateBorder ? 60 : 30; // $30 x 2 if crossing states, $30 x 1 if same state
    
    // Calculate hotel cost ($125 if over 150 miles, x2 for double wide)
    const requiresHotel = distance > 150;
    const hotelCost = requiresHotel ? 125 * multiplier : 0;
    
    // Flat rate
    const flatRate = 1000;
    
    // Total cost with 15% markup
    const subtotal = baseCost + permitCost + hotelCost + flatRate;
    const totalCost = Math.round(subtotal * 1.15);
    
    return {
      baseCost,
      permitCost,
      hotelCost,
      flatRate,
      totalCost,
      isCalculating: false,
      breakdown: {
        distance,
        pricePerMile: pricePerMile * multiplier,
        isDoubleWide,
        crossesStateBorder,
        requiresHotel
      }
    };
  };

  return {
    calculateShippingCost,
    getShippingCost
  };
};
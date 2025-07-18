import React, { useEffect, useMemo } from 'react';
import { useShippingCost } from '@/hooks/useShippingCost';
import { formatPrice } from '@/lib/utils';
import { Loader2, Truck, MapPin, DollarSign } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

interface MobileHomeInfo {
  id: string;
  width_feet: number;
  manufacturer: string;
  series: string;
  model: string;
}

interface EstimateShippingInfoProps {
  mobileHome: MobileHomeInfo;
  deliveryAddress: string;
}

export const EstimateShippingInfo = ({ mobileHome, deliveryAddress }: EstimateShippingInfoProps) => {
  const { calculateShippingCost, getShippingCost } = useShippingCost();

  // Parse the delivery address to create a DeliveryAddress object
  const parsedAddress = useMemo(() => {
    // Basic parsing - you might want to enhance this
    const parts = deliveryAddress.split(',').map(part => part.trim());
    const lastPart = parts[parts.length - 1] || '';
    const stateZip = lastPart.split(' ');
    
    return {
      street: parts[0] || '',
      city: parts[1] || '',
      state: stateZip[0] || '',
      zipCode: stateZip[1] || ''
    };
  }, [deliveryAddress]);

  // Create a mock full mobile home object for the shipping calculation
  const fullMobileHome = useMemo(() => ({
    ...mobileHome,
    active: true,
    bathrooms: 1,
    bedrooms: 1,
    company_id: '',
    cost: 0,
    created_at: '',
    description: '',
    display_name: '',
    display_order: 0,
    exterior_image_url: '',
    features: [],
    floor_plan_image_url: '',
    length_feet: 60,
    minimum_profit: 0,
    price: 0,
    retail_price: 0,
    square_footage: 1000,
    updated_at: ''
  }), [mobileHome]);

  const shippingCost = getShippingCost(fullMobileHome, parsedAddress);

  useEffect(() => {
    if (parsedAddress.zipCode && !shippingCost.breakdown && !shippingCost.isCalculating) {
      calculateShippingCost(fullMobileHome, parsedAddress);
    }
  }, [fullMobileHome.id, parsedAddress.zipCode, calculateShippingCost, shippingCost.breakdown, shippingCost.isCalculating]);

  if (shippingCost.isCalculating) {
    return (
      <div className="flex items-center space-x-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Calculating shipping cost...</span>
      </div>
    );
  }

  if (shippingCost.error) {
    return (
      <div className="text-sm text-red-600">
        <p>Unable to calculate shipping: {shippingCost.error}</p>
        <p className="mt-1 font-medium">Estimated minimum: {formatPrice(1000)}</p>
      </div>
    );
  }

  if (!shippingCost.breakdown) {
    return (
      <div className="text-sm text-muted-foreground">
        <p>Shipping calculation not available</p>
        <p className="mt-1 font-medium">Estimated minimum: {formatPrice(1000)}</p>
      </div>
    );
  }

  const { breakdown } = shippingCost;

  return (
    <div className="space-y-3">
      {/* Total Cost */}
      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-md">
        <div className="flex items-center space-x-2">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">Total Shipping Cost:</span>
        </div>
        <span className="text-lg font-bold">{formatPrice(shippingCost.totalCost)}</span>
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <div className="flex items-center space-x-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span>Distance: {breakdown.distance.toFixed(1)} miles</span>
        </div>
        
        <div className="flex items-center space-x-2">
          <Truck className="h-4 w-4 text-muted-foreground" />
          <span>Type: {breakdown.isDoubleWide ? 'Double Wide' : 'Single Wide'}</span>
        </div>
        
        <div className="col-span-1 sm:col-span-2">
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>Base cost ({formatPrice(breakdown.pricePerMile)}/mile):</span>
              <span>{formatPrice(shippingCost.baseCost)}</span>
            </div>
            <div className="flex justify-between">
              <span>Permits ({breakdown.crossesStateBorder ? 'Cross-state' : 'In-state'}):</span>
              <span>{formatPrice(shippingCost.permitCost)}</span>
            </div>
            {shippingCost.hotelCost > 0 && (
              <div className="flex justify-between">
                <span>Hotel (over 150 miles):</span>
                <span>{formatPrice(shippingCost.hotelCost)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Setup & delivery:</span>
              <span>{formatPrice(shippingCost.flatRate)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
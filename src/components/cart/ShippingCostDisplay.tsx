import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Truck, MapPin, Hotel, DollarSign } from 'lucide-react';
import { useShippingCost } from '@/hooks/useShippingCost';
import { DeliveryAddress } from '@/hooks/useShoppingCart';
import type { Database } from '@/integrations/supabase/types';

type MobileHome = Database['public']['Tables']['mobile_homes']['Row'];

interface ShippingCostDisplayProps {
  mobileHome: MobileHome;
  deliveryAddress: DeliveryAddress;
}

export const ShippingCostDisplay = ({ mobileHome, deliveryAddress }: ShippingCostDisplayProps) => {
  const { calculateShippingCost, getShippingCost } = useShippingCost();
  
  const shippingCost = getShippingCost(mobileHome, deliveryAddress);
  
  console.log('📦 ShippingCostDisplay calculation:', {
    mobileHome: mobileHome.model,
    totalCost: shippingCost.totalCost,
    breakdown: shippingCost.breakdown
  });
  
  // Trigger calculation when component mounts
  useEffect(() => {
    if (deliveryAddress && !shippingCost.breakdown && !shippingCost.isCalculating) {
      calculateShippingCost(mobileHome, deliveryAddress);
    }
  }, [mobileHome.id, deliveryAddress.zipCode, calculateShippingCost]);

  if (shippingCost.error) {
    return (
      <Card className="border-yellow-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Truck className="h-4 w-4" />
            Shipping Cost
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">{shippingCost.error}</p>
          <p className="text-lg font-semibold text-right mt-2">
            ${shippingCost.totalCost.toLocaleString()} <span className="text-sm font-normal">(minimum)</span>
          </p>
        </CardContent>
      </Card>
    );
  }

  if (shippingCost.isCalculating) {
    return (
      <Card className="border-blue-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Truck className="h-4 w-4 animate-pulse" />
            Calculating Shipping...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { breakdown } = shippingCost;

  return (
    <Card className="border-green-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Truck className="h-4 w-4" />
          Shipping Cost
          {breakdown && (
            <Badge variant={breakdown.isDoubleWide ? "default" : "secondary"} className="ml-auto">
              {breakdown.isDoubleWide ? 'Double Wide' : 'Single Wide'}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center font-bold text-lg">
          <span>Total Shipping:</span>
          <span>${shippingCost.totalCost.toLocaleString()}</span>
        </div>
      </CardContent>
    </Card>
  );
};
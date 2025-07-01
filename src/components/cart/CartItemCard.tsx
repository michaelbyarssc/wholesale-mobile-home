
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { CartServicesList } from './CartServicesList';
import { CartHomeOptionsList } from './CartHomeOptionsList';
import { formatPrice } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';
import { CartItem } from '@/components/ShoppingCart';
import { useCustomerPricing } from '@/hooks/useCustomerPricing';

type HomeOption = Database['public']['Tables']['home_options']['Row'];

interface CartItemCardProps {
  item: CartItem;
  services: any[];
  homeOptions: any[];
  availableServices: any[];
  getServicePrice: (serviceId: string) => number;
  getMissingDependencies: (serviceId: string) => string[];
  getServicesByDependency: (serviceId: string) => any[];
  onUpdateServices: (homeId: string, selectedServices: string[]) => void;
  onUpdateHomeOptions: (homeId: string, selectedHomeOptions: { option: HomeOption; quantity: number }[]) => void;
  onRemoveItem: (homeId: string) => void;
  calculatePrice: (cost: number) => number;
  calculateHomeOptionPrice: (homeOption: HomeOption, homeSquareFootage?: number) => number;
  calculateItemTotal: (item: CartItem) => number;
  getHomeName: (home: any) => string;
}

export const CartItemCard = ({
  item,
  services,
  homeOptions,
  availableServices,
  getServicePrice,
  getMissingDependencies,
  getServicesByDependency,
  onUpdateServices,
  onUpdateHomeOptions,
  onRemoveItem,
  calculatePrice,
  calculateHomeOptionPrice,
  calculateItemTotal,
  getHomeName
}: CartItemCardProps) => {
  const { calculateMobileHomePrice } = useCustomerPricing(null);

  const formatSize = (home: any) => {
    if (home.length_feet && home.width_feet) {
      return `${home.width_feet}x${home.length_feet}`;
    }
    return 'N/A';
  };

  const handleRemoveItem = () => {
    console.log('🔍 CartItemCard: Remove item clicked for:', item.mobileHome.id);
    try {
      onRemoveItem(item.mobileHome.id);
      console.log('🔍 CartItemCard: Remove item completed');
    } catch (error) {
      console.error('🔍 CartItemCard: Error removing item:', error);
      // Don't throw the error to prevent crashing the app
    }
  };

  // Add error boundary for the component
  try {
    return (
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <CardTitle className="text-lg">
              {getHomeName(item.mobileHome)} - {formatSize(item.mobileHome)}
            </CardTitle>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove "{getHomeName(item.mobileHome)}" from your cart. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleRemoveItem}>
                    Remove Item
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          <div className="text-sm text-gray-600">
            Base Price: {formatPrice(calculateMobileHomePrice(item.mobileHome))}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <CartServicesList
            item={item}
            services={services}
            availableServices={availableServices}
            getServicePrice={getServicePrice}
            getMissingDependencies={getMissingDependencies}
            getServicesByDependency={getServicesByDependency}
            onUpdateServices={onUpdateServices}
            calculatePrice={calculatePrice}
          />

          <CartHomeOptionsList
            item={item}
            homeOptions={homeOptions}
            onUpdateHomeOptions={onUpdateHomeOptions}
            calculateHomeOptionPrice={calculateHomeOptionPrice}
            calculatePrice={calculatePrice}
          />

          <div className="border-t pt-3">
            <div className="flex justify-between items-center font-bold">
              <span>Item Total:</span>
              <span className="text-green-600">{formatPrice(calculateItemTotal(item))}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  } catch (error) {
    console.error('🔍 CartItemCard: Error rendering component:', error);
    return (
      <Card>
        <CardContent className="p-4">
          <div className="text-red-500">
            Error loading cart item. Please try refreshing the page.
          </div>
        </CardContent>
      </Card>
    );
  }
};

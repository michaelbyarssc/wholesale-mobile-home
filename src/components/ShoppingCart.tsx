import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Trash2, ShoppingCart as CartIcon } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useConditionalServices } from '@/hooks/useConditionalServices';
import { useCustomerPricing } from '@/hooks/useCustomerPricing';
import { CartItem } from '@/hooks/useShoppingCart';
import { formatPrice } from '@/lib/utils';
import { User } from '@supabase/supabase-js';

interface ShoppingCartProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onRemoveItem: (homeId: string) => void;
  onUpdateServices: (homeId: string, selectedServices: string[]) => void;
  onClearCart: () => void;
  user?: User | null;
}

export const ShoppingCart = ({
  isOpen,
  onClose,
  cartItems,
  onRemoveItem,
  onUpdateServices,
  onClearCart,
  user
}: ShoppingCartProps) => {
  const { calculatePrice } = useCustomerPricing(user);

  // Fetch services
  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('active', true)
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data;
    }
  });

  const calculateItemTotal = (item: CartItem) => {
    const homePrice = calculatePrice(item.mobileHome.cost || item.mobileHome.price);
    const servicesPrice = item.selectedServices.reduce((total, serviceId) => {
      const service = services.find(s => s.id === serviceId);
      if (!service) return total;
      return total + calculatePrice(service.cost || service.price);
    }, 0);
    return homePrice + servicesPrice;
  };

  const calculateGrandTotal = () => {
    return cartItems.reduce((total, item) => total + calculateItemTotal(item), 0);
  };

  const getHomeName = (home: any) => {
    return home.display_name || `${home.series} ${home.model}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CartIcon className="h-5 w-5" />
            Shopping Cart ({cartItems.length} item{cartItems.length !== 1 ? 's' : ''})
          </DialogTitle>
        </DialogHeader>

        {cartItems.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Your cart is empty</p>
            <p className="text-sm text-gray-400 mt-2">Click on a mobile home to add it to your cart</p>
          </div>
        ) : (
          <div className="space-y-6">
            {cartItems.map((item) => (
              <CartItemCard
                key={item.mobileHome.id}
                item={item}
                services={services}
                onUpdateServices={onUpdateServices}
                onRemoveItem={onRemoveItem}
                calculatePrice={calculatePrice}
                calculateItemTotal={calculateItemTotal}
                getHomeName={getHomeName}
              />
            ))}

            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-4">
                <div className="text-2xl font-bold">
                  Total: {formatPrice(calculateGrandTotal())}
                </div>
                <div className="space-x-2">
                  <Button variant="outline" onClick={onClearCart}>
                    Clear Cart
                  </Button>
                  <Button onClick={() => {
                    // Cart contains all the pricing information the user needs
                    onClose();
                  }}>
                    Close Cart
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

interface CartItemCardProps {
  item: CartItem;
  services: any[];
  onUpdateServices: (homeId: string, selectedServices: string[]) => void;
  onRemoveItem: (homeId: string) => void;
  calculatePrice: (cost: number) => number;
  calculateItemTotal: (item: CartItem) => number;
  getHomeName: (home: any) => string;
}

const CartItemCard = ({
  item,
  services,
  onUpdateServices,
  onRemoveItem,
  calculatePrice,
  calculateItemTotal,
  getHomeName
}: CartItemCardProps) => {
  const mobileHomes = [item.mobileHome]; // For the conditional services hook
  
  const {
    availableServices,
    getDependencies,
    getMissingDependencies,
    getServicesByDependency
  } = useConditionalServices(services, item.mobileHome.id, mobileHomes, item.selectedServices);

  const handleServiceToggle = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    if (!service) return;

    if (item.selectedServices.includes(serviceId)) {
      // Removing service - check if other services depend on it
      const dependentServices = getServicesByDependency(serviceId);
      const selectedDependentServices = dependentServices.filter(s => 
        item.selectedServices.includes(s.id)
      );

      if (selectedDependentServices.length > 0) {
        alert(`Cannot remove service. This service is required by: ${selectedDependentServices.map(s => s.name).join(', ')}`);
        return;
      }

      onUpdateServices(item.mobileHome.id, item.selectedServices.filter(id => id !== serviceId));
    } else {
      // Adding service - check dependencies
      const missingDeps = getMissingDependencies(serviceId);
      if (missingDeps.length > 0) {
        const missingServiceNames = missingDeps.map(depId => 
          services.find(s => s.id === depId)?.name
        ).filter(Boolean);

        alert(`Please select these services first: ${missingServiceNames.join(', ')}`);
        return;
      }

      onUpdateServices(item.mobileHome.id, [...item.selectedServices, serviceId]);
    }
  };

  const formatSize = (home: any) => {
    if (home.length_feet && home.width_feet) {
      return `${home.width_feet}x${home.length_feet}`;
    }
    return 'N/A';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">
            {getHomeName(item.mobileHome)} - {formatSize(item.mobileHome)}
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRemoveItem(item.mobileHome.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        <div className="text-sm text-gray-600">
          Base Price: {formatPrice(calculatePrice(item.mobileHome.cost || item.mobileHome.price))}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-medium mb-3">Available Services:</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {availableServices.map((service) => {
              const isSelected = item.selectedServices.includes(service.id);
              const serviceCost = service.cost || service.price;
              const displayPrice = calculatePrice(serviceCost);
              
              return (
                <div key={service.id} className="flex items-start space-x-3 p-2 border rounded">
                  <Checkbox
                    id={`${item.mobileHome.id}-${service.id}`}
                    checked={isSelected}
                    onCheckedChange={() => handleServiceToggle(service.id)}
                  />
                  <div className="flex-1">
                    <Label 
                      htmlFor={`${item.mobileHome.id}-${service.id}`}
                      className="font-medium cursor-pointer text-sm"
                    >
                      {service.name}
                    </Label>
                    {service.description && (
                      <p className="text-xs text-gray-500 mt-1">{service.description}</p>
                    )}
                    <p className="text-sm text-gray-600 mt-1">
                      {formatPrice(displayPrice)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="border-t pt-3">
          <div className="flex justify-between items-center font-bold">
            <span>Item Total:</span>
            <span className="text-green-600">{formatPrice(calculateItemTotal(item))}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

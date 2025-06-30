import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ShoppingCart as CartIcon } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCustomerPricing } from '@/hooks/useCustomerPricing';
import { User } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import { CartItemCard } from './cart/CartItemCard';
import { CartTotal } from './cart/CartTotal';
import type { Database } from '@/integrations/supabase/types';

type HomeOption = Database['public']['Tables']['home_options']['Row'];

export interface CartItem {
  id: string;
  mobileHome: Database['public']['Tables']['mobile_homes']['Row'];
  selectedServices: string[];
  selectedHomeOptions: { option: HomeOption; quantity: number }[];
}

interface ShoppingCartProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onRemoveItem: (homeId: string) => void;
  onUpdateServices: (homeId: string, selectedServices: string[]) => void;
  onUpdateHomeOptions: (homeId: string, selectedHomeOptions: { option: HomeOption; quantity: number }[]) => void;
  onClearCart: () => void;
  user?: User | null;
}

export const ShoppingCart = ({
  isOpen,
  onClose,
  cartItems,
  onRemoveItem,
  onUpdateServices,
  onUpdateHomeOptions,
  onClearCart,
  user
}: ShoppingCartProps) => {
  const navigate = useNavigate();
  const { calculatePrice, calculateHomeOptionPrice } = useCustomerPricing(user);

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

  // Fetch home options
  const { data: homeOptions = [] } = useQuery({
    queryKey: ['home-options'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('home_options')
        .select('*')
        .eq('active', true)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data;
    }
  });

  const calculateItemTotal = (item: CartItem) => {
    const homePrice = calculatePrice(item.mobileHome.cost || item.mobileHome.price);
    
    // Calculate services price using the basic service cost/price fields
    const servicesPrice = item.selectedServices.reduce((total, serviceId) => {
      const service = services.find(s => s.id === serviceId);
      if (!service) return total;
      
      // For now, use the basic cost or price field until we fix the conditional pricing
      const serviceCost = service.cost || service.price || 0;
      const finalPrice = calculatePrice(serviceCost);
      return total + finalPrice;
    }, 0);
    
    const homeOptionsPrice = (item.selectedHomeOptions || []).reduce((total, { option, quantity }) => {
      const optionPrice = calculateHomeOptionPrice(option, item.mobileHome.square_footage || undefined);
      return total + (optionPrice * quantity);
    }, 0);
    
    return homePrice + servicesPrice + homeOptionsPrice;
  };

  const calculateGrandTotal = () => {
    return cartItems.reduce((total, item) => total + calculateItemTotal(item), 0);
  };

  const getHomeName = (home: any) => {
    return home.display_name || `${home.series} ${home.model}`;
  };

  const handleConvertToEstimate = () => {
    // Store cart data in localStorage for the estimate form to pick up
    localStorage.setItem('cart_for_estimate', JSON.stringify(cartItems));
    onClose();
    navigate('/estimate');
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
                homeOptions={homeOptions}
                onUpdateServices={onUpdateServices}
                onUpdateHomeOptions={onUpdateHomeOptions}
                onRemoveItem={onRemoveItem}
                calculatePrice={calculatePrice}
                calculateHomeOptionPrice={calculateHomeOptionPrice}
                calculateItemTotal={calculateItemTotal}
                getHomeName={getHomeName}
              />
            ))}

            <CartTotal
              total={calculateGrandTotal()}
              onClearCart={onClearCart}
              onConvertToEstimate={handleConvertToEstimate}
              onCloseCart={onClose}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

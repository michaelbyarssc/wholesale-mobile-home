
import React, { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ShoppingCart as CartIcon } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCustomerPricing } from '@/hooks/useCustomerPricing';
import { useConditionalServices } from '@/hooks/useConditionalServices';
import { User } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import { CartItemCard } from './cart/CartItemCard';
import { CartTotal } from './cart/CartTotal';
import { LoadingSpinner } from './layout/LoadingSpinner';
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
  isLoading?: boolean;
}

export const ShoppingCart = ({
  isOpen,
  onClose,
  cartItems,
  onRemoveItem,
  onUpdateServices,
  onUpdateHomeOptions,
  onClearCart,
  user,
  isLoading = false
}: ShoppingCartProps) => {
  const navigate = useNavigate();
  
  console.log('🔍 ShoppingCart: User passed to pricing hook:', user?.id || 'undefined');
  const { calculateMobileHomePrice, calculateServicePrice, calculateHomeOptionPrice } = useCustomerPricing(user);

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

  // Create stable parameters for useConditionalServices to prevent hook call inconsistency
  const stableParams = useMemo(() => {
    // Always use a consistent home ID and services array, even when cart is empty
    const homeId = cartItems.length > 0 ? cartItems[0].mobileHome.id : 'stable-empty-id';
    const selectedServices = cartItems.length > 0 ? cartItems[0].selectedServices : [];
    const mobileHomes = cartItems.length > 0 ? cartItems.map(item => item.mobileHome) : [];
    
    return { homeId, selectedServices, mobileHomes };
  }, [cartItems]);

  // Use conditional services with stable parameters
  const {
    availableServices,
    getServicePrice,
    getMissingDependencies,
    getServicesByDependency
  } = useConditionalServices(services, stableParams.homeId, stableParams.mobileHomes, stableParams.selectedServices);

  const calculateItemTotal = (item: CartItem) => {
    try {
      // Calculate home price using the proper mobile home pricing logic
      const homePrice = calculateMobileHomePrice(item.mobileHome);
      
      // Calculate services price using conditional pricing and proper markup
      const servicesPrice = item.selectedServices.reduce((total, serviceId) => {
        const service = services.find(s => s.id === serviceId);
        if (!service) return total;
        
        const serviceCost = getServicePrice(serviceId);
        const finalPrice = calculateServicePrice(service, item.mobileHome);
        console.log(`🔍 Cart Service ${service.name}: Raw cost = ${serviceCost}, Final with markup = ${finalPrice}`);
        return total + finalPrice;
      }, 0);
      
      // Calculate home options price with proper markup application
      const homeOptionsPrice = (item.selectedHomeOptions || []).reduce((total, { option, quantity }) => {
        const baseOptionPrice = calculateHomeOptionPrice(option, item.mobileHome.square_footage || undefined);
        const totalOptionPrice = baseOptionPrice * quantity;
        console.log(`🔍 Cart Option ${option.name}: Base price = ${baseOptionPrice}, Quantity = ${quantity}, Total = ${totalOptionPrice}`);
        return total + totalOptionPrice;
      }, 0);
      
      const totalPrice = homePrice + servicesPrice + homeOptionsPrice;
      console.log(`🔍 Cart Total - Item ${item.mobileHome.model}: Home = ${homePrice}, Services = ${servicesPrice}, Options = ${homeOptionsPrice}, Total = ${totalPrice}`);
      
      return totalPrice;
    } catch (error) {
      console.error('Error calculating item total:', error);
      return 0;
    }
  };

  const calculateGrandTotal = () => {
    try {
      const total = cartItems.reduce((total, item) => total + calculateItemTotal(item), 0);
      console.log(`🔍 Cart Grand Total: ${total}`);
      return total;
    } catch (error) {
      console.error('Error calculating grand total:', error);
      return 0;
    }
  };

  const getHomeName = (home: any) => {
    return home.display_name || `${home.series} ${home.model}`;
  };

  const handleConvertToEstimate = () => {
    try {
      // Store cart data in localStorage for the estimate form to pick up
      localStorage.setItem('cart_for_estimate', JSON.stringify(cartItems));
      onClose();
      navigate('/estimate');
    } catch (error) {
      console.error('Error converting to estimate:', error);
    }
  };

  const handleRemoveItem = (homeId: string) => {
    console.log('🔍 ShoppingCart: Removing item:', homeId);
    try {
      onRemoveItem(homeId);
    } catch (error) {
      console.error('🔍 ShoppingCart: Error removing item:', error);
    }
  };

  const handleClearCart = () => {
    console.log('🔍 ShoppingCart: Clearing cart');
    try {
      onClearCart();
    } catch (error) {
      console.error('🔍 ShoppingCart: Error clearing cart:', error);
    }
  };

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CartIcon className="h-5 w-5" />
              Loading Cart...
            </DialogTitle>
          </DialogHeader>
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

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
                availableServices={availableServices}
                getServicePrice={getServicePrice}
                getMissingDependencies={getMissingDependencies}
                getServicesByDependency={getServicesByDependency}
                onUpdateServices={onUpdateServices}
                onUpdateHomeOptions={onUpdateHomeOptions}
                onRemoveItem={handleRemoveItem}
                calculatePrice={() => 0} // This is now handled by specific calculation functions
                calculateHomeOptionPrice={calculateHomeOptionPrice}
                calculateItemTotal={calculateItemTotal}
                getHomeName={getHomeName}
              />
            ))}

            <CartTotal
              total={calculateGrandTotal()}
              onClearCart={handleClearCart}
              onConvertToEstimate={handleConvertToEstimate}
              onCloseCart={onClose}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

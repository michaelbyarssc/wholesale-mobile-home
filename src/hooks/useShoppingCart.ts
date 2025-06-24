
import { useState, useCallback } from 'react';
import type { Database } from '@/integrations/supabase/types';

type MobileHome = Database['public']['Tables']['mobile_homes']['Row'];
type Service = Database['public']['Tables']['services']['Row'];

export interface CartItem {
  mobileHome: MobileHome;
  selectedServices: string[];
}

export const useShoppingCart = () => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const addToCart = useCallback((mobileHome: MobileHome, selectedServices: string[] = []) => {
    setCartItems(prev => {
      const existingIndex = prev.findIndex(item => item.mobileHome.id === mobileHome.id);
      if (existingIndex >= 0) {
        // Update existing item
        const newItems = [...prev];
        newItems[existingIndex] = { mobileHome, selectedServices };
        return newItems;
      } else {
        // Add new item
        return [...prev, { mobileHome, selectedServices }];
      }
    });
    setIsCartOpen(true);
  }, []);

  const removeFromCart = useCallback((homeId: string) => {
    setCartItems(prev => prev.filter(item => item.mobileHome.id !== homeId));
  }, []);

  const updateServices = useCallback((homeId: string, selectedServices: string[]) => {
    setCartItems(prev => 
      prev.map(item => 
        item.mobileHome.id === homeId 
          ? { ...item, selectedServices }
          : item
      )
    );
  }, []);

  const clearCart = useCallback(() => {
    setCartItems([]);
  }, []);

  const toggleCart = useCallback(() => {
    setIsCartOpen(prev => !prev);
  }, []);

  return {
    cartItems,
    isCartOpen,
    addToCart,
    removeFromCart,
    updateServices,
    clearCart,
    toggleCart,
    setIsCartOpen
  };
};

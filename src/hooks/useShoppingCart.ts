import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

export type CartItem = {
  id: string;
  mobileHome: Database['public']['Tables']['mobile_homes']['Row'];
  selectedServices: string[];
};

export const useShoppingCart = () => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Load cart items from localStorage on mount
  useEffect(() => {
    try {
      const savedItems = localStorage.getItem('cart_items');
      if (savedItems) {
        const parsed = JSON.parse(savedItems);
        if (Array.isArray(parsed)) {
          setCartItems(parsed);
        }
      }
    } catch (error) {
      console.error('Error loading cart from localStorage:', error);
      localStorage.removeItem('cart_items'); // Clear corrupted data
    }
  }, []);

  // Save cart items to localStorage whenever cartItems changes
  useEffect(() => {
    try {
      localStorage.setItem('cart_items', JSON.stringify(cartItems));
    } catch (error) {
      console.error('Error saving cart to localStorage:', error);
    }
  }, [cartItems]);

  const addToCart = useCallback((mobileHome: Database['public']['Tables']['mobile_homes']['Row']) => {
    setCartItems(prev => {
      const existingIndex = prev.findIndex(cartItem => cartItem.mobileHome.id === mobileHome.id);
      if (existingIndex >= 0) {
        // Item already exists, keep existing services
        return prev;
      } else {
        // Add new item
        const newItem: CartItem = {
          id: mobileHome.id,
          mobileHome,
          selectedServices: []
        };
        return [...prev, newItem];
      }
    });
  }, []);

  const removeFromCart = useCallback((itemId: string) => {
    setCartItems(prev => prev.filter(item => item.mobileHome.id !== itemId));
  }, []);

  const updateServices = useCallback((homeId: string, selectedServices: string[]) => {
    setCartItems(prev => prev.map(item => 
      item.mobileHome.id === homeId 
        ? { ...item, selectedServices }
        : item
    ));
  }, []);

  const clearCart = useCallback(() => {
    setCartItems([]);
  }, []);

  const toggleCart = useCallback(() => {
    setIsCartOpen(prev => !prev);
  }, []);

  const closeCart = useCallback(() => {
    setIsCartOpen(false);
  }, []);

  return {
    cartItems,
    isCartOpen,
    addToCart,
    removeFromCart,
    updateServices,
    clearCart,
    toggleCart,
    closeCart,
    setIsCartOpen,
  };
};

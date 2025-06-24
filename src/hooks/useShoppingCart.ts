
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

export type CartItem = Database['public']['Tables']['mobile_homes']['Row'] & {
  selectedServices?: Database['public']['Tables']['services']['Row'][];
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

  const addToCart = useCallback((item: CartItem) => {
    setCartItems(prev => {
      const existingIndex = prev.findIndex(cartItem => cartItem.id === item.id);
      if (existingIndex >= 0) {
        // Item already exists, update it
        const updated = [...prev];
        updated[existingIndex] = item;
        return updated;
      } else {
        // Add new item
        return [...prev, item];
      }
    });
  }, []);

  const removeFromCart = useCallback((itemId: string) => {
    setCartItems(prev => prev.filter(item => item.id !== itemId));
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
    clearCart,
    toggleCart,
    closeCart,
  };
};


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
      console.log('Loading cart from localStorage:', savedItems);
      if (savedItems) {
        const parsed = JSON.parse(savedItems);
        if (Array.isArray(parsed)) {
          console.log('Loaded cart items:', parsed.length);
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
      console.log('Saving cart to localStorage:', cartItems.length, 'items');
      localStorage.setItem('cart_items', JSON.stringify(cartItems));
    } catch (error) {
      console.error('Error saving cart to localStorage:', error);
    }
  }, [cartItems]);

  const addToCart = useCallback((mobileHome: Database['public']['Tables']['mobile_homes']['Row']) => {
    console.log('addToCart called with:', mobileHome.id, mobileHome.model);
    
    setCartItems(prevItems => {
      console.log('Current cart items before update:', prevItems.length);
      const existingIndex = prevItems.findIndex(cartItem => cartItem.mobileHome.id === mobileHome.id);
      console.log('Existing item index:', existingIndex);
      
      if (existingIndex >= 0) {
        // Item already exists, keep existing services
        console.log('Item already in cart, keeping existing');
        return prevItems;
      } else {
        // Add new item
        const newItem: CartItem = {
          id: mobileHome.id,
          mobileHome,
          selectedServices: []
        };
        console.log('Adding new item to cart:', newItem.id);
        const newCart = [...prevItems, newItem];
        console.log('New cart length after adding:', newCart.length);
        
        // Force a re-render by returning a new array reference
        return newCart;
      }
    });
  }, []);

  const removeFromCart = useCallback((itemId: string) => {
    console.log('Removing item from cart:', itemId);
    setCartItems(prev => prev.filter(item => item.mobileHome.id !== itemId));
  }, []);

  const updateServices = useCallback((homeId: string, selectedServices: string[]) => {
    console.log('Updating services for home:', homeId, selectedServices);
    setCartItems(prev => prev.map(item => 
      item.mobileHome.id === homeId 
        ? { ...item, selectedServices }
        : item
    ));
  }, []);

  const clearCart = useCallback(() => {
    console.log('Clearing cart');
    setCartItems([]);
  }, []);

  const toggleCart = useCallback(() => {
    console.log('Toggling cart, current state:', isCartOpen);
    setIsCartOpen(prev => {
      const newState = !prev;
      console.log('Cart will be:', newState ? 'open' : 'closed');
      return newState;
    });
  }, [isCartOpen]);

  const closeCart = useCallback(() => {
    console.log('Closing cart');
    setIsCartOpen(false);
  }, []);

  console.log('useShoppingCart render - cart items:', cartItems.length, 'isOpen:', isCartOpen);

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

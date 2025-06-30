
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type HomeOption = Database['public']['Tables']['home_options']['Row'];

export type CartItem = {
  id: string;
  mobileHome: Database['public']['Tables']['mobile_homes']['Row'];
  selectedServices: string[];
  selectedHomeOptions: { option: HomeOption; quantity: number }[];
};

export const useShoppingCart = () => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load cart items from localStorage on mount
  useEffect(() => {
    const loadCart = () => {
      try {
        const savedItems = localStorage.getItem('cart_items');
        console.log('🔍 Loading cart from localStorage:', savedItems);
        if (savedItems) {
          const parsed = JSON.parse(savedItems);
          if (Array.isArray(parsed)) {
            console.log('🔍 Loaded cart items:', parsed.length);
            setCartItems(parsed);
          } else {
            console.log('🔍 Invalid cart data format, clearing cart');
            localStorage.removeItem('cart_items');
            setCartItems([]);
          }
        } else {
          setCartItems([]);
        }
      } catch (error) {
        console.error('🔍 Error loading cart from localStorage:', error);
        localStorage.removeItem('cart_items');
        setCartItems([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadCart();
  }, []);

  // Save cart items to localStorage whenever cartItems changes
  useEffect(() => {
    if (!isLoading) {
      try {
        console.log('🔍 Saving cart to localStorage:', cartItems.length, 'items');
        localStorage.setItem('cart_items', JSON.stringify(cartItems));
      } catch (error) {
        console.error('🔍 Error saving cart to localStorage:', error);
      }
    }
  }, [cartItems, isLoading]);

  const addToCart = useCallback((
    mobileHome: Database['public']['Tables']['mobile_homes']['Row'], 
    selectedServices: string[] = [],
    selectedHomeOptions: { option: HomeOption; quantity: number }[] = []
  ) => {
    console.log('🔍 addToCart called with:', mobileHome.id, mobileHome.model, 'services:', selectedServices, 'options:', selectedHomeOptions);
    
    try {
      setCartItems(prevItems => {
        console.log('🔍 Current cart items before update:', prevItems.length);
        const existingIndex = prevItems.findIndex(cartItem => cartItem.mobileHome.id === mobileHome.id);
        console.log('🔍 Existing item index:', existingIndex);
        
        if (existingIndex >= 0) {
          console.log('🔍 Item already in cart, updating services and options');
          const updatedItems = [...prevItems];
          updatedItems[existingIndex] = {
            ...updatedItems[existingIndex],
            selectedServices,
            selectedHomeOptions
          };
          return updatedItems;
        } else {
          const newItem: CartItem = {
            id: mobileHome.id,
            mobileHome,
            selectedServices,
            selectedHomeOptions
          };
          console.log('🔍 Adding new item to cart:', newItem.id, 'with services:', selectedServices, 'and options:', selectedHomeOptions);
          const newCart = [...prevItems, newItem];
          console.log('🔍 New cart length after adding:', newCart.length);
          
          return newCart;
        }
      });
    } catch (error) {
      console.error('🔍 Error adding to cart:', error);
    }
  }, []);

  const removeFromCart = useCallback((itemId: string) => {
    console.log('🔍 removeFromCart called with:', itemId);
    try {
      setCartItems(prev => {
        console.log('🔍 Current cart before removal:', prev.length, 'items');
        const filtered = prev.filter(item => {
          const shouldKeep = item.mobileHome.id !== itemId;
          console.log('🔍 Item', item.mobileHome.id, shouldKeep ? 'kept' : 'removed');
          return shouldKeep;
        });
        console.log('🔍 Cart after removal:', filtered.length, 'items');
        return filtered;
      });
    } catch (error) {
      console.error('🔍 Error removing from cart:', error);
    }
  }, []);

  const updateServices = useCallback((homeId: string, selectedServices: string[]) => {
    console.log('🔍 updateServices called for home:', homeId, selectedServices);
    try {
      setCartItems(prev => prev.map(item => 
        item.mobileHome.id === homeId 
          ? { ...item, selectedServices }
          : item
      ));
    } catch (error) {
      console.error('🔍 Error updating services:', error);
    }
  }, []);

  const updateHomeOptions = useCallback((homeId: string, selectedHomeOptions: { option: HomeOption; quantity: number }[]) => {
    console.log('🔍 updateHomeOptions called for home:', homeId, selectedHomeOptions);
    try {
      setCartItems(prev => prev.map(item => 
        item.mobileHome.id === homeId 
          ? { ...item, selectedHomeOptions }
          : item
      ));
    } catch (error) {
      console.error('🔍 Error updating home options:', error);
    }
  }, []);

  const clearCart = useCallback(() => {
    console.log('🔍 clearCart called');
    try {
      console.log('🔍 Setting cart items to empty array');
      setCartItems([]);
      console.log('🔍 Cart cleared successfully');
    } catch (error) {
      console.error('🔍 Error clearing cart:', error);
    }
  }, []);

  const toggleCart = useCallback(() => {
    console.log('🔍 toggleCart called, current isCartOpen:', isCartOpen);
    try {
      setIsCartOpen(prev => {
        const newState = !prev;
        console.log('🔍 Setting cart state to:', newState);
        return newState;
      });
    } catch (error) {
      console.error('🔍 Error toggling cart:', error);
    }
  }, [isCartOpen]);

  const closeCart = useCallback(() => {
    console.log('🔍 closeCart called');
    try {
      setIsCartOpen(false);
    } catch (error) {
      console.error('🔍 Error closing cart:', error);
    }
  }, []);

  console.log('🔍 useShoppingCart render - cart items:', cartItems.length, 'isOpen:', isCartOpen, 'isLoading:', isLoading);

  return {
    cartItems,
    isCartOpen,
    isLoading,
    addToCart,
    removeFromCart,
    updateServices,
    updateHomeOptions,
    clearCart,
    toggleCart,
    closeCart,
    setIsCartOpen,
  };
};

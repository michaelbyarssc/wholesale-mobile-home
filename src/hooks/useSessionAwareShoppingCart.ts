import { useState, useEffect, useCallback } from 'react';
import { Database } from '@/integrations/supabase/types';
import { useMultiUserAuth } from '@/hooks/useMultiUserAuth';

type HomeOption = Database['public']['Tables']['home_options']['Row'];

export type DeliveryAddress = {
  street: string;
  city: string;
  state: string;
  zipCode: string;
};

export type CartData = {
  items: CartItem[];
  deliveryAddress: DeliveryAddress | null;
};

export type CartItem = {
  id: string;
  mobileHome: Database['public']['Tables']['mobile_homes']['Row'];
  selectedServices: string[];
  selectedHomeOptions: { option: HomeOption; quantity: number }[];
};

export const useSessionAwareShoppingCart = () => {
  const { activeSession, supabaseClient } = useMultiUserAuth();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [deliveryAddress, setDeliveryAddress] = useState<DeliveryAddress | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Helper function to get session-specific localStorage keys
  const getStorageKey = useCallback((baseKey: string) => {
    if (activeSession) {
      // Use user ID for consistent cart storage across all sessions for same user
      return `${baseKey}_user_${activeSession.user.id}`;
    }
    return `${baseKey}_guest`;
  }, [activeSession?.user.id]);

  // Load cart data from localStorage on session change
  useEffect(() => {
    const loadCart = () => {
      try {
        const cartDataKey = getStorageKey('cart_data');
        const savedCartData = localStorage.getItem(cartDataKey);
        console.log('🔍 Loading cart from localStorage for session:', activeSession?.id || 'guest', 'key:', cartDataKey);
        
        if (savedCartData) {
          const parsed: CartData = JSON.parse(savedCartData);
          if (parsed && typeof parsed === 'object') {
            console.log('🔍 Loaded cart items:', parsed.items?.length || 0);
            setCartItems(parsed.items || []);
            setDeliveryAddress(parsed.deliveryAddress || null);
          } else {
            console.log('🔍 Invalid cart data format, clearing cart');
            localStorage.removeItem(cartDataKey);
            setCartItems([]);
            setDeliveryAddress(null);
          }
        } else {
          // Clear cart for new session
          setCartItems([]);
          setDeliveryAddress(null);
        }
      } catch (error) {
        console.error('🔍 Error loading cart from localStorage:', error);
        const cartDataKey = getStorageKey('cart_data');
        localStorage.removeItem(cartDataKey);
        setCartItems([]);
        setDeliveryAddress(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadCart();
  }, [activeSession?.user.id, getStorageKey]); // Re-load when user changes

  // Save cart data to localStorage whenever cartItems or deliveryAddress changes
  useEffect(() => {
    if (!isLoading) {
      try {
        const cartData: CartData = {
          items: cartItems,
          deliveryAddress: deliveryAddress
        };
        const cartDataKey = getStorageKey('cart_data');
        console.log('🔍 Saving cart data to localStorage for session:', activeSession?.id || 'guest', 'items:', cartItems.length);
        localStorage.setItem(cartDataKey, JSON.stringify(cartData));
      } catch (error) {
        console.error('🔍 Error saving cart to localStorage:', error);
      }
    }
  }, [cartItems, deliveryAddress, isLoading, getStorageKey]);

  const addToCart = useCallback((
    mobileHome: Database['public']['Tables']['mobile_homes']['Row'], 
    selectedServices: string[] = [],
    selectedHomeOptions: { option: HomeOption; quantity: number }[] = []
  ) => {
    console.log('🔍 addToCart called for session:', activeSession?.id || 'guest', 'home:', mobileHome.id);
    
    try {
      setCartItems(prevItems => {
        const existingIndex = prevItems.findIndex(cartItem => cartItem.mobileHome.id === mobileHome.id);
        
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
          console.log('🔍 Adding new item to cart for session:', activeSession?.id || 'guest');
          
          // Notify admin about cart addition for logged-in users
          if (activeSession?.user && supabaseClient) {
            supabaseClient.functions.invoke('notify-admin-user-activity', {
              body: {
                user_id: activeSession.user.id,
                activity_type: 'cart_add',
                mobile_home_id: mobileHome.id,
                mobile_home_model: mobileHome.model
              }
            }).catch(error => {
              console.error('Error notifying admin about cart addition:', error);
            });
          }
          
          return [...prevItems, newItem];
        }
      });
    } catch (error) {
      console.error('🔍 Error adding to cart:', error);
    }
  }, [activeSession, supabaseClient]);

  const removeFromCart = useCallback((itemId: string) => {
    console.log('🔍 removeFromCart called for session:', activeSession?.id || 'guest', 'item:', itemId);
    try {
      setCartItems(prev => prev.filter(item => item.mobileHome.id !== itemId));
    } catch (error) {
      console.error('🔍 Error removing from cart:', error);
    }
  }, [activeSession?.id]);

  const updateServices = useCallback((homeId: string, selectedServices: string[]) => {
    console.log('🔍 updateServices called for session:', activeSession?.id || 'guest', 'home:', homeId);
    try {
      setCartItems(prev => prev.map(item => 
        item.mobileHome.id === homeId 
          ? { ...item, selectedServices }
          : item
      ));
    } catch (error) {
      console.error('🔍 Error updating services:', error);
    }
  }, [activeSession?.id]);

  const updateHomeOptions = useCallback((homeId: string, selectedHomeOptions: { option: HomeOption; quantity: number }[]) => {
    console.log('🔍 updateHomeOptions called for session:', activeSession?.id || 'guest', 'home:', homeId);
    try {
      setCartItems(prev => prev.map(item => 
        item.mobileHome.id === homeId 
          ? { ...item, selectedHomeOptions }
          : item
      ));
    } catch (error) {
      console.error('🔍 Error updating home options:', error);
    }
  }, [activeSession?.id]);

  const updateDeliveryAddress = useCallback((address: DeliveryAddress | null) => {
    console.log('🔍 updateDeliveryAddress called for session:', activeSession?.id || 'guest');
    try {
      setDeliveryAddress(address);
    } catch (error) {
      console.error('🔍 Error updating delivery address:', error);
    }
  }, [activeSession?.id]);

  const clearCart = useCallback(() => {
    console.log('🔍 clearCart called for session:', activeSession?.id || 'guest');
    try {
      setCartItems([]);
      setDeliveryAddress(null);
      
      // Clear cart data from localStorage
      const cartDataKey = getStorageKey('cart_data');
      localStorage.removeItem(cartDataKey);
      console.log('🔍 Cleared cart data from localStorage for session:', activeSession?.id || 'guest');
    } catch (error) {
      console.error('🔍 Error clearing cart:', error);
    }
  }, [getStorageKey]);

  const toggleCart = useCallback(() => {
    console.log('🔍 toggleCart called for session:', activeSession?.id || 'guest');
    try {
      setIsCartOpen(prev => !prev);
    } catch (error) {
      console.error('🔍 Error toggling cart:', error);
    }
  }, [activeSession?.id]);

  const closeCart = useCallback(() => {
    console.log('🔍 closeCart called for session:', activeSession?.id || 'guest');
    try {
      setIsCartOpen(false);
    } catch (error) {
      console.error('🔍 Error closing cart:', error);
    }
  }, [activeSession?.id]);

  console.log('🔍 useSessionAwareShoppingCart render - session:', activeSession?.id || 'guest', 'cart items:', cartItems.length, 'isOpen:', isCartOpen);

  return {
    cartItems,
    deliveryAddress,
    isCartOpen,
    isLoading,
    addToCart,
    removeFromCart,
    updateServices,
    updateHomeOptions,
    updateDeliveryAddress,
    clearCart,
    toggleCart,
    closeCart,
    setIsCartOpen,
  };
};
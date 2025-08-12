import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

type MobileHome = Database['public']['Tables']['mobile_homes']['Row'];

const WISHLIST_STORAGE_KEY = 'mobile-home-wishlist';

export const useWishlist = (user?: User | null) => {
  const [wishlistItems, setWishlistItems] = useState<MobileHome[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load wishlist on mount and when user changes
  useEffect(() => {
    if (user) {
      loadUserWishlist();
    } else {
      loadGuestWishlist();
    }
  }, [user]);

  // Load wishlist from database for logged-in users
  const loadUserWishlist = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_wishlists')
        .select('mobile_home_id')
        .eq('user_id', user.id);

      if (error) throw error;

      const ids = (data || []).map((d: any) => d.mobile_home_id);
      const { data: publicHomes, error: homesError } = await (supabase as any).rpc('get_public_mobile_homes');
      if (homesError) throw homesError;

      const list = (publicHomes as any[]) || [];
      const homes = list.filter((h: any) => ids.includes(h.id));
      setWishlistItems(homes as MobileHome[]);
    } catch (error) {
      console.error('Error loading user wishlist:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load wishlist from localStorage for guests
  const loadGuestWishlist = () => {
    try {
      const stored = localStorage.getItem(WISHLIST_STORAGE_KEY);
      if (stored) {
        const homeIds = JSON.parse(stored) as string[];
        // For guest users, we'll need to fetch the homes by IDs
        fetchHomesByIds(homeIds);
      } else {
        setWishlistItems([]);
      }
    } catch (error) {
      console.error('Error loading guest wishlist:', error);
      setWishlistItems([]);
    }
  };

  // Fetch homes by IDs for guest wishlist
  const fetchHomesByIds = async (homeIds: string[]) => {
    if (homeIds.length === 0) {
      setWishlistItems([]);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .rpc('get_public_mobile_homes');

      if (error) throw error;
      const list = (data as any[]) || [];
      const homes = list.filter((h: any) => homeIds.includes(h.id));
      setWishlistItems(homes as MobileHome[]);
    } catch (error) {
      console.error('Error fetching homes by IDs:', error);
      setWishlistItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Add home to wishlist
  const addToWishlist = useCallback(async (home: MobileHome) => {
    if (user) {
      // Add to database for logged-in users
      try {
        const { error } = await supabase
          .from('user_wishlists')
          .insert({
            user_id: user.id,
            mobile_home_id: home.id
          });

        if (error && error.code !== '23505') { // Ignore duplicate key errors
          throw error;
        }

        setWishlistItems(prev => {
          if (prev.some(item => item.id === home.id)) return prev;
          return [...prev, home];
        });

        // Notify admin about wishlist addition
        try {
          await supabase.functions.invoke('notify-admin-user-activity', {
            body: {
              user_id: user.id,
              activity_type: 'wishlist_add',
              mobile_home_id: home.id,
              mobile_home_model: home.model
            }
          });
        } catch (notifyError) {
          console.error('Error notifying admin about wishlist addition:', notifyError);
          // Don't throw error - notification failure shouldn't break the main functionality
        }
      } catch (error) {
        console.error('Error adding to wishlist:', error);
      }
    } else {
      // Add to localStorage for guests
      try {
        const stored = localStorage.getItem(WISHLIST_STORAGE_KEY);
        const currentIds = stored ? JSON.parse(stored) as string[] : [];
        
        if (!currentIds.includes(home.id)) {
          const newIds = [...currentIds, home.id];
          localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(newIds));
          setWishlistItems(prev => {
            if (prev.some(item => item.id === home.id)) return prev;
            return [...prev, home];
          });
        }
      } catch (error) {
        console.error('Error adding to guest wishlist:', error);
      }
    }
  }, [user]);

  // Remove home from wishlist
  const removeFromWishlist = useCallback(async (homeId: string) => {
    if (user) {
      // Remove from database for logged-in users
      try {
        const { error } = await supabase
          .from('user_wishlists')
          .delete()
          .eq('user_id', user.id)
          .eq('mobile_home_id', homeId);

        if (error) throw error;

        setWishlistItems(prev => prev.filter(item => item.id !== homeId));
      } catch (error) {
        console.error('Error removing from wishlist:', error);
      }
    } else {
      // Remove from localStorage for guests
      try {
        const stored = localStorage.getItem(WISHLIST_STORAGE_KEY);
        const currentIds = stored ? JSON.parse(stored) as string[] : [];
        const newIds = currentIds.filter(id => id !== homeId);
        
        localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(newIds));
        setWishlistItems(prev => prev.filter(item => item.id !== homeId));
      } catch (error) {
        console.error('Error removing from guest wishlist:', error);
      }
    }
  }, [user]);

  // Clear entire wishlist
  const clearWishlist = useCallback(async () => {
    if (user) {
      // Clear database for logged-in users
      try {
        const { error } = await supabase
          .from('user_wishlists')
          .delete()
          .eq('user_id', user.id);

        if (error) throw error;
        setWishlistItems([]);
      } catch (error) {
        console.error('Error clearing wishlist:', error);
      }
    } else {
      // Clear localStorage for guests
      try {
        localStorage.removeItem(WISHLIST_STORAGE_KEY);
        setWishlistItems([]);
      } catch (error) {
        console.error('Error clearing guest wishlist:', error);
      }
    }
  }, [user]);

  // Check if home is in wishlist
  const isInWishlist = useCallback((homeId: string) => {
    return wishlistItems.some(item => item.id === homeId);
  }, [wishlistItems]);

  // Toggle home in/out of wishlist
  const toggleWishlist = useCallback(async (home: MobileHome) => {
    if (isInWishlist(home.id)) {
      await removeFromWishlist(home.id);
    } else {
      await addToWishlist(home);
    }
  }, [isInWishlist, addToWishlist, removeFromWishlist]);

  return {
    wishlistItems,
    isLoading,
    addToWishlist,
    removeFromWishlist,
    clearWishlist,
    isInWishlist,
    toggleWishlist,
    wishlistCount: wishlistItems.length
  };
};
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';

type MobileHome = Database['public']['Tables']['mobile_homes']['Row'];

const WISHLIST_STORAGE_KEY = 'mobile-home-wishlist';

export const useSessionAwareWishlist = () => {
  const { activeSession, getSupabaseClient } = useAuth();
  const supabaseClient = getSupabaseClient();
  const [wishlistItems, setWishlistItems] = useState<MobileHome[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Helper function to get session-specific localStorage keys
  const getStorageKey = useCallback((baseKey: string) => {
    if (activeSession) {
      // Use user ID for consistent wishlist storage across all sessions for same user
      return `${baseKey}_user_${activeSession.user.id}`;
    }
    return `${baseKey}_guest`;
  }, [activeSession?.user.id]);

  // Load wishlist on user change (not session change) - optimized to prevent continuous calls
  const lastUserIdRef = useRef<string | null>(null);

  // Fetch homes by IDs for guest wishlist
  const fetchHomesByIds = useCallback(async (homeIds: string[]) => {
    if (homeIds.length === 0) {
      setWishlistItems([]);
      return;
    }

    setIsLoading(true);
    try {
      const client = supabaseClient || (await import('@/integrations/supabase/client')).supabase;
      const { data, error } = await client
        .from('mobile_homes')
        .select('*')
        .in('id', homeIds)
        .eq('active', true);

      if (error) throw error;
      setWishlistItems(data || []);
    } catch (error) {
      console.error('Error fetching homes by IDs:', error);
      setWishlistItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [supabaseClient]);

  // Load wishlist from database for logged-in users
  const loadUserWishlist = useCallback(async () => {
    if (!activeSession?.user || !supabaseClient) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabaseClient
        .from('user_wishlists')
        .select(`
          *,
          mobile_homes (*)
        `)
        .eq('user_id', activeSession.user.id);

      if (error) throw error;

      const homes = data?.map(item => item.mobile_homes).filter(Boolean) as MobileHome[];
      setWishlistItems(homes || []);
      console.log('🔍 Loaded wishlist for session:', activeSession.id, 'items:', homes?.length || 0);
    } catch (error) {
      console.error('Error loading user wishlist:', error);
    } finally {
      setIsLoading(false);
    }
  }, [activeSession?.user?.id, activeSession?.id, supabaseClient]);

  // Load wishlist from localStorage for guests
  const loadGuestWishlist = useCallback(() => {
    try {
      const wishlistKey = getStorageKey(WISHLIST_STORAGE_KEY);
      const stored = localStorage.getItem(wishlistKey);
      console.log('🔍 Loading guest wishlist for session:', activeSession?.id || 'guest', 'key:', wishlistKey);
      
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
  }, [activeSession?.id, getStorageKey, fetchHomesByIds]);
  
  useEffect(() => {
    const currentUserId = activeSession?.user?.id || null;
    
    // Only reload if the user ID actually changed
    if (lastUserIdRef.current === currentUserId) {
      return;
    }
    
    lastUserIdRef.current = currentUserId;
    
    if (activeSession?.user) {
      loadUserWishlist();
    } else {
      loadGuestWishlist();
    }
  }, [activeSession?.user?.id, loadUserWishlist, loadGuestWishlist]); // Add the functions to dependencies

  // Add home to wishlist
  const addToWishlist = useCallback(async (home: MobileHome) => {
    console.log('🔍 addToWishlist called for session:', activeSession?.id || 'guest', 'home:', home.id);
    
    if (activeSession?.user && supabaseClient) {
      // Add to database for logged-in users
      try {
        const { error } = await supabaseClient
          .from('user_wishlists')
          .insert({
            user_id: activeSession.user.id,
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
          await supabaseClient.functions.invoke('notify-admin-user-activity', {
            body: {
              user_id: activeSession.user.id,
              activity_type: 'wishlist_add',
              mobile_home_id: home.id,
              mobile_home_model: home.model
            }
          });
        } catch (notifyError) {
          console.error('Error notifying admin about wishlist addition:', notifyError);
        }
      } catch (error) {
        console.error('Error adding to wishlist:', error);
      }
    } else {
      // Add to localStorage for guests
      try {
        const wishlistKey = getStorageKey(WISHLIST_STORAGE_KEY);
        const stored = localStorage.getItem(wishlistKey);
        const currentIds = stored ? JSON.parse(stored) as string[] : [];
        
        if (!currentIds.includes(home.id)) {
          const newIds = [...currentIds, home.id];
          localStorage.setItem(wishlistKey, JSON.stringify(newIds));
          setWishlistItems(prev => {
            if (prev.some(item => item.id === home.id)) return prev;
            return [...prev, home];
          });
          console.log('🔍 Added to guest wishlist for session:', activeSession?.id || 'guest');
        }
      } catch (error) {
        console.error('Error adding to guest wishlist:', error);
      }
    }
  }, [activeSession, supabaseClient]);

  // Remove home from wishlist
  const removeFromWishlist = useCallback(async (homeId: string) => {
    console.log('🔍 removeFromWishlist called for session:', activeSession?.id || 'guest', 'home:', homeId);
    
    if (activeSession?.user && supabaseClient) {
      // Remove from database for logged-in users
      try {
        const { error } = await supabaseClient
          .from('user_wishlists')
          .delete()
          .eq('user_id', activeSession.user.id)
          .eq('mobile_home_id', homeId);

        if (error) throw error;

        setWishlistItems(prev => prev.filter(item => item.id !== homeId));
      } catch (error) {
        console.error('Error removing from wishlist:', error);
      }
    } else {
      // Remove from localStorage for guests
      try {
        const wishlistKey = getStorageKey(WISHLIST_STORAGE_KEY);
        const stored = localStorage.getItem(wishlistKey);
        const currentIds = stored ? JSON.parse(stored) as string[] : [];
        const newIds = currentIds.filter(id => id !== homeId);
        
        localStorage.setItem(wishlistKey, JSON.stringify(newIds));
        setWishlistItems(prev => prev.filter(item => item.id !== homeId));
        console.log('🔍 Removed from guest wishlist for session:', activeSession?.id || 'guest');
      } catch (error) {
        console.error('Error removing from guest wishlist:', error);
      }
    }
  }, [activeSession, supabaseClient]);

  // Clear entire wishlist
  const clearWishlist = useCallback(async () => {
    console.log('🔍 clearWishlist called for session:', activeSession?.id || 'guest');
    
    if (activeSession?.user && supabaseClient) {
      // Clear database for logged-in users
      try {
        const { error } = await supabaseClient
          .from('user_wishlists')
          .delete()
          .eq('user_id', activeSession.user.id);

        if (error) throw error;
        setWishlistItems([]);
      } catch (error) {
        console.error('Error clearing wishlist:', error);
      }
    } else {
      // Clear localStorage for guests
      try {
        const wishlistKey = getStorageKey(WISHLIST_STORAGE_KEY);
        localStorage.removeItem(wishlistKey);
        setWishlistItems([]);
        console.log('🔍 Cleared guest wishlist for session:', activeSession?.id || 'guest');
      } catch (error) {
        console.error('Error clearing guest wishlist:', error);
      }
    }
  }, [activeSession, supabaseClient]);

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
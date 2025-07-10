import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';

// Global cache to prevent duplicate API calls across multiple hook instances
let globalUserProfile: { first_name?: string } | null = null;
let globalProfilePromise: Promise<any> | null = null;
let globalUserId: string | null = null;

export const useAuthUser = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<{ first_name?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let initialCheckDone = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (event === 'SIGNED_OUT') {
          setUserProfile(null);
        }
        
        if (initialCheckDone) {
          setIsLoading(false);
        }
      }
    );

    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
        }
        
        if (!mounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        initialCheckDone = true;
        setIsLoading(false);
      } catch (error) {
        console.error('Auth check error:', error);
        if (mounted) {
          setSession(null);
          setUser(null);
          initialCheckDone = true;
          setIsLoading(false);
        }
      }
    };

    checkAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserProfile = useCallback(async (userId: string) => {
    // If we already have the profile for this user, use it
    if (globalUserId === userId && globalUserProfile) {
      setUserProfile(globalUserProfile);
      return;
    }

    // If there's already a request in progress for this user, wait for it
    if (globalUserId === userId && globalProfilePromise) {
      try {
        const result = await globalProfilePromise;
        setUserProfile(result);
      } catch (error) {
        console.error('Error waiting for profile fetch:', error);
      }
      return;
    }

    // Clear cache if user changed
    if (globalUserId !== userId) {
      globalUserProfile = null;
      globalProfilePromise = null;
      globalUserId = userId;
    }

    // Start new fetch
    globalProfilePromise = (async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('first_name')
          .eq('user_id', userId)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching user profile:', error);
          return null;
        }
        globalUserProfile = data;
        return data;
      } catch (error) {
        console.error('Error fetching user profile:', error);
        return null;
      }
    })();

    try {
      const result = await globalProfilePromise;
      setUserProfile(result);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setUserProfile(null);
      // Clear global cache when user logs out
      if (globalUserId) {
        globalUserProfile = null;
        globalProfilePromise = null;
        globalUserId = null;
      }
      return;
    }

    fetchUserProfile(user.id);
  }, [user, fetchUserProfile]);

  const handleLogout = async () => {
    try {
      setUser(null);
      setSession(null);
      setUserProfile(null);
      
      // Clear global cache on logout
      globalUserProfile = null;
      globalProfilePromise = null;
      globalUserId = null;
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Logout error:', error);
      }
      
      navigate('/');
    } catch (error) {
      console.error('Error during logout:', error);
      setUser(null);
      setSession(null);
      setUserProfile(null);
      // Clear global cache on error
      globalUserProfile = null;
      globalProfilePromise = null;
      globalUserId = null;
      navigate('/');
    }
  };

  const handleProfileUpdated = useCallback(async () => {
    if (user) {
      // Clear the global cache to force a fresh fetch
      globalUserProfile = null;
      globalProfilePromise = null;
      await fetchUserProfile(user.id);
    }
  }, [user, fetchUserProfile]);

  return {
    user,
    session,
    userProfile,
    isLoading,
    handleLogout,
    handleProfileUpdated
  };
};
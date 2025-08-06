import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';

// Note: Removed global caching to prevent cross-user data contamination

export const useAuthUser = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<{ first_name?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Debug logging for auth state
  console.log('useAuthUser: Current state', { 
    userEmail: user?.email, 
    sessionExists: !!session, 
    profileExists: !!userProfile, 
    isLoading 
  });

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
    // Always fetch fresh profile data - no caching for security
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name')
        .eq('user_id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user profile:', error);
        setUserProfile(null);
        return;
      }
      
      setUserProfile(data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setUserProfile(null);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setUserProfile(null);
      return;
    }

    fetchUserProfile(user.id);
  }, [user, fetchUserProfile]);

  const handleLogout = async () => {
    try {
      setUser(null);
      setSession(null);
      setUserProfile(null);
      
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
      navigate('/');
    }
  };

  const handleProfileUpdated = useCallback(async () => {
    if (user) {
      // Always fetch fresh profile data
      await fetchUserProfile(user.id);
    }
  }, [user, fetchUserProfile]);

  // Force refresh auth state - useful for clearing cache issues
  const forceRefreshAuth = useCallback(async () => {
    console.log('useAuthUser: Force refreshing auth state...');
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Error force refreshing session:', error);
        return;
      }
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await fetchUserProfile(session.user.id);
      }
    } catch (error) {
      console.error('Error in forceRefreshAuth:', error);
    }
  }, [fetchUserProfile]);

  return {
    user,
    session,
    userProfile,
    isLoading,
    handleLogout,
    handleProfileUpdated,
    forceRefreshAuth
  };
};
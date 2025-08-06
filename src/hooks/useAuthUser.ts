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

  // SECURITY: Enhanced debug logging for session tracking
  console.log('🔐 useAuthUser: Current state', {
    userId: user?.id,
    userEmail: user?.email,
    sessionUserId: session?.user?.id,
    sessionUserEmail: session?.user?.email,
    isLoading,
    timestamp: new Date().toISOString()
  });

  // SECURITY: Check for session user mismatch
  if (user && session && user.id !== session.user.id) {
    console.error('🚨 SECURITY ALERT: User ID mismatch detected!', {
      userId: user.id,
      sessionUserId: session.user.id,
      userEmail: user.email,
      sessionUserEmail: session.user.email
    });
    // Force logout on session mismatch
    supabase.auth.signOut();
  }

  useEffect(() => {
    let mounted = true;
    let initialCheckDone = false;

    // SECURITY: Enhanced auth state change handler with validation
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;
        
        console.log('🔐 Auth state change:', {
          event,
          userId: newSession?.user?.id,
          userEmail: newSession?.user?.email,
          timestamp: new Date().toISOString()
        });

        switch (event) {
          case 'SIGNED_IN':
            if (newSession?.user) {
              // SECURITY: Clear any existing state before setting new user
              setUser(null);
              setSession(null);
              setUserProfile(null);
              
              // Set new user state
              setUser(newSession.user);
              setSession(newSession);
            }
            break;
            
          case 'SIGNED_OUT':
            // SECURITY: Force clear all state
            setUser(null);
            setSession(null);
            setUserProfile(null);
            break;
            
          case 'TOKEN_REFRESHED':
            if (newSession?.user) {
              // SECURITY: Validate user hasn't changed during refresh
              if (user && user.id !== newSession.user.id) {
                console.error('🚨 SECURITY: User changed during token refresh!');
                await supabase.auth.signOut();
                return;
              }
              setSession(newSession);
            }
            break;
        }
        
        if (initialCheckDone) {
          setIsLoading(false);
        }
      }
    );

    const checkAuth = async () => {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('🚨 Auth initialization error:', error);
          if (mounted) {
            setUser(null);
            setSession(null);
            setUserProfile(null);
            setIsLoading(false);
          }
          return;
        }
        
        if (!mounted) return;
        
        if (initialSession?.user) {
          // SECURITY: Validate session integrity
          const sessionUser = initialSession.user;
          console.log('🔐 Setting initial auth state:', {
            userId: sessionUser.id,
            userEmail: sessionUser.email,
            sessionId: initialSession.access_token.slice(-10)
          });
          
          setUser(sessionUser);
          setSession(initialSession);
        } else {
          setUser(null);
          setSession(null);
          setUserProfile(null);
        }
        
        initialCheckDone = true;
        setIsLoading(false);
      } catch (error) {
        console.error('🚨 Auth initialization failed:', error);
        if (mounted) {
          setUser(null);
          setSession(null);
          setUserProfile(null);
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
    if (!userId) {
      setUserProfile(null);
      return;
    }

    try {
      // SECURITY: Always verify user matches session
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession || currentSession.user.id !== userId) {
        console.error('🚨 SECURITY: Profile fetch attempted for different user');
        setUserProfile(null);
        return;
      }

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
      console.log('🔐 Starting logout process...');
      
      // SECURITY: Force clear all local state immediately
      setUser(null);
      setSession(null);
      setUserProfile(null);
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Logout error:', error);
      } else {
        console.log('🔐 Logout successful');
      }
      
      // SECURITY: Clear any cached data and force page refresh
      if (typeof window !== 'undefined') {
        // Clear localStorage
        localStorage.clear();
        // Clear sessionStorage
        sessionStorage.clear();
      }
      
      navigate('/');
    } catch (error) {
      console.error('Error during logout:', error);
      // Even if logout fails, clear local state and redirect
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
    try {
      console.log('🔐 Force refreshing auth state...');
      setIsLoading(true);
      
      // SECURITY: Get fresh session and validate
      const { data: { session: freshSession }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('🚨 Error refreshing auth:', error);
        setUser(null);
        setSession(null);
        setUserProfile(null);
        setIsLoading(false);
        return;
      }
      
      if (freshSession?.user) {
        // SECURITY: Check if user changed
        if (user && user.id !== freshSession.user.id) {
          console.error('🚨 SECURITY: Different user detected during refresh!');
          await handleLogout();
          return;
        }
        
        console.log('🔐 Auth refresh successful:', {
          userId: freshSession.user.id,
          userEmail: freshSession.user.email
        });
        
        setUser(freshSession.user);
        setSession(freshSession);
        await fetchUserProfile(freshSession.user.id);
      } else {
        console.log('🔐 No session found during refresh');
        setUser(null);
        setSession(null);
        setUserProfile(null);
      }
      setIsLoading(false);
    } catch (error) {
      console.error('🚨 Error in forceRefreshAuth:', error);
      setUser(null);
      setSession(null);
      setUserProfile(null);
      setIsLoading(false);
    }
  }, [user, fetchUserProfile]);

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
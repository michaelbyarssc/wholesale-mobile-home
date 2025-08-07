import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';

// Note: Removed global caching to prevent cross-user data contamination

export const useAuthUser = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<{ first_name?: string; last_name?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionFingerprint, setSessionFingerprint] = useState<string | null>(null);

  // Simplified session security - only clear on actual data contamination
  const clearUserSession = async (reason: string) => {
    console.log('🔐 Clearing session:', reason);
    
    // Clear state
    setUser(null);
    setSession(null);
    setUserProfile(null);
    setSessionFingerprint(null);
    setIsLoading(false);
    
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Simplified debug logging
  console.log('🔐 useAuthUser: Current state', {
    userId: user?.id,
    userEmail: user?.email,
    isLoading,
    timestamp: new Date().toISOString()
  });

  // Only check for critical mismatches, not fingerprints
  React.useEffect(() => {
    if (user && session && user.id !== session.user.id) {
      console.error('🚨 Critical user/session mismatch detected');
      clearUserSession(`User/Session ID mismatch: User(${user.email}) vs Session(${session.user.email})`);
    }
  }, [user, session]);

  useEffect(() => {
    let mounted = true;
    let initialCheckDone = false;

    // Simplified auth state change handler
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
              console.log('🔐 Setting new session');
              setUser(newSession.user);
              setSession(newSession);
              setSessionFingerprint(`session_${Date.now()}`);
            }
            break;
            
          case 'SIGNED_OUT':
            console.log('🔐 Clearing session on sign out');
            setUser(null);
            setSession(null);
            setUserProfile(null);
            setSessionFingerprint(null);
            break;
            
          case 'TOKEN_REFRESHED':
            if (newSession?.user) {
              // Only update session, don't validate aggressively
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
        console.log('🔐 Starting auth check');
        
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth initialization error:', error);
          if (mounted) {
            setIsLoading(false);
          }
          return;
        }
        
        if (!mounted) return;
        
        if (initialSession?.user) {
          console.log('🔐 Initial session found:', {
            userId: initialSession.user.id,
            userEmail: initialSession.user.email
          });
          
          setUser(initialSession.user);
          setSession(initialSession);
          setSessionFingerprint(`session_${Date.now()}`);
        } else {
          console.log('🔐 No initial session found');
          setUser(null);
          setSession(null);
          setUserProfile(null);
          setSessionFingerprint(null);
        }
        
        initialCheckDone = true;
        setIsLoading(false);
      } catch (error) {
        console.error('Auth initialization failed:', error);
        if (mounted) {
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
      console.log('🔐 Fetching profile for user:', userId);

      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user profile:', error);
        setUserProfile(null);
        return;
      }
      
      console.log('🔐 Profile fetched successfully:', data);
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
      console.log('🔐 Starting logout...');
      
      setUser(null);
      setSession(null);
      setUserProfile(null);
      setSessionFingerprint(null);
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Logout error:', error);
      } else {
        console.log('🔐 Logout successful');
      }
      
      navigate('/');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const handleProfileUpdated = useCallback(async () => {
    if (user) {
      // Always fetch fresh profile data
      await fetchUserProfile(user.id);
    }
  }, [user, fetchUserProfile]);

  // Simplified auth refresh
  const forceRefreshAuth = useCallback(async () => {
    try {
      console.log('🔐 Refreshing auth state...');
      setIsLoading(true);
      
      const { data: { session: freshSession }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error refreshing auth:', error);
        setUser(null);
        setSession(null);
        setUserProfile(null);
        setIsLoading(false);
        return;
      }
      
      if (freshSession?.user) {
        console.log('🔐 Auth refresh successful');
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
      console.error('Error in forceRefreshAuth:', error);
      setUser(null);
      setSession(null);
      setUserProfile(null);
      setIsLoading(false);
    }
  }, [fetchUserProfile]);

  return {
    user,
    session,
    userProfile,
    isLoading,
    handleLogout,
    handleProfileUpdated,
    forceRefreshAuth,
    sessionFingerprint
  };
};
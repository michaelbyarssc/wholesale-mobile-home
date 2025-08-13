import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';

export const useAuthUser = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<{ first_name?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionFingerprint, setSessionFingerprint] = useState<string | null>(null);
  
  // Add debouncing refs
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const lastAuthCheck = useRef<number>(0);

  const clearUserSession = async (reason: string) => {
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

  // Only check for critical mismatches
  React.useEffect(() => {
    if (user && session && user.id !== session.user.id) {
      clearUserSession(`User/Session ID mismatch`);
    }
  }, [user, session]);

  useEffect(() => {
    let mounted = true;
    let initialCheckDone = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;
        
        // Debounce rapid auth state changes
        if (debounceTimeout.current) {
          clearTimeout(debounceTimeout.current);
        }
        
        debounceTimeout.current = setTimeout(() => {
          switch (event) {
            case 'SIGNED_IN':
              if (newSession?.user) {
                setUser(newSession.user);
                setSession(newSession);
                setSessionFingerprint(`session_${Date.now()}`);
              }
              break;
              
            case 'SIGNED_OUT':
              setUser(null);
              setSession(null);
              setUserProfile(null);
              setSessionFingerprint(null);
              break;
              
            case 'TOKEN_REFRESHED':
              if (newSession?.user) {
                setSession(newSession);
              }
              break;
          }
          
          if (initialCheckDone) {
            setIsLoading(false);
          }
        }, 100); // 100ms debounce
      }
    );

    const checkAuth = async () => {
      // Prevent rapid auth checks
      const now = Date.now();
      if (now - lastAuthCheck.current < 500) {
        return;
      }
      lastAuthCheck.current = now;
      
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          if (mounted) {
            setIsLoading(false);
          }
          return;
        }
        
        if (!mounted) return;
        
        if (initialSession?.user) {
          setUser(initialSession.user);
          setSession(initialSession);
          setSessionFingerprint(`session_${Date.now()}`);
        } else {
          setUser(null);
          setSession(null);
          setUserProfile(null);
          setSessionFingerprint(null);
        }
        
        initialCheckDone = true;
        setIsLoading(false);
      } catch (error) {
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
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, []);

  const fetchUserProfile = useCallback(async (userId: string) => {
    if (!userId) {
      setUserProfile(null);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name')
        .eq('user_id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        setUserProfile(null);
        return;
      }
      
      setUserProfile(data);
    } catch (error) {
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
      setSessionFingerprint(null);
      
      const { error } = await supabase.auth.signOut();
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

  const forceRefreshAuth = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const { data: { session: freshSession }, error } = await supabase.auth.getSession();
      
      if (error) {
        setUser(null);
        setSession(null);
        setUserProfile(null);
        setIsLoading(false);
        return;
      }
      
      if (freshSession?.user) {
        setUser(freshSession.user);
        setSession(freshSession);
        await fetchUserProfile(freshSession.user.id);
      } else {
        setUser(null);
        setSession(null);
        setUserProfile(null);
      }
      setIsLoading(false);
    } catch (error) {
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
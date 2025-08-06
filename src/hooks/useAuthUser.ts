import React, { useState, useEffect, useCallback } from 'react';
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
  const [sessionFingerprint, setSessionFingerprint] = useState<string | null>(null);

  // EMERGENCY: Generate unique session fingerprint for contamination detection
  const generateSessionFingerprint = () => {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // EMERGENCY: Force clear all browser storage and state
  const emergencyClearSession = async (reason: string) => {
    console.error('🚨 EMERGENCY SESSION CLEAR:', reason);
    
    // Clear all state immediately
    setUser(null);
    setSession(null);
    setUserProfile(null);
    setSessionFingerprint(null);
    setIsLoading(false);
    
    // Force clear all browser storage
    if (typeof window !== 'undefined') {
      try {
        localStorage.clear();
        sessionStorage.clear();
        
        // Clear all cookies
        document.cookie.split(";").forEach((c) => {
          const eqPos = c.indexOf("=");
          const name = eqPos > -1 ? c.substr(0, eqPos) : c;
          document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
        });
      } catch (error) {
        console.error('Error clearing storage:', error);
      }
    }
    
    // Force sign out from Supabase
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
    
    // Force redirect to auth page
    window.location.href = '/auth';
  };

  // SECURITY: Enhanced debug logging for session tracking
  console.log('🔐 useAuthUser: Current state', {
    userId: user?.id,
    userEmail: user?.email,
    sessionUserId: session?.user?.id,
    sessionUserEmail: session?.user?.email,
    sessionFingerprint,
    isLoading,
    timestamp: new Date().toISOString()
  });

  // CRITICAL SECURITY: Immediate mismatch detection and emergency clearing
  React.useEffect(() => {
    if (user && session) {
      // Check for user/session mismatch
      if (user.id !== session.user.id || user.email !== session.user.email) {
        emergencyClearSession(`User/Session mismatch: User(${user.email}) vs Session(${session.user.email})`);
        return;
      }
      
      // Check for session fingerprint contamination
      if (sessionFingerprint && session.access_token) {
        const currentFingerprint = session.access_token.slice(-10);
        if (sessionFingerprint !== currentFingerprint) {
          emergencyClearSession(`Session fingerprint mismatch: ${sessionFingerprint} vs ${currentFingerprint}`);
          return;
        }
      }
    }
  }, [user, session, sessionFingerprint]);

  useEffect(() => {
    let mounted = true;
    let initialCheckDone = false;

    // EMERGENCY: Enhanced auth state change handler with strict validation
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
              // EMERGENCY: Complete state isolation for new session
              console.log('🔐 EMERGENCY: Starting fresh session isolation');
              
              // Force clear ALL existing state
              setUser(null);
              setSession(null);
              setUserProfile(null);
              setSessionFingerprint(null);
              
              // Clear browser storage to prevent contamination
              if (typeof window !== 'undefined') {
                try {
                  localStorage.clear();
                  sessionStorage.clear();
                } catch (error) {
                  console.error('Error clearing storage on sign in:', error);
                }
              }
              
              // Generate new session fingerprint
              const newFingerprint = generateSessionFingerprint();
              setSessionFingerprint(newFingerprint);
              
              // Set new user state with fresh data
              setUser(newSession.user);
              setSession(newSession);
              
              console.log('🔐 Fresh session established:', {
                userId: newSession.user.id,
                userEmail: newSession.user.email,
                fingerprint: newFingerprint
              });
            }
            break;
            
          case 'SIGNED_OUT':
            console.log('🔐 EMERGENCY: Complete state clearing on sign out');
            // EMERGENCY: Force clear all state and storage
            setUser(null);
            setSession(null);
            setUserProfile(null);
            setSessionFingerprint(null);
            
            if (typeof window !== 'undefined') {
              try {
                localStorage.clear();
                sessionStorage.clear();
              } catch (error) {
                console.error('Error clearing storage on sign out:', error);
              }
            }
            break;
            
          case 'TOKEN_REFRESHED':
            if (newSession?.user) {
              // CRITICAL: Validate user hasn't changed during refresh
              if (user && user.id !== newSession.user.id) {
                console.error('🚨 EMERGENCY: User changed during token refresh!');
                await emergencyClearSession('User changed during token refresh');
                return;
              }
              
              // Validate session integrity
              if (user && user.email !== newSession.user.email) {
                console.error('🚨 EMERGENCY: Email changed during token refresh!');
                await emergencyClearSession('Email changed during token refresh');
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
        console.log('🔐 EMERGENCY: Starting fresh auth check with complete isolation');
        
        // EMERGENCY: Clear all state before checking auth
        setUser(null);
        setSession(null);
        setUserProfile(null);
        setSessionFingerprint(null);
        
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('🚨 Auth initialization error:', error);
          if (mounted) {
            await emergencyClearSession('Auth initialization error');
          }
          return;
        }
        
        if (!mounted) return;
        
        if (initialSession?.user) {
          // EMERGENCY: Validate session integrity with strict checks
          const sessionUser = initialSession.user;
          
          console.log('🔐 EMERGENCY: Validating initial session:', {
            userId: sessionUser.id,
            userEmail: sessionUser.email,
            sessionId: initialSession.access_token.slice(-10),
            timestamp: new Date().toISOString()
          });
          
          // Generate fresh session fingerprint
          const newFingerprint = generateSessionFingerprint();
          setSessionFingerprint(newFingerprint);
          
          // Set validated session data
          setUser(sessionUser);
          setSession(initialSession);
          
          console.log('🔐 Initial session validated and isolated successfully');
        } else {
          console.log('🔐 No initial session found - state cleared');
          setUser(null);
          setSession(null);
          setUserProfile(null);
          setSessionFingerprint(null);
        }
        
        initialCheckDone = true;
        setIsLoading(false);
      } catch (error) {
        console.error('🚨 Auth initialization failed:', error);
        if (mounted) {
          await emergencyClearSession('Auth initialization failed');
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
      // EMERGENCY: Double verification before profile fetch
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      if (!currentSession || currentSession.user.id !== userId) {
        console.error('🚨 EMERGENCY: Profile fetch attempted for different user!', {
          requestedUserId: userId,
          sessionUserId: currentSession?.user.id,
          sessionEmail: currentSession?.user.email
        });
        await emergencyClearSession('Profile fetch user mismatch');
        return;
      }

      // Additional validation: ensure current user state matches
      if (user && user.id !== userId) {
        console.error('🚨 EMERGENCY: Profile fetch user ID mismatch with current user!');
        await emergencyClearSession('Profile user ID mismatch');
        return;
      }

      console.log('🔐 Fetching profile for validated user:', {
        userId,
        userEmail: currentSession.user.email
      });

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
      
      console.log('🔐 Profile fetched successfully:', data);
      setUserProfile(data);
    } catch (error) {
      console.error('🚨 Error fetching user profile:', error);
      setUserProfile(null);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setUserProfile(null);
      return;
    }

    fetchUserProfile(user.id);
  }, [user, fetchUserProfile]);

  const handleLogout = async () => {
    try {
      console.log('🔐 EMERGENCY: Starting complete logout and session clearing...');
      
      // EMERGENCY: Immediate state clearing
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
      
      // EMERGENCY: Complete browser storage clearing
      if (typeof window !== 'undefined') {
        try {
          localStorage.clear();
          sessionStorage.clear();
          
          // Clear all cookies
          document.cookie.split(";").forEach((c) => {
            const eqPos = c.indexOf("=");
            const name = eqPos > -1 ? c.substr(0, eqPos) : c;
            document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
          });
        } catch (error) {
          console.error('Error clearing storage during logout:', error);
        }
      }
      
      // Force redirect to prevent any caching issues
      window.location.href = '/';
    } catch (error) {
      console.error('🚨 Error during logout:', error);
      // EMERGENCY: Even if logout fails, force clear everything
      await emergencyClearSession('Logout failed - emergency clear');
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
    forceRefreshAuth,
    emergencyClearSession,
    sessionFingerprint
  };
};
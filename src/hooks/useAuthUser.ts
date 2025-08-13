import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { StorageQuotaManager } from '@/utils/storageQuotaManager';

export const useAuthUser = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<{ first_name?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionFingerprint, setSessionFingerprint] = useState<string | null>(null);
  const [storageError, setStorageError] = useState<boolean>(false);
  
  // Add debouncing refs
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const lastAuthCheck = useRef<number>(0);
  const authTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const emergencyCleanupDone = useRef<boolean>(false);

  const clearUserSession = async (reason: string) => {
    console.log(`[AuthUser] Clearing session: ${reason}`);
    
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

  const emergencyAuthRecovery = useCallback(async () => {
    console.log('[AuthUser] Emergency auth recovery triggered');
    
    if (!emergencyCleanupDone.current) {
      const cleanupSuccess = StorageQuotaManager.emergencyCleanup();
      emergencyCleanupDone.current = true;
      
      if (cleanupSuccess) {
        console.log('[AuthUser] Emergency cleanup successful, retrying auth');
        setStorageError(false);
        // Retry auth check after cleanup
        setTimeout(() => {
          if (authTimeoutRef.current) {
            clearTimeout(authTimeoutRef.current);
          }
          setIsLoading(true);
        }, 500);
        return true;
      }
    }
    
    // If cleanup didn't work, use fallback authentication
    console.log('[AuthUser] Using fallback authentication');
    setStorageError(true);
    setIsLoading(false);
    return false;
  }, []);

  // Only check for critical mismatches
  React.useEffect(() => {
    if (user && session && user.id !== session.user.id) {
      clearUserSession(`User/Session ID mismatch`);
    }
  }, [user, session]);

  useEffect(() => {
    let mounted = true;
    let initialCheckDone = false;

    // Emergency timeout - if auth doesn't resolve in 10 seconds, trigger recovery
    authTimeoutRef.current = setTimeout(() => {
      if (mounted && !initialCheckDone) {
        console.log('[AuthUser] Auth timeout reached, triggering emergency recovery');
        emergencyAuthRecovery();
      }
    }, 10000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;
        
        // Clear timeout if auth resolves
        if (authTimeoutRef.current) {
          clearTimeout(authTimeoutRef.current);
          authTimeoutRef.current = null;
        }
        
        // Debounce rapid auth state changes
        if (debounceTimeout.current) {
          clearTimeout(debounceTimeout.current);
        }
        
        debounceTimeout.current = setTimeout(() => {
          try {
            switch (event) {
              case 'SIGNED_IN':
                if (newSession?.user) {
                  setUser(newSession.user);
                  setSession(newSession);
                  setSessionFingerprint(`session_${Date.now()}`);
                  setStorageError(false);
                }
                break;
                
              case 'SIGNED_OUT':
                setUser(null);
                setSession(null);
                setUserProfile(null);
                setSessionFingerprint(null);
                setStorageError(false);
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
          } catch (error) {
            console.error('[AuthUser] Error in auth state change:', error);
            if (mounted) {
              emergencyAuthRecovery();
            }
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
        // Check storage quota before making requests
        const quotaCheck = StorageQuotaManager.checkQuota();
        if (!quotaCheck.canWrite && quotaCheck.metrics.usagePercentage > 0.9) {
          console.log('[AuthUser] Storage quota critical, triggering emergency cleanup');
          const cleanupSuccess = await emergencyAuthRecovery();
          if (!cleanupSuccess) {
            return; // Emergency recovery will handle loading state
          }
        }

        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('[AuthUser] Auth session error:', error);
          if (mounted) {
            // Try emergency recovery for auth errors
            const recovered = await emergencyAuthRecovery();
            if (!recovered) {
              setIsLoading(false);
            }
          }
          return;
        }
        
        if (!mounted) return;
        
        if (initialSession?.user) {
          setUser(initialSession.user);
          setSession(initialSession);
          setSessionFingerprint(`session_${Date.now()}`);
          setStorageError(false);
        } else {
          setUser(null);
          setSession(null);
          setUserProfile(null);
          setSessionFingerprint(null);
        }
        
        initialCheckDone = true;
        setIsLoading(false);
        
        // Clear timeout since auth resolved
        if (authTimeoutRef.current) {
          clearTimeout(authTimeoutRef.current);
          authTimeoutRef.current = null;
        }
      } catch (error) {
        console.error('[AuthUser] Critical auth error:', error);
        if (mounted) {
          const recovered = await emergencyAuthRecovery();
          if (!recovered) {
            initialCheckDone = true;
            setIsLoading(false);
          }
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
      if (authTimeoutRef.current) {
        clearTimeout(authTimeoutRef.current);
      }
    };
  }, [emergencyAuthRecovery]);

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
    sessionFingerprint,
    storageError,
    emergencyAuthRecovery
  };
};
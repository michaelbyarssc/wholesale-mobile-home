import { useState, useEffect, useCallback, useMemo } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { useSessionManager } from '@/contexts/SessionManagerContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

// Profile cache with longer duration
const PROFILE_CACHE_TIME = 10 * 60 * 1000; // 10 minutes
const PROFILE_GC_TIME = 20 * 60 * 1000; // 20 minutes

export const useOptimizedAuth = () => {
  const {
    sessions,
    activeSession,
    activeSessionId,
    addSession,
    removeSession,
    switchToSession,
    clearAllSessions,
    updateSessionProfile
  } = useSessionManager();
  
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Optimized profile fetching with React Query
  const { data: userProfile, refetch: refetchProfile } = useQuery({
    queryKey: ['user-profile', activeSession?.user?.id],
    queryFn: async () => {
      if (!activeSession?.user?.id) return null;

      const { data: profile, error } = await activeSession.supabaseClient
        .from('profiles')
        .select('first_name, last_name')
        .eq('user_id', activeSession.user.id)
        .maybeSingle();

      if (error) {
        console.warn('Profile fetch error (non-blocking):', error.message);
        return null;
      }

      return profile || {};
    },
    enabled: !!activeSession?.user?.id,
    staleTime: PROFILE_CACHE_TIME,
    gcTime: PROFILE_GC_TIME,
    refetchOnWindowFocus: false,
    refetchOnMount: false
  });

  // Update session profile when data changes
  useEffect(() => {
    if (userProfile && activeSessionId) {
      updateSessionProfile(activeSessionId, userProfile);
    }
  }, [userProfile, activeSessionId, updateSessionProfile]);

  // Simplified auth initialization with debouncing
  useEffect(() => {
    let mounted = true;
    let authSubscription: any = null;
    
    const initializeAuth = async () => {
      try {
        // Simplified auth state listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          (event, session) => {
            if (!mounted) return;
            
            // Debounce auth events
            const eventKey = `auth_${event}_${session?.user?.id || 'none'}`;
            if ((window as any)[eventKey]) {
              clearTimeout((window as any)[eventKey]);
            }
            
            (window as any)[eventKey] = setTimeout(async () => {
              if (!mounted) return;
              
              if (event === 'SIGNED_IN' && session?.user) {
                const existingSession = sessions.find(s => s.user.id === session.user.id);
                if (!existingSession) {
                  await addSession(session.user, session);
                }
              }
              
              delete (window as any)[eventKey];
            }, 300);
          }
        );
        
        authSubscription = subscription;

        // Check for existing session
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && mounted) {
          const existingSession = sessions.find(s => s.user.id === session.user.id);
          if (!existingSession) {
            await addSession(session.user, session);
          }
        }
        
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();
    
    return () => {
      mounted = false;
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
  }, [addSession, sessions]);

  // Optimized sign in with reduced state changes
  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      if (data.user && data.session) {
        await addSession(data.user, data.session);
        return { data, error: null };
      }

      return { data, error: null };
    } catch (error: any) {
      return { data: null, error };
    }
  }, [addSession]);

  // Optimized sign up
  const signUp = useCallback(async (email: string, password: string, metadata?: any) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: metadata
        }
      });

      if (error) throw error;

      if (data.user && data.session) {
        await addSession(data.user, data.session);
      }

      return { data, error: null };
    } catch (error: any) {
      return { data: null, error };
    }
  }, [addSession]);

  // Optimized sign out with immediate cleanup
  const signOut = useCallback(async (sessionId?: string) => {
    const targetSessionId = sessionId || activeSessionId;
    if (!targetSessionId) return;

    const session = sessions.find(s => s.id === targetSessionId);
    if (!session) return;
    
    try {
      // Immediate cleanup
      removeSession(targetSessionId);
      
      // Background logout
      session.supabaseClient.auth.signOut().catch(console.error);
      
      // Quick reload for complete cleanup
      setTimeout(() => window.location.reload(), 200);
      
    } catch (error) {
      console.error('Sign out error:', error);
      removeSession(targetSessionId);
      setTimeout(() => window.location.reload(), 100);
    }
  }, [activeSessionId, sessions, removeSession]);

  // Optimized switch session
  const switchToSessionSafe = useCallback(async (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;

    switchToSession(sessionId);
    
    // Refetch profile for new session
    setTimeout(() => refetchProfile(), 100);
  }, [sessions, switchToSession, refetchProfile]);

  // Memoized getters for better performance
  const getCurrentUser = useMemo(() => activeSession?.user || null, [activeSession]);
  const getCurrentSession = useMemo(() => activeSession?.session || null, [activeSession]);
  const getCurrentUserProfile = useMemo(() => userProfile, [userProfile]);
  const getSupabaseClient = useMemo(() => activeSession?.supabaseClient || supabase, [activeSession]);

  return {
    // Session management
    sessions,
    activeSession,
    activeSessionId,
    switchToSession: switchToSessionSafe,
    
    // Current session data
    user: getCurrentUser,
    session: getCurrentSession,
    userProfile: getCurrentUserProfile,
    isLoading,
    
    // Auth methods
    signIn,
    signUp,
    signOut,
    signOutAll: clearAllSessions,
    
    // Profile methods
    fetchUserProfile: refetchProfile,
    
    // Client access
    supabaseClient: getSupabaseClient,
    
    // Utilities
    hasMultipleSessions: sessions.length > 1,
    sessionCount: sessions.length
  };
};
import { useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { useSessionManager } from '@/contexts/SessionManagerContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export const useSimplifiedAuth = () => {
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

  // Simplified profile fetching
  const { data: userProfile } = useQuery({
    queryKey: ['user-profile', activeSession?.user?.id],
    queryFn: async () => {
      if (!activeSession?.user?.id) return null;

      const { data: profile } = await activeSession.supabaseClient
        .from('profiles')
        .select('first_name, last_name')
        .eq('user_id', activeSession.user.id)
        .maybeSingle();

      return profile || {};
    },
    enabled: !!activeSession?.user?.id,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 20 * 60 * 1000, // 20 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false
  });

  // Update session profile when data changes
  useEffect(() => {
    if (userProfile && activeSessionId) {
      updateSessionProfile(activeSessionId, userProfile);
    }
  }, [userProfile, activeSessionId, updateSessionProfile]);

  // Simplified auth initialization
  useEffect(() => {
    let mounted = true;
    let authSubscription: any = null;
    
    const initializeAuth = async () => {
      try {
        // Simple auth state listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (!mounted) return;
            
            if (event === 'SIGNED_IN' && session?.user) {
              const existingSession = sessions.find(s => s.user.id === session.user.id);
              if (!existingSession) {
                await addSession(session.user, session);
              }
            }
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

  // Simplified auth methods
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

  const signOut = useCallback(async (sessionId?: string) => {
    const targetSessionId = sessionId || activeSessionId;
    if (!targetSessionId) return;

    const session = sessions.find(s => s.id === targetSessionId);
    if (!session) return;
    
    try {
      removeSession(targetSessionId);
      session.supabaseClient.auth.signOut().catch(console.error);
      setTimeout(() => window.location.reload(), 200);
    } catch (error) {
      console.error('Sign out error:', error);
      removeSession(targetSessionId);
      setTimeout(() => window.location.reload(), 100);
    }
  }, [activeSessionId, sessions, removeSession]);

  const switchToSessionSafe = useCallback(async (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;
    switchToSession(sessionId);
  }, [sessions, switchToSession]);

  return {
    // Session management
    sessions,
    activeSession,
    activeSessionId,
    switchToSession: switchToSessionSafe,
    
    // Current session data
    user: activeSession?.user || null,
    session: activeSession?.session || null,
    userProfile: userProfile || {},
    isLoading,
    
    // Auth methods
    signIn,
    signUp,
    signOut,
    signOutAll: clearAllSessions,
    
    // Client access
    supabaseClient: activeSession?.supabaseClient || supabase,
    
    // Utilities
    hasMultipleSessions: sessions.length > 1,
    sessionCount: sessions.length
  };
};
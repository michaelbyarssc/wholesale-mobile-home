import { useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { useSessionManager } from '@/contexts/SessionManagerContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useSessionValidation } from '@/hooks/useSessionValidation';
import { AuthStabilizer } from '@/utils/authStabilizer';
import { devLog, devError } from '@/utils/environmentUtils';

export const useMultiUserAuth = () => {
  const {
    sessions,
    activeSession,
    activeSessionId,
    addSession,
    removeSession,
    switchToSession,
    clearAllSessions,
    getSessionClient,
    updateSessionProfile
  } = useSessionManager();
  
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { validateSession } = useSessionValidation();

  // Initialize by checking for existing session - React Strict Mode compatible
  useEffect(() => {
    const cleanup = AuthStabilizer.createStrictModeCompatibleEffect(
      async () => {
        // Set up auth state listener first - stable callback without dependencies
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
              // Use debounced initialization to prevent React Strict Mode issues
              AuthStabilizer.debouncedInitialization(
                session.user.id,
                async () => {
                  // Use a separate check to avoid dependency on sessions array
                  const storedSessions = localStorage.getItem('wmh_sessions');
                  const existingSessions = storedSessions ? JSON.parse(storedSessions) : [];
                  const hasExistingSession = existingSessions.some((s: any) => s.user.id === session.user.id);
                  
                  if (!hasExistingSession) {
                    devLog('🔐 Auth state change: adding new session for user:', session.user.email);
                    return await addSession(session.user, session);
                  }
                  return '';
                }
              );
            }
          }
        );

        // Then check for existing session
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const storedSessions = localStorage.getItem('wmh_sessions');
          const existingSessions = storedSessions ? JSON.parse(storedSessions) : [];
          
          if (existingSessions.length === 0) {
            devLog('🔐 Initializing auth with existing session for user:', session.user.email);
            await addSession(session.user, session);
          }
        }
        
        setIsLoading(false);
        return subscription;
      },
      () => {
        // Cleanup function
        setIsLoading(false);
      }
    );

    return cleanup;
  }, [addSession]); // Only depend on addSession

  const signIn = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      if (data.user && data.session) {
        const sessionId = await addSession(data.user, data.session);
        devLog('🔐 Sign in successful, session ID:', sessionId);
        return { data, error: null };
      }

      return { data, error: null };
    } catch (error: any) {
      devError('🔐 Sign in error:', error);
      return { data: null, error };
    } finally {
      setIsLoading(false);
    }
  }, [addSession]);

  const signUp = useCallback(async (email: string, password: string, metadata?: any) => {
    setIsLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: metadata
        }
      });

      if (error) throw error;

      if (data.user && data.session) {
        const sessionId = await addSession(data.user, data.session);
        devLog('🔐 Sign up successful, session ID:', sessionId);
      }

      return { data, error: null };
    } catch (error: any) {
      devError('🔐 Sign up error:', error);
      return { data: null, error };
    } finally {
      setIsLoading(false);
    }
  }, [addSession]);

  const signOut = useCallback(async (sessionId?: string) => {
    const targetSessionId = sessionId || activeSessionId;
    if (!targetSessionId) return;

    const session = sessions.find(s => s.id === targetSessionId);
    if (!session) return;

    try {
      // Sign out from the specific session's client
      await session.supabaseClient.auth.signOut();
      removeSession(targetSessionId);
      devLog('🔐 Signed out session:', targetSessionId);
    } catch (error) {
      devError('🔐 Sign out error:', error);
    }
  }, [activeSessionId, sessions, removeSession]);

  const signOutAll = useCallback(async () => {
    try {
      // Sign out all sessions
      await Promise.all(sessions.map(session => 
        session.supabaseClient.auth.signOut()
      ));
      clearAllSessions();
      navigate('/');
      devLog('🔐 Signed out all sessions');
    } catch (error) {
      devError('🔐 Sign out all error:', error);
    }
  }, [sessions, clearAllSessions, navigate]);

  const switchToSessionSafe = useCallback(async (sessionId: string) => {
    // Switch immediately for better UX, validate in background
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      switchToSession(sessionId);
      
      // Validate in background - non-blocking
      setTimeout(async () => {
        try {
          const isValid = await validateSession(sessionId);
          if (!isValid) {
            devError('🔐 Session validation failed after switch:', sessionId);
          }
        } catch (error) {
          devError('🔐 Session validation error:', error);
        }
      }, 0);
    }
  }, [sessions, switchToSession, validateSession]);

  const fetchUserProfile = useCallback(async (sessionId?: string) => {
    const targetSessionId = sessionId || activeSessionId;
    if (!targetSessionId) return null;

    const session = sessions.find(s => s.id === targetSessionId);
    if (!session) return null;

    try {
      const { data: profile } = await session.supabaseClient
        .from('profiles')
        .select('first_name, last_name')
        .eq('user_id', session.user.id)
        .single();

      if (profile) {
        updateSessionProfile(targetSessionId, profile);
      }

      return profile;
    } catch (error) {
      devError('Error fetching user profile:', error);
      return null;
    }
  }, [activeSessionId, sessions, updateSessionProfile]);

  const getCurrentSession = useCallback(() => {
    return activeSession;
  }, [activeSession]);

  const getCurrentUser = useCallback(() => {
    return activeSession?.user || null;
  }, [activeSession]);

  const getCurrentUserProfile = useCallback(() => {
    return activeSession?.userProfile || null;
  }, [activeSession]);

  const getSupabaseClient = useCallback(() => {
    return activeSession?.supabaseClient || supabase;
  }, [activeSession]);

  return {
    // Session management
    sessions,
    activeSession,
    activeSessionId,
    switchToSession: switchToSessionSafe,
    
    // Current session data
    user: getCurrentUser(),
    session: getCurrentSession()?.session || null,
    userProfile: getCurrentUserProfile(),
    isLoading,
    
    // Auth methods
    signIn,
    signUp,
    signOut,
    signOutAll,
    
    // Profile methods
    fetchUserProfile,
    
    // Client access
    supabaseClient: getSupabaseClient(),
    
    // Utilities
    hasMultipleSessions: sessions.length > 1,
    sessionCount: sessions.length
  };
};
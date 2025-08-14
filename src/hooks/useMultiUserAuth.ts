import { useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { useSessionManager } from '@/contexts/SessionManagerContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useSessionValidation } from '@/hooks/useSessionValidation';

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

  // Initialize by checking for existing session - stable approach
  useEffect(() => {
    let initialized = false;
    let authSubscription: any = null;
    
    const initializeAuth = async () => {
      if (initialized) return;
      initialized = true;
      
      try {
        // Set up auth state listener first - stable callback without dependencies
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          (event, session) => {
            // Handle auth state changes without async operations to prevent deadlocks
            if (event === 'SIGNED_IN' && session?.user) {
              // Defer session addition to prevent blocking the auth state change
              setTimeout(async () => {
                try {
                  const storedSessions = localStorage.getItem('wmh_sessions');
                  const existingSessions = storedSessions ? JSON.parse(storedSessions) : [];
                  const hasExistingSession = existingSessions.some((s: any) => s.user.id === session.user.id);
                  
                  if (!hasExistingSession) {
                    console.log('🔐 Auth state change: adding new session for user:', session.user.email);
                    await addSession(session.user, session);
                  }
                } catch (error) {
                  console.error('🔐 Error in deferred session addition:', error);
                }
              }, 0);
            } else if (event === 'SIGNED_OUT') {
              // Handle sign out events by cleaning up any orphaned sessions
              setTimeout(() => {
                try {
                  const storedSessions = localStorage.getItem('wmh_sessions');
                  if (storedSessions) {
                    const sessionData = JSON.parse(storedSessions);
                    // Check if any stored sessions are still valid
                    if (sessionData.length > 0 && !session) {
                      console.log('🔐 Cleaning up orphaned sessions after sign out');
                      localStorage.removeItem('wmh_sessions');
                      localStorage.removeItem('wmh_active_session');
                    }
                  }
                } catch (error) {
                  console.error('🔐 Error cleaning up after sign out:', error);
                }
              }, 0);
            }
          }
        );
        
        authSubscription = subscription;

        // Then check for existing session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('🔐 Error getting session:', sessionError);
          // Clear any corrupted session data
          localStorage.removeItem('wmh_sessions');
          localStorage.removeItem('wmh_active_session');
        } else if (session?.user) {
          const storedSessions = localStorage.getItem('wmh_sessions');
          const existingSessions = storedSessions ? JSON.parse(storedSessions) : [];
          
          if (existingSessions.length === 0) {
            console.log('🔐 Initializing auth with existing session for user:', session.user.email);
            await addSession(session.user, session);
          }
        }
        
      } catch (error: any) {
        console.error('Error initializing auth:', error);
        
        // If auth initialization fails completely, clear all auth data
        if (error?.message?.includes('Failed to fetch') || 
            error?.message?.includes('session_not_found')) {
          console.log('🔐 Clearing corrupted auth state due to initialization error');
          localStorage.removeItem('wmh_sessions');
          localStorage.removeItem('wmh_active_session');
          
          // Clear any auth-related storage keys
          Object.keys(localStorage).forEach(key => {
            if (key.startsWith('wmh_session_') || key.startsWith('sb-')) {
              localStorage.removeItem(key);
            }
          });
        }
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
    
    return () => {
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
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
        console.log('🔐 Sign in successful, session ID:', sessionId);
        return { data, error: null };
      }

      return { data, error: null };
    } catch (error: any) {
      console.error('🔐 Sign in error:', error);
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
        console.log('🔐 Sign up successful, session ID:', sessionId);
      }

      return { data, error: null };
    } catch (error: any) {
      console.error('🔐 Sign up error:', error);
      return { data: null, error };
    } finally {
      setIsLoading(false);
    }
  }, [addSession]);

  const signOut = useCallback(async (sessionId?: string) => {
    const targetSessionId = sessionId || activeSessionId;
    if (!targetSessionId) return;

    const session = sessions.find(s => s.id === targetSessionId);
    if (!session) {
      // Session already removed, just clean up local state
      removeSession(targetSessionId);
      return;
    }

    try {
      // Check if session is still valid before attempting sign out
      const { error: userError } = await session.supabaseClient.auth.getUser();
      
      if (userError && (userError.message.includes('session_not_found') || userError.message.includes('Session not found'))) {
        // Session is already invalid on server, just clean up locally
        console.log('🔐 Session already invalid on server, cleaning up locally:', targetSessionId);
        removeSession(targetSessionId);
        return;
      }
      
      // Session is valid, attempt proper sign out
      await session.supabaseClient.auth.signOut();
      removeSession(targetSessionId);
      console.log('🔐 Signed out session:', targetSessionId);
    } catch (error: any) {
      console.error('🔐 Sign out error:', error);
      
      // If sign out failed due to invalid session, clean up anyway
      if (error?.message?.includes('session_not_found') || 
          error?.message?.includes('Session not found') ||
          error?.message?.includes('Failed to fetch')) {
        console.log('🔐 Cleaning up invalid session after sign out error:', targetSessionId);
        removeSession(targetSessionId);
      }
    }
  }, [activeSessionId, sessions, removeSession]);

  const signOutAll = useCallback(async () => {
    try {
      // Attempt to sign out all valid sessions, but don't fail if some are invalid
      const signOutPromises = sessions.map(async (session) => {
        try {
          const { error: userError } = await session.supabaseClient.auth.getUser();
          if (!userError) {
            await session.supabaseClient.auth.signOut();
          }
        } catch (error: any) {
          // Log but don't fail - session might already be invalid
          console.log('🔐 Session already invalid during sign out all:', session.id);
        }
      });
      
      await Promise.allSettled(signOutPromises);
      clearAllSessions();
      navigate('/');
      console.log('🔐 Signed out all sessions');
    } catch (error) {
      console.error('🔐 Sign out all error:', error);
      // Force cleanup even if sign out failed
      clearAllSessions();
      navigate('/');
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
            console.warn('🔐 Session validation failed after switch:', sessionId);
          }
        } catch (error) {
          console.error('🔐 Session validation error:', error);
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
      console.error('Error fetching user profile:', error);
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
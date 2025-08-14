import { useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { useSessionManager } from '@/contexts/SessionManagerContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useSessionValidation } from '@/hooks/useSessionValidation';
import { useSimpleAuth } from '@/hooks/useSimpleAuth';
import { validateSessionIntegrity, clearCorruptedSessions } from '@/utils/sessionCleanup';

export const useMultiUserAuth = () => {
  // Check session integrity first - if corrupted, fall back to simple auth
  const isSessionValid = validateSessionIntegrity();
  const simpleAuth = useSimpleAuth();
  
  // Get session manager with safety check
  let sessionManager;
  try {
    sessionManager = useSessionManager();
  } catch (error) {
    console.warn('🔐 SessionManager not available, falling back to simple auth');
    return {
      ...simpleAuth,
      // Add multi-user specific methods that redirect to simple auth
      switchToSession: () => {},
      signOutAll: simpleAuth.signOut,
      fetchUserProfile: async () => null,
      hasMultipleSessions: false,
      sessionCount: simpleAuth.user ? 1 : 0,
      userProfile: null,
      getCurrentSession: () => simpleAuth.activeSession,
      getCurrentUser: () => simpleAuth.user,
      getCurrentUserProfile: () => null,
      getSupabaseClient: () => simpleAuth.supabaseClient
    };
  }
  
  const {
    sessions = [],
    activeSession,
    activeSessionId,
    addSession,
    removeSession,
    switchToSession,
    clearAllSessions,
    getSessionClient,
    updateSessionProfile
  } = sessionManager;
  
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { validateSession } = useSessionValidation();
  
  // If session integrity is compromised or addSession is not available, use simple auth for login
  if (!isSessionValid || !addSession || (!sessions.length && !simpleAuth.user)) {
    console.log('🔐 MULTI-USER AUTH: Using simple auth due to integrity issues or context not ready');
    return {
      ...simpleAuth,
      // Add multi-user specific methods that redirect to simple auth
      switchToSession: () => {},
      signOutAll: simpleAuth.signOut,
      fetchUserProfile: async () => null,
      hasMultipleSessions: false,
      sessionCount: simpleAuth.user ? 1 : 0,
      userProfile: null,
      getCurrentSession: () => simpleAuth.activeSession,
      getCurrentUser: () => simpleAuth.user,
      getCurrentUserProfile: () => null,
      getSupabaseClient: () => simpleAuth.supabaseClient
    };
  }

  // Initialize by checking for existing session with recovery
  useEffect(() => {
    // Guard against missing addSession function
    if (!addSession) {
      console.warn('🔐 MULTI-USER AUTH: addSession not available, skipping initialization');
      setIsLoading(false);
      return;
    }
    
    let initialized = false;
    let authSubscription: any = null;
    
    const initializeAuth = async () => {
      if (initialized) return;
      initialized = true;
      
      try {
        // Check session integrity first
        if (!validateSessionIntegrity()) {
          console.warn('🔐 Session integrity check failed, clearing corrupted data');
          clearCorruptedSessions();
        }
        
        // Set up auth state listener first - stable callback without dependencies
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
              // Use a separate check to avoid dependency on sessions array
              const storedSessions = localStorage.getItem('wmh_sessions');
              const existingSessions = storedSessions ? JSON.parse(storedSessions) : [];
              const hasExistingSession = existingSessions.some((s: any) => s.user.id === session.user.id);
              
              if (!hasExistingSession) {
                console.log('🔐 Auth state change: adding new session for user:', session.user.email);
                try {
                  if (addSession && typeof addSession === 'function') {
                    await addSession(session.user, session);
                  } else {
                    console.error('🔐 addSession is not available or not a function');
                  }
                } catch (error) {
                  console.error('🔐 Error adding session during auth state change:', error);
                  // Fallback: clear corrupted data
                  clearCorruptedSessions();
                }
              }
            }
          }
        );
        
        authSubscription = subscription;

        // Then check for existing session with error handling
        try {
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error('🔐 Error getting session:', error);
            clearCorruptedSessions();
          } else if (session?.user) {
            const storedSessions = localStorage.getItem('wmh_sessions');
            const existingSessions = storedSessions ? JSON.parse(storedSessions) : [];
            
            if (existingSessions.length === 0) {
              console.log('🔐 Initializing auth with existing session for user:', session.user.email);
              try {
                if (addSession && typeof addSession === 'function') {
                  await addSession(session.user, session);
                } else {
                  console.error('🔐 addSession is not available during initialization');
                }
              } catch (error) {
                console.error('🔐 Error adding session during initialization:', error);
                clearCorruptedSessions();
              }
            }
          }
        } catch (error) {
          console.error('🔐 Session retrieval failed:', error);
          clearCorruptedSessions();
        }
        
      } catch (error) {
        console.error('Error initializing auth:', error);
        clearCorruptedSessions();
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
  }, [addSession].filter(Boolean)); // Filter out undefined dependencies

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
    if (!session) return;

    try {
      // Sign out from the specific session's client
      await session.supabaseClient.auth.signOut();
      removeSession(targetSessionId);
      console.log('🔐 Signed out session:', targetSessionId);
    } catch (error) {
      console.error('🔐 Sign out error:', error);
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
      console.log('🔐 Signed out all sessions');
    } catch (error) {
      console.error('🔐 Sign out all error:', error);
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
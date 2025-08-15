import { useState, useEffect, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { useSessionManager } from '@/contexts/SessionManagerContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useOptimizedSessionValidation } from '@/hooks/useOptimizedSessionValidation';
import { useSimpleAuth } from '@/hooks/useSimpleAuth';
import { validateSessionIntegrity, clearCorruptedSessions, detectAndClearStaleSession } from '@/utils/sessionCleanup';

export const useMultiUserAuth = () => {
  // Get session manager with safety check - no fallback to prevent conflicts
  let sessionManager;
  try {
    sessionManager = useSessionManager();
  } catch (error) {
    console.warn('🔐 SessionManager not available, using fallback');
    // Return minimal fallback without competing auth systems
    return {
      user: null,
      session: null,
      userProfile: null,
      isLoading: false,
      sessions: [],
      activeSession: null,
      activeSessionId: null,
      signIn: async () => ({ data: null, error: new Error('Session manager not available') }),
      signUp: async () => ({ data: null, error: new Error('Session manager not available') }),
      signOut: async () => {},
      signOutAll: async () => {},
      switchToSession: () => {},
      fetchUserProfile: async () => null,
      hasMultipleSessions: false,
      sessionCount: 0,
      supabaseClient: supabase
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
  const { validateSession } = useOptimizedSessionValidation();
  
  // Only fallback to simple auth if there's no context at all - be more permissive for initialization
  if (!sessionManager || !addSession) {
    console.log('🔐 MULTI-USER AUTH: SessionManager not ready, initializing...');
    // Don't immediately fallback - let the initialization process complete
    setIsLoading(true);
  }

  // Circuit breaker for preventing rapid auth operations
  const authOperationInProgress = useRef(false);
  const lastAuthEventTime = useRef(0);
  const authEventDebounceMs = 1000; // 1 second debounce

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
        console.log('🔐 MULTI-USER AUTH: Initializing authentication...');
        
        // Perform stale session detection and cleanup before initialization
        const hasValidSession = await detectAndClearStaleSession();
        
        if (!hasValidSession) {
          console.log('🔐 MULTI-USER AUTH: Stale sessions cleared, continuing with fresh state');
        }
        
        // Set up auth state listener with improved debouncing
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          (event, session) => {
            const now = Date.now();
            
            // Improved circuit breaker: only block rapid identical events
            if (authOperationInProgress.current && event !== 'TOKEN_REFRESHED') {
              console.log('🔐 Auth operation in progress, skipping:', event);
              return;
            }
            
            // Allow token refresh events through
            if (event === 'TOKEN_REFRESHED') {
              return;
            }
            
            // Debounce only for non-critical events
            if (event !== 'SIGNED_IN' && event !== 'SIGNED_OUT' && 
                now - lastAuthEventTime.current < authEventDebounceMs) {
              console.log('🔐 Auth event debounced, skipping:', event);
              return;
            }
            
            lastAuthEventTime.current = now;
            
            // Handle SIGNED_OUT to properly clear sessions
            if (event === 'SIGNED_OUT') {
              console.log('🔐 Auth state change: user signed out');
              authOperationInProgress.current = true;
              
              // Use immediate cleanup instead of setTimeout to prevent race conditions
              try {
                localStorage.removeItem('wmh_sessions');
                localStorage.removeItem('wmh_active_session');
                console.log('🔐 Cleared session storage on sign out');
              } catch (error) {
                console.error('🔐 Error clearing session storage:', error);
              } finally {
                authOperationInProgress.current = false;
              }
              return;
            }
            
            if (event === 'SIGNED_IN' && session?.user) {
              authOperationInProgress.current = true;
              
              // Check if session already exists BEFORE attempting to add
              const storedSessions = localStorage.getItem('wmh_sessions');
              const existingSessions = storedSessions ? JSON.parse(storedSessions) : [];
              const hasExistingSession = existingSessions.some((s: any) => s.user.id === session.user.id);
              
              if (hasExistingSession) {
                console.log('🔐 Session already exists for user, skipping add:', session.user.email);
                authOperationInProgress.current = false;
                return;
              }
              
              // Use setTimeout to defer Supabase calls and prevent deadlock
              setTimeout(async () => {
                try {
                  if (addSession && typeof addSession === 'function') {
                    console.log('🔐 Auth state change: adding new session for user:', session.user.email);
                    await addSession(session.user, session);
                  }
                } catch (error) {
                  console.error('🔐 Error adding session during auth state change:', error);
                  clearCorruptedSessions();
                } finally {
                  authOperationInProgress.current = false;
                }
              }, 100); // Slight delay to ensure DOM is ready
            }
          }
        );
        
        // CRITICAL: Assign the subscription object to prevent null reference error
        authSubscription = subscription;

        // Then check for existing session with error handling - only after cleanup
        try {
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error('🔐 Error getting session:', error);
            // Clear corrupted sessions if there's an auth error
            if (error.message?.includes('invalid') || error.message?.includes('expired')) {
              clearCorruptedSessions();
            }
          } else if (session?.user) {
            const storedSessions = localStorage.getItem('wmh_sessions');
            const existingSessions = storedSessions ? JSON.parse(storedSessions) : [];
            
            if (existingSessions.length === 0 && addSession && typeof addSession === 'function') {
              console.log('🔐 Initializing auth with existing session for user:', session.user.email);
              try {
                authOperationInProgress.current = true;
                await addSession(session.user, session);
                } catch (error) {
                  console.error('🔐 Error adding session during initialization:', error);
                  // Clear sessions on initialization error to prevent loops
                  clearCorruptedSessions();
                } finally {
                authOperationInProgress.current = false;
              }
            }
          }
        } catch (error) {
          console.error('🔐 Session retrieval failed:', error);
          // Clear sessions on critical retrieval failure
          clearCorruptedSessions();
        }
        
      } catch (error) {
        console.error('Error initializing auth:', error);
        // Clear sessions on any critical initialization failure
        clearCorruptedSessions();
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
    
    return () => {
      // Add null check to prevent "Cannot read properties of null" error
      if (authSubscription && typeof authSubscription.unsubscribe === 'function') {
        authSubscription.unsubscribe();
      }
      // Reset circuit breaker on cleanup
      authOperationInProgress.current = false;
    };
  }, []); // Remove addSession dependency to prevent re-initialization loops

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
      // Set circuit breaker to prevent interference during logout
      authOperationInProgress.current = true;
      
      // Sign out from the specific session's client
      await session.supabaseClient.auth.signOut();
      removeSession(targetSessionId);
      console.log('🔐 Signed out session:', targetSessionId);
      
      // Clear circuit breaker after successful logout
      setTimeout(() => {
        authOperationInProgress.current = false;
      }, 1000); // Give 1 second buffer
      
    } catch (error) {
      console.error('🔐 Sign out error:', error);
      authOperationInProgress.current = false;
    }
  }, [activeSessionId, sessions, removeSession]);

  const signOutAll = useCallback(async () => {
    try {
      // Set circuit breaker to prevent interference during logout
      authOperationInProgress.current = true;
      
      // Sign out all sessions
      await Promise.all(sessions.map(session => 
        session.supabaseClient.auth.signOut()
      ));
      clearAllSessions();
      navigate('/');
      console.log('🔐 Signed out all sessions');
      
      // Clear circuit breaker after successful logout
      setTimeout(() => {
        authOperationInProgress.current = false;
      }, 1000); // Give 1 second buffer
      
    } catch (error) {
      console.error('🔐 Sign out all error:', error);
      authOperationInProgress.current = false;
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
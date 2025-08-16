import { useState, useEffect, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { useSingleClientSessionManager } from '@/contexts/SingleClientSessionManager';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useOptimizedSessionValidation } from '@/hooks/useOptimizedSessionValidation';
import { useTokenRefresh } from '@/hooks/useTokenRefresh';
import { validateSessionIntegrity, clearCorruptedSessions, detectAndClearStaleSession } from '@/utils/sessionCleanup';
import { logger } from '@/utils/logger';

export const useMultiUserAuth = () => {
  // Get single client session manager
  let sessionManager;
  try {
    sessionManager = useSingleClientSessionManager();
  } catch (error) {
    logger.warn('🔐 SingleClientSessionManager not available, using fallback');
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
    updateSessionProfile,
    isTokenRefreshing
  } = sessionManager;
  
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { validateSession } = useOptimizedSessionValidation();
  const { handleTokenRefreshError, silentRefresh } = useTokenRefresh();
  
  // Circuit breaker for preventing rapid auth operations
  const authOperationInProgress = useRef(false);
  const lastAuthEventTime = useRef(0);
  const authEventDebounceMs = 1000; // 1 second debounce

  // Initialize by checking for existing session with recovery
  useEffect(() => {
    // Guard against missing addSession function
    if (!addSession) {
      logger.warn('🔐 MULTI-USER AUTH: addSession not available, skipping initialization');
      setIsLoading(false);
      return;
    }
    
    let initialized = false;
    let authSubscription: any = null;
    
    const initializeAuth = async () => {
      if (initialized) return;
      initialized = true;
      
      try {
        logger.log('🔐 MULTI-USER AUTH: Initializing authentication...');
        
        // Only perform stale session detection on initial mount, not on every re-render
        const shouldCheckStale = !sessionStorage.getItem('auth_initialized');
        if (shouldCheckStale) {
          sessionStorage.setItem('auth_initialized', 'true');
          const hasValidSession = await detectAndClearStaleSession();
          
          if (!hasValidSession) {
            logger.log('🔐 MULTI-USER AUTH: Stale sessions cleared, continuing with fresh state');
          }
        }
        
        // Set up auth state listener with improved error handling
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            const now = Date.now();
            
            logger.debug('🔐 Auth state change:', { event, hasSession: !!session });
            
            // Improved circuit breaker: only block rapid identical events
            if (authOperationInProgress.current && event !== 'TOKEN_REFRESHED') {
              logger.debug('🔐 Auth operation in progress, skipping:', event);
              return;
            }
            
            // Handle token refresh events with better error handling
            if (event === 'TOKEN_REFRESHED') {
              logger.log('🔐 Token refreshed successfully');
              return;
            }
            
            // Debounce only for non-critical events
            if (event !== 'SIGNED_IN' && event !== 'SIGNED_OUT' && 
                now - lastAuthEventTime.current < authEventDebounceMs) {
              logger.debug('🔐 Auth event debounced, skipping:', event);
              return;
            }
            
            lastAuthEventTime.current = now;
            
            // Handle SIGNED_OUT
            if (event === 'SIGNED_OUT') {
              logger.log('🔐 Auth state change: user signed out');
              authOperationInProgress.current = true;
              
              try {
                localStorage.removeItem('wmh_sessions');
                localStorage.removeItem('wmh_active_session');
                logger.log('🔐 Cleared session storage on sign out');
              } catch (error) {
                logger.error('🔐 Error clearing session storage:', error);
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
                logger.log('🔐 Session already exists for user, skipping add:', session.user.email);
                authOperationInProgress.current = false;
                return;
              }
              
              // Use setTimeout to defer Supabase calls and prevent deadlock
              setTimeout(async () => {
                try {
                  if (addSession && typeof addSession === 'function') {
                    logger.log('🔐 Auth state change: adding new session for user:', session.user.email);
                    await addSession(session.user, session);
                  }
                } catch (error) {
                  logger.error('🔐 Error adding session during auth state change:', error);
                  // Only clear on critical errors, not network issues
                  if (error?.message?.includes('invalid') || error?.message?.includes('expired')) {
                    clearCorruptedSessions();
                  }
                } finally {
                  authOperationInProgress.current = false;
                }
              }, 100);
            }
          }
        );
        
        // CRITICAL: Assign the subscription object to prevent null reference error
        authSubscription = subscription;

        // Then check for existing session with better error handling
        try {
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (error) {
            logger.error('🔐 Error getting session:', error);
            // Only clear on confirmed auth issues, not network errors
            if (error.message?.includes('invalid') || error.message?.includes('expired')) {
              clearCorruptedSessions();
            } else {
              logger.warn('🔐 Session retrieval error, but not clearing sessions:', error.message);
            }
          } else if (session?.user) {
            const storedSessions = localStorage.getItem('wmh_sessions');
            const existingSessions = storedSessions ? JSON.parse(storedSessions) : [];
            
            if (existingSessions.length === 0 && addSession && typeof addSession === 'function') {
              logger.log('🔐 Initializing auth with existing session for user:', session.user.email);
              try {
                authOperationInProgress.current = true;
                await addSession(session.user, session);
              } catch (error) {
                logger.error('🔐 Error adding session during initialization:', error);
                // Only clear on critical initialization errors
                if (error?.message?.includes('invalid') || error?.message?.includes('expired')) {
                  clearCorruptedSessions();
                }
              } finally {
                authOperationInProgress.current = false;
              }
            }
          }
        } catch (error) {
          logger.error('🔐 Session retrieval failed:', error);
          // Only clear on critical retrieval failures
          if (error?.message?.includes('invalid') || error?.message?.includes('expired')) {
            clearCorruptedSessions();
          }
        }
        
      } catch (error) {
        logger.error('Error initializing auth:', error);
        // Only clear on critical initialization failures
        if (error?.message?.includes('invalid') || error?.message?.includes('expired')) {
          clearCorruptedSessions();
        }
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
    
    return () => {
      if (authSubscription && typeof authSubscription.unsubscribe === 'function') {
        authSubscription.unsubscribe();
      }
      authOperationInProgress.current = false;
    };
  }, [addSession]); // Reduced dependencies to prevent re-initialization loops

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
        logger.log('🔐 Sign in successful, session ID:', sessionId);
        return { data, error: null };
      }

      return { data, error: null };
    } catch (error: any) {
      logger.error('🔐 Sign in error:', error);
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
        logger.log('🔐 Sign up successful, session ID:', sessionId);
      }

      return { data, error: null };
    } catch (error: any) {
      logger.error('🔐 Sign up error:', error);
      return { data: null, error };
    } finally {
      setIsLoading(false);
    }
  }, [addSession]);

  const signOut = useCallback(async (sessionId?: string) => {
    try {
      logger.log('🔐 Starting sign out process...');
      authOperationInProgress.current = true;

      // Clear session storage
      try {
        localStorage.removeItem('sb-vgdreuwmisludqxphsph-auth-token');
        localStorage.removeItem('supabase-sessions');
        sessionStorage.clear();
      } catch (e) {
        logger.warn('🔐 Error clearing storage:', e);
      }

      // Sign out from Supabase (single client now)
      await supabase.auth.signOut();
      
      // Clear session state
      const targetSessionId = sessionId || activeSessionId;
      if (removeSession && targetSessionId) {
        removeSession(targetSessionId);
      } else if (clearAllSessions) {
        clearAllSessions();
      }
      
      logger.log('🔐 Sign out completed');
      authOperationInProgress.current = false;
      navigate('/');
      
    } catch (error) {
      logger.error('🔐 Sign out error:', error);
      authOperationInProgress.current = false;
      
      // Force clear on error
      try {
        localStorage.removeItem('sb-vgdreuwmisludqxphsph-auth-token');
        localStorage.removeItem('supabase-sessions');
        sessionStorage.clear();
        if (clearAllSessions) clearAllSessions();
      } catch (e) {
        logger.warn('🔐 Error force clearing:', e);
      }
      navigate('/');
    }
  }, [activeSessionId, removeSession, clearAllSessions, navigate]);

  const signOutAll = useCallback(async () => {
    try {
      logger.log('🔐 Starting sign out all process...');
      authOperationInProgress.current = true;
      
      // Clear session storage
      try {
        localStorage.removeItem('sb-vgdreuwmisludqxphsph-auth-token');
        localStorage.removeItem('supabase-sessions');
        sessionStorage.clear();
      } catch (e) {
        logger.warn('🔐 Error clearing storage:', e);
      }

      // Sign out from single client
      await supabase.auth.signOut();
      
      // Clear all sessions
      if (clearAllSessions) {
        clearAllSessions();
      }
      
      logger.log('🔐 Signed out all sessions');
      authOperationInProgress.current = false;
      navigate('/');
      
    } catch (error) {
      logger.error('🔐 Sign out all error:', error);
      authOperationInProgress.current = false;
      
      // Force clear on error
      try {
        localStorage.removeItem('sb-vgdreuwmisludqxphsph-auth-token');
        localStorage.removeItem('supabase-sessions');
        sessionStorage.clear();
        if (clearAllSessions) clearAllSessions();
      } catch (e) {
        logger.warn('🔐 Error force clearing:', e);
      }
      navigate('/');
    }
  }, [clearAllSessions, navigate]);

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
            logger.warn('🔐 Session validation failed after switch:', sessionId);
          }
        } catch (error) {
          logger.error('🔐 Session validation error:', error);
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
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('user_id', session.user.id)
        .single();

      if (profile) {
        updateSessionProfile(targetSessionId, profile);
      }

      return profile;
    } catch (error) {
      logger.error('Error fetching user profile:', error);
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
    return supabase; // Always use the single client
  }, []);

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
    sessionCount: sessions.length,
    isTokenRefreshing
  };
};
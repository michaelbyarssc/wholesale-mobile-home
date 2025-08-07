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

  const fetchUserProfile = useCallback(async (sessionId?: string) => {
    const targetSessionId = sessionId || activeSessionId;
    console.log('🔍 DEBUG: fetchUserProfile called with sessionId:', sessionId, 'targetSessionId:', targetSessionId);
    
    if (!targetSessionId) {
      console.log('🔍 DEBUG: No targetSessionId, returning null');
      return null;
    }

    const session = sessions.find(s => s.id === targetSessionId);
    if (!session) {
      console.log('🔍 DEBUG: No session found for ID:', targetSessionId);
      return null;
    }

    console.log('🔍 DEBUG: Found session for user:', session.user.email, 'with ID:', session.user.id);

    try {
      console.log('🔍 DEBUG: Querying profiles table for user_id:', session.user.id);
      
      const { data: profile, error } = await session.supabaseClient
        .from('profiles')
        .select('first_name, last_name')
        .eq('user_id', session.user.id)
        .single();

      console.log('🔍 DEBUG: Database query result - profile:', profile, 'error:', error);

      if (error) {
        console.error('🔍 DEBUG: Database error:', error);
        return null;
      }

      if (profile) {
        console.log('🔍 DEBUG: Profile found, calling updateSessionProfile with:', profile);
        updateSessionProfile(targetSessionId, profile);
        console.log('🔍 DEBUG: updateSessionProfile called successfully');
      } else {
        console.log('🔍 DEBUG: No profile data returned from database');
      }

      return profile;
    } catch (error) {
      console.error('🔍 DEBUG: Exception in fetchUserProfile:', error);
      return null;
    }
  }, [activeSessionId, sessions, updateSessionProfile]);

  // Initialize by checking for existing session with StrictMode protection
  useEffect(() => {
    let initialized = false;
    let authSubscription: any = null;
    
    const initializeAuth = async () => {
      if (initialized) {
        console.log('🔒 Preventing duplicate auth initialization (StrictMode protection)');
        return;
      }
      initialized = true;
      
      try {
        console.log('🔐 Initializing multi-user auth with StrictMode protection...');
        
        // Set up auth state listener with enhanced debouncing
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          (event, session) => {
            console.log('🔐 Auth state change:', event, session?.user?.email);
            
            // Enhanced debounce with queue management to prevent rapid session creation
            const authEventKey = `auth_${event}_${session?.user?.id || 'none'}`;
            
            // Clear any existing timeout for this auth event
            if ((window as any)[authEventKey]) {
              clearTimeout((window as any)[authEventKey]);
            }
            
            (window as any)[authEventKey] = setTimeout(async () => {
              if (event === 'SIGNED_IN' && session?.user) {
                try {
                  // Additional check to prevent creating session if one already exists
                  const existingSession = sessions.find(s => s.user.id === session.user.id);
                  if (!existingSession) {
            const sessionId = await addSession(session.user, session);
            // Fetch profile for new session immediately
            console.log('🔍 DEBUG: New session added via auth change, fetching profile');
            fetchUserProfile(sessionId);
                  } else {
                    console.log('🔐 Session already exists for user, skipping creation');
                  }
                } catch (error) {
                  console.error('🔐 Error adding session on auth change:', error);
                }
              } else if (event === 'SIGNED_OUT') {
                console.log('🔐 User signed out via auth change');
              }
              
              delete (window as any)[authEventKey];
            }, 750); // Increased debounce for StrictMode
          }
        );
        
        authSubscription = subscription;

        // Then check for existing session
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const storedSessions = localStorage.getItem('wmh_sessions');
          const existingSessions = storedSessions ? JSON.parse(storedSessions) : [];
          
          // Only add if no sessions exist AND no runtime sessions exist
          if (existingSessions.length === 0 && sessions.length === 0) {
            console.log('🔐 Initializing auth with existing session for user:', session.user.email);
            const sessionId = await addSession(session.user, session);
            // Fetch profile for initialized session immediately
            console.log('🔍 DEBUG: Initializing session, fetching profile');
            fetchUserProfile(sessionId);
          } else {
            console.log('🔐 Sessions already exist, skipping initialization');
          }
        }
        
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
    
    return () => {
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
      initialized = false;
    };
  }, [addSession, sessions, fetchUserProfile]); // Added fetchUserProfile dependency

  // Auto-fetch profiles when activeSession changes or sessions are loaded
  useEffect(() => {
    console.log('🔍 DEBUG: useEffect triggered - activeSession:', activeSession?.user?.email, 'userProfile:', activeSession?.userProfile);
    
    if (activeSession && !activeSession.userProfile) {
      console.log('🔍 DEBUG: Active session found without profile, fetching profile...');
      fetchUserProfile(activeSessionId!);
    } else if (activeSession?.userProfile) {
      console.log('🔍 DEBUG: Active session already has profile:', activeSession.userProfile);
    }
  }, [activeSession, activeSessionId, fetchUserProfile]);

  // Auto-fetch profiles for any sessions missing profile data
  useEffect(() => {
    console.log('🔍 DEBUG: Checking all sessions for missing profiles. Total sessions:', sessions.length);
    
    sessions.forEach(session => {
      if (!session.userProfile) {
        console.log('🔍 DEBUG: Session missing profile:', session.user.email, 'fetching...');
        // Make profile fetching more immediate
        fetchUserProfile(session.id);
      } else {
        console.log('🔍 DEBUG: Session has profile:', session.user.email, session.userProfile);
      }
    });
  }, [sessions, fetchUserProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      if (data.user && data.session) {
        try {
          const sessionId = await addSession(data.user, data.session);
          console.log('🔐 Sign in successful, session ID:', sessionId);
          // Fetch profile immediately after successful sign in
          console.log('🔍 DEBUG: Fetching profile immediately after sign in');
          fetchUserProfile(sessionId);
          return { data, error: null };
        } catch (sessionError: any) {
          if (sessionError.message?.includes('Session creation is temporarily locked')) {
            return { data: null, error: { message: 'Please wait a moment and try again.' } };
          }
          throw sessionError;
        }
      }

      return { data, error: null };
    } catch (error: any) {
      console.error('🔐 Sign in error:', error);
      return { data: null, error };
    } finally {
      setIsLoading(false);
    }
  }, [addSession, fetchUserProfile]);

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
        // Fetch profile immediately after successful sign up
        console.log('🔍 DEBUG: Fetching profile immediately after sign up');
        fetchUserProfile(sessionId);
      }

      return { data, error: null };
    } catch (error: any) {
      console.error('🔐 Sign up error:', error);
      return { data: null, error };
    } finally {
      setIsLoading(false);
    }
  }, [addSession, fetchUserProfile]);

  const signOut = useCallback(async (sessionId?: string) => {
    const targetSessionId = sessionId || activeSessionId;
    if (!targetSessionId) {
      console.warn('🔐 No session to sign out');
      return;
    }

    const session = sessions.find(s => s.id === targetSessionId);
    if (!session) {
      console.warn('🔐 Session not found for logout:', targetSessionId);
      return;
    }

    console.log('🚨 SIGN OUT: Starting logout for session:', targetSessionId, 'user:', session.user.email);
    
    try {
      // Set logout state immediately to show feedback
      setIsLoading(true);
      
      console.log('🚨 SIGN OUT: Step 1 - Calling Supabase auth.signOut()');
      
      // Force client logout with reduced timeout
      const logoutPromise = session.supabaseClient.auth.signOut();
      const timeoutPromise = new Promise((resolve) => 
        setTimeout(() => {
          console.warn('🚨 SIGN OUT: Timeout reached, proceeding with cleanup');
          resolve(null);
        }, 2000) // Reduced to 2 seconds
      );
      
      await Promise.race([logoutPromise, timeoutPromise]);
      console.log('🚨 SIGN OUT: Step 2 - Supabase logout completed or timed out');
      
      // Remove session from state immediately
      console.log('🚨 SIGN OUT: Step 3 - Removing session from state');
      removeSession(targetSessionId);
      
      console.log('🚨 SIGN OUT: Step 4 - Session removed successfully:', targetSessionId);
      
      // Force page reload after a short delay to ensure complete cleanup
      setTimeout(() => {
        console.log('🚨 SIGN OUT: Step 5 - Forcing page reload for complete state cleanup');
        window.location.reload();
      }, 500);
      
    } catch (error) {
      console.error('🚨 SIGN OUT ERROR: Forcing emergency cleanup:', error);
      // Force cleanup even if logout fails
      removeSession(targetSessionId);
      
      // Emergency page reload
      setTimeout(() => {
        console.log('🚨 EMERGENCY: Forcing page reload due to sign out error');
        window.location.reload();
      }, 100);
    } finally {
      setIsLoading(false);
    }
  }, [activeSessionId, sessions, removeSession]);

  const signOutAll = useCallback(async () => {
    console.log('🚨 SIGN OUT ALL: Starting logout for', sessions.length, 'sessions');
    
    try {
      setIsLoading(true);
      
      console.log('🚨 SIGN OUT ALL: Step 1 - Calling logout for all sessions');
      
      // Force logout all clients with reduced timeout
      const logoutPromises = sessions.map((session, index) => {
        console.log(`🚨 SIGN OUT ALL: Logging out session ${index + 1}/${sessions.length} - ${session.user.email}`);
        return Promise.race([
          session.supabaseClient.auth.signOut(),
          new Promise(resolve => setTimeout(resolve, 1500)) // 1.5s timeout per session
        ]);
      });
      
      await Promise.allSettled(logoutPromises);
      console.log('🚨 SIGN OUT ALL: Step 2 - All logout promises settled');
      
      // Clear all sessions immediately
      console.log('🚨 SIGN OUT ALL: Step 3 - Clearing all sessions from state');
      clearAllSessions();
      
      // Clear all localStorage data immediately
      console.log('🚨 SIGN OUT ALL: Step 4 - Clearing localStorage');
      try {
        localStorage.removeItem('wmh_sessions');
        localStorage.removeItem('wmh_active_session');
        // Clear any auth tokens
        Object.keys(localStorage).forEach(key => {
          if (key.includes('sb-') || key.includes('auth-token')) {
            localStorage.removeItem(key);
          }
        });
      } catch (storageError) {
        console.error('🚨 SIGN OUT ALL: Storage cleanup error:', storageError);
      }
      
      // Force page reload immediately for complete cleanup
      console.log('🚨 SIGN OUT ALL: Step 5 - Forcing immediate page reload');
      window.location.href = '/';
      
    } catch (error) {
      console.error('🚨 SIGN OUT ALL ERROR: Forcing emergency cleanup:', error);
      // Emergency cleanup - clear everything and reload
      clearAllSessions();
      try {
        localStorage.clear();
      } catch (clearError) {
        console.error('🚨 EMERGENCY: Failed to clear localStorage:', clearError);
      }
      window.location.href = '/';
    }
  }, [sessions, clearAllSessions]);

  const switchToSessionSafe = useCallback(async (sessionId: string) => {
    // Enhanced session switching with better validation
    const session = sessions.find(s => s.id === sessionId);
    if (!session) {
      console.warn('🔐 Cannot switch to non-existent session:', sessionId);
      return;
    }

    console.log('🔐 Switching to session:', sessionId, 'for user:', session.user.email);
    
    // Switch immediately for better UX
    switchToSession(sessionId);
    
    // Fetch profile if not already loaded
    if (!session.userProfile) {
      console.log('🔍 DEBUG: Session switch - fetching profile for session:', sessionId);
      fetchUserProfile(sessionId);
    }
    
    // Validate in background with debouncing to prevent excessive calls
    const validationKey = `validation_${sessionId}`;
    if (!(window as any)[validationKey]) {
      (window as any)[validationKey] = true;
      
      setTimeout(async () => {
        try {
          const isValid = await validateSession(sessionId);
          if (!isValid) {
            console.warn('🔐 Session validation failed after switch:', sessionId);
          } else {
            console.log('🔐 Session switch validation successful:', sessionId);
          }
        } catch (error) {
          console.error('🔐 Session validation error:', error);
        } finally {
          delete (window as any)[validationKey];
        }
      }, 500); // 500ms delay for validation
    }
  }, [sessions, switchToSession, validateSession, fetchUserProfile]);


  const getCurrentSession = useCallback(() => {
    return activeSession;
  }, [activeSession]);

  const getCurrentUser = useCallback(() => {
    return activeSession?.user || null;
  }, [activeSession]);

  const getCurrentUserProfile = useCallback(() => {
    const profile = activeSession?.userProfile || null;
    console.log('🔍 DEBUG: getCurrentUserProfile called, returning:', profile);
    return profile;
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
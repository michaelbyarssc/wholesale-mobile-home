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
    console.log('🔍 PROFILE: fetchUserProfile called with sessionId:', sessionId, 'targetSessionId:', targetSessionId);
    
    if (!targetSessionId) {
      console.log('🔍 PROFILE: No targetSessionId, returning null');
      return null;
    }

    const session = sessions.find(s => s.id === targetSessionId);
    if (!session?.user?.id) {
      console.log('🔍 PROFILE: No session or user found for ID:', targetSessionId);
      return null;
    }

    try {
      console.log('🔍 AUTH CHECK: Fetching profile for user:', session.user.email, 'session:', targetSessionId);
      
      // First verify the client is properly authenticated
      const { data: authSession, error: authError } = await session.supabaseClient.auth.getSession();
      
      if (authError || !authSession?.session?.access_token) {
        console.error('❌ AUTH CHECK: Client not properly authenticated:', authError);
        
        // Try to refresh the session
        try {
          console.log('🔄 AUTH CHECK: Attempting to refresh session...');
          await session.supabaseClient.auth.setSession(session.session);
          console.log('✅ AUTH CHECK: Session refreshed successfully');
        } catch (refreshError) {
          console.error('❌ AUTH CHECK: Failed to refresh session:', refreshError);
          return null;
        }
      } else {
        console.log('✅ AUTH CHECK: Client is properly authenticated');
      }
      
      // Now attempt to fetch the profile with enhanced error logging
      console.log('🔍 PROFILE FETCH: Querying profiles table for user_id:', session.user.id);
      const { data, error } = await session.supabaseClient
        .from('profiles')
        .select('first_name, last_name, email, phone_number')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (error) {
        console.error('❌ PROFILE FETCH: Database error:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        
        // If it's an RLS error, log more details
        if (error.code === '42501' || error.message?.includes('permission denied') || error.message?.includes('RLS')) {
          console.error('❌ PROFILE FETCH: RLS Permission denied - this indicates an authentication or policy issue');
          console.error('❌ PROFILE FETCH: Current auth user ID:', authSession?.session?.user?.id);
          console.error('❌ PROFILE FETCH: Target user ID:', session.user.id);
          console.error('❌ PROFILE FETCH: Session valid:', !!authSession?.session);
        }
        
        return null;
      }

      console.log('✅ PROFILE FETCH: Profile fetched successfully:', data);
      
      if (data) {
        updateSessionProfile(targetSessionId, data);
        console.log('✅ PROFILE UPDATE: Session profile updated');
      } else {
        console.log('ℹ️ PROFILE FETCH: No profile data found for user, this may be normal for new users');
      }
      
      return data;
    } catch (error) {
      console.error('❌ PROFILE FETCH: Unexpected exception:', error);
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
        
        // Set up auth state listener with simplified logic
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          (event, session) => {
            console.log('🔐 Auth state change:', event, session?.user?.email);
            
            // Simplified timeout to prevent excessive session creation
            const authEventKey = `auth_${event}_${session?.user?.id || 'none'}`;
            
            if ((window as any)[authEventKey]) {
              clearTimeout((window as any)[authEventKey]);
            }
            
            (window as any)[authEventKey] = setTimeout(async () => {
              if (event === 'SIGNED_IN' && session?.user) {
                try {
                  const existingSession = sessions.find(s => s.user.id === session.user.id);
                  if (!existingSession) {
                    console.log('🔐 Creating new session for user:', session.user.email);
                    const sessionId = await addSession(session.user, session);
                    // Profile fetching is now non-blocking
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
            }, 500); // Reduced debounce
          }
        );
        
        authSubscription = subscription;

        // SIMPLIFIED: Check for existing session without complex conditions
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          console.log('🔐 Found existing session, checking if session exists for user:', session.user.email);
          const existingSession = sessions.find(s => s.user.id === session.user.id);
          
          if (!existingSession) {
            console.log('🔐 Initializing auth with existing session');
            const sessionId = await addSession(session.user, session);
            // Profile fetching is now non-blocking
            fetchUserProfile(sessionId);
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
  }, [addSession, sessions, fetchUserProfile]);

  // SIMPLIFIED: Auto-fetch profiles only when needed, non-blocking
  useEffect(() => {
    if (activeSession && activeSession.userProfile === undefined) {
      console.log('🔍 DEBUG: Fetching profile for active session:', activeSession.user.email);
      // Use setTimeout to make this completely non-blocking
      setTimeout(() => {
        fetchUserProfile(activeSessionId!);
      }, 100);
    }
  }, [activeSession, activeSessionId, fetchUserProfile]);

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
          // Profile fetching is now non-blocking
          setTimeout(() => fetchUserProfile(sessionId), 100);
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
        // Profile fetching is now non-blocking
        setTimeout(() => fetchUserProfile(sessionId), 100);
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

    console.log('🚨 SIGN OUT: Starting enhanced logout for session:', targetSessionId, 'user:', session.user.email);
    
    try {
      setIsLoading(true);
      
      // Step 1: Immediate localStorage cleanup for this user
      console.log('🚨 SIGN OUT: Step 1 - Immediate localStorage cleanup');
      const userId = session.user.id;
      const keysToRemove = Object.keys(localStorage).filter(key => 
        key.includes(userId) || 
        key.startsWith(`wmh_session_${userId}`) ||
        key.includes(`auth-token`) && key.includes(userId)
      );
      
      keysToRemove.forEach(key => {
        try {
          localStorage.removeItem(key);
          console.log('🚨 Removed stale key:', key);
        } catch (error) {
          console.warn('🚨 Failed to remove key:', key, error);
        }
      });
      
      // Step 2: Remove from session state immediately
      console.log('🚨 SIGN OUT: Step 2 - Removing session from state');
      removeSession(targetSessionId);
      
      // Step 3: Attempt Supabase logout with short timeout
      console.log('🚨 SIGN OUT: Step 3 - Calling Supabase auth.signOut()');
      try {
        await Promise.race([
          session.supabaseClient.auth.signOut(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Logout timeout')), 1000)
          )
        ]);
        console.log('🚨 SIGN OUT: Supabase logout completed');
      } catch (logoutError) {
        console.warn('🚨 SIGN OUT: Supabase logout failed or timed out:', logoutError);
      }
      
      // Step 4: Comprehensive cleanup
      console.log('🚨 SIGN OUT: Step 4 - Comprehensive cleanup');
      
      // Clear any remaining session artifacts
      try {
        const remainingSessions = localStorage.getItem('wmh_sessions');
        if (remainingSessions) {
          const sessions = JSON.parse(remainingSessions);
          const filteredSessions = sessions.filter((s: any) => s.user.id !== userId);
          if (filteredSessions.length !== sessions.length) {
            localStorage.setItem('wmh_sessions', JSON.stringify(filteredSessions));
            console.log('🚨 Cleaned sessions from localStorage');
          }
        }
      } catch (error) {
        console.error('🚨 Error cleaning session storage:', error);
        localStorage.removeItem('wmh_sessions');
      }
      
      // Step 5: Navigate to auth page
      console.log('🚨 SIGN OUT: Step 5 - Navigating to auth page');
      window.location.href = '/auth';
      
    } catch (error) {
      console.error('🚨 SIGN OUT ERROR: Emergency cleanup:', error);
      // Emergency cleanup
      removeSession(targetSessionId);
      
      // Clear all localStorage if needed
      try {
        localStorage.removeItem('wmh_sessions');
        localStorage.removeItem('wmh_active_session');
      } catch (clearError) {
        console.error('🚨 Emergency storage clear failed:', clearError);
      }
      
      window.location.href = '/auth';
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
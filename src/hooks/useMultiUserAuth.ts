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
        // Set up auth state listener with debouncing to prevent conflicts
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          (event, session) => {
            console.log('🔐 Auth state change:', event, session?.user?.email);
            
            // Debounce auth events to prevent rapid session creation
            setTimeout(async () => {
              if (event === 'SIGNED_IN' && session?.user) {
                try {
                  await addSession(session.user, session);
                } catch (error) {
                  console.error('🔐 Error adding session on auth change:', error);
                }
              } else if (event === 'SIGNED_OUT') {
                console.log('🔐 User signed out via auth change');
              }
            }, 500); // 500ms debounce
          }
        );
        
        authSubscription = subscription;

        // Then check for existing session
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const storedSessions = localStorage.getItem('wmh_sessions');
          const existingSessions = storedSessions ? JSON.parse(storedSessions) : [];
          
          if (existingSessions.length === 0) {
            console.log('🔐 Initializing auth with existing session for user:', session.user.email);
            await addSession(session.user, session);
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
    if (!targetSessionId) {
      console.warn('🔐 No session to sign out');
      return;
    }

    const session = sessions.find(s => s.id === targetSessionId);
    if (!session) {
      console.warn('🔐 Session not found for logout:', targetSessionId);
      return;
    }

    console.log('🔐 Starting logout for session:', targetSessionId, 'user:', session.user.email);
    
    try {
      // Set logout state to prevent interference
      setIsLoading(true);
      
      // Force client logout with timeout
      const logoutPromise = session.supabaseClient.auth.signOut();
      const timeoutPromise = new Promise((resolve) => 
        setTimeout(() => {
          console.warn('🔐 Logout timeout, proceeding with cleanup');
          resolve(null);
        }, 3000)
      );
      
      await Promise.race([logoutPromise, timeoutPromise]);
      
      // Remove session after client logout
      removeSession(targetSessionId);
      
      console.log('🔐 Successfully signed out session:', targetSessionId);
      
    } catch (error) {
      console.error('🔐 Sign out error, forcing cleanup:', error);
      // Force cleanup even if logout fails
      removeSession(targetSessionId);
    } finally {
      setIsLoading(false);
    }
  }, [activeSessionId, sessions, removeSession]);

  const signOutAll = useCallback(async () => {
    console.log('🔐 Starting sign out all for', sessions.length, 'sessions');
    
    try {
      setIsLoading(true);
      
      // Force logout all clients with timeout
      const logoutPromises = sessions.map(session => 
        Promise.race([
          session.supabaseClient.auth.signOut(),
          new Promise(resolve => setTimeout(resolve, 2000)) // 2s timeout per session
        ])
      );
      
      await Promise.allSettled(logoutPromises);
      
      // Clear all sessions and force page reload for complete cleanup
      clearAllSessions();
      
      // Force page reload to clear all state
      setTimeout(() => {
        window.location.href = '/';
      }, 100);
      
      console.log('🔐 Signed out all sessions and reloading');
      
    } catch (error) {
      console.error('🔐 Sign out all error, forcing cleanup:', error);
      // Force cleanup even if logout fails
      clearAllSessions();
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
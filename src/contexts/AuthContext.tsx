import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { useSessionManager } from '@/contexts/SessionManagerContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useSessionValidation } from '@/hooks/useSessionValidation';

// Global login state to prevent secondary auth calls
let globalLoginInProgress = false;

interface AuthContextType {
  // Current auth state
  user: User | null;
  session: Session | null;
  userProfile: any | null;
  isLoading: boolean;
  isSigningOut: boolean;
  
  // Session management
  sessions: any[];
  activeSession: any | null;
  activeSessionId: string | null;
  hasMultipleSessions: boolean;
  
  // Auth methods
  signIn: (email: string, password: string) => Promise<{ data: any, error: any }>;
  signUp: (email: string, password: string, metadata?: any) => Promise<{ data: any, error: any }>;
  signOut: (sessionId?: string) => Promise<void>;
  signOutAll: () => Promise<void>;
  switchToSession: (sessionId: string) => void;
  switchToSessionSafe: (sessionId: string) => Promise<void>;
  
  // Profile methods
  fetchUserProfile: (sessionId?: string, forceRefresh?: boolean) => Promise<any | null>;
  
  // Utility methods
  getCurrentSession: () => Session | null;
  getCurrentUser: () => User | null;
  getCurrentUserProfile: () => any | null;
  getSupabaseClient: () => any;
  supabaseClient: any;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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
  const [isSigningOut, setIsSigningOut] = useState(false);
  const navigate = useNavigate();
  const { validateSession } = useSessionValidation();

  // Centralized profile fetching with deduplication
  const [ongoingRequests, setOngoingRequests] = useState<Map<string, Promise<any>>>(new Map());

  const fetchUserProfile = useCallback(async (sessionId?: string, forceRefresh = false) => {
    const targetSessionId = sessionId || activeSessionId;
    
    if (!targetSessionId) {
      return null;
    }

    const session = sessions.find(s => s.id === targetSessionId);
    if (!session?.user?.id) {
      return null;
    }

    // Request deduplication - check if already fetching for this user
    const requestKey = `profile_${session.user.id}`;
    if (!forceRefresh && ongoingRequests.has(requestKey)) {
      console.log('🔍 PROFILE: Deduplicating request for user:', session.user.email);
      return ongoingRequests.get(requestKey);
    }

    // Check if profile is already cached and not forcing refresh
    if (!forceRefresh && session.userProfile) {
      console.log('🔍 PROFILE: Using cached profile for user:', session.user.email);
      return session.userProfile;
    }

    // Create the fetch promise and store it for deduplication
    const fetchPromise = (async () => {
      try {
        console.log('🔍 AUTH CHECK: Fetching profile for user:', session.user.email, 'session:', targetSessionId);
        
        // Skip auth verification during login to avoid duplicate calls
        if (globalLoginInProgress) {
          console.log('🔍 AUTH CHECK: Skipping verification during login');
        } else {
          // Verify we have a valid session without making additional auth calls
          if (!session.session?.access_token) {
            console.error('❌ AUTH CHECK: No valid access token in session');
            return null;
          }
          console.log('✅ AUTH CHECK: Client is properly authenticated');
        }
        
        // Now attempt to fetch the profile
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
          return null;
        }

        console.log('✅ PROFILE FETCH: Profile fetched successfully:', data);
        
        if (data) {
          updateSessionProfile(targetSessionId, data);
          console.log('✅ PROFILE UPDATE: Session profile updated');
          
          // Cache in localStorage for instant retrieval
          try {
            const profileCache = JSON.parse(localStorage.getItem('wmh_profile_cache') || '{}');
            profileCache[session.user.id] = data;
            localStorage.setItem('wmh_profile_cache', JSON.stringify(profileCache));
          } catch (error) {
            console.warn('Failed to cache profile in localStorage:', error);
          }
        } else {
          console.log('ℹ️ PROFILE FETCH: No profile data found for user, this may be normal for new users');
        }
        
        return data;
      } catch (error) {
        console.error('❌ PROFILE FETCH: Unexpected exception:', error);
        return null;
      } finally {
        // Remove from ongoing requests when done
        setOngoingRequests(prev => {
          const newMap = new Map(prev);
          newMap.delete(requestKey);
          return newMap;
        });
      }
    })();

    // Store the promise for deduplication
    setOngoingRequests(prev => new Map(prev.set(requestKey, fetchPromise)));
    
    return fetchPromise;
  }, [activeSessionId, sessions, updateSessionProfile, ongoingRequests]);

  // Initialize auth - SINGLE POINT OF AUTH INITIALIZATION
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
        console.log('🔐 Initializing centralized auth...');
        
        // Set up auth state listener ONLY (no duplicate getSession call)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          (event, session) => {
            console.log('🔐 Auth state change:', event, session?.user?.email);
            
            // Mark login as complete when we get a signed in event
            if (event === 'SIGNED_IN') {
              globalLoginInProgress = false;
            }
            
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
                    await addSession(session.user, session);
                  } else {
                    console.log('🔐 Session already exists for user, switching to it');
                    switchToSession(existingSession.id);
                  }
                } catch (error) {
                  console.error('🔐 Error adding session on auth change:', error);
                }
              } else if (event === 'SIGNED_OUT') {
                console.log('🔐 User signed out via auth change');
                globalLoginInProgress = false;
              }
              
              delete (window as any)[authEventKey];
            }, 500);
          }
        );
        
        authSubscription = subscription;
        
        // Only check existing session if we have stored sessions but no active session
        // This prevents duplicate auth calls on every page load
        if (sessions.length === 0 && !activeSessionId) {
          console.log('🔐 Checking for existing session only once during initialization');
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            console.log('🔐 Found existing session, creating session manager entry');
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
      initialized = false;
    };
  }, [addSession, sessions, switchToSession, activeSessionId]);

  // Auto-fetch profiles - SINGLE POINT OF PROFILE FETCHING (disabled during login)
  const shouldFetchProfile = useRef(false);
  
  useEffect(() => {
    if (isSigningOut || globalLoginInProgress) return; // Skip during login
    
    if (activeSession && !activeSession.userProfile && !shouldFetchProfile.current) {
      shouldFetchProfile.current = true;
      console.log('🔍 PROFILE: Auto-fetching profile for active session:', activeSession.user.email);
      
      // Check localStorage cache first
      try {
        const profileCache = JSON.parse(localStorage.getItem('wmh_profile_cache') || '{}');
        const cachedProfile = profileCache[activeSession.user.id];
        if (cachedProfile) {
          console.log('🔍 PROFILE: Using cached profile for instant display');
          updateSessionProfile(activeSessionId!, cachedProfile);
          shouldFetchProfile.current = false;
          return;
        }
      } catch (error) {
        console.warn('Failed to load cached profile:', error);
      }
      
      // Only fetch if no cache available and not during login
      fetchUserProfile(activeSessionId!).finally(() => {
        shouldFetchProfile.current = false;
      });
    }
    
    // Reset flag when session changes
    if (!activeSession) {
      shouldFetchProfile.current = false;
    }
  }, [activeSession?.id, activeSessionId, isSigningOut]);

  const signIn = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    globalLoginInProgress = true; // Prevent secondary auth calls
    
    try {
      console.log('🔐 Starting login process - preventing secondary auth calls');
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      if (data.user && data.session) {
        try {
          const sessionId = await addSession(data.user, data.session);
          console.log('🔐 Sign in successful, session ID:', sessionId);
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
      globalLoginInProgress = false; // Reset on error
      return { data: null, error };
    } finally {
      setIsLoading(false);
      // Note: globalLoginInProgress is reset in auth state change handler
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

    console.log('🚨 SIGN OUT: Starting logout for session:', targetSessionId, 'user:', session.user.email);
    
    try {
      setIsSigningOut(true);
      setIsLoading(true);
      
      // Immediate cleanup
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
      
      removeSession(targetSessionId);
      
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
      
      navigate('/auth');
      
    } catch (error) {
      console.error('🚨 SIGN OUT ERROR:', error);
      removeSession(targetSessionId);
      navigate('/auth');
    } finally {
      setIsSigningOut(false);
      setIsLoading(false);
    }
  }, [activeSessionId, sessions, removeSession, navigate]);

  const signOutAll = useCallback(async () => {
    console.log('🚨 SIGN OUT ALL: Starting logout for', sessions.length, 'sessions');
    
    try {
      setIsSigningOut(true);
      setIsLoading(true);
      
      const logoutPromises = sessions.map((session) => {
        return Promise.race([
          session.supabaseClient.auth.signOut(),
          new Promise(resolve => setTimeout(resolve, 1500))
        ]);
      });
      
      await Promise.allSettled(logoutPromises);
      clearAllSessions();
      
      try {
        localStorage.removeItem('wmh_sessions');
        localStorage.removeItem('wmh_active_session');
        Object.keys(localStorage).forEach(key => {
          if (key.includes('sb-') || key.includes('auth-token')) {
            localStorage.removeItem(key);
          }
        });
      } catch (storageError) {
        console.error('🚨 Storage cleanup error:', storageError);
      }
      
      navigate('/');
      
    } catch (error) {
      console.error('🚨 SIGN OUT ALL ERROR:', error);
      clearAllSessions();
      navigate('/');
    } finally {
      setIsSigningOut(false);
    }
  }, [sessions, clearAllSessions, navigate]);

  const switchToSessionSafe = useCallback(async (sessionId: string) => {
    try {
      const session = sessions.find(s => s.id === sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      const isValid = await validateSession(sessionId);
      if (!isValid) {
        throw new Error('Session validation failed');
      }

      switchToSession(sessionId);
      console.log('🔄 Switched to session:', sessionId);
    } catch (error) {
      console.error('🔄 Failed to switch session:', error);
    }
  }, [sessions, validateSession, switchToSession]);

  // Utility methods
  const getCurrentSession = useCallback(() => activeSession?.session || null, [activeSession]);
  const getCurrentUser = useCallback(() => activeSession?.user || null, [activeSession]);
  const getCurrentUserProfile = useCallback(() => activeSession?.userProfile || null, [activeSession]);
  const getSupabaseClient = useCallback(() => {
    return activeSession ? getSessionClient(activeSession.id) : supabase;
  }, [activeSession, getSessionClient]);

  const value: AuthContextType = {
    // Current auth state
    user: activeSession?.user || null,
    session: activeSession?.session || null,
    userProfile: activeSession?.userProfile || null,
    isLoading,
    isSigningOut,
    
    // Session management
    sessions,
    activeSession,
    activeSessionId,
    hasMultipleSessions: sessions.length > 1,
    
    // Auth methods
    signIn,
    signUp,
    signOut,
    signOutAll,
    switchToSession,
    switchToSessionSafe,
    
    // Profile methods
    fetchUserProfile,
    
    // Utility methods
    getCurrentSession,
    getCurrentUser,
    getCurrentUserProfile,
    getSupabaseClient,
    supabaseClient: getSupabaseClient(),
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
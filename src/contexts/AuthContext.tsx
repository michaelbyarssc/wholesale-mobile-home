
import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { useSessionManager } from '@/contexts/SessionManagerContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useSessionValidation } from '@/hooks/useSessionValidation';

interface AuthContextType {
  // Current auth state
  user: User | null;
  session: Session | null;
  userProfile: any | null;
  userRoles: any[];
  isLoading: boolean;
  isSigningOut: boolean;
  isLoginInProgress: boolean;
  isStabilizing: boolean;
  isUserDataReady: boolean;
  
  // Session management
  sessions: any[];
  activeSession: any | null;
  activeSessionId: string | null;
  hasMultipleSessions: boolean;
  supabaseClient: any;
  
  // Role management
  isAdmin: boolean;
  isSuperAdmin: boolean;
  hasRole: (role: 'admin' | 'super_admin' | 'user' | 'driver') => boolean;
  
  // Auth methods
  signIn: (email: string, password: string) => Promise<{ data: any, error: any }>;
  signUp: (email: string, password: string, metadata?: any) => Promise<{ data: any, error: any }>;
  signOut: (sessionId?: string) => Promise<void>;
  signOutAll: () => Promise<void>;
  switchToSession: (sessionId: string) => void;
  switchToSessionSafe: (sessionId: string) => Promise<void>;
  
  // Profile methods
  fetchUserProfile: (sessionId?: string) => Promise<any>;
  
  // Session methods
  getSupabaseClient: (sessionId?: string) => any;
  getCurrentSession: () => any;
  getCurrentUser: () => User | null;
  getCurrentProfile: () => any;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isLoginInProgress, setIsLoginInProgress] = useState(false);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [isRolesLoading, setIsRolesLoading] = useState(false);
  const [isStabilizing, setIsStabilizing] = useState(false);
  const [userRoles, setUserRoles] = useState<any[]>([]);
  const [isUserDataReady, setIsUserDataReady] = useState(false);
  
  const {
    sessions,
    activeSessionId,
    addSession,
    switchToSession: sessionManagerSwitchToSession,
    updateSessionProfile,
    removeSession,
    clearAllSessions,
    activeSession
  } = useSessionManager();

  // Memoized derived state to prevent unnecessary recalculations
  const hasMultipleSessions = useMemo(() => sessions.length > 1, [sessions.length]);

  const navigate = useNavigate();
  const { validateSession } = useSessionValidation();

  // Request deduplication refs
  const profileFetchInProgress = useRef(false);
  const hasProfileBeenFetched = useRef(new Set<string>());
  const profileRequestPromises = useRef(new Map<string, Promise<any>>());
  
  // Role request deduplication refs  
  const rolesFetchInProgress = useRef(false);
  const hasRoleBeenFetched = useRef(new Set<string>());
  const roleRequestPromises = useRef(new Map<string, Promise<any>>());
  
  // Auth event deduplication ref
  const lastProcessedEvent = useRef<{event: string, userId?: string, timestamp: number} | null>(null);

  // Simple profile fetching
  const fetchUserProfile = useCallback(async (targetSessionId?: string) => {
    const sessionId = targetSessionId || activeSessionId;
    const session = sessions.find(s => s.id === sessionId);
    
    if (!session?.user) {
      console.log('🔍 PROFILE: No valid session for profile fetch');
      return null;
    }

    const userId = session.user.id;
    const requestId = `${userId}-${Date.now()}`;
    
    // Check if we already fetched for this user
    if (hasProfileBeenFetched.current.has(userId)) {
      console.log(`🔍 PROFILE [${requestId}]: Already fetched for user ${userId}, skipping`);
      return null;
    }

    // Return existing promise if request is in progress
    if (profileRequestPromises.current.has(userId)) {
      console.log(`🔍 PROFILE [${requestId}]: Request already in progress for user ${userId}, returning existing promise`);
      return profileRequestPromises.current.get(userId);
    }

    // Mark as fetched and create new promise
    hasProfileBeenFetched.current.add(userId);
    setIsProfileLoading(true);
    
    const profilePromise = (async () => {
      try {
        console.log(`🔍 PROFILE FETCH [${requestId}]: Querying profiles table for user_id:`, userId);
        const { data, error } = await session.supabaseClient
          .from('profiles')
          .select('first_name, last_name, email, phone_number')
          .eq('user_id', userId)
          .maybeSingle();

        if (error) {
          console.error(`❌ PROFILE FETCH [${requestId}]: Database error:`, error);
          return null;
        }

        console.log(`✅ PROFILE FETCH [${requestId}]: Profile fetched successfully:`, data);
        
        if (data) {
          updateSessionProfile(sessionId, data);
          console.log(`✅ PROFILE UPDATE [${requestId}]: Session profile updated`);
        }
        
        return data;
      } catch (error) {
        console.error(`❌ PROFILE FETCH [${requestId}]: Unexpected exception:`, error);
        return null;
      } finally {
        profileRequestPromises.current.delete(userId);
        setIsProfileLoading(false);
      }
    })();

    profileRequestPromises.current.set(userId, profilePromise);
    return profilePromise;
  }, [activeSessionId, sessions, updateSessionProfile]);

  // Centralized role fetching
  const fetchUserRoles = useCallback(async (targetSessionId?: string) => {
    const sessionId = targetSessionId || activeSessionId;
    const session = sessions.find(s => s.id === sessionId);
    
    if (!session?.user) {
      console.log('🔐 ROLES: No valid session for role fetch');
      setUserRoles([]);
      return [];
    }

    const userId = session.user.id;
    const requestId = `${userId}-${Date.now()}`;
    
    // Check if we already fetched for this user
    if (hasRoleBeenFetched.current.has(userId)) {
      console.log(`🔐 ROLES [${requestId}]: Already fetched for user ${userId}, returning cached`);
      return userRoles;
    }

    // Return existing promise if request is in progress
    if (roleRequestPromises.current.has(userId)) {
      console.log(`🔐 ROLES [${requestId}]: Request already in progress for user ${userId}, returning existing promise`);
      return roleRequestPromises.current.get(userId);
    }

    // Mark as fetched and create new promise
    hasRoleBeenFetched.current.add(userId);
    setIsRolesLoading(true);
    
    const rolePromise = (async () => {
      try {
        console.log(`🔐 ROLES FETCH [${requestId}]: Querying user_roles table for user_id:`, userId);
        const { data, error } = await session.supabaseClient
          .from('user_roles')
          .select('id, user_id, role')
          .eq('user_id', userId);

        if (error) {
          console.error(`❌ ROLES FETCH [${requestId}]: Database error:`, error);
          setUserRoles([]);
          return [];
        }

        console.log(`✅ ROLES FETCH [${requestId}]: Roles fetched successfully:`, data?.map(r => r.role) || []);
        
        const roles = data || [];
        setUserRoles(roles);
        return roles;
      } catch (error) {
        console.error(`❌ ROLES FETCH [${requestId}]: Unexpected exception:`, error);
        setUserRoles([]);
        return [];
      } finally {
        roleRequestPromises.current.delete(userId);
        setIsRolesLoading(false);
      }
    })();

    roleRequestPromises.current.set(userId, rolePromise);
    return rolePromise;
  }, [activeSessionId, sessions, userRoles]);

  // Initialize auth
  useEffect(() => {
    let initialized = false;
    let authSubscription: any = null;
    
    const initializeAuth = async () => {
      if (initialized) {
        console.log('🔒 Preventing duplicate auth initialization (StrictMode protection)');
        return;
      }
      
      initialized = true;
      console.log('🚀 AUTH INIT: Starting auth initialization...');
      
      try {
        // Set up auth state listener
        authSubscription = supabase.auth.onAuthStateChange(async (event, session) => {
          console.log('🔄 AUTH STATE CHANGE:', event, session ? `User: ${session.user?.email}` : 'No session');
          
          // Deduplicate rapid auth events
          const currentEvent = {
            event,
            userId: session?.user?.id,
            timestamp: Date.now()
          };
          
          // Skip if same event for same user within 100ms
          if (lastProcessedEvent.current && 
              lastProcessedEvent.current.event === event &&
              lastProcessedEvent.current.userId === session?.user?.id &&
              (currentEvent.timestamp - lastProcessedEvent.current.timestamp) < 100) {
            console.log('⏭️ AUTH EVENT SKIPPED: Duplicate event within 100ms');
            return;
          }
          
          lastProcessedEvent.current = currentEvent;
          
          if (event === 'SIGNED_IN' && session?.user) {
            console.log('✅ AUTH STATE: User signed in:', session.user.email, 'Event:', event);
            
            // Batch state updates to reduce re-renders
            React.startTransition(() => {
              setIsStabilizing(true);
              setIsUserDataReady(false);
              setIsLoginInProgress(false);
            });
            
            await addSession(session.user, session);
            
            // Reduced stabilization period for faster UI response
            setTimeout(() => {
              React.startTransition(() => {
                setIsStabilizing(false);
              });
            }, 150);
          } else if (event === 'SIGNED_OUT') {
            console.log('🚪 AUTH STATE: User signed out, clearing sessions and refs');
            clearAllSessions();
            hasProfileBeenFetched.current.clear();
            profileRequestPromises.current.clear();
            hasRoleBeenFetched.current.clear();
            roleRequestPromises.current.clear();
            setUserRoles([]);
            setIsUserDataReady(false);
            setIsLoginInProgress(false);
          } else if (event === 'TOKEN_REFRESHED' && session?.user) {
            console.log('🔄 AUTH STATE: Token refreshed for user:', session.user.email);
            // Check if session already exists to prevent feedback loops
            const existingSession = sessions.find(s => s.user.id === session.user.id);
            if (!existingSession) {
              console.log('⚠️ TOKEN_REFRESHED: No existing session found, adding session');
              await addSession(session.user, session);
            } else {
              console.log('✅ TOKEN_REFRESHED: Session already exists, skipping addSession');
            }
          } else {
            console.log('❌ AUTH STATE: No user session, signing out');
            setIsLoginInProgress(false);
          }
        });

        // Check for existing session
        console.log('🔍 AUTH INIT: Checking for existing session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ AUTH INIT: Error getting session:', error);
          setIsLoading(false);
          return;
        }

        if (session?.user) {
          console.log('✅ AUTH INIT: Found existing session for:', session.user.email);
          await addSession(session.user, session);
        } else {
          console.log('ℹ️ AUTH INIT: No existing session found');
        }
        
      } catch (error) {
        console.error('❌ AUTH INIT: Initialization error:', error);
      } finally {
        setIsLoading(false);
        console.log('✅ AUTH INIT: Initialization complete');
      }
    };

    initializeAuth();

    return () => {
      console.log('🧹 AUTH CLEANUP: Cleaning up auth subscription');
      if (authSubscription?.subscription) {
        authSubscription.subscription.unsubscribe();
      }
    };
  }, []);

  // Coordinated data fetching - profile then roles then ready state
  useEffect(() => {
    const currentSession = activeSession;
    
    if (currentSession?.user && !isLoginInProgress && !isStabilizing) {
      console.log('📱 COORDINATED FETCH: Starting data fetch sequence for user:', currentSession.user.email);
      
      // Sequential loading: profile first, then roles, then mark ready
      const fetchDataSequence = async () => {
        try {
          // Step 1: Fetch profile if needed
          if (!currentSession.userProfile && !isProfileLoading) {
            console.log('📱 STEP 1: Fetching profile...');
            await fetchUserProfile();
          }
          
          // Step 2: Fetch roles if needed - but don't block on this  
          if (!hasRoleBeenFetched.current.has(currentSession.user.id) && !isRolesLoading) {
            console.log('📱 STEP 2: Fetching roles...');
            // Don't await - let roles load in background
            fetchUserRoles().catch(error => {
              console.error('📱 BACKGROUND ROLES FETCH: Error:', error);
            });
          }
          
          // Step 3: Mark user data as ready after profile is loaded (don't wait for roles)
          if (!isUserDataReady && !isProfileLoading) {
            console.log('📱 STEP 3: Marking user data as ready (profile loaded, roles loading in background)');
            setIsUserDataReady(true);
          }
        } catch (error) {
          console.error('📱 COORDINATED FETCH: Error in data sequence:', error);
          // Even on error, mark as ready so user isn't stuck
          if (!isUserDataReady) {
            console.log('📱 STEP 3 (FALLBACK): Marking user data as ready despite error');
            setIsUserDataReady(true);
          }
        }
      };
      
      // Add delay to prevent rapid fetches during transitions
      const fetchTimer = setTimeout(fetchDataSequence, 200);
      return () => clearTimeout(fetchTimer);
    }
  }, [activeSession?.user?.id, isLoginInProgress, isStabilizing, isProfileLoading, isUserDataReady]);

  // Handle non-authenticated users - mark as ready when no session exists
  useEffect(() => {
    if (!activeSession && !isLoading && !isUserDataReady) {
      console.log('📱 NON-AUTH USER: Marking user data as ready (no session)');
      setIsUserDataReady(true);
    }
  }, [activeSession, isLoading, isUserDataReady]);

  // Auth methods
  const signIn = useCallback(async (email: string, password: string) => {
    console.log('🔐 SIGN IN: Starting sign in for:', email);
    setIsLoginInProgress(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('❌ SIGN IN: Error:', error);
        setIsLoginInProgress(false);
        return { data: null, error };
      }

      console.log('✅ SIGN IN: Success for:', email);
      return { data, error: null };
    } catch (error) {
      console.error('❌ SIGN IN: Exception:', error);
      setIsLoginInProgress(false);
      return { data: null, error };
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, metadata?: any) => {
    console.log('📝 SIGN UP: Starting sign up for:', email);
    setIsLoginInProgress(true);
    
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

      if (error) {
        console.error('❌ SIGN UP: Error:', error);
        setIsLoginInProgress(false);
        return { data: null, error };
      }

      console.log('✅ SIGN UP: Success for:', email);
      return { data, error: null };
    } catch (error) {
      console.error('❌ SIGN UP: Exception:', error);
      setIsLoginInProgress(false);
      return { data: null, error };
    }
  }, []);

  const signOut = useCallback(async (sessionId?: string) => {
    const targetSessionId = sessionId || activeSessionId;
    
    console.log('🚪 SIGN OUT: Starting sign out for session:', targetSessionId);
    setIsSigningOut(true);

    try {
      if (targetSessionId) {
        const session = sessions.find(s => s.id === targetSessionId);
        
        if (session?.supabaseClient) {
          await session.supabaseClient.auth.signOut();
        }
        
        removeSession(targetSessionId);
      } else {
        await supabase.auth.signOut();
      }

      console.log('✅ SIGN OUT: Complete');
    } catch (error) {
      console.error('❌ SIGN OUT: Error:', error);
    } finally {
      setIsSigningOut(false);
    }
  }, [activeSessionId, sessions, removeSession]);

  const signOutAll = useCallback(async () => {
    console.log('🚪 SIGN OUT ALL: Starting...');
    setIsSigningOut(true);

    try {
      await supabase.auth.signOut({ scope: 'global' });
      clearAllSessions();
      console.log('✅ SIGN OUT ALL: Complete');
    } catch (error) {
      console.error('❌ SIGN OUT ALL: Error:', error);
    } finally {
      setIsSigningOut(false);
    }
  }, [clearAllSessions]);

  const switchToSession = useCallback((sessionId: string) => {
    console.log('🔄 SWITCH SESSION: Switching to session:', sessionId);
    sessionManagerSwitchToSession(sessionId);
  }, [sessionManagerSwitchToSession]);

  const switchToSessionSafe = useCallback(async (sessionId: string) => {
    console.log('🔄 SWITCH SESSION SAFE: Switching to session:', sessionId);
    
    const targetSession = sessions.find(s => s.id === sessionId);
    if (!targetSession) {
      console.error('❌ SWITCH SESSION: Session not found:', sessionId);
      return;
    }

    try {
      const isValid = await validateSession(sessionId);
      if (isValid) {
        sessionManagerSwitchToSession(sessionId);
        console.log('✅ SWITCH SESSION: Successfully switched to:', sessionId);
      } else {
        console.log('❌ SWITCH SESSION: Session invalid, removing:', sessionId);
        removeSession(sessionId);
      }
    } catch (error) {
      console.error('❌ SWITCH SESSION: Error validating session:', error);
      removeSession(sessionId);
    }
  }, [sessions, validateSession, sessionManagerSwitchToSession, removeSession]);

  // Helper methods
  const getSupabaseClient = useCallback((sessionId?: string) => {
    const targetSessionId = sessionId || activeSessionId;
    const session = sessions.find(s => s.id === targetSessionId);
    return session?.supabaseClient || supabase;
  }, [activeSessionId, sessions]);

  const getCurrentSession = useCallback(() => {
    return activeSession;
  }, [activeSession]);

  const getCurrentUser = useCallback(() => {
    return activeSession?.user || null;
  }, [activeSession]);

  const getCurrentProfile = useCallback(() => {
    return activeSession?.userProfile || null;
  }, [activeSession]);

  // Role checking functions
  const hasRole = useCallback((role: 'admin' | 'super_admin' | 'user' | 'driver') => {
    return userRoles.some(userRole => userRole.role === role);
  }, [userRoles]);

  const isAdmin = hasRole('admin') || hasRole('super_admin');
  const isSuperAdmin = hasRole('super_admin');

  // Context value
  const value: AuthContextType = {
    // Current auth state
    user: activeSession?.user || null,
    session: activeSession?.session || null,
    userProfile: activeSession?.userProfile || null,
    userRoles,
    isLoading,
    isSigningOut,
    isLoginInProgress,
    isStabilizing,
    isUserDataReady,
    
    // Session management
    sessions,
    activeSession,
    activeSessionId,
    hasMultipleSessions,
    supabaseClient: getSupabaseClient(),
    
    // Role management
    isAdmin,
    isSuperAdmin,
    hasRole,
    
    // Auth methods
    signIn,
    signUp,
    signOut,
    signOutAll,
    switchToSession,
    switchToSessionSafe,
    
    // Profile methods
    fetchUserProfile,
    
    // Session methods
    getSupabaseClient,
    getCurrentSession,
    getCurrentUser,
    getCurrentProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

import { useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { clearCorruptedSessions, resetAuthenticationState } from '@/utils/sessionCleanup';
import type { SessionData } from '@/contexts/SessionManagerContext';

/**
 * Simplified authentication hook that bypasses complex multi-user session management
 * for initial login flow. This ensures basic authentication works reliably.
 */
export const useSimpleAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize authentication with cleanup
  useEffect(() => {
    let authSubscription: any = null;
    
    const initializeAuth = async () => {
      try {
        console.log('🔐 SIMPLE AUTH: Initializing...');
        
        // Clear any corrupted session data first
        clearCorruptedSessions();
        
        // Set up auth state listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          (event, session) => {
            console.log('🔐 SIMPLE AUTH: Auth state change:', event, session?.user?.email);
            setSession(session);
            setUser(session?.user ?? null);
            
            if (event === 'SIGNED_OUT') {
              // Clear any remaining session data on sign out
              clearCorruptedSessions();
            }
          }
        );
        
        authSubscription = subscription;

        // Check for existing session
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('🔐 SIMPLE AUTH: Error getting session:', error);
          // Clear corrupted data and reset
          resetAuthenticationState();
          setSession(null);
          setUser(null);
        } else {
          console.log('🔐 SIMPLE AUTH: Current session:', currentSession?.user?.email);
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
        }
        
      } catch (error) {
        console.error('🔐 SIMPLE AUTH: Error initializing auth:', error);
        resetAuthenticationState();
        setSession(null);
        setUser(null);
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
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      console.log('🔐 SIMPLE AUTH: Signing in user:', email);
      
      // Clear any existing corrupted data
      clearCorruptedSessions();
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('🔐 SIMPLE AUTH: Sign in error:', error);
        throw error;
      }

      console.log('🔐 SIMPLE AUTH: Sign in successful');
      return { data, error: null };
    } catch (error: any) {
      console.error('🔐 SIMPLE AUTH: Sign in failed:', error);
      return { data: null, error };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, metadata?: any) => {
    setIsLoading(true);
    try {
      console.log('🔐 SIMPLE AUTH: Signing up user:', email);
      
      // Clear any existing corrupted data
      clearCorruptedSessions();
      
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
        console.error('🔐 SIMPLE AUTH: Sign up error:', error);
        throw error;
      }

      console.log('🔐 SIMPLE AUTH: Sign up successful');
      return { data, error: null };
    } catch (error: any) {
      console.error('🔐 SIMPLE AUTH: Sign up failed:', error);
      return { data: null, error };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      console.log('🔐 SIMPLE AUTH: Signing out');
      await supabase.auth.signOut();
      
      // Clear all session data
      resetAuthenticationState();
      
      console.log('🔐 SIMPLE AUTH: Sign out successful');
    } catch (error) {
      console.error('🔐 SIMPLE AUTH: Sign out error:', error);
      // Force clear even if sign out fails
      resetAuthenticationState();
      setSession(null);
      setUser(null);
    }
  }, []);

  return {
    user,
    session,
    isLoading,
    signIn,
    signUp,
    signOut,
    // Compatibility with multi-user auth interface
    supabaseClient: supabase,
    hasMultipleSessions: false,
    sessions: [],
    sessionCount: 0,
    activeSession: session && user ? { 
      id: `simple_${user.id}`, 
      user, 
      session, 
      supabaseClient: supabase,
      userProfile: null,
      createdAt: new Date()
    } as SessionData : null,
    activeSessionId: session?.user?.id || null
  };
};
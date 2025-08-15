import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useStorageMaintenance } from '@/hooks/useStorageMaintenance';
import { logger } from '@/utils/logger';
import { useTokenRefresh } from '@/hooks/useTokenRefresh';

export interface SessionData {
  id: string;
  user: User;
  session: Session;
  userProfile: { first_name?: string; last_name?: string } | null;
  createdAt: Date;
}

interface SingleClientSessionManagerContextType {
  sessions: SessionData[];
  activeSessionId: string | null;
  activeSession: SessionData | null;
  addSession: (user: User, session: Session) => Promise<string>;
  removeSession: (sessionId: string) => void;
  switchToSession: (sessionId: string) => void;
  clearAllSessions: () => void;
  updateSessionProfile: (sessionId: string, profile: { first_name?: string; last_name?: string }) => void;
  isTokenRefreshing: boolean;
}

const SingleClientSessionManagerContext = createContext<SingleClientSessionManagerContextType | null>(null);

export const useSingleClientSessionManager = () => {
  const context = useContext(SingleClientSessionManagerContext);
  if (!context) {
    logger.warn('🔐 SingleClientSessionManager context not available, returning defaults');
    return {
      sessions: [],
      activeSessionId: null,
      activeSession: null,
      addSession: async () => { throw new Error('SessionManager not initialized'); },
      removeSession: () => {},
      switchToSession: () => {},
      clearAllSessions: () => {},
      updateSessionProfile: () => {},
      isTokenRefreshing: false
    };
  }
  return context;
};

export const SingleClientSessionManagerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isTokenRefreshing, setIsTokenRefreshing] = useState(false);
  
  const { checkStorageIntegrity, cleanupOrphanedStorage } = useStorageMaintenance();
  const { refreshTokenWithRetry, handleTokenRefreshError, silentRefresh } = useTokenRefresh();
  
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const storageValidationInterval = useRef<NodeJS.Timeout | null>(null);
  const sessionUpdateTimeout = useRef<NodeJS.Timeout | null>(null);

  // Initialize from localStorage on mount
  useEffect(() => {
    const loadSessions = async () => {
      try {
        logger.log('🔐 Loading sessions from localStorage');
        
        // Import session control utilities
        const { shouldRestoreSession, validateAndCleanExpiredSessions } = await import('@/utils/sessionControl');
        
        // Check if we should restore sessions
        if (!shouldRestoreSession()) {
          logger.log('🔐 Session restoration disabled (Remember Me not selected)');
          setSessions([]);
          setActiveSessionId(null);
          return;
        }
        
        // Validate and clean expired sessions
        const hasValidSessions = validateAndCleanExpiredSessions();
        if (!hasValidSessions) {
          logger.log('🔐 No valid sessions found after cleanup');
          setSessions([]);
          setActiveSessionId(null);
          return;
        }
        
        // Check storage integrity
        const isIntegrityOk = checkStorageIntegrity();
        if (isIntegrityOk) {
          cleanupOrphanedStorage();
        } else {
          logger.warn('🔐 Storage corruption detected during initialization, clearing');
          return;
        }

        const storedSessions = localStorage.getItem('wmh_sessions');
        const storedActiveId = localStorage.getItem('wmh_active_session');
        
        if (storedSessions) {
          const sessionData = JSON.parse(storedSessions);
          
          // Single-session mode: keep only the active or most recent session
          let selectedSessionData: any | null = null;
          if (storedActiveId && sessionData.some((s: any) => s.id === storedActiveId)) {
            selectedSessionData = sessionData.find((s: any) => s.id === storedActiveId);
          } else if (sessionData.length > 0) {
            const sorted = [...sessionData].sort((a: any, b: any) => 
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
            selectedSessionData = sorted[0];
          }
          
          if (selectedSessionData) {
            const recreatedSession: SessionData = {
              ...selectedSessionData,
              createdAt: new Date(selectedSessionData.createdAt)
            };
            
            setSessions([recreatedSession]);
            setActiveSessionId(recreatedSession.id);
            
            // Set the session in the single client
            try {
              await supabase.auth.setSession({
                access_token: recreatedSession.session.access_token,
                refresh_token: recreatedSession.session.refresh_token
              });
              logger.log('🔐 Session restored and set in client for:', recreatedSession.user.email);
            } catch (error) {
              logger.error('🔐 Error setting session in client:', error);
              // Clear corrupted session
              setSessions([]);
              setActiveSessionId(null);
              localStorage.removeItem('wmh_sessions');
              localStorage.removeItem('wmh_active_session');
            }
          }
        }
      } catch (error) {
        logger.error('🔐 Storage corruption detected during load:', error);
        localStorage.removeItem('wmh_sessions');
        localStorage.removeItem('wmh_active_session');
        setSessions([]);
        setActiveSessionId(null);
      }
    };

    loadSessions();
    
    // Storage integrity monitoring (reduced frequency)
    storageValidationInterval.current = setInterval(() => {
      const isIntegrityOk = checkStorageIntegrity();
      if (isIntegrityOk) {
        cleanupOrphanedStorage();
      }
    }, 15 * 60 * 1000); // Check every 15 minutes
    
    return () => {
      if (storageValidationInterval.current) {
        clearInterval(storageValidationInterval.current);
      }
    };
  }, [checkStorageIntegrity, cleanupOrphanedStorage]);

  // Save sessions to localStorage whenever they change
  useEffect(() => {
    if (sessionUpdateTimeout.current) {
      clearTimeout(sessionUpdateTimeout.current);
    }
    
    sessionUpdateTimeout.current = setTimeout(() => {
      try {
        const sessionsToStore = sessions.map(session => ({
          id: session.id,
          user: session.user,
          session: session.session,
          userProfile: session.userProfile,
          createdAt: session.createdAt.toISOString()
        }));
        
        localStorage.setItem('wmh_sessions', JSON.stringify(sessionsToStore));
        
        if (activeSessionId) {
          localStorage.setItem('wmh_active_session', activeSessionId);
        } else {
          localStorage.removeItem('wmh_active_session');
        }
      } catch (error) {
        logger.error('Error saving sessions to localStorage:', error);
      }
    }, 100); // Debounce saves
  }, [sessions, activeSessionId]);

  // Cross-tab communication
  useEffect(() => {
    if (!broadcastChannelRef.current) {
      broadcastChannelRef.current = new BroadcastChannel('wmh_session_sync');
    }
    
    const handleBroadcastMessage = (event: MessageEvent) => {
      if (event.data.type === 'session_change') {
        // Reload from storage
        const storedSessions = localStorage.getItem('wmh_sessions');
        const storedActiveId = localStorage.getItem('wmh_active_session');
        
        if (storedSessions) {
          try {
            const sessionData = JSON.parse(storedSessions);
            const recreatedSessions = sessionData.map((s: any) => ({
              ...s,
              createdAt: new Date(s.createdAt)
            }));
            
            setSessions(recreatedSessions);
            setActiveSessionId(storedActiveId);
          } catch (error) {
            logger.error('Error syncing sessions:', error);
          }
        }
      }
    };
    
    broadcastChannelRef.current.addEventListener('message', handleBroadcastMessage);
    
    return () => {
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.removeEventListener('message', handleBroadcastMessage);
      }
    };
  }, []);

  // Token refresh monitoring
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        logger.debug('🔐 Auth state change:', event);
        
        if (event === 'TOKEN_REFRESHED') {
          logger.log('🔐 Token refreshed successfully');
          
          // Update stored session with new tokens
          if (session && activeSessionId) {
            setSessions(prev => prev.map(s => 
              s.id === activeSessionId 
                ? { ...s, session }
                : s
            ));
          }
          
          setIsTokenRefreshing(false);
        }
        
        if (event === 'SIGNED_OUT') {
          logger.log('🔐 User signed out');
          setSessions([]);
          setActiveSessionId(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [activeSessionId]);

  const broadcastSessionChange = useCallback(() => {
    try {
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.postMessage({ type: 'session_change' });
      }
    } catch (error) {
      logger.error('Error broadcasting session change:', error);
    }
  }, []);

  const addSession = useCallback(async (user: User, session: Session): Promise<string> => {
    // Check for existing session
    const existingSession = sessions.find(s => s.user.id === user.id);
    if (existingSession) {
      logger.log('🔐 Session already exists for user:', user.email, 'switching to existing');
      setActiveSessionId(existingSession.id);
      return existingSession.id;
    }
    
    const sessionId = `session_${user.id}_${Date.now()}`;
    
    try {
      // Set session in the single client
      await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token
      });

      // Fetch user profile
      let userProfile = null;
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('user_id', user.id)
          .single();
        userProfile = profile;
      } catch (error) {
        logger.error('Error fetching user profile:', error);
      }

      const newSession: SessionData = {
        id: sessionId,
        user,
        session,
        userProfile,
        createdAt: new Date()
      };

      // Single-session mode: replace existing session
      setSessions([newSession]);
      setActiveSessionId(sessionId);
      broadcastSessionChange();
      
      logger.log('🔐 Added new session:', sessionId, 'for user:', user.email);
      return sessionId;
    } catch (error) {
      logger.error('🔐 Error adding session:', error);
      throw error;
    }
  }, [sessions, broadcastSessionChange]);

  const removeSession = useCallback((sessionId: string) => {
    setSessions(prev => {
      const session = prev.find(s => s.id === sessionId);
      if (session) {
        logger.log('🔐 Removed session:', sessionId, 'for user:', session.user.email);
      }
      return prev.filter(s => s.id !== sessionId);
    });

    if (activeSessionId === sessionId) {
      setActiveSessionId(null);
    }

    broadcastSessionChange();
  }, [activeSessionId, broadcastSessionChange]);

  const switchToSession = useCallback(async (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      try {
        // Set the session in the single client
        await supabase.auth.setSession({
          access_token: session.session.access_token,
          refresh_token: session.session.refresh_token
        });
        
        setActiveSessionId(sessionId);
        broadcastSessionChange();
        logger.log('🔐 Switched to session:', sessionId, 'for user:', session.user.email);
      } catch (error) {
        logger.error('🔐 Error switching session:', error);
        // Remove invalid session
        removeSession(sessionId);
      }
    }
  }, [sessions, broadcastSessionChange, removeSession]);

  const clearAllSessions = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      logger.warn('🔐 Error signing out from client:', error);
    }
    
    setSessions([]);
    setActiveSessionId(null);
    localStorage.removeItem('wmh_sessions');
    localStorage.removeItem('wmh_active_session');
    broadcastSessionChange();
    logger.log('🔐 Cleared all sessions');
  }, [broadcastSessionChange]);

  const updateSessionProfile = useCallback((sessionId: string, profile: { first_name?: string; last_name?: string }) => {
    setSessions(prev => prev.map(session => 
      session.id === sessionId 
        ? { ...session, userProfile: profile }
        : session
    ));
  }, []);

  const activeSession = sessions.find(s => s.id === activeSessionId) || null;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (storageValidationInterval.current) {
        clearInterval(storageValidationInterval.current);
      }
      if (sessionUpdateTimeout.current) {
        clearTimeout(sessionUpdateTimeout.current);
      }
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.close();
      }
    };
  }, []);

  const value: SingleClientSessionManagerContextType = {
    sessions,
    activeSessionId,
    activeSession,
    addSession,
    removeSession,
    switchToSession,
    clearAllSessions,
    updateSessionProfile,
    isTokenRefreshing
  };

  return (
    <SingleClientSessionManagerContext.Provider value={value}>
      {children}
    </SingleClientSessionManagerContext.Provider>
  );
};

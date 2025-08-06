import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { useStorageCorruptionRecovery } from '@/hooks/useStorageCorruptionRecovery';

const SUPABASE_URL = "https://vgdreuwmisludqxphsph.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnZHJldXdtaXNsdWRxeHBoc3BoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3MDk2OTgsImV4cCI6MjA2NjI4NTY5OH0.gnJ83GgBWV4tb-cwWJXY0pPG2bGAyTK3T2IojP4llR8";

export interface SessionData {
  id: string;
  user: User;
  session: Session;
  supabaseClient: SupabaseClient<Database>;
  userProfile: { first_name?: string; last_name?: string } | null;
  createdAt: Date;
}

interface SessionManagerContextType {
  sessions: SessionData[];
  activeSessionId: string | null;
  activeSession: SessionData | null;
  addSession: (user: User, session: Session) => Promise<string>;
  removeSession: (sessionId: string) => void;
  switchToSession: (sessionId: string) => void;
  clearAllSessions: () => void;
  getSessionClient: (sessionId?: string) => SupabaseClient<Database> | null;
  updateSessionProfile: (sessionId: string, profile: { first_name?: string; last_name?: string }) => void;
}

const SessionManagerContext = createContext<SessionManagerContextType | null>(null);

export const useSessionManager = () => {
  const context = useContext(SessionManagerContext);
  if (!context) {
    throw new Error('useSessionManager must be used within a SessionManagerProvider');
  }
  return context;
};

export const SessionManagerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const { checkStorageIntegrity, cleanupOrphanedStorage } = useStorageCorruptionRecovery();

  // Initialize from localStorage on mount
  useEffect(() => {
    const loadSessions = () => {
      // Check storage integrity first
      const isIntegrityOk = checkStorageIntegrity();
      if (!isIntegrityOk) {
        console.log('🔐 Storage corruption detected during initialization');
        return;
      }

      // Clean up orphaned storage
      cleanupOrphanedStorage();

      try {
        const storedSessions = localStorage.getItem('wmh_sessions');
        const storedActiveId = localStorage.getItem('wmh_active_session');
        
        if (storedSessions) {
          const sessionData = JSON.parse(storedSessions);
          // Recreate sessions with fresh Supabase clients
          const recreatedSessions = sessionData.map((sessionInfo: any) => {
            // Generate proper storage key for recreated session
            const timestamp = new Date(sessionInfo.createdAt).getTime();
            const storageKey = `wmh_session_${sessionInfo.user.id}_${timestamp}`;
            
            const client = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
              auth: {
                storageKey: storageKey,
                storage: window.localStorage
              }
            });
            
            return {
              ...sessionInfo,
              supabaseClient: client,
              createdAt: new Date(sessionInfo.createdAt)
            };
          });
          
          setSessions(recreatedSessions);
          setActiveSessionId(storedActiveId);
        }
      } catch (error) {
        console.error('🔐 Storage corruption detected during load:', error);
        // Clear corrupted data
        localStorage.removeItem('wmh_sessions');
        localStorage.removeItem('wmh_active_session');
        setSessions([]);
        setActiveSessionId(null);
      }
    };

    loadSessions();
  }, []);

  // Save sessions to localStorage whenever they change
  useEffect(() => {
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
      console.error('Error saving sessions to localStorage:', error);
    }
  }, [sessions, activeSessionId]);

  // Cross-tab communication
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'wmh_sessions' || event.key === 'wmh_active_session') {
        // Sync sessions from storage without forcing reload
        const storedSessions = localStorage.getItem('wmh_sessions');
        const storedActiveId = localStorage.getItem('wmh_active_session');
        
        if (storedSessions) {
          try {
            const sessionData = JSON.parse(storedSessions);
            const recreatedSessions = sessionData.map((sessionInfo: any) => {
              // Generate proper storage key for synced session
              const timestamp = new Date(sessionInfo.createdAt).getTime();
              const storageKey = `wmh_session_${sessionInfo.user.id}_${timestamp}`;
              
              const client = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
                auth: {
                  storageKey: storageKey,
                  storage: window.localStorage
                }
              });
              
              return {
                ...sessionInfo,
                supabaseClient: client,
                createdAt: new Date(sessionInfo.createdAt)
              };
            });
            
            setSessions(recreatedSessions);
            setActiveSessionId(storedActiveId);
          } catch (error) {
            console.error('Error syncing sessions from storage:', error);
          }
        }
      }
    };

    const channel = new BroadcastChannel('wmh_session_sync');
    const handleBroadcastMessage = (event: MessageEvent) => {
      if (event.data.type === 'session_change') {
        // Sync state without forcing reload
        const storedSessions = localStorage.getItem('wmh_sessions');
        const storedActiveId = localStorage.getItem('wmh_active_session');
        
        if (storedSessions) {
          try {
            const sessionData = JSON.parse(storedSessions);
            const recreatedSessions = sessionData.map((sessionInfo: any) => {
              // Generate proper storage key for broadcast synced session
              const timestamp = new Date(sessionInfo.createdAt).getTime();
              const storageKey = `wmh_session_${sessionInfo.user.id}_${timestamp}`;
              
              const client = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
                auth: {
                  storageKey: storageKey,
                  storage: window.localStorage
                }
              });
              
              return {
                ...sessionInfo,
                supabaseClient: client,
                createdAt: new Date(sessionInfo.createdAt)
              };
            });
            
            setSessions(recreatedSessions);
            setActiveSessionId(storedActiveId);
          } catch (error) {
            console.error('Error syncing sessions from broadcast:', error);
          }
        }
      }
    };
    
    channel.addEventListener('message', handleBroadcastMessage);

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      channel.removeEventListener('message', handleBroadcastMessage);
      channel.close();
    };
  }, []);

  const broadcastSessionChange = useCallback(() => {
    try {
      const channel = new BroadcastChannel('wmh_session_sync');
      channel.postMessage({ type: 'session_change' });
      channel.close();
    } catch (error) {
      console.error('Error broadcasting session change:', error);
    }
  }, []);

  const addSession = useCallback(async (user: User, session: Session): Promise<string> => {
    const timestamp = Date.now();
    const sessionId = `session_${user.id}_${timestamp}`;
    
    // Use unique storage key combining user ID and timestamp for proper isolation
    const storageKey = `wmh_session_${user.id}_${timestamp}`;
    
    // Create session-specific Supabase client with unique storage key
    const client = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        storageKey: storageKey,
        storage: window.localStorage
      }
    });

    // Set the session in the new client
    await client.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token
    });

    // Fetch user profile
    let userProfile = null;
    try {
      const { data: profile } = await client
        .from('profiles')
        .select('first_name, last_name')
        .eq('user_id', user.id)
        .single();
      userProfile = profile;
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }

    const newSession: SessionData = {
      id: sessionId,
      user,
      session,
      supabaseClient: client,
      userProfile,
      createdAt: new Date()
    };

    setSessions(prev => {
      // Check if session already exists to prevent duplicates
      const existingSession = prev.find(s => s.user.id === user.id);
      if (existingSession) {
        console.log('🔐 Session already exists for user:', user.email, 'switching to existing');
        setActiveSessionId(existingSession.id);
        return prev;
      }
      return [...prev, newSession];
    });

    setActiveSessionId(sessionId);
    broadcastSessionChange();
    
    console.log('🔐 Added new session:', sessionId, 'for user:', user.email);
    return sessionId;
  }, [broadcastSessionChange]);

  const removeSession = useCallback((sessionId: string) => {
    setSessions(prev => {
      const session = prev.find(s => s.id === sessionId);
      if (session) {
        // Clean up session-specific storage using the correct key format
        const storageKeyPrefix = `wmh_session_${session.user.id}_`;
        
        // Find and remove all storage keys for this session
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith(storageKeyPrefix)) {
            const sessionIdFromKey = key.split('_')[3];
            if (sessionId.includes(sessionIdFromKey)) {
              localStorage.removeItem(key);
              console.log('🔐 Cleaned up storage key:', key);
            }
          }
        });
        
        console.log('🔐 Removed session:', sessionId, 'for user:', session.user.email);
      }
      return prev.filter(s => s.id !== sessionId);
    });

    if (activeSessionId === sessionId) {
      // Switch to another session or clear active session
      setSessions(current => {
        const remaining = current.filter(s => s.id !== sessionId);
        if (remaining.length > 0) {
          setActiveSessionId(remaining[0].id);
        } else {
          setActiveSessionId(null);
        }
        return remaining;
      });
    }

    broadcastSessionChange();
  }, [activeSessionId, broadcastSessionChange]);

  const switchToSession = useCallback((sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      setActiveSessionId(sessionId);
      broadcastSessionChange();
      console.log('🔐 Switched to session:', sessionId, 'for user:', session.user.email);
    }
  }, [sessions, broadcastSessionChange]);

  const clearAllSessions = useCallback(() => {
    sessions.forEach(session => {
      // Clean up all session-specific storage
      const storageKeyPrefix = `wmh_session_${session.user.id}_`;
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(storageKeyPrefix)) {
          localStorage.removeItem(key);
        }
      });
    });
    setSessions([]);
    setActiveSessionId(null);
    localStorage.removeItem('wmh_sessions');
    localStorage.removeItem('wmh_active_session');
    broadcastSessionChange();
    console.log('🔐 Cleared all sessions and storage');
  }, [sessions, broadcastSessionChange]);

  const getSessionClient = useCallback((sessionId?: string): SupabaseClient<Database> | null => {
    const id = sessionId || activeSessionId;
    if (!id) return null;
    
    const session = sessions.find(s => s.id === id);
    return session?.supabaseClient || null;
  }, [sessions, activeSessionId]);

  const updateSessionProfile = useCallback((sessionId: string, profile: { first_name?: string; last_name?: string }) => {
    setSessions(prev => prev.map(session => 
      session.id === sessionId 
        ? { ...session, userProfile: profile }
        : session
    ));
  }, []);

  const activeSession = sessions.find(s => s.id === activeSessionId) || null;

  const value: SessionManagerContextType = {
    sessions,
    activeSessionId,
    activeSession,
    addSession,
    removeSession,
    switchToSession,
    clearAllSessions,
    getSessionClient,
    updateSessionProfile
  };

  return (
    <SessionManagerContext.Provider value={value}>
      {children}
    </SessionManagerContext.Provider>
  );
};
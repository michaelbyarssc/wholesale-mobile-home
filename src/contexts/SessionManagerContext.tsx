import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { useStorageMaintenance } from '@/hooks/useStorageMaintenance';
import { StorageQuotaManager } from '@/utils/storageQuotaManager';
import { AuthStabilizer } from '@/utils/authStabilizer';
import { devLog, devError } from '@/utils/environmentUtils';

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
  const { checkStorageIntegrity, cleanupOrphanedStorage, emergencyCleanup } = useStorageMaintenance();
  
  // Client cache to prevent excessive recreation
  const clientCache = useRef<Map<string, SupabaseClient<Database>>>(new Map());
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const storageValidationInterval = useRef<NodeJS.Timeout | null>(null);

  // Create cached client function with quota management and instance limits
  const getCachedClient = useCallback((storageKey: string, userId?: string, timestamp?: number) => {
    // Try exact key first
    if (clientCache.current.has(storageKey)) {
      return clientCache.current.get(storageKey)!;
    }
    
    // For recreation scenarios, try to find by user pattern
    if (userId) {
      const userPattern = `wmh_session_${userId}_`;
      for (const [key, client] of clientCache.current.entries()) {
        if (key.startsWith(userPattern)) {
          // Reuse existing client for same user
          clientCache.current.set(storageKey, client);
          devLog('🔐 Reusing cached client for user:', userId);
          return client;
        }
      }
      
      // Check client instance limits
      if (!AuthStabilizer.canCreateClientInstance(userId)) {
        devError(`❌ Cannot create client for ${userId} - instance limit reached`);
        return null;
      }
    }
    
    // Check storage quota before creating client
    const quotaCheck = StorageQuotaManager.checkQuota();
    if (quotaCheck.critical) {
      devLog('🚨 Storage quota critical, performing emergency cleanup before client creation');
      const cleanupSuccess = StorageQuotaManager.emergencyCleanup();
      if (!cleanupSuccess) {
        devError('❌ Failed to free storage space for new client');
        return null;
      }
    }
    
    try {
      const client = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        auth: {
          storageKey: storageKey,
          storage: {
            getItem: (key: string) => localStorage.getItem(key),
            setItem: (key: string, value: string) => {
              const success = StorageQuotaManager.safeSetItem(key, value);
              if (!success) {
                throw new Error(`Failed to store ${key} - quota exceeded`);
              }
            },
            removeItem: (key: string) => localStorage.removeItem(key)
          }
        }
      });
      
      clientCache.current.set(storageKey, client);
      if (userId) {
        AuthStabilizer.registerClientInstance(userId);
      }
      devLog('🔐 Created new cached client for key:', storageKey);
      return client;
    } catch (error) {
      devError('❌ Failed to create Supabase client:', error);
      return null;
    }
  }, []);

  // Initialize from localStorage on mount
  useEffect(() => {
    const loadSessions = () => {
      try {
        // Check storage integrity and clean up orphaned storage
        const isIntegrityOk = checkStorageIntegrity();
        if (isIntegrityOk) {
          cleanupOrphanedStorage();
        } else {
          console.log('🔐 Storage corruption detected during initialization, clearing');
          return;
        }

        const storedSessions = localStorage.getItem('wmh_sessions');
        const storedActiveId = localStorage.getItem('wmh_active_session');
        
        if (storedSessions) {
          const sessionData = JSON.parse(storedSessions);
          
          // Deduplicate by user id
          const uniqueSessionData = sessionData.filter((session: any, index: number, array: any[]) => 
            index === array.findIndex((s: any) => s.user.id === session.user.id)
          );
          
          // Enforce single-session mode: keep only the active or most recent session
          let selectedSessionData: any[] = [];
          if (storedActiveId && uniqueSessionData.some((s: any) => s.id === storedActiveId)) {
            selectedSessionData = uniqueSessionData.filter((s: any) => s.id === storedActiveId);
          } else if (uniqueSessionData.length > 0) {
            const sorted = [...uniqueSessionData].sort((a: any, b: any) => 
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
            selectedSessionData = [sorted[0]];
          }
          
          // Recreate only the selected session with cached client
          if (selectedSessionData.length > 0) {
            const sessionInfo = selectedSessionData[0];
            const timestamp = new Date(sessionInfo.createdAt).getTime();
            const storageKey = `wmh_session_${sessionInfo.user.id}_${timestamp}`;
            const client = getCachedClient(storageKey, sessionInfo.user.id, timestamp);
            
            const recreatedSession = {
              ...sessionInfo,
              supabaseClient: client,
              createdAt: new Date(sessionInfo.createdAt)
            } as SessionData;
            
            setSessions([recreatedSession]);
            setActiveSessionId(recreatedSession.id);
          } else {
            setSessions([]);
            setActiveSessionId(null);
          }
        }
      } catch (error) {
        console.error('🔐 Storage corruption detected during load:', error);
        localStorage.removeItem('wmh_sessions');
        localStorage.removeItem('wmh_active_session');
        setSessions([]);
        setActiveSessionId(null);
      }
    };

    loadSessions();
    
    // Start continuous storage integrity monitoring
    storageValidationInterval.current = setInterval(() => {
      const isIntegrityOk = checkStorageIntegrity();
      if (isIntegrityOk) {
        cleanupOrphanedStorage();
      }
    }, 5 * 60 * 1000); // Check every 5 minutes
    
    return () => {
      if (storageValidationInterval.current) {
        clearInterval(storageValidationInterval.current);
      }
    };
  }, [checkStorageIntegrity, cleanupOrphanedStorage, getCachedClient]);

  // Save sessions to localStorage whenever they change (with quota management)
  useEffect(() => {
    try {
      const sessionsToStore = sessions.map(session => ({
        id: session.id,
        user: session.user,
        session: session.session,
        userProfile: session.userProfile,
        createdAt: session.createdAt.toISOString()
      }));
      
      const success = StorageQuotaManager.safeSetItem('wmh_sessions', JSON.stringify(sessionsToStore));
      if (!success) {
        devError('❌ Failed to save sessions due to storage quota');
        // Try emergency cleanup and retry once
        if (StorageQuotaManager.emergencyCleanup()) {
          StorageQuotaManager.safeSetItem('wmh_sessions', JSON.stringify(sessionsToStore));
        }
      }
      
      if (activeSessionId) {
        StorageQuotaManager.safeSetItem('wmh_active_session', activeSessionId);
      } else {
        localStorage.removeItem('wmh_active_session');
      }
    } catch (error) {
      devError('Error saving sessions to localStorage:', error);
    }
  }, [sessions, activeSessionId]);

  // Optimized cross-tab communication with debouncing
  useEffect(() => {
    let syncTimeout: NodeJS.Timeout | null = null;
    
    const debouncedSync = () => {
      if (syncTimeout) clearTimeout(syncTimeout);
      syncTimeout = setTimeout(() => {
        try {
          const storedSessions = localStorage.getItem('wmh_sessions');
          const storedActiveId = localStorage.getItem('wmh_active_session');
          
          if (storedSessions) {
            const sessionData = JSON.parse(storedSessions);
            
            // Filter duplicates
            const uniqueSessionData = sessionData.filter((session: any, index: number, array: any[]) => 
              index === array.findIndex((s: any) => s.user.id === session.user.id)
            );
            
            // Enforce single-session: choose active or most recent only
            let selectedSessionData: any | null = null;
            if (storedActiveId && uniqueSessionData.some((s: any) => s.id === storedActiveId)) {
              selectedSessionData = uniqueSessionData.find((s: any) => s.id === storedActiveId);
            } else if (uniqueSessionData.length > 0) {
              selectedSessionData = [...uniqueSessionData].sort((a: any, b: any) => 
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
              )[0];
            }
            
            if (selectedSessionData) {
              const timestamp = new Date(selectedSessionData.createdAt).getTime();
              const storageKey = `wmh_session_${selectedSessionData.user.id}_${timestamp}`;
              const client = getCachedClient(storageKey);
              const recreatedSession = {
                ...selectedSessionData,
                supabaseClient: client,
                createdAt: new Date(selectedSessionData.createdAt)
              };
              setSessions([recreatedSession]);
              setActiveSessionId(recreatedSession.id);
            } else {
              setSessions([]);
              setActiveSessionId(null);
            }
          }
        } catch (error) {
          console.error('Error syncing sessions:', error);
        }
      }, 100); // 100ms debounce
    };

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'wmh_sessions' || event.key === 'wmh_active_session') {
        debouncedSync();
      }
    };

    // Reuse broadcast channel
    if (!broadcastChannelRef.current) {
      broadcastChannelRef.current = new BroadcastChannel('wmh_session_sync');
    }
    
    const handleBroadcastMessage = (event: MessageEvent) => {
      if (event.data.type === 'session_change') {
        debouncedSync();
      }
    };
    
    broadcastChannelRef.current.addEventListener('message', handleBroadcastMessage);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      if (syncTimeout) clearTimeout(syncTimeout);
      window.removeEventListener('storage', handleStorageChange);
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.removeEventListener('message', handleBroadcastMessage);
      }
    };
  }, [getCachedClient]);

  const broadcastSessionChange = useCallback(() => {
    try {
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.postMessage({ type: 'session_change' });
      }
    } catch (error) {
      console.error('Error broadcasting session change:', error);
    }
  }, []);

  const addSession = useCallback(async (user: User, session: Session): Promise<string> => {
    // Check initialization guard to prevent duplicate sessions
    if (AuthStabilizer.isInitializing(user.id)) {
      devLog(`⏭️ Skipping session creation for ${user.email} - initialization in progress`);
      const existingSession = sessions.find(s => s.user.id === user.id);
      return existingSession?.id || '';
    }

    // Check for existing session for this user first
    const existingSession = sessions.find(s => s.user.id === user.id);
    if (existingSession) {
      devLog('🔐 Session already exists for user:', user.email, 'switching to existing');
      setActiveSessionId(existingSession.id);
      return existingSession.id;
    }
    
    // Single-session mode: replace any existing session
    if (sessions.length > 0) {
      sessions.forEach(prevSession => {
        const ts = new Date(prevSession.createdAt).getTime();
        const prevKey = `wmh_session_${prevSession.user.id}_${ts}`;
        // Remove from client cache
        clientCache.current.delete(prevKey);
        // Unregister client instance
        AuthStabilizer.unregisterClientInstance(prevSession.user.id);
        // Remove any cache entries for same user
        const userPattern = `wmh_session_${prevSession.user.id}_`;
        for (const key of clientCache.current.keys()) {
          if (key.startsWith(userPattern)) clientCache.current.delete(key);
        }
        // Clean up storage keys for previous session
        Object.keys(localStorage).forEach(k => {
          if (k.includes(`${prevSession.user.id}_${ts}`)) {
            localStorage.removeItem(k);
          }
        });
      });
    }
    
    const timestamp = Date.now();
    const sessionId = `session_${user.id}_${timestamp}`;
    const storageKey = `wmh_session_${user.id}_${timestamp}`;
    
    // Set initialization guard
    AuthStabilizer.setInitializing(user.id, true);
    
    try {
      // Use cached client creation
      const client = getCachedClient(storageKey, user.id, timestamp);
      if (!client) {
        throw new Error('Failed to create Supabase client - quota or instance limit reached');
      }

      // Set the session in the client
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

      setSessions([newSession]);
      setActiveSessionId(sessionId);
      broadcastSessionChange();
      
      devLog('🔐 Added new session:', sessionId, 'for user:', user.email);
      return sessionId;
    } catch (error) {
      devError('🔐 Error adding session:', error);
      // Clean up cached client on error
      clientCache.current.delete(storageKey);
      AuthStabilizer.unregisterClientInstance(user.id);
      throw error;
    } finally {
      // Always release initialization guard
      AuthStabilizer.setInitializing(user.id, false);
    }
  }, [sessions, getCachedClient, broadcastSessionChange]);

  const removeSession = useCallback((sessionId: string) => {
    setSessions(prev => {
      const session = prev.find(s => s.id === sessionId);
      if (session) {
        // Clean up session-specific storage and cached client
        const timestamp = new Date(session.createdAt).getTime();
        const storageKey = `wmh_session_${session.user.id}_${timestamp}`;
        
        // Remove from client cache - key fix
        clientCache.current.delete(storageKey);
        
        // Unregister client instance
        AuthStabilizer.unregisterClientInstance(session.user.id);
        
        // Also remove any other cache entries for this user (cleanup orphaned entries)
        const userPattern = `wmh_session_${session.user.id}_`;
        for (const key of clientCache.current.keys()) {
          if (key.startsWith(userPattern)) {
            clientCache.current.delete(key);
          }
        }
        
        // Clean up all storage keys for this session
        Object.keys(localStorage).forEach(key => {
          if (key.includes(`${session.user.id}_${timestamp}`)) {
            localStorage.removeItem(key);
            console.log('🔐 Cleaned up storage key:', key);
          }
        });
        
        devLog('🔐 Removed session:', sessionId, 'for user:', session.user.email);
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
      devLog('🔐 Switched to session:', sessionId, 'for user:', session.user.email);
    }
  }, [sessions, broadcastSessionChange]);

  const clearAllSessions = useCallback(() => {
    sessions.forEach(session => {
      // Clean up all session-specific storage and cached clients
      const timestamp = new Date(session.createdAt).getTime();
      const storageKey = `wmh_session_${session.user.id}_${timestamp}`;
      
      // Remove from client cache and unregister instance
      clientCache.current.delete(storageKey);
      AuthStabilizer.unregisterClientInstance(session.user.id);
      
      // Clean up storage keys
      Object.keys(localStorage).forEach(key => {
        if (key.includes(`${session.user.id}_${timestamp}`)) {
          localStorage.removeItem(key);
        }
      });
    });
    
    // Clear all cached clients
    clientCache.current.clear();
    
    setSessions([]);
    setActiveSessionId(null);
    localStorage.removeItem('wmh_sessions');
    localStorage.removeItem('wmh_active_session');
    broadcastSessionChange();
    // Clear auth stabilizer state
    AuthStabilizer.cleanup();
    
    devLog('🔐 Cleared all sessions and storage');
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (storageValidationInterval.current) {
        clearInterval(storageValidationInterval.current);
      }
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.close();
      }
      clientCache.current.clear();
    };
  }, []);

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

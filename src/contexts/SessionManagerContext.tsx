import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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
  
  // Client cache to prevent excessive recreation
  const clientCache = useRef<Map<string, SupabaseClient<Database>>>(new Map());
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const storageValidationInterval = useRef<NodeJS.Timeout | null>(null);

  // Timestamp generation for consistent session keys across operations
  const generateSessionTimestamp = useCallback(() => {
    return Date.now();
  }, []);

  // Create cached client function with enhanced resource management
  const getCachedClient = useCallback((storageKey: string, userId?: string, timestamp?: number) => {
    // Track client creation for memory monitoring
    const currentClientCount = clientCache.current.size;
    if (currentClientCount > 10) {
      console.warn('🔐 High client count detected:', currentClientCount, 'cleaning up oldest clients');
      // Remove oldest clients to prevent memory leaks
      const entries = Array.from(clientCache.current.entries());
      entries.slice(0, 5).forEach(([key]) => {
        clientCache.current.delete(key);
      });
    }
    
    // Try exact key first for perfect match
    if (clientCache.current.has(storageKey)) {
      console.log('🔐 Reusing exact cached client for key:', storageKey);
      return clientCache.current.get(storageKey)!;
    }
    
    // For recreation scenarios with user ID, try to find compatible client
    if (userId) {
      const userPattern = `wmh_session_${userId}_`;
      for (const [key, client] of clientCache.current.entries()) {
        if (key.startsWith(userPattern)) {
          // Validate client is still functional before reuse
          try {
            client.auth.getSession(); // Quick validity check
            clientCache.current.set(storageKey, client);
            console.log('🔐 Reusing validated cached client for user:', userId);
            return client;
          } catch (error) {
            console.warn('🔐 Cached client invalid, removing:', key);
            clientCache.current.delete(key);
          }
        }
      }
    }
    
    // Create new client with proper configuration
    const client = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        storageKey: storageKey,
        storage: window.localStorage,
        persistSession: true,
        autoRefreshToken: true
      }
    });
    
    clientCache.current.set(storageKey, client);
    console.log('🔐 Created new cached client for key:', storageKey, 'total clients:', clientCache.current.size);
    return client;
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
          
          // Filter out any duplicate user sessions
          const uniqueSessionData = sessionData.filter((session: any, index: number, array: any[]) => 
            index === array.findIndex(s => s.user.id === session.user.id)
          );
          
          // Recreate sessions with consistent storage key generation
            const recreatedSessions = uniqueSessionData.map((sessionInfo: any) => {
              // Use the original timestamp to ensure consistent storage keys
              const originalTimestamp = new Date(sessionInfo.createdAt).getTime();
              const storageKey = `wmh_session_${sessionInfo.user.id}_${originalTimestamp}`;
              
              // Validate storage key exists before creating client
              const existingAuth = localStorage.getItem(`sb-${SUPABASE_URL.split('//')[1].split('.')[0]}-auth-token`);
              const client = getCachedClient(storageKey, sessionInfo.user.id, originalTimestamp);
              
              return {
                ...sessionInfo,
                supabaseClient: client,
                createdAt: new Date(sessionInfo.createdAt),
                storageKey // Store key for validation
              };
            });
          
          setSessions(recreatedSessions);
          
          // Validate active session exists
          if (storedActiveId && uniqueSessionData.some((s: any) => s.id === storedActiveId)) {
            setActiveSessionId(storedActiveId);
          } else if (uniqueSessionData.length > 0) {
            setActiveSessionId(uniqueSessionData[0].id);
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
            
            // Filter duplicates and use cached clients
            const uniqueSessionData = sessionData.filter((session: any, index: number, array: any[]) => 
              index === array.findIndex(s => s.user.id === session.user.id)
            );
            
            const recreatedSessions = uniqueSessionData.map((sessionInfo: any) => {
              const timestamp = new Date(sessionInfo.createdAt).getTime();
              const storageKey = `wmh_session_${sessionInfo.user.id}_${timestamp}`;
              const client = getCachedClient(storageKey);
              
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
      // Silently handle closed broadcast channel errors
      if (error instanceof Error && error.name !== 'InvalidStateError') {
        console.error('Error broadcasting session change:', error);
      }
    }
  }, []);

  const addSession = useCallback(async (user: User, session: Session): Promise<string> => {
    // Enhanced session deduplication with storage key consistency
    const existingSession = sessions.find(s => s.user.id === user.id);
    if (existingSession) {
      console.log('🔐 Session already exists for user:', user.email, 'updating existing session');
      
      // Update the existing session with fresh auth data
      const updatedSessions = sessions.map(s => 
        s.id === existingSession.id 
          ? { ...s, session, user }
          : s
      );
      setSessions(updatedSessions);
      setActiveSessionId(existingSession.id);
      broadcastSessionChange();
      return existingSession.id;
    }
    
    // Use consistent timestamp generation for stable storage keys
    const timestamp = generateSessionTimestamp();
    const sessionId = `session_${user.id}_${timestamp}`;
    const storageKey = `wmh_session_${user.id}_${timestamp}`;
    
    console.log('🔐 Creating session with consistent key:', storageKey);
    
    try {
      // Use cached client creation with validation
      const client = getCachedClient(storageKey, user.id, timestamp);

      // Set the session in the client with error handling
      await client.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token
      });

      // Fetch user profile with timeout to prevent hanging
      let userProfile = null;
      try {
        const profilePromise = client
          .from('profiles')
          .select('first_name, last_name')
          .eq('user_id', user.id)
          .single();
        
        // 5 second timeout for profile fetch
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Profile fetch timeout')), 5000)
        );
        
        const { data: profile } = await Promise.race([profilePromise, timeoutPromise]) as any;
        userProfile = profile;
      } catch (error) {
        console.warn('Error fetching user profile (non-critical):', error);
      }

      const newSession: SessionData = {
        id: sessionId,
        user,
        session,
        supabaseClient: client,
        userProfile,
        createdAt: new Date(timestamp) // Use consistent timestamp
      };

      setSessions(prev => [...prev, newSession]);
      setActiveSessionId(sessionId);
      broadcastSessionChange();
      
      console.log('🔐 Added new session:', sessionId, 'for user:', user.email, 'storage key:', storageKey);
      return sessionId;
    } catch (error) {
      console.error('🔐 Error adding session:', error);
      // Clean up cached client on error to prevent memory leaks
      clientCache.current.delete(storageKey);
      throw error;
    }
  }, [sessions, getCachedClient, broadcastSessionChange, generateSessionTimestamp]);

  const removeSession = useCallback((sessionId: string) => {
    setSessions(prev => {
      const session = prev.find(s => s.id === sessionId);
      if (session) {
        // Enhanced cleanup with consistent key generation
        const timestamp = new Date(session.createdAt).getTime();
        const storageKey = `wmh_session_${session.user.id}_${timestamp}`;
        
        console.log('🔐 Removing session with cleanup:', sessionId, 'storage key:', storageKey);
        
        // Remove from client cache with extensive cleanup
        clientCache.current.delete(storageKey);
        
        // Clean up any other cache entries for this user pattern
        const userPattern = `wmh_session_${session.user.id}_`;
        const keysToDelete = Array.from(clientCache.current.keys()).filter(key => 
          key.startsWith(userPattern)
        );
        keysToDelete.forEach(key => {
          clientCache.current.delete(key);
          console.log('🔐 Cleaned up orphaned client cache key:', key);
        });
        
        // Enhanced storage cleanup - more aggressive pattern matching
        const storageKeysToDelete = Object.keys(localStorage).filter(key => {
          return key.includes(`${session.user.id}_${timestamp}`) ||
                 key.includes(`${session.user.id}`) && key.includes('wmh_');
        });
        
        storageKeysToDelete.forEach(key => {
          try {
            localStorage.removeItem(key);
            console.log('🔐 Cleaned up storage key:', key);
          } catch (error) {
            console.warn('🔐 Error cleaning storage key:', key, error);
          }
        });
        
        // Also clean up session-specific storage like cart and wishlist
        const userSpecificKeys = [
          `cart_data_user_${session.user.id}`,
          `mobile-home-wishlist_user_${session.user.id}`
        ];
        
        userSpecificKeys.forEach(key => {
          if (localStorage.getItem(key)) {
            console.log('🔐 Preserving user data key (will be cleaned on app restart):', key);
          }
        });
        
        console.log('🔐 Removed session:', sessionId, 'for user:', session.user.email, 'cache size:', clientCache.current.size);
      }
      return prev.filter(s => s.id !== sessionId);
    });

    // Handle active session switching with better logic
    if (activeSessionId === sessionId) {
      setSessions(current => {
        const remaining = current.filter(s => s.id !== sessionId);
        const newActiveId = remaining.length > 0 ? remaining[0].id : null;
        setActiveSessionId(newActiveId);
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
      // Clean up all session-specific storage and cached clients
      const timestamp = new Date(session.createdAt).getTime();
      const storageKey = `wmh_session_${session.user.id}_${timestamp}`;
      
      // Remove from client cache
      clientCache.current.delete(storageKey);
      
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

  // Memory monitoring integration
  useEffect(() => {
    const monitorInterval = setInterval(() => {
      const clientCount = clientCache.current.size;
      const sessionCount = sessions.length;
      
      if (clientCount > sessionCount * 2) {
        console.warn('🔐 Client cache growing beyond expected size:', {
          clients: clientCount,
          sessions: sessionCount,
          ratio: clientCount / Math.max(sessionCount, 1)
        });
      }
    }, 2 * 60 * 1000); // Check every 2 minutes

    return () => clearInterval(monitorInterval);
  }, [sessions.length]);

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
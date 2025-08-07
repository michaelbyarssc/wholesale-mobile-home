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
  forceCleanUserSessions: (userId: string) => void;
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

  // Emergency session deduplication utility
  const forceCleanUserSessions = useCallback((userId: string) => {
    console.log('🚨 EMERGENCY: Force cleaning all sessions for user:', userId);
    
    // Remove from runtime state
    setSessions(prev => prev.filter(s => s.user.id !== userId));
    
    // Clean localStorage sessions data
    try {
      const storedSessions = localStorage.getItem('wmh_sessions');
      if (storedSessions) {
        const sessions = JSON.parse(storedSessions);
        const cleanedSessions = sessions.filter((s: any) => s.user.id !== userId);
        localStorage.setItem('wmh_sessions', JSON.stringify(cleanedSessions));
      }
    } catch (error) {
      console.error('🚨 Error cleaning localStorage sessions:', error);
    }
    
    // Clean all storage keys for this user
    const keysToRemove = Object.keys(localStorage).filter(key => 
      key.includes(userId) && (
        key.includes('wmh_') || 
        key.includes('sb-') ||
        key.includes('auth-token')
      )
    );
    
    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key);
        console.log('🚨 Removed orphaned key:', key);
      } catch (error) {
        console.warn('🚨 Failed to remove key:', key, error);
      }
    });
    
    // Clean client cache
    Array.from(clientCache.current.keys())
      .filter(key => key.includes(userId))
      .forEach(key => clientCache.current.delete(key));
      
    console.log('🚨 Emergency cleanup complete for user:', userId);
  }, []);

  // Storage-based deduplication with atomic locks
  const deduplicateStorageSessions = useCallback(() => {
    const lockKey = 'wmh_dedup_lock';
    const lockValue = Date.now().toString();
    const lockTimeout = 5000; // 5 second timeout
    
    try {
      // Atomic lock acquisition
      const existingLock = localStorage.getItem(lockKey);
      if (existingLock && (Date.now() - parseInt(existingLock)) < lockTimeout) {
        console.log('🔐 Deduplication already in progress, skipping');
        return false;
      }
      
      localStorage.setItem(lockKey, lockValue);
      
      // Perform deduplication
      const storedSessions = localStorage.getItem('wmh_sessions');
      if (storedSessions) {
        const sessions = JSON.parse(storedSessions);
        const userCounts = new Map<string, number>();
        
        // Count sessions per user
        sessions.forEach((session: any) => {
          const count = userCounts.get(session.user.id) || 0;
          userCounts.set(session.user.id, count + 1);
        });
        
        // Find duplicates and clean them
        const duplicateUsers = Array.from(userCounts.entries())
          .filter(([_, count]) => count > 1)
          .map(([userId, _]) => userId);
          
        if (duplicateUsers.length > 0) {
          console.log('🔐 Found duplicate users in storage:', duplicateUsers);
          
          // Keep only the most recent session per user
          const dedupedSessions = sessions.reduce((acc: any[], session: any) => {
            const existingIndex = acc.findIndex(s => s.user.id === session.user.id);
            if (existingIndex === -1) {
              acc.push(session);
            } else {
              // Keep the more recent session
              const existing = acc[existingIndex];
              const sessionTime = new Date(session.createdAt).getTime();
              const existingTime = new Date(existing.createdAt).getTime();
              
              if (sessionTime > existingTime) {
                acc[existingIndex] = session;
                console.log('🔐 Replaced older session for user:', session.user.email);
              }
            }
            return acc;
          }, []);
          
          localStorage.setItem('wmh_sessions', JSON.stringify(dedupedSessions));
          console.log('🔐 Deduplication complete, removed', sessions.length - dedupedSessions.length, 'duplicate sessions');
        }
      }
      
      return true;
    } catch (error) {
      console.error('🔐 Error during deduplication:', error);
      return false;
    } finally {
      // Release lock
      try {
        const currentLock = localStorage.getItem(lockKey);
        if (currentLock === lockValue) {
          localStorage.removeItem(lockKey);
        }
      } catch (error) {
        console.warn('🔐 Error releasing deduplication lock:', error);
      }
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

        // Perform storage deduplication before loading
        deduplicateStorageSessions();

        const storedSessions = localStorage.getItem('wmh_sessions');
        const storedActiveId = localStorage.getItem('wmh_active_session');
        
        if (storedSessions) {
          const sessionData = JSON.parse(storedSessions);
          
          // Additional runtime deduplication as safety net
          const uniqueSessionData = sessionData.filter((session: any, index: number, array: any[]) => 
            index === array.findIndex(s => s.user.id === session.user.id)
          );
          
          // Log if we found any runtime duplicates that escaped storage dedup
          if (sessionData.length !== uniqueSessionData.length) {
            console.warn('🔐 Found runtime duplicates that escaped storage dedup:', 
              sessionData.length - uniqueSessionData.length);
          }
          
          // Recreate sessions with consistent storage key generation
          const recreatedSessions = uniqueSessionData.map((sessionInfo: any) => {
            // Use the original timestamp to ensure consistent storage keys
            const originalTimestamp = new Date(sessionInfo.createdAt).getTime();
            const storageKey = `wmh_session_${sessionInfo.user.id}_${originalTimestamp}`;
            
            // Validate storage key exists before creating client
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
        // Also run deduplication periodically
        deduplicateStorageSessions();
      }
    }, 5 * 60 * 1000); // Check every 5 minutes
    
    return () => {
      if (storageValidationInterval.current) {
        clearInterval(storageValidationInterval.current);
      }
    };
  }, [checkStorageIntegrity, cleanupOrphanedStorage, getCachedClient, deduplicateStorageSessions]);

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

  // Optimized cross-tab communication with enhanced deduplication
  useEffect(() => {
    let syncTimeout: NodeJS.Timeout | null = null;
    
    const debouncedSync = () => {
      if (syncTimeout) clearTimeout(syncTimeout);
      syncTimeout = setTimeout(() => {
        try {
          // Run deduplication before sync
          deduplicateStorageSessions();
          
          const storedSessions = localStorage.getItem('wmh_sessions');
          const storedActiveId = localStorage.getItem('wmh_active_session');
          
          if (storedSessions) {
            const sessionData = JSON.parse(storedSessions);
            
            // Validate single session per user during sync
            const userSessionCounts = new Map<string, number>();
            sessionData.forEach((session: any) => {
              const count = userSessionCounts.get(session.user.id) || 0;
              userSessionCounts.set(session.user.id, count + 1);
            });
            
            // Log any duplicates found during sync
            const duplicateUsers = Array.from(userSessionCounts.entries())
              .filter(([_, count]) => count > 1);
            
            if (duplicateUsers.length > 0) {
              console.warn('🔐 SYNC: Found duplicates for users:', duplicateUsers.map(([id, count]) => `${id}:${count}`));
            }
            
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
      }, 50); // Reduced to 50ms for faster sync
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
      } else if (event.data.type === 'forced_logout') {
        // Handle forced logout from another tab/device
        const { userId, reason } = event.data;
        console.log('🔐 Received forced logout broadcast for user:', userId, 'reason:', reason);
        
        // Remove any sessions for this user
        setSessions(prev => {
          const userSessions = prev.filter(s => s.user.id === userId);
          if (userSessions.length > 0) {
            console.log('🔐 Removing', userSessions.length, 'sessions due to forced logout');
            // Clear storage for these sessions
            userSessions.forEach(session => {
              const timestamp = new Date(session.createdAt).getTime();
              const storageKey = `wmh_session_${session.user.id}_${timestamp}`;
              clientCache.current.delete(storageKey);
            });
          }
          return prev.filter(s => s.user.id !== userId);
        });
        
        // If the removed user was active, clear active session
        setActiveSessionId(prevActiveId => {
          const activeSession = sessions.find(s => s.id === prevActiveId);
          if (activeSession && activeSession.user.id === userId) {
            return null;
          }
          return prevActiveId;
        });
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
  }, [getCachedClient, deduplicateStorageSessions]);

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

  const removeSession = useCallback((sessionId: string) => {
    console.log('🔐 Starting session removal for:', sessionId);
    
    // Disable cross-tab sync during logout
    const originalBroadcast = broadcastChannelRef.current;
    broadcastChannelRef.current = null;
    
    try {
      const sessionToRemove = sessions.find(s => s.id === sessionId);
      if (!sessionToRemove) {
        console.warn('🔐 Session not found for removal:', sessionId);
        return;
      }
      
      const timestamp = new Date(sessionToRemove.createdAt).getTime();
      const storageKey = `wmh_session_${sessionToRemove.user.id}_${timestamp}`;
      
      console.log('🔐 Removing session with cleanup:', sessionId, 'storage key:', storageKey);
      
      // Force logout on client before removal
      try {
        if (sessionToRemove.supabaseClient) {
          sessionToRemove.supabaseClient.auth.signOut();
        }
      } catch (error) {
        console.warn('🔐 Client signOut failed (non-critical):', error);
      }
      
      // Synchronous client cache cleanup
      clientCache.current.delete(storageKey);
      
      // Clean up any other cache entries for this user
      const userPattern = `wmh_session_${sessionToRemove.user.id}_`;
      Array.from(clientCache.current.keys())
        .filter(key => key.startsWith(userPattern))
        .forEach(key => {
          clientCache.current.delete(key);
          console.log('🔐 Cleaned up orphaned client cache key:', key);
        });
      
      // Complete storage cleanup with fallback patterns
      const storageKeysToDelete = Object.keys(localStorage).filter(key => {
        // Primary pattern matches
        if (key.includes(`${sessionToRemove.user.id}_${timestamp}`)) return true;
        if (key.includes(`${sessionToRemove.user.id}`) && key.includes('wmh_')) return true;
        // Auth token cleanup
        if (key.includes('auth-token') && key.includes(sessionToRemove.user.id)) return true;
        return false;
      });
      
      storageKeysToDelete.forEach(key => {
        try {
          localStorage.removeItem(key);
          console.log('🔐 Cleaned up storage key:', key);
        } catch (error) {
          console.warn('🔐 Error cleaning storage key:', key, error);
        }
      });
      
      // Clear auth tokens using Supabase pattern
      try {
        const authKeys = Object.keys(localStorage).filter(key => 
          key.includes('sb-') && key.includes('auth-token')
        );
        authKeys.forEach(key => localStorage.removeItem(key));
      } catch (error) {
        console.warn('🔐 Auth token cleanup failed:', error);
      }
      
      // Single atomic state update to prevent race conditions
      setSessions(prev => {
        const filteredSessions = prev.filter(s => s.id !== sessionId);
        
        // Handle active session switching
        if (activeSessionId === sessionId) {
          const newActiveId = filteredSessions.length > 0 ? filteredSessions[0].id : null;
          setActiveSessionId(newActiveId);
          console.log('🔐 Active session switched to:', newActiveId);
        }
        
        console.log('🔐 Session removed:', sessionId, 'remaining sessions:', filteredSessions.length);
        return filteredSessions;
      });
      
    } finally {
      // Re-enable cross-tab sync and broadcast change
      setTimeout(() => {
        broadcastChannelRef.current = originalBroadcast;
        if (originalBroadcast) {
          try {
            originalBroadcast.postMessage({ type: 'session_logout', sessionId });
          } catch (error) {
            console.warn('🔐 Logout broadcast failed:', error);
          }
        }
      }, 100);
    }
  }, [sessions, activeSessionId]);

  const addSession = useCallback(async (user: User, session: Session): Promise<string> => {
    // ENHANCED SINGLE SESSION ENFORCEMENT: Check both runtime state AND storage
    console.log('🔐 SINGLE SESSION ENFORCEMENT: Checking for existing sessions for user:', user.email);
    
    // First, clean any existing sessions from storage atomically
    try {
      const lockKey = 'wmh_session_creation_lock';
      const lockValue = Date.now().toString();
      localStorage.setItem(lockKey, lockValue);
      
      // Clean storage first
      const storedSessions = localStorage.getItem('wmh_sessions');
      if (storedSessions) {
        const sessions = JSON.parse(storedSessions);
        const existingUserSessions = sessions.filter((s: any) => s.user.id === user.id);
        
        if (existingUserSessions.length > 0) {
          console.log('🔐 Found', existingUserSessions.length, 'existing storage sessions for user:', user.email);
          
          // Remove all sessions for this user from storage
          const cleanedSessions = sessions.filter((s: any) => s.user.id !== user.id);
          localStorage.setItem('wmh_sessions', JSON.stringify(cleanedSessions));
          
          // Clean all related storage keys
          existingUserSessions.forEach((existingSession: any) => {
            const timestamp = new Date(existingSession.createdAt).getTime();
            const storagePattern = `wmh_session_${user.id}_${timestamp}`;
            
            Object.keys(localStorage).forEach(key => {
              if (key.includes(user.id) && (key.includes('wmh_') || key.includes('sb-'))) {
                try {
                  localStorage.removeItem(key);
                  console.log('🔐 Cleaned storage key:', key);
                } catch (error) {
                  console.warn('🔐 Failed to clean key:', key);
                }
              }
            });
          });
        }
      }
      
      // Release lock
      localStorage.removeItem(lockKey);
    } catch (error) {
      console.error('🔐 Error during storage cleanup:', error);
    }
    
    // Second, check runtime state and clean any existing sessions
    const existingSession = sessions.find(s => s.user.id === user.id);
    if (existingSession) {
      console.log('🔐 RUNTIME: Found existing session for user:', user.email, 'logging out previous session');
      
      try {
        // Force logout the existing session's client
        await existingSession.supabaseClient.auth.signOut();
        console.log('🔐 Successfully logged out existing session client');
      } catch (error) {
        console.warn('🔐 Error logging out existing session client (non-critical):', error);
      }
      
      // Remove the existing session immediately
      removeSession(existingSession.id);
    }
    
    // Broadcast forced logout to other tabs/devices
    if (broadcastChannelRef.current) {
      try {
        broadcastChannelRef.current.postMessage({ 
          type: 'forced_logout', 
          userId: user.id,
          reason: 'new_login_detected'
        });
        console.log('🔐 Broadcasted forced logout for user:', user.email);
      } catch (error) {
        console.warn('🔐 Could not broadcast forced logout:', error);
      }
    }
    
    // Use consistent timestamp generation for stable storage keys
    const timestamp = generateSessionTimestamp();
    const sessionId = `session_${user.id}_${timestamp}`;
    const storageKey = `wmh_session_${user.id}_${timestamp}`;
    
    console.log('🔐 Creating new session with key:', storageKey, 'for user:', user.email);
    
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
  }, [sessions, getCachedClient, broadcastSessionChange, generateSessionTimestamp, removeSession]);

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
    updateSessionProfile,
    forceCleanUserSessions
  };

  return (
    <SessionManagerContext.Provider value={value}>
      {children}
    </SessionManagerContext.Provider>
  );
};
import { useCallback } from 'react';
import { useSessionManager } from '@/contexts/SessionManagerContext';

export const useSessionRecovery = () => {
  const { sessions, clearAllSessions, forceCleanUserSessions } = useSessionManager();

  // Emergency cleanup for corrupted sessions
  const emergencyCleanup = useCallback(() => {
    console.log('🚨 Performing emergency session cleanup');
    
    try {
      // Clear all session-related localStorage with comprehensive patterns
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.startsWith('wmh_') ||
          key.includes('auth-token') ||
          key.startsWith('sb-') ||
          key.includes('session') ||
          key.includes('cart_data') ||
          key.includes('wishlist')
        )) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => {
        try {
          localStorage.removeItem(key);
          console.log('🚨 Removed emergency key:', key);
        } catch (error) {
          console.warn('🚨 Could not remove key:', key, error);
        }
      });
      
      // Clear sessions from context
      clearAllSessions();
      
      // Force page reload for complete state reset
      setTimeout(() => {
        console.log('🚨 Emergency cleanup complete, reloading page');
        window.location.reload();
      }, 500);
      
      return true;
    } catch (error) {
      console.error('❌ Emergency cleanup failed:', error);
      return false;
    }
  }, [clearAllSessions]);

  // Fix duplicate sessions for same user
  const fixDuplicateSessions = useCallback(() => {
    console.log('🔧 Checking for duplicate sessions');
    
    const userSessionMap = new Map();
    const duplicates = [];
    
    sessions.forEach(session => {
      const userId = session.user.id;
      if (userSessionMap.has(userId)) {
        duplicates.push(session.id);
      } else {
        userSessionMap.set(userId, session.id);
      }
    });
    
    if (duplicates.length > 0) {
      console.log('🔧 Found duplicate sessions:', duplicates);
      // Note: In a real implementation, you'd call removeSession for each duplicate
      // But that would require access to the removeSession function
      return duplicates;
    }
    
    console.log('✅ No duplicate sessions found');
    return [];
  }, [sessions]);

  // Force clean all sessions for a specific user (emergency use)
  const forceCleanSpecificUser = useCallback((userId: string) => {
    console.log('🚨 EMERGENCY: Force cleaning sessions for specific user:', userId);
    try {
      forceCleanUserSessions(userId);
      return true;
    } catch (error) {
      console.error('🚨 Emergency user cleanup failed:', error);
      return false;
    }
  }, [forceCleanUserSessions]);

  return {
    emergencyCleanup,
    fixDuplicateSessions,
    forceCleanSpecificUser,
    hasMultipleSessions: sessions.length > 1,
    sessionCount: sessions.length
  };
};
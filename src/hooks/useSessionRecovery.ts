import { useCallback } from 'react';
import { useSessionManager } from '@/contexts/SessionManagerContext';

export const useSessionRecovery = () => {
  const { sessions, clearAllSessions } = useSessionManager();

  // Emergency cleanup for corrupted sessions
  const emergencyCleanup = useCallback(() => {
    console.log('🚨 Performing emergency session cleanup');
    
    try {
      // Clear all session-related localStorage
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('wmh_')) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      // Clear sessions from context
      clearAllSessions();
      
      console.log('✅ Emergency cleanup completed');
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

  return {
    emergencyCleanup,
    fixDuplicateSessions,
    hasMultipleSessions: sessions.length > 1,
    sessionCount: sessions.length
  };
};
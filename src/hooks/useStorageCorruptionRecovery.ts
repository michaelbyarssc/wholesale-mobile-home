import { useCallback } from 'react';

export const useStorageCorruptionRecovery = () => {
  
  // Clean up orphaned storage keys
  const cleanupOrphanedStorage = useCallback(() => {
    try {
      const wmhKeys = Object.keys(localStorage).filter(key => key.startsWith('wmh_'));
      const sessionsData = localStorage.getItem('wmh_sessions');
      
      if (sessionsData) {
        const sessions = JSON.parse(sessionsData);
        const validUserIds = sessions.map((s: any) => s.user.id);
        
        // Remove storage keys for users not in current sessions
        wmhKeys.forEach(key => {
          if (key.startsWith('wmh_session_') || key.startsWith('wmh_user_')) {
            const userId = key.split('_')[2];
            if (userId && !validUserIds.includes(userId)) {
              localStorage.removeItem(key);
              console.log('🔐 Cleaned up orphaned storage key:', key);
            }
          }
        });
      }
    } catch (error) {
      console.error('🔐 Error cleaning up orphaned storage:', error);
    }
  }, []);

  // Check for and recover from storage corruption
  const checkStorageIntegrity = useCallback(() => {
    try {
      // Check for corrupted session data
      const sessionsData = localStorage.getItem('wmh_sessions');
      const activeSessionId = localStorage.getItem('wmh_active_session');
      
      if (sessionsData) {
        const parsed = JSON.parse(sessionsData);
        
        // Validate structure
        if (!Array.isArray(parsed)) {
          throw new Error('Sessions data is not an array');
        }
        
        // Validate each session
        for (const session of parsed) {
          if (!session.id || !session.user || !session.session) {
            throw new Error('Invalid session structure');
          }
        }
        
        // Validate active session exists in sessions
        if (activeSessionId && !parsed.some(s => s.id === activeSessionId)) {
          console.warn('🔐 Active session not found in sessions, clearing');
          localStorage.removeItem('wmh_active_session');
        }
      }
      
      return true;
    } catch (error) {
      console.error('🔐 Storage corruption detected:', error);
      
      // Clear corrupted data
      localStorage.removeItem('wmh_sessions');
      localStorage.removeItem('wmh_active_session');
      
      return false;
    }
  }, []);


  return { 
    checkStorageIntegrity,
    cleanupOrphanedStorage 
  };
};
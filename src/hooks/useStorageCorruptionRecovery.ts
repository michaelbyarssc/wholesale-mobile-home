import { useCallback } from 'react';

export const useStorageCorruptionRecovery = () => {

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


  return { checkStorageIntegrity };
};
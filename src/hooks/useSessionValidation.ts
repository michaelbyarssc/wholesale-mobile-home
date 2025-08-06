import { useEffect, useCallback } from 'react';
import { useSessionManager } from '@/contexts/SessionManagerContext';

export const useSessionValidation = () => {
  const { sessions, activeSessionId, removeSession } = useSessionManager();

  // Validate session integrity
  const validateSession = useCallback(async (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return false;

    try {
      // Check if the session is still valid
      const { data: { user }, error } = await session.supabaseClient.auth.getUser();
      
      if (error || !user) {
        console.warn('🔐 Invalid session detected, removing:', sessionId);
        removeSession(sessionId);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('🔐 Error validating session:', error);
      removeSession(sessionId);
      return false;
    }
  }, [sessions, removeSession]);

  // Validate sessions on demand only - remove aggressive periodic validation
  const validateAllSessions = useCallback(async () => {
    const validationPromises = sessions.map(session => validateSession(session.id));
    await Promise.allSettled(validationPromises);
  }, [sessions, validateSession]);
  
  // Only validate when explicitly requested or on session switch
  const validateActiveSession = useCallback(async () => {
    if (activeSessionId) {
      await validateSession(activeSessionId);
    }
  }, [activeSessionId, validateSession]);

  return { 
    validateSession,
    validateAllSessions,
    validateActiveSession 
  };
};
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

  // Validate all sessions periodically
  useEffect(() => {
    const validateAllSessions = async () => {
      for (const session of sessions) {
        await validateSession(session.id);
      }
    };

    // Validate sessions every 5 minutes
    const interval = setInterval(validateAllSessions, 5 * 60 * 1000);
    
    // Validate on mount
    validateAllSessions();

    return () => clearInterval(interval);
  }, [sessions, validateSession]);

  // Validate active session on switch
  useEffect(() => {
    if (activeSessionId) {
      validateSession(activeSessionId);
    }
  }, [activeSessionId, validateSession]);

  return { validateSession };
};
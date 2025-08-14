import { useEffect, useCallback } from 'react';
import { useSessionManager } from '@/contexts/SessionManagerContext';

export const useSessionValidation = () => {
  const { sessions, activeSessionId, removeSession } = useSessionManager();

  // Validate session integrity with better error handling
  const validateSession = useCallback(async (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return false;

    try {
      // Check if the session is still valid
      const { data: { user }, error } = await session.supabaseClient.auth.getUser();
      
      if (error) {
        if (error.message?.includes('session_not_found') || 
            error.message?.includes('Session not found') ||
            error.message?.includes('Failed to fetch')) {
          console.warn('🔐 Session expired or invalid, removing:', sessionId);
          removeSession(sessionId);
          return false;
        }
        
        // For other errors, don't remove session immediately
        console.warn('🔐 Session validation error (not removing):', error.message);
        return false;
      }
      
      if (!user) {
        console.warn('🔐 No user in session, removing:', sessionId);
        removeSession(sessionId);
        return false;
      }
      
      return true;
    } catch (error: any) {
      console.error('🔐 Error validating session:', error);
      
      // Only remove session for specific errors that indicate it's truly invalid
      if (error?.message?.includes('session_not_found') || 
          error?.message?.includes('Session not found') ||
          error?.message?.includes('Failed to fetch')) {
        removeSession(sessionId);
      }
      
      return false;
    }
  }, [sessions, removeSession]);

  // Add periodic validation for critical scenarios - less aggressive
  useEffect(() => {
    const validateCriticalSessions = async () => {
      // Only validate if we have active sessions and one is currently active
      if (sessions.length > 0 && activeSessionId) {
        // Validate just the active session periodically
        await validateSession(activeSessionId);
      }
    };

    // Validate active session every 5 minutes (reasonable for active use)
    const interval = setInterval(validateCriticalSessions, 5 * 60 * 1000);
    
    // Validate on mount if we have an active session
    if (activeSessionId) {
      validateCriticalSessions();
    }

    return () => clearInterval(interval);
  }, [activeSessionId, validateSession]); // Depend on active session only
  
  // Validate all sessions on demand only
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
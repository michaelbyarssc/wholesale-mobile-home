import { useEffect, useCallback, useRef } from 'react';
import { useSessionManager } from '@/contexts/SessionManagerContext';

export const useSessionValidation = () => {
  const { sessions, activeSessionId, removeSession } = useSessionManager();

  // Validation state to prevent race conditions
  const validationInProgress = useRef<Set<string>>(new Set());

  // Enhanced session validation with graceful error handling
  const validateSession = useCallback(async (sessionId: string) => {
    // Prevent concurrent validation of same session
    if (validationInProgress.current.has(sessionId)) {
      console.log('🔐 Session validation already in progress:', sessionId);
      return true; // Assume valid during concurrent validation
    }

    const session = sessions.find(s => s.id === sessionId);
    if (!session) {
      console.warn('🔐 Session not found for validation:', sessionId);
      return false;
    }

    // Mark as being validated
    validationInProgress.current.add(sessionId);
    
    try {
      // Shorter timeout to prevent hanging and faster recovery
      const validationPromise = session.supabaseClient.auth.getUser();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Validation timeout')), 1500)
      );
      
      const { data: { user }, error } = await Promise.race([
        validationPromise, 
        timeoutPromise
      ]) as any;
      
      if (error || !user) {
        // Don't remove session immediately, just log the issue
        console.warn('🔐 Session validation failed, user may need to re-login:', sessionId);
        return false;
      }
      
      console.log('🔐 Session validation successful:', sessionId);
      return true;
    } catch (error) {
      // Handle timeout errors more gracefully
      if (error instanceof Error && error.message === 'Validation timeout') {
        console.warn('🔐 Session validation timeout (network issue):', sessionId);
        return true; // Assume valid on timeout to prevent logout loops
      }
      console.error('🔐 Error validating session:', error);
      return false;
    } finally {
      // Always clean up validation state
      validationInProgress.current.delete(sessionId);
    }
  }, [sessions, removeSession]);

  // Optimized periodic validation - much less aggressive
  useEffect(() => {
    let validationTimer: NodeJS.Timeout | null = null;
    let lastValidationTime = 0;
    
    const smartValidation = async () => {
      const now = Date.now();
      
      // Only validate if enough time has passed and we have an active session
      if (sessions.length > 0 && activeSessionId && (now - lastValidationTime) > 900000) { // 15 minutes
        try {
          const isValid = await validateSession(activeSessionId);
          lastValidationTime = now;
          
          if (!isValid) {
            console.warn('🔐 Active session may need refresh');
          } else {
            console.log('🔐 Active session validation passed');
          }
        } catch (error) {
          console.error('🔐 Smart validation error:', error);
        }
      }
    };

    // No initial validation on mount - wait for first interval
    // Set up periodic validation with much longer intervals
    validationTimer = setInterval(smartValidation, 15 * 60 * 1000); // Every 15 minutes
    
    return () => {
      if (validationTimer) {
        clearInterval(validationTimer);
      }
    };
  }, [activeSessionId, sessions.length, validateSession]); // Minimal dependencies
  
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
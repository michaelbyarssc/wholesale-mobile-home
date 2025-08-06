import { useEffect, useCallback, useRef } from 'react';
import { useSessionManager } from '@/contexts/SessionManagerContext';

export const useSessionValidation = () => {
  const { sessions, activeSessionId, removeSession } = useSessionManager();

  // Validation state to prevent race conditions
  const validationInProgress = useRef<Set<string>>(new Set());

  // Validate session integrity with conflict prevention
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
      // Quick timeout to prevent hanging validation
      const validationPromise = session.supabaseClient.auth.getUser();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Validation timeout')), 3000)
      );
      
      const { data: { user }, error } = await Promise.race([
        validationPromise, 
        timeoutPromise
      ]) as any;
      
      if (error || !user) {
        console.warn('🔐 Invalid session detected, scheduling removal:', sessionId);
        // Schedule removal to avoid race conditions during validation
        setTimeout(() => removeSession(sessionId), 100);
        return false;
      }
      
      console.log('🔐 Session validation successful:', sessionId);
      return true;
    } catch (error) {
      console.error('🔐 Error validating session:', error);
      // Schedule removal on error
      setTimeout(() => removeSession(sessionId), 100);
      return false;
    } finally {
      // Always clean up validation state
      validationInProgress.current.delete(sessionId);
    }
  }, [sessions, removeSession]);

  // Smart periodic validation - less aggressive, more efficient
  useEffect(() => {
    let validationTimer: NodeJS.Timeout | null = null;
    let lastValidationTime = 0;
    
    const smartValidation = async () => {
      const now = Date.now();
      
      // Only validate if enough time has passed and we have an active session
      if (sessions.length > 0 && activeSessionId && (now - lastValidationTime) > 300000) { // 5 minutes
        try {
          const isValid = await validateSession(activeSessionId);
          lastValidationTime = now;
          
          if (!isValid) {
            console.warn('🔐 Active session invalid, sessions may need refresh');
          } else {
            console.log('🔐 Active session validation passed');
          }
        } catch (error) {
          console.error('🔐 Smart validation error:', error);
        }
      }
    };

    // Initial validation on mount (if session exists and hasn't been validated recently)
    if (activeSessionId && sessions.length > 0) {
      setTimeout(smartValidation, 1000); // Delay initial validation by 1 second
    }

    // Set up periodic validation with longer intervals
    validationTimer = setInterval(smartValidation, 10 * 60 * 1000); // Every 10 minutes
    
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
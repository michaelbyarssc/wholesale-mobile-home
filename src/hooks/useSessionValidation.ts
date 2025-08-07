import { useEffect, useCallback, useRef } from 'react';
import { useSessionManager } from '@/contexts/SessionManagerContext';

export const useSessionValidation = () => {
  const { sessions, activeSessionId, removeSession } = useSessionManager();

  // Validation state to prevent race conditions
  const validationInProgress = useRef<Set<string>>(new Set());

  // Enhanced session validation with error detection and auto-cleanup
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
        setTimeout(() => reject(new Error('Validation timeout')), 1000)
      );
      
      const { data: { user }, error } = await Promise.race([
        validationPromise, 
        timeoutPromise
      ]) as any;
      
      // Check for specific error codes that indicate invalid sessions
      if (error) {
        console.warn('🔐 Session validation error:', error);
        
        // Handle session_not_found and other auth errors
        if (error.message?.includes('session_not_found') || 
            error.message?.includes('invalid_token') ||
            error.message?.includes("session id doesn't exist") ||
            error.status === 403) {
          console.error('🚨 CRITICAL: Invalid session detected, auto-removing:', sessionId);
          
          // Auto-remove invalid session
          setTimeout(() => {
            removeSession(sessionId);
            
            // Clean localStorage for this session
            const userId = session.user.id;
            Object.keys(localStorage).forEach(key => {
              if (key.includes(userId)) {
                try {
                  localStorage.removeItem(key);
                  console.log('🚨 Auto-cleaned invalid session key:', key);
                } catch (cleanError) {
                  console.warn('🚨 Failed to clean key:', key, cleanError);
                }
              }
            });
          }, 0);
          
          return false;
        }
        
        return false;
      }
      
      if (!user) {
        console.warn('🔐 Session validation failed - no user returned:', sessionId);
        return false;
      }
      
      console.log('🔐 Session validation successful:', sessionId);
      return true;
    } catch (error) {
      // Handle timeout errors and other validation failures
      if (error instanceof Error && error.message === 'Validation timeout') {
        console.warn('🔐 Session validation timeout (network issue):', sessionId);
        return true; // Assume valid on timeout to prevent logout loops
      }
      
      console.error('🔐 Error validating session:', error);
      
      // Check if this looks like a session corruption issue
      if (error instanceof Error && (
        error.message.includes('session') || 
        error.message.includes('auth') ||
        error.message.includes('token')
      )) {
        console.warn('🚨 Possible session corruption detected for:', sessionId);
        return false;
      }
      
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
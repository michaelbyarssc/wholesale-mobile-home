import { useEffect, useCallback, useRef } from 'react';
import { useSessionManager } from '@/contexts/SessionManagerContext';

/**
 * Optimized session validation hook that reduces redundant validation calls
 * and prevents authentication loops
 */
export const useOptimizedSessionValidation = () => {
  const { sessions, activeSessionId, removeSession } = useSessionManager();
  
  // Track validation state to prevent redundant calls
  const validationInProgress = useRef<Set<string>>(new Set());
  const lastValidationTime = useRef<Map<string, number>>(new Map());
  const validationCooldown = 5 * 60 * 1000; // 5 minutes cooldown between validations

  // Validate session with cooldown and deduplication
  const validateSession = useCallback(async (sessionId: string): Promise<boolean> => {
    // Check if validation is already in progress for this session
    if (validationInProgress.current.has(sessionId)) {
      console.log('🔐 Validation already in progress for session:', sessionId);
      return true; // Assume valid to prevent blocking
    }

    // Check cooldown period
    const lastValidation = lastValidationTime.current.get(sessionId);
    const now = Date.now();
    if (lastValidation && (now - lastValidation) < validationCooldown) {
      console.log('🔐 Session validation on cooldown for:', sessionId);
      return true; // Assume valid during cooldown
    }

    const session = sessions.find(s => s.id === sessionId);
    if (!session) {
      console.warn('🔐 Session not found for validation:', sessionId);
      return false;
    }

    // Mark validation as in progress
    validationInProgress.current.add(sessionId);
    lastValidationTime.current.set(sessionId, now);

    try {
      // Simple validation - just check if we can get user info
      const { data: { user }, error } = await session.supabaseClient.auth.getUser();
      
      if (error || !user) {
        console.warn('🔐 Session validation failed, removing:', sessionId, error?.message);
        removeSession(sessionId);
        return false;
      }
      
      console.log('🔐 Session validation successful for:', sessionId);
      return true;
    } catch (error) {
      console.error('🔐 Session validation error:', error);
      // Don't remove session on validation error - could be network issue
      return true; // Assume valid to prevent removal on temporary errors
    } finally {
      // Remove from in-progress set
      validationInProgress.current.delete(sessionId);
    }
  }, [sessions, removeSession]);

  // Validate active session only when absolutely necessary
  const validateActiveSession = useCallback(async (): Promise<boolean> => {
    if (!activeSessionId) {
      return false;
    }
    
    return validateSession(activeSessionId);
  }, [activeSessionId, validateSession]);

  // Clean up validation state when sessions change
  useEffect(() => {
    const currentSessionIds = new Set(sessions.map(s => s.id));
    
    // Clean up validation tracking for removed sessions
    for (const sessionId of validationInProgress.current) {
      if (!currentSessionIds.has(sessionId)) {
        validationInProgress.current.delete(sessionId);
      }
    }
    
    for (const [sessionId] of lastValidationTime.current) {
      if (!currentSessionIds.has(sessionId)) {
        lastValidationTime.current.delete(sessionId);
      }
    }
  }, [sessions]);

  // Emergency session reset function
  const resetSessionValidation = useCallback(() => {
    console.log('🔐 Resetting session validation state');
    validationInProgress.current.clear();
    lastValidationTime.current.clear();
  }, []);

  return { 
    validateSession,
    validateActiveSession,
    resetSessionValidation
  };
};
import { useCallback, useRef, useEffect } from 'react';
import { AuthStabilizer } from '@/utils/authStabilizer';
import { devLog } from '@/utils/environmentUtils';

/**
 * Enhanced auth stabilizer hook with state management
 */
export const useAuthStabilizer = (userId?: string) => {
  const stateRef = useRef({
    isInitializing: false,
    lastInitialization: 0,
    attempts: 0
  });

  const canInitialize = useCallback((forceUserId?: string) => {
    const id = forceUserId || userId;
    if (!id) return false;
    
    const now = Date.now();
    const state = stateRef.current;
    
    // Prevent rapid initialization attempts
    if (state.isInitializing) {
      devLog(`⏭️ Skipping initialization - already in progress for ${id}`);
      return false;
    }
    
    // Exponential backoff for failed attempts
    const backoffTime = Math.min(1000 * Math.pow(2, state.attempts), 30000);
    if (now - state.lastInitialization < backoffTime) {
      devLog(`⏭️ Skipping initialization - backoff period for ${id}`);
      return false;
    }
    
    return true;
  }, [userId]);

  const performInitialization = useCallback(async <T>(
    initFn: () => Promise<T>,
    onSuccess?: (result: T) => void,
    onError?: (error: Error) => void
  ): Promise<T | null> => {
    if (!userId || !canInitialize()) {
      return null;
    }

    const state = stateRef.current;
    state.isInitializing = true;
    state.lastInitialization = Date.now();

    try {
      devLog(`🔄 Starting initialization for ${userId}`);
      const result = await initFn();
      
      // Reset attempts on success
      state.attempts = 0;
      onSuccess?.(result);
      
      devLog(`✅ Initialization successful for ${userId}`);
      return result;
    } catch (error) {
      state.attempts++;
      const err = error instanceof Error ? error : new Error(String(error));
      onError?.(err);
      
      devLog(`❌ Initialization failed for ${userId} (attempt ${state.attempts}):`, err);
      return null;
    } finally {
      state.isInitializing = false;
    }
  }, [userId, canInitialize]);

  const resetState = useCallback(() => {
    stateRef.current = {
      isInitializing: false,
      lastInitialization: 0,
      attempts: 0
    };
    if (userId) {
      AuthStabilizer.setInitializing(userId, false);
    }
  }, [userId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (userId) {
        AuthStabilizer.setInitializing(userId, false);
      }
    };
  }, [userId]);

  return {
    canInitialize,
    performInitialization,
    resetState,
    isInitializing: stateRef.current.isInitializing,
    attempts: stateRef.current.attempts
  };
};
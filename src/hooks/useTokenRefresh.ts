import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

interface TokenRefreshConfig {
  maxRetries: number;
  retryDelayMs: number;
  backoffMultiplier: number;
}

const DEFAULT_CONFIG: TokenRefreshConfig = {
  maxRetries: 3,
  retryDelayMs: 1000,
  backoffMultiplier: 2
};

export const useTokenRefresh = (config: Partial<TokenRefreshConfig> = {}) => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const refreshInProgress = useRef(false);
  const lastRefreshAttempt = useRef(0);
  const refreshRetryCount = useRef(0);

  const refreshTokenWithRetry = useCallback(async (): Promise<{ success: boolean; error?: any }> => {
    // Prevent concurrent refresh attempts
    if (refreshInProgress.current) {
      logger.debug('🔐 TOKEN REFRESH: Already in progress, skipping');
      return { success: false, error: new Error('Refresh already in progress') };
    }

    // Rate limiting: don't attempt refresh more than once per 5 seconds
    const now = Date.now();
    if (now - lastRefreshAttempt.current < 5000) {
      logger.debug('🔐 TOKEN REFRESH: Rate limited, skipping');
      return { success: false, error: new Error('Rate limited') };
    }

    refreshInProgress.current = true;
    lastRefreshAttempt.current = now;

    try {
      logger.debug('🔐 TOKEN REFRESH: Starting token refresh attempt', {
        attempt: refreshRetryCount.current + 1,
        maxRetries: finalConfig.maxRetries
      });

      const { data, error } = await supabase.auth.refreshSession();

      if (error) {
        logger.warn('🔐 TOKEN REFRESH: Failed', {
          error: error.message,
          attempt: refreshRetryCount.current + 1
        });

        // Retry logic for specific recoverable errors
        if (refreshRetryCount.current < finalConfig.maxRetries) {
          const isRecoverableError = 
            error.message?.includes('network') ||
            error.message?.includes('timeout') ||
            error.message?.includes('connection') ||
            error.status === 429; // Rate limit

          if (isRecoverableError) {
            refreshRetryCount.current++;
            const delay = finalConfig.retryDelayMs * Math.pow(finalConfig.backoffMultiplier, refreshRetryCount.current - 1);
            
            logger.debug('🔐 TOKEN REFRESH: Retrying after delay', { delay, attempt: refreshRetryCount.current });
            
            await new Promise(resolve => setTimeout(resolve, delay));
            refreshInProgress.current = false;
            return refreshTokenWithRetry();
          }
        }

        // Non-recoverable errors or max retries exceeded
        logger.error('🔐 TOKEN REFRESH: Failed permanently', {
          error: error.message,
          totalAttempts: refreshRetryCount.current + 1,
          recoverable: false
        });

        refreshRetryCount.current = 0;
        return { success: false, error };
      }

      // Success
      logger.log('🔐 TOKEN REFRESH: Success', {
        user: data.user?.email,
        attempts: refreshRetryCount.current + 1
      });

      refreshRetryCount.current = 0;
      return { success: true };

    } catch (error: any) {
      logger.error('🔐 TOKEN REFRESH: Unexpected error', error);
      refreshRetryCount.current = 0;
      return { success: false, error };
    } finally {
      refreshInProgress.current = false;
    }
  }, [finalConfig]);

  const handleTokenRefreshError = useCallback(async (error: any): Promise<'retry' | 'logout' | 'ignore'> => {
    // Categorize errors
    if (error?.message?.includes('refresh_token_not_found')) {
      logger.warn('🔐 Token refresh failed: refresh token not found - attempting recovery');
      // This might be recoverable if we have a valid session
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.refresh_token) {
        return 'retry';
      }
      return 'logout';
    }

    if (error?.message?.includes('invalid_grant') || error?.message?.includes('expired')) {
      logger.warn('🔐 Token refresh failed: token expired or invalid');
      return 'logout';
    }

    if (error?.message?.includes('network') || error?.status >= 500) {
      logger.warn('🔐 Token refresh failed: network/server error - will retry');
      return 'retry';
    }

    // Unknown error - be conservative and logout
    logger.error('🔐 Token refresh failed: unknown error', error);
    return 'logout';
  }, []);

  const silentRefresh = useCallback(async (): Promise<boolean> => {
    try {
      const result = await refreshTokenWithRetry();
      return result.success;
    } catch (error) {
      logger.error('🔐 Silent refresh failed', error);
      return false;
    }
  }, [refreshTokenWithRetry]);

  return {
    refreshTokenWithRetry,
    handleTokenRefreshError,
    silentRefresh,
    isRefreshInProgress: () => refreshInProgress.current
  };
};
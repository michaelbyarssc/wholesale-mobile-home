import { useCallback } from 'react';
import { useSessionManager } from '@/contexts/SessionManagerContext';

export const useAuthErrorRecovery = () => {
  const { clearAllSessions } = useSessionManager();

  // Clear all auth state when fundamental errors occur
  const clearAuthState = useCallback(() => {
    console.log('🔐 Performing full auth state cleanup');
    
    // Clear session manager state
    clearAllSessions();
    
    // Clear all localStorage auth-related data
    const keysToRemove = Object.keys(localStorage).filter(key => 
      key.startsWith('wmh_') || 
      key.startsWith('sb-') ||
      key.includes('session')
    );
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      console.log('🔐 Removed storage key:', key);
    });
    
    // Clear any remaining supabase auth data
    localStorage.removeItem('supabase.auth.token');
    
    console.log('🔐 Full auth state cleanup complete');
  }, [clearAllSessions]);

  // Handle specific auth errors
  const handleAuthError = useCallback((error: any) => {
    const errorMessage = error?.message || '';
    
    if (errorMessage.includes('session_not_found') ||
        errorMessage.includes('Session not found') ||
        errorMessage.includes('Failed to fetch') ||
        errorMessage.includes('JWT expired')) {
      
      console.log('🔐 Detected auth error requiring cleanup:', errorMessage);
      clearAuthState();
      return true; // Error was handled
    }
    
    return false; // Error not handled
  }, [clearAuthState]);

  // Force refresh auth state
  const forceAuthRefresh = useCallback(async () => {
    try {
      console.log('🔐 Forcing auth refresh');
      clearAuthState();
      
      // Reload the page to get a fresh start
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      console.error('🔐 Error during force refresh:', error);
    }
  }, [clearAuthState]);

  return {
    clearAuthState,
    handleAuthError,
    forceAuthRefresh
  };
};
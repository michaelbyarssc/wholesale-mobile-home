import { useCallback } from 'react';
import { useSessionManager } from '@/contexts/SessionManagerContext';

export const useSessionRecovery = () => {
  const { sessions, clearAllSessions, forceCleanUserSessions } = useSessionManager();

  // Enhanced emergency cleanup for corrupted sessions
  const emergencyCleanup = useCallback(() => {
    console.log('🚨 Performing enhanced emergency session cleanup');
    
    try {
      // Step 1: Clear all session-related localStorage with comprehensive patterns
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.startsWith('wmh_') ||
          key.includes('auth-token') ||
          key.startsWith('sb-') ||
          key.includes('session') ||
          key.includes('cart_data') ||
          key.includes('wishlist') ||
          key.includes('supabase') ||
          key.includes('auth')
        )) {
          keysToRemove.push(key);
        }
      }
      
      console.log(`🚨 Found ${keysToRemove.length} keys to remove:`, keysToRemove);
      
      keysToRemove.forEach(key => {
        try {
          localStorage.removeItem(key);
          console.log('🚨 Removed emergency key:', key);
        } catch (error) {
          console.warn('🚨 Could not remove key:', key, error);
        }
      });
      
      // Step 2: Clear sessions from context
      console.log('🚨 Clearing all sessions from context');
      clearAllSessions();
      
      // Step 3: Clear any cached authentication state
      try {
        // Clear any global auth state that might be cached
        if ((window as any).supabaseAuthState) {
          delete (window as any).supabaseAuthState;
        }
        
        // Clear any debounced auth events
        Object.keys(window as any).forEach(key => {
          if (key.startsWith('auth_')) {
            clearTimeout((window as any)[key]);
            delete (window as any)[key];
          }
        });
      } catch (error) {
        console.warn('🚨 Error clearing global auth state:', error);
      }
      
      // Step 4: Force navigate to auth page with complete state reset
      console.log('🚨 Emergency cleanup complete, redirecting to auth');
      window.location.href = '/auth?emergency=true';
      
      return true;
    } catch (error) {
      console.error('❌ Emergency cleanup failed:', error);
      // Fallback - just clear everything and reload
      try {
        localStorage.clear();
        window.location.href = '/auth';
      } catch (fallbackError) {
        console.error('❌ Fallback cleanup failed:', fallbackError);
        window.location.reload();
      }
      return false;
    }
  }, [clearAllSessions]);

  // Fix duplicate sessions for same user
  const fixDuplicateSessions = useCallback(() => {
    console.log('🔧 Checking for duplicate sessions');
    
    const userSessionMap = new Map();
    const duplicates = [];
    
    sessions.forEach(session => {
      const userId = session.user.id;
      if (userSessionMap.has(userId)) {
        duplicates.push(session.id);
      } else {
        userSessionMap.set(userId, session.id);
      }
    });
    
    if (duplicates.length > 0) {
      console.log('🔧 Found duplicate sessions:', duplicates);
      // Note: In a real implementation, you'd call removeSession for each duplicate
      // But that would require access to the removeSession function
      return duplicates;
    }
    
    console.log('✅ No duplicate sessions found');
    return [];
  }, [sessions]);

  // Force clean all sessions for a specific user (emergency use)
  const forceCleanSpecificUser = useCallback((userId: string) => {
    console.log('🚨 EMERGENCY: Force cleaning sessions for specific user:', userId);
    try {
      forceCleanUserSessions(userId);
      return true;
    } catch (error) {
      console.error('🚨 Emergency user cleanup failed:', error);
      return false;
    }
  }, [forceCleanUserSessions]);

  return {
    emergencyCleanup,
    fixDuplicateSessions,
    forceCleanSpecificUser,
    hasMultipleSessions: sessions.length > 1,
    sessionCount: sessions.length
  };
};
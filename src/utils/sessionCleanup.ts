/**
 * Session cleanup utilities to fix authentication issues
 */

export const clearCorruptedSessions = () => {
  try {
    console.log('🔐 CLEANUP: Starting session cleanup');
    
    // Clear all authentication-related localStorage keys
    const keysToRemove = [
      'wmh_sessions',
      'wmh_active_session',
    ];
    
    // Find and remove all session-specific keys
    const allKeys = Object.keys(localStorage);
    const sessionKeys = allKeys.filter(key => 
      key.startsWith('wmh_session_') || 
      key.startsWith('wmh_user_') ||
      key.startsWith('supabase.auth.token')
    );
    
    // Remove all identified keys
    [...keysToRemove, ...sessionKeys].forEach(key => {
      localStorage.removeItem(key);
      console.log('🔐 CLEANUP: Removed key:', key);
    });
    
    console.log('🔐 CLEANUP: Session cleanup completed');
    return true;
  } catch (error) {
    console.error('🔐 CLEANUP: Error during session cleanup:', error);
    return false;
  }
};

export const resetAuthenticationState = () => {
  try {
    console.log('🔐 RESET: Resetting authentication state');
    
    // Clear all authentication data
    clearCorruptedSessions();
    
    // Clear any cached clients or auth state
    if (typeof window !== 'undefined' && window.location) {
      // Clear URL parameters that might interfere
      const url = new URL(window.location.href);
      if (url.searchParams.has('access_token') || url.searchParams.has('refresh_token')) {
        url.searchParams.delete('access_token');
        url.searchParams.delete('refresh_token');
        url.searchParams.delete('expires_at');
        url.searchParams.delete('token_type');
        url.searchParams.delete('type');
        window.history.replaceState({}, '', url.toString());
      }
    }
    
    console.log('🔐 RESET: Authentication state reset completed');
    return true;
  } catch (error) {
    console.error('🔐 RESET: Error resetting authentication state:', error);
    return false;
  }
};

export const validateSessionIntegrity = async () => {
  try {
    const sessions = localStorage.getItem('wmh_sessions');
    const activeSessionId = localStorage.getItem('wmh_active_session');
    
    if (!sessions) return true;
    
    const parsed = JSON.parse(sessions);
    
    // Check if sessions array is valid
    if (!Array.isArray(parsed)) {
      console.warn('🔐 VALIDATE: Sessions data is not an array');
      return false;
    }
    
    // Check if active session exists in sessions
    if (activeSessionId && !parsed.some((s: any) => s.id === activeSessionId)) {
      console.warn('🔐 VALIDATE: Active session not found in sessions');
      return false;
    }
    
    // Check session structure
    for (const session of parsed) {
      if (!session.id || !session.user || !session.session) {
        console.warn('🔐 VALIDATE: Invalid session structure');
        return false;
      }
      
      // Check if session tokens are expired
      if (session.session?.expires_at) {
        const expiresAt = new Date(session.session.expires_at);
        const now = new Date();
        if (expiresAt <= now) {
          console.warn('🔐 VALIDATE: Session expired for user:', session.user.email);
          return false;
        }
      }
    }
    
    return true;
  } catch (error) {
    console.error('🔐 VALIDATE: Error validating session integrity:', error);
    return false;
  }
};

export const validateServerSession = async () => {
  try {
    console.log('🔐 SERVER VALIDATE: Checking server-side session validity');
    
    // Import here to avoid circular dependencies
    const { supabase } = await import('@/integrations/supabase/client');
    
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      console.warn('🔐 SERVER VALIDATE: Server session invalid:', error?.message);
      return false;
    }
    
    console.log('🔐 SERVER VALIDATE: Server session valid for user:', user.email);
    return true;
  } catch (error) {
    console.error('🔐 SERVER VALIDATE: Error validating server session:', error);
    return false;
  }
};

export const detectAndClearStaleSession = async () => {
  try {
    console.log('🔐 STALE CHECK: Detecting stale sessions');
    
    // Check if local session exists
    const hasLocalSession = localStorage.getItem('wmh_sessions') || localStorage.getItem('wmh_active_session');
    
    if (!hasLocalSession) {
      console.log('🔐 STALE CHECK: No local sessions found');
      return true;
    }
    
    // Validate both local and server integrity
    const localIntegrity = await validateSessionIntegrity();
    const serverValidity = await validateServerSession();
    
    if (!localIntegrity || !serverValidity) {
      console.warn('🔐 STALE CHECK: Detected stale/corrupted session, clearing...');
      clearCorruptedSessions();
      return false;
    }
    
    console.log('🔐 STALE CHECK: Session integrity validated');
    return true;
  } catch (error) {
    console.error('🔐 STALE CHECK: Error during stale session detection:', error);
    // Clear on any validation error to be safe
    clearCorruptedSessions();
    return false;
  }
};
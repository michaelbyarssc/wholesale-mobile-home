/**
 * Session cleanup utilities to fix authentication issues
 */

// Track login state to prevent aggressive cleanup during auth flow
let isInLoginFlow = false;
let loginFlowStartTime = 0;
const LOGIN_GRACE_PERIOD_MS = 10000; // 10 seconds grace period after login

export const markLoginFlowStart = () => {
  console.log('🔐 LOGIN FLOW: Started - disabling aggressive cleanup');
  isInLoginFlow = true;
  loginFlowStartTime = Date.now();
};

export const markLoginFlowEnd = () => {
  console.log('🔐 LOGIN FLOW: Ended - re-enabling cleanup after delay');
  setTimeout(() => {
    isInLoginFlow = false;
    loginFlowStartTime = 0;
    console.log('🔐 LOGIN FLOW: Grace period ended, cleanup re-enabled');
  }, LOGIN_GRACE_PERIOD_MS);
};

const isInLoginGracePeriod = () => {
  if (!isInLoginFlow && loginFlowStartTime === 0) return false;
  const elapsed = Date.now() - loginFlowStartTime;
  return elapsed < LOGIN_GRACE_PERIOD_MS;
};

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
    
    // More lenient validation - don't require active session to exist in sessions
    // This prevents false positives during session creation/switching
    
    // Check session structure - be more lenient
    for (const session of parsed) {
      if (!session.id || !session.user) {
        console.warn('🔐 VALIDATE: Invalid session structure - missing id or user');
        return false;
      }
      
      // Only check expiration if we have a clear expires_at field
      // Add buffer time to prevent false positives due to clock drift
      if (session.session?.expires_at) {
        const expiresAt = new Date(session.session.expires_at);
        const now = new Date();
        const bufferMs = 60000; // 1 minute buffer
        
        if (expiresAt.getTime() <= (now.getTime() - bufferMs)) {
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

// Detect and clear stale sessions - throttled version to prevent loops
let lastStaleCheckTime = 0;
const staleCheckCooldown = 2 * 60 * 1000; // 2 minutes cooldown

export const detectAndClearStaleSession = async (): Promise<boolean> => {
  const now = Date.now();
  
  // Throttle stale session checks to prevent loops
  if (now - lastStaleCheckTime < staleCheckCooldown) {
    console.log('🔐 STALE CHECK: Throttled, skipping check (cooldown active)');
    return true; // Assume valid during cooldown
  }
  
  if (isInLoginGracePeriod()) {
    console.log('🔐 STALE CHECK: Skipping during login grace period');
    return true;
  }

  lastStaleCheckTime = now;
  console.log('🔐 STALE CHECK: Detecting stale sessions');
  
  // Check local session integrity first
  const localIntegrity = await validateSessionIntegrity();
  if (!localIntegrity) {
    console.log('🔐 STALE CHECK: Session integrity failed, clearing corrupted sessions');
    clearCorruptedSessions();
    return false;
  }
  
  console.log('🔐 STALE CHECK: Session integrity validated');
  
  // Check server session validity with timeout
  try {
    const isServerValid = await Promise.race([
      validateServerSession(),
      new Promise<boolean>((_, reject) => 
        setTimeout(() => reject(new Error('Validation timeout')), 5000)
      )
    ]);
    
    if (!isServerValid) {
      console.log('🔐 STALE CHECK: Server session invalid, clearing stale sessions');
      clearCorruptedSessions();
      return false;
    }
    
    console.log('🔐 STALE CHECK: All validations passed');
    return true;
  } catch (error) {
    console.log('🔐 STALE CHECK: Validation timeout or error, assuming valid to prevent blocking');
    return true; // Don't block on validation errors
  }
};
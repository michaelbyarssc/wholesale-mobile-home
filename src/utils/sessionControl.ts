/**
 * Session control utilities for managing authentication persistence
 */

export interface SessionConfig {
  rememberMe: boolean;
  expirationHours: number;
}

const SESSION_CONFIG_KEY = 'wmh_session_config';
const DEFAULT_EXPIRATION_HOURS = 24;

export const getSessionConfig = (): SessionConfig => {
  try {
    const stored = localStorage.getItem(SESSION_CONFIG_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error reading session config:', error);
  }
  
  return {
    rememberMe: false,
    expirationHours: DEFAULT_EXPIRATION_HOURS
  };
};

export const setSessionConfig = (config: SessionConfig) => {
  try {
    localStorage.setItem(SESSION_CONFIG_KEY, JSON.stringify(config));
  } catch (error) {
    console.error('Error saving session config:', error);
  }
};

export const clearAllSessionData = () => {
  try {
    console.log('🔐 Clearing all session data');
    
    // Clear session-related localStorage keys
    const keysToRemove = [
      'wmh_sessions',
      'wmh_active_session',
      SESSION_CONFIG_KEY
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
    });
    
    console.log('🔐 All session data cleared');
    return true;
  } catch (error) {
    console.error('🔐 Error clearing session data:', error);
    return false;
  }
};

export const isSessionExpired = (createdAt: Date, expirationHours: number): boolean => {
  const now = new Date();
  const expiration = new Date(createdAt.getTime() + (expirationHours * 60 * 60 * 1000));
  return now > expiration;
};

export const shouldRestoreSession = (): boolean => {
  const config = getSessionConfig();
  
  // If user didn't choose "Remember Me", don't restore sessions
  if (!config.rememberMe) {
    console.log('🔐 Session restore disabled (Remember Me not selected)');
    return false;
  }
  
  return true;
};

export const validateAndCleanExpiredSessions = (): boolean => {
  try {
    const config = getSessionConfig();
    const storedSessions = localStorage.getItem('wmh_sessions');
    
    if (!storedSessions) return true;
    
    const sessions = JSON.parse(storedSessions);
    if (!Array.isArray(sessions)) return false;
    
    // Filter out expired sessions
    const validSessions = sessions.filter((session: any) => {
      if (!session.createdAt) return false;
      
      const createdAt = new Date(session.createdAt);
      const expired = isSessionExpired(createdAt, config.expirationHours);
      
      if (expired) {
        console.log('🔐 Removing expired session for:', session.user?.email);
      }
      
      return !expired;
    });
    
    // Update localStorage if we removed any sessions
    if (validSessions.length !== sessions.length) {
      if (validSessions.length === 0) {
        localStorage.removeItem('wmh_sessions');
        localStorage.removeItem('wmh_active_session');
      } else {
        localStorage.setItem('wmh_sessions', JSON.stringify(validSessions));
        
        // Check if active session was removed
        const activeSessionId = localStorage.getItem('wmh_active_session');
        if (activeSessionId && !validSessions.some((s: any) => s.id === activeSessionId)) {
          localStorage.removeItem('wmh_active_session');
        }
      }
    }
    
    return validSessions.length > 0;
  } catch (error) {
    console.error('🔐 Error validating sessions:', error);
    clearAllSessionData();
    return false;
  }
};
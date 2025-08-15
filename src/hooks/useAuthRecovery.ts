import { useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { detectAndClearStaleSession, clearCorruptedSessions } from '@/utils/sessionCleanup';

/**
 * Hook for automatic authentication recovery and error handling
 */
export const useAuthRecovery = () => {
  const { toast } = useToast();

  // Recovery function that can be called manually
  const recoverAuthentication = useCallback(async () => {
    try {
      console.log('🔐 RECOVERY: Starting authentication recovery');
      
      const isValid = await detectAndClearStaleSession();
      
      if (!isValid) {
        toast({
          title: "Session Restored",
          description: "We cleared some outdated login data. Please sign in again.",
          variant: "default"
        });
        
        // Reload page to reset authentication state
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
      
      return isValid;
    } catch (error) {
      console.error('🔐 RECOVERY: Error during authentication recovery:', error);
      
      // Emergency cleanup
      clearCorruptedSessions();
      
      toast({
        title: "Authentication Reset",
        description: "We've reset your authentication. Please sign in again.",
        variant: "destructive"
      });
      
      return false;
    }
  }, [toast]);

  // Auto-recovery on mount for critical issues
  useEffect(() => {
    let mounted = true;
    
    const performAutoRecovery = async () => {
      try {
        // Check for obvious corruption markers
        const sessions = localStorage.getItem('wmh_sessions');
        const activeSession = localStorage.getItem('wmh_active_session');
        
        // Only auto-recover if there are clear signs of corruption
        if (sessions && activeSession) {
          try {
            const parsed = JSON.parse(sessions);
            if (!Array.isArray(parsed) || parsed.length === 0) {
              console.log('🔐 RECOVERY: Auto-recovery triggered for corrupted sessions');
              if (mounted) {
                await recoverAuthentication();
              }
            }
          } catch (parseError) {
            console.log('🔐 RECOVERY: Auto-recovery triggered for unparseable sessions');
            if (mounted) {
              await recoverAuthentication();
            }
          }
        }
      } catch (error) {
        console.error('🔐 RECOVERY: Error during auto-recovery:', error);
      }
    };

    // Delay auto-recovery to allow normal initialization
    const recoveryTimeout = setTimeout(performAutoRecovery, 2000);

    return () => {
      mounted = false;
      clearTimeout(recoveryTimeout);
    };
  }, [recoverAuthentication]);

  return {
    recoverAuthentication
  };
};